"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/admin";
import { logAndMaskError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { variantStockUpdateSchema } from "@/schemas/stock";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function updateVariantStockAction(formData: FormData) {
  const session = await requireAdminSession();
  const parsed = variantStockUpdateSchema.safeParse({
    variantId: getString(formData, "variantId"),
    stock: Number(getString(formData, "stock")),
    cost: Number(getString(formData, "cost")),
    notes: getString(formData, "notes"),
  });

  if (!parsed.success) {
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.productVariant.findUniqueOrThrow({
        where: { id: parsed.data.variantId },
        select: { id: true, productId: true, stock: true, cost: true },
      });
      const nextCost = new Prisma.Decimal(parsed.data.cost);

      await tx.productVariant.update({
        where: { id: current.id },
        data: { stock: parsed.data.stock, cost: nextCost },
      });

      const aggregate = await tx.productVariant.aggregate({
        where: { productId: current.productId, active: true },
        _sum: { stock: true },
      });

      await tx.product.update({
        where: { id: current.productId },
        data: { stock: aggregate._sum.stock ?? 0 },
      });

      await tx.stockMovement.create({
        data: {
          variantId: current.id,
          productId: current.productId,
          type: "ADJUSTMENT",
          quantity: parsed.data.stock - current.stock,
          stockBefore: current.stock,
          stockAfter: parsed.data.stock,
          unitCost: nextCost,
          createdById: session.user.id,
          notes: parsed.data.notes || "Ajuste manual desde admin de variantes.",
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "variant.stock.update",
          entityType: "ProductVariant",
          entityId: current.id,
          before: { stock: current.stock, cost: current.cost.toString() },
          after: { stock: parsed.data.stock, cost: nextCost.toString() },
        },
      });
    });
  } catch (error) {
    logAndMaskError("update-variant-stock", error, "No fue posible actualizar la variante.");
  }

  revalidatePath("/admin/variantes");
  revalidatePath("/admin/productos");
  revalidatePath("/productos");
}