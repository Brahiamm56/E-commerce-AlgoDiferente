"use server";

import { revalidatePath } from "next/cache";

import type { AdminFormState } from "@/actions/admin-state";
import { requireAdminSession } from "@/lib/admin";
import { isDatabaseConfigured } from "@/lib/env";
import { logAndMaskError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { newSaleSchema } from "@/schemas/sale";

function buildErrorState(message: string, fieldErrors?: Record<string, string[] | undefined>): AdminFormState {
  return {
    fieldErrors,
    message,
    submissionKey: Date.now(),
    status: "error",
  };
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseItems(raw: string) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: unknown) => {
      const obj = item as Record<string, unknown>;
      return {
        productId: typeof obj.productId === "string" ? obj.productId : null,
        name: typeof obj.name === "string" ? obj.name : "",
        priceCents: Number(obj.priceCents ?? 0),
        quantity: Number(obj.quantity ?? 1),
      };
    });
  } catch {
    return [];
  }
}

export async function createSaleAction(_: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdminSession();

  if (!isDatabaseConfigured()) {
    return buildErrorState("Configura DATABASE_URL antes de registrar ventas.");
  }

  const items = parseItems(getString(formData, "items"));
  const status = getString(formData, "status") || "COMPLETED";

  const parsed = newSaleSchema.safeParse({
    customerName: getString(formData, "customerName") || undefined,
    customerPhone: getString(formData, "customerPhone") || undefined,
    deliveryMethod: getString(formData, "deliveryMethod") || undefined,
    notes: getString(formData, "notes") || undefined,
    status,
    items,
    paymentMethod: getString(formData, "paymentMethod") || "CASH",
    paidWithCash: Number(getString(formData, "paidWithCash") || 0),
    paidWithTransfer: Number(getString(formData, "paidWithTransfer") || 0),
    amountReceived: Number(getString(formData, "amountReceived") || 0),
  });

  if (!parsed.success) {
    return buildErrorState(
      "Revisa los datos de la venta.",
      parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>,
    );
  }

  const totalCents = parsed.data.items.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0,
  );

  let saleId: string | null = null;

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          customerName: parsed.data.customerName || null,
          customerPhone: parsed.data.customerPhone || null,
          deliveryMethod: parsed.data.deliveryMethod || null,
          notes: parsed.data.notes || null,
          status: parsed.data.status,
          paymentMethod: parsed.data.paymentMethod,
          paidWithCash: parsed.data.paidWithCash,
          paidWithTransfer: parsed.data.paidWithTransfer,
          amountReceived: parsed.data.amountReceived,
          totalCents,
          items: {
            create: parsed.data.items.map((item) => ({
              productId: item.productId || null,
              name: item.name,
              priceCents: item.priceCents,
              quantity: item.quantity,
            })),
          },
        },
      });

      // Decrementar stock si el producto existe en la BD y la venta no está cancelada
      if (parsed.data.status !== "CANCELLED") {
        for (const item of parsed.data.items) {
          if (item.productId) {
            await tx.product
              .update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } },
              })
              .catch(() => null);
          }
        }
      }

      return created;
    });

    saleId = sale.id;
  } catch (error) {
    const masked = logAndMaskError("create-sale", error, "No fue posible registrar la venta.");
    return buildErrorState(`${masked.message} (cod. ${masked.code})`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/ventas");
  revalidatePath("/admin/productos");

  return {
    status: "success",
    message: "Venta registrada.",
    submissionKey: Date.now(),
    data: saleId ? { saleId } : undefined,
  };
}

export async function updateSaleStatusAction(saleId: string, nextStatus: "PENDING" | "COMPLETED" | "CANCELLED") {
  await requireAdminSession();

  if (!isDatabaseConfigured()) return;

  try {
    await prisma.sale.update({ where: { id: saleId }, data: { status: nextStatus } });
    revalidatePath("/admin/ventas");
    revalidatePath("/admin");
  } catch (error) {
    logAndMaskError("update-sale-status", error, "No fue posible actualizar el estado.");
  }
}
