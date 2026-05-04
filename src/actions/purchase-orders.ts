"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/admin";
import { isDatabaseConfigured } from "@/lib/env";
import { logAndMaskError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { purchaseOrderCreateSchema, purchaseOrderReceiveSchema } from "@/schemas/purchase-order";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function centsToDecimal(value: number) {
  return new Prisma.Decimal(value).div(100);
}

function buildNumber(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function createPurchaseOrderAction(formData: FormData) {
  await requireAdminSession();
  if (!isDatabaseConfigured()) return;

  const parsed = purchaseOrderCreateSchema.safeParse({
    supplierId: getString(formData, "supplierId"),
    variantId: getString(formData, "variantId"),
    quantity: Number(getString(formData, "quantity") || 0),
    unitCostCents: Math.round(Number(getString(formData, "unitCost") || 0) * 100),
    notes: getString(formData, "notes"),
  });

  if (!parsed.success) return;

  try {
    await prisma.purchaseOrder.create({
      data: {
        orderNumber: buildNumber("OC"),
        supplierId: parsed.data.supplierId,
        status: "SENT",
        subtotal: centsToDecimal(parsed.data.unitCostCents * parsed.data.quantity),
        notes: parsed.data.notes || null,
        sentAt: new Date(),
        items: {
          create: {
            variantId: parsed.data.variantId,
            quantityOrdered: parsed.data.quantity,
            unitCost: centsToDecimal(parsed.data.unitCostCents),
          },
        },
      },
    });
  } catch (error) {
    logAndMaskError("create-purchase-order", error, "No fue posible crear la orden de compra.");
  }

  revalidatePath("/admin/compras");
}

export async function receivePurchaseOrderAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!isDatabaseConfigured()) return;

  const parsed = purchaseOrderReceiveSchema.safeParse({ purchaseOrderId: getString(formData, "purchaseOrderId") });
  if (!parsed.success) return;

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUniqueOrThrow({
        where: { id: parsed.data.purchaseOrderId },
        include: { items: { include: { variant: true } } },
      });

      for (const item of order.items) {
        const quantityToReceive = item.quantityOrdered - item.quantityReceived;
        if (quantityToReceive <= 0) continue;

        const nextStock = item.variant.stock + quantityToReceive;
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: nextStock, cost: item.unitCost },
        });
        await tx.product.update({ where: { id: item.variant.productId }, data: { stock: { increment: quantityToReceive } } });
        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { quantityReceived: item.quantityOrdered },
        });
        await tx.supplierProduct.upsert({
          where: { supplierId_variantId: { supplierId: order.supplierId, variantId: item.variantId } },
          create: {
            supplierId: order.supplierId,
            variantId: item.variantId,
            lastCost: item.unitCost,
          },
          update: { lastCost: item.unitCost },
        });
        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            productId: item.variant.productId,
            type: "PURCHASE_RECEIPT",
            quantity: quantityToReceive,
            stockBefore: item.variant.stock,
            stockAfter: nextStock,
            unitCost: item.unitCost,
            relatedPurchaseOrderId: order.id,
            createdById: session.user.id,
            notes: `Recepción ${order.orderNumber}`,
          },
        });
      }

      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status: "RECEIVED", receivedAt: new Date() },
      });
      await tx.internalReceipt.create({
        data: {
          receiptNumber: buildNumber("REC-OC"),
          type: "PURCHASE_ORDER",
          purchaseOrderId: order.id,
          total: order.subtotal,
          metadata: { receivedById: session.user.id },
        },
      });
    });
  } catch (error) {
    logAndMaskError("receive-purchase-order", error, "No fue posible recepcionar la compra.");
  }

  revalidatePath("/admin/compras");
  revalidatePath("/admin/variantes");
  revalidatePath("/admin/productos");
}