"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/admin";
import { isDatabaseConfigured } from "@/lib/env";
import { logAndMaskError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { customerCreateSchema, debtPaymentSchema } from "@/schemas/customer";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function centsToDecimal(value: number) {
  return new Prisma.Decimal(value).div(100);
}

function decimalToCents(value: Prisma.Decimal | number | string) {
  return Math.round(Number(value.toString()) * 100);
}

function normalizedPhone(value: string) {
  return value.replace(/[^+\d]/g, "");
}

function buildReceiptNumber() {
  return `REC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function createCustomerAction(formData: FormData) {
  await requireAdminSession();
  if (!isDatabaseConfigured()) return;

  const parsed = customerCreateSchema.safeParse({
    name: getString(formData, "name"),
    phone: getString(formData, "phone"),
    email: getString(formData, "email"),
    document: getString(formData, "document"),
    creditLimitCents: Math.round(Number(getString(formData, "creditLimit") || 0) * 100),
    notes: getString(formData, "notes"),
  });

  if (!parsed.success) return;

  try {
    await prisma.customer.upsert({
      where: { phone: normalizedPhone(parsed.data.phone) },
      create: {
        name: parsed.data.name,
        phone: normalizedPhone(parsed.data.phone),
        email: parsed.data.email || null,
        document: parsed.data.document || null,
        creditLimit: centsToDecimal(parsed.data.creditLimitCents),
        notes: parsed.data.notes || null,
      },
      update: {
        name: parsed.data.name,
        email: parsed.data.email || null,
        document: parsed.data.document || null,
        creditLimit: centsToDecimal(parsed.data.creditLimitCents),
        notes: parsed.data.notes || null,
      },
    });
  } catch (error) {
    logAndMaskError("create-customer", error, "No fue posible guardar el cliente.");
  }

  revalidatePath("/admin/clientes");
}

export async function recordDebtPaymentAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!isDatabaseConfigured()) return;

  const parsed = debtPaymentSchema.safeParse({
    customerId: getString(formData, "customerId"),
    amountCents: Math.round(Number(getString(formData, "amount") || 0) * 100),
    method: getString(formData, "method") || "CASH",
    notes: getString(formData, "notes"),
  });

  if (!parsed.success) return;

  try {
    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUniqueOrThrow({ where: { id: parsed.data.customerId } });
      const currentDebt = decimalToCents(customer.debtAccumulated);
      const nextDebt = Math.max(0, currentDebt - parsed.data.amountCents);
      const payment = await tx.payment.create({
        data: {
          customerId: customer.id,
          method: parsed.data.method,
          provider: "INTERNAL",
          status: "APPROVED",
          amount: centsToDecimal(parsed.data.amountCents),
          paidAt: new Date(),
        },
      });

      await tx.customer.update({
        where: { id: customer.id },
        data: { debtAccumulated: centsToDecimal(nextDebt) },
      });
      await tx.customerLedgerEntry.create({
        data: {
          customerId: customer.id,
          type: "CREDIT",
          amount: centsToDecimal(parsed.data.amountCents),
          balanceAfter: centsToDecimal(nextDebt),
          paymentId: payment.id,
          reference: "Pago de deuda",
          notes: parsed.data.notes || null,
        },
      });
      await tx.internalReceipt.create({
        data: {
          receiptNumber: buildReceiptNumber(),
          type: "DEBT_PAYMENT",
          customerId: customer.id,
          total: centsToDecimal(parsed.data.amountCents),
          metadata: { method: parsed.data.method, createdById: session.user.id },
        },
      });

      const cashSession = await tx.cashRegisterSession.findFirst({ where: { status: "OPEN" }, orderBy: { openedAt: "desc" } });
      if (cashSession) {
        await tx.cashMovement.create({
          data: {
            sessionId: cashSession.id,
            type: "PAYMENT_IN",
            amount: centsToDecimal(parsed.data.amountCents),
            paymentMethod: parsed.data.method,
            description: `Cobranza cuenta corriente ${customer.name}`,
            createdById: session.user.id,
          },
        });
      }
    });
  } catch (error) {
    logAndMaskError("debt-payment", error, "No fue posible registrar el pago de deuda.");
  }

  revalidatePath("/admin/clientes");
  revalidatePath("/admin/pos");
}