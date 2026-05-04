"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import type { AdminFormState } from "@/actions/admin-state";
import { requireAdminSession } from "@/lib/admin";
import { isDatabaseConfigured } from "@/lib/env";
import { logAndMaskError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { cashSessionCloseSchema, cashSessionOpenSchema, posSaleSchema } from "@/schemas/pos";

function buildState(status: AdminFormState["status"], message: string): AdminFormState {
  return { status, message, submissionKey: Date.now() };
}

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

function parseItems(raw: string) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      const object = item as Record<string, unknown>;
      return {
        variantId: typeof object.variantId === "string" ? object.variantId : "",
        quantity: Number(object.quantity ?? 1),
      };
    });
  } catch {
    return [];
  }
}

function buildReceiptNumber(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function openCashSessionAction(formData: FormData) {
  const session = await requireAdminSession();
  const parsed = cashSessionOpenSchema.safeParse({
    openingAmountCents: Math.round(Number(getString(formData, "openingAmount") || 0) * 100),
    notes: getString(formData, "notes"),
  });

  if (!parsed.success || !isDatabaseConfigured()) return;

  await prisma.cashRegisterSession.create({
    data: {
      sessionNumber: buildReceiptNumber("CAJA"),
      status: "OPEN",
      openingAmount: centsToDecimal(parsed.data.openingAmountCents),
      openedById: session.user.id,
      notes: parsed.data.notes || null,
      movements: {
        create: {
          type: "OPENING",
          amount: centsToDecimal(parsed.data.openingAmountCents),
          description: "Apertura de caja",
          createdById: session.user.id,
        },
      },
    },
  });

  revalidatePath("/admin/pos");
}

export async function closeCashSessionAction(formData: FormData) {
  const session = await requireAdminSession();
  const parsed = cashSessionCloseSchema.safeParse({
    sessionId: getString(formData, "sessionId"),
    closingAmountCents: Math.round(Number(getString(formData, "closingAmount") || 0) * 100),
    notes: getString(formData, "notes"),
  });

  if (!parsed.success || !isDatabaseConfigured()) return;

  await prisma.$transaction(async (tx) => {
    const current = await tx.cashRegisterSession.findUniqueOrThrow({
      where: { id: parsed.data.sessionId },
      include: { movements: true },
    });
    const expectedCents = current.movements.reduce(
      (sum, movement) => sum + decimalToCents(movement.amount),
      0,
    );
    const differenceCents = parsed.data.closingAmountCents - expectedCents;

    await tx.cashRegisterSession.update({
      where: { id: current.id },
      data: {
        status: "CLOSED",
        expectedAmount: centsToDecimal(expectedCents),
        closingAmount: centsToDecimal(parsed.data.closingAmountCents),
        difference: centsToDecimal(differenceCents),
        closedById: session.user.id,
        closedAt: new Date(),
        notes: parsed.data.notes || current.notes,
      },
    });
  });

  revalidatePath("/admin/pos");
}

export async function createPosSaleAction(_: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const session = await requireAdminSession();

  if (!isDatabaseConfigured()) {
    return buildState("error", "Configura DATABASE_URL antes de vender por POS.");
  }

  const parsed = posSaleSchema.safeParse({
    customerId: getString(formData, "customerId"),
    paymentMethod: getString(formData, "paymentMethod"),
    amountReceivedCents: Math.round(Number(getString(formData, "amountReceived") || 0) * 100),
    notes: getString(formData, "notes"),
    items: parseItems(getString(formData, "items")),
  });

  if (!parsed.success) {
    return buildState("error", "Revisá los datos de la venta POS.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const cashSession = await tx.cashRegisterSession.findFirst({
        where: { status: "OPEN" },
        orderBy: { openedAt: "desc" },
      });
      const variants = await tx.productVariant.findMany({
        where: { id: { in: parsed.data.items.map((item) => item.variantId) } },
        include: { product: { select: { id: true, name: true } } },
      });
      const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
      const lines = parsed.data.items.map((item) => {
        const variant = variantMap.get(item.variantId);
        if (!variant) throw new Error("Una variante ya no existe.");
        return { item, variant };
      });
      const subtotalCents = lines.reduce(
        (sum, { item, variant }) => sum + decimalToCents(variant.price) * item.quantity,
        0,
      );
      const surchargeCents =
        parsed.data.paymentMethod === "CREDIT_CARD"
          ? Math.round(subtotalCents * (Number(process.env.POS_CARD_SURCHARGE_PERCENT ?? 20) / 100))
          : 0;
      const totalCents = subtotalCents + surchargeCents;
      const customerId = parsed.data.customerId || null;

      if (parsed.data.paymentMethod === "CURRENT_ACCOUNT") {
        if (!customerId) throw new Error("Seleccioná cliente para cuenta corriente.");

        const customer = await tx.customer.findUniqueOrThrow({ where: { id: customerId } });
        const nextDebtCents = decimalToCents(customer.debtAccumulated) + totalCents;
        const limitCents = decimalToCents(customer.creditLimit);

        if (nextDebtCents > limitCents) {
          throw new Error("La venta supera el límite de crédito del cliente.");
        }

        await tx.customer.update({
          where: { id: customer.id },
          data: { debtAccumulated: centsToDecimal(nextDebtCents) },
        });
      }

      const sale = await tx.sale.create({
        data: {
          channel: "POS",
          customerId,
          cashSessionId: cashSession?.id ?? null,
          customerName: null,
          totalCents,
          subtotal: centsToDecimal(subtotalCents),
          surchargeTotal: centsToDecimal(surchargeCents),
          costTotal: centsToDecimal(lines.reduce((sum, { item, variant }) => sum + decimalToCents(variant.cost) * item.quantity, 0)),
          status: "COMPLETED",
          paymentMethod: parsed.data.paymentMethod,
          amountReceived: parsed.data.amountReceivedCents,
          notes: parsed.data.notes || null,
          items: {
            create: lines.map(({ item, variant }) => ({
              productId: variant.productId,
              variantId: variant.id,
              internalSku: variant.internalSku,
              variantLabel: `${variant.size} / ${variant.colorName}`,
              name: variant.product.name,
              priceCents: decimalToCents(variant.price),
              unitCost: variant.cost,
              quantity: item.quantity,
            })),
          },
          payments: {
            create: {
              customerId,
              method: parsed.data.paymentMethod,
              provider: "INTERNAL",
              status: "APPROVED",
              amount: centsToDecimal(totalCents),
              paidAt: new Date(),
            },
          },
        },
      });

      for (const { item, variant } of lines) {
        const nextStock = variant.stock - item.quantity;
        await tx.productVariant.update({ where: { id: variant.id }, data: { stock: nextStock } });
        await tx.product.update({ where: { id: variant.productId }, data: { stock: { decrement: item.quantity } } });
        await tx.stockMovement.create({
          data: {
            variantId: variant.id,
            productId: variant.productId,
            type: "SALE",
            quantity: -item.quantity,
            stockBefore: variant.stock,
            stockAfter: nextStock,
            unitCost: variant.cost,
            relatedSaleId: sale.id,
            createdById: session.user.id,
            notes: "Venta POS.",
          },
        });
      }

      if (cashSession && parsed.data.paymentMethod !== "CURRENT_ACCOUNT") {
        await tx.cashMovement.create({
          data: {
            sessionId: cashSession.id,
            type: "SALE",
            amount: centsToDecimal(totalCents),
            paymentMethod: parsed.data.paymentMethod,
            description: `Venta POS ${sale.id}`,
            saleId: sale.id,
            createdById: session.user.id,
          },
        });
      }

      if (parsed.data.paymentMethod === "CURRENT_ACCOUNT" && customerId) {
        const customer = await tx.customer.findUniqueOrThrow({ where: { id: customerId } });
        await tx.customerLedgerEntry.create({
          data: {
            customerId,
            type: "DEBIT",
            amount: centsToDecimal(totalCents),
            balanceAfter: customer.debtAccumulated,
            saleId: sale.id,
            reference: "Venta POS cuenta corriente",
          },
        });
      }

      await tx.internalReceipt.create({
        data: {
          receiptNumber: buildReceiptNumber("TCK"),
          type: "SALE",
          saleId: sale.id,
          customerId,
          total: centsToDecimal(totalCents),
          metadata: { paymentMethod: parsed.data.paymentMethod },
        },
      });
    });
  } catch (error) {
    const masked = logAndMaskError("pos-sale", error, "No fue posible registrar la venta POS.");
    return buildState("error", `${masked.message} (cod. ${masked.code})`);
  }

  revalidatePath("/admin/pos");
  revalidatePath("/admin/ventas");
  revalidatePath("/admin/productos");
  revalidatePath("/admin/variantes");

  return buildState("success", "Venta POS registrada.");
}