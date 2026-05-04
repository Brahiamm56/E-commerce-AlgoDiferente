import { isDatabaseConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export type AdminVariant = {
  id: string;
  productName: string;
  categoryName: string;
  internalSku: string;
  size: string;
  colorName: string;
  priceCents: number;
  costCents: number;
  stock: number;
  stockReserved: number;
  active: boolean;
  updatedAt: Date;
};

function decimalToCents(value: { toString(): string }) {
  return Math.round(Number(value.toString()) * 100);
}

export async function getAdminVariants(): Promise<AdminVariant[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  try {
    const variants = await prisma.productVariant.findMany({
      include: {
        product: {
          select: {
            name: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: [{ product: { name: "asc" } }, { colorName: "asc" }, { size: "asc" }],
    });

    return variants.map((variant) => ({
      id: variant.id,
      productName: variant.product.name,
      categoryName: variant.product.category.name,
      internalSku: variant.internalSku,
      size: variant.size,
      colorName: variant.colorName,
      priceCents: decimalToCents(variant.price),
      costCents: decimalToCents(variant.cost),
      stock: variant.stock,
      stockReserved: variant.stockReserved,
      active: variant.active,
      updatedAt: variant.updatedAt,
    }));
  } catch {
    return [];
  }
}