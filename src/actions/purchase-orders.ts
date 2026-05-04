"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/admin";
import { isDatabaseConfigured } from "@/lib/env";
import { logAndMaskError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  purchaseOrderCreateSchema,
  purchaseOrderReceiveSchema,
  type PurchaseOrderCreateInput,
} from "@/schemas/purchase-order";

export type PurchaseOrderCreateActionResult = {
  status: "success" | "error";
  message: string;
  orderId?: string;
  orderNumber?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

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

export async function createPurchaseOrderAction(
  input: PurchaseOrderCreateInput,
): Promise<PurchaseOrderCreateActionResult> {
  await requireAdminSession();

  if (!isDatabaseConfigured()) {
    return {
      status: "error",
      message: "La base de datos no esta configurada.",
    };
  }

  const parsed = purchaseOrderCreateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos del pedido antes de finalizar.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const variantIds = parsed.data.items.map((item) => item.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds }, active: true },
      select: {
        id: true,
        productId: true,
      },
    });

    if (variants.length !== variantIds.length) {
      return {
        status: "error",
        message: "Una o mas variantes ya no estan disponibles. Recarga la pagina e intenta nuevamente.",
      };
    }

    const variantById = new Map(variants.map((variant) => [variant.id, variant]));

    for (const item of parsed.data.items) {
      const variant = variantById.get(item.variantId);

      if (!variant || variant.productId !== item.productId) {
        return {
          status: "error",
          message: "Detectamos cambios en el catalogo. Vuelve a armar el pedido para continuar.",
        };
      }
    }

    const subtotalCents = parsed.data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitCostCents,
      0,
    );
    const orderNumber = buildNumber("OC");

    const order = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: parsed.data.supplierId,
        status: "SENT",
        subtotal: centsToDecimal(subtotalCents),
        notes: parsed.data.notes || null,
        sentAt: new Date(),
        items: {
          create: parsed.data.items.map((item) => ({
            variantId: item.variantId,
            quantityOrdered: item.quantity,
            unitCost: centsToDecimal(item.unitCostCents),
          })),
        },
      },
      select: {
        id: true,
        orderNumber: true,
      },
    });

    revalidatePath("/admin/compras");
    revalidatePath("/admin/proveedores");

    return {
      status: "success",
      message: `Pedido ${order.orderNumber} generado correctamente.`,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  } catch (error) {
    logAndMaskError("create-purchase-order", error, "No fue posible crear la orden de compra.");

    return {
      status: "error",
      message: "No fue posible crear la orden de compra.",
    };
  }
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
            notes: `Recepcion ${order.orderNumber}`,
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
