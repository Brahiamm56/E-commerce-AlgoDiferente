import { isDatabaseConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export type PosProductOption = {
  variantId: string;
  productId: string;
  name: string;
  variantLabel: string;
  internalSku: string;
  priceCents: number;
  stock: number;
};

export type PosCustomerOption = {
  id: string;
  name: string;
  phone: string;
  debtCents: number;
  creditLimitCents: number;
};

function decimalToCents(value: { toString(): string }) {
  return Math.round(Number(value.toString()) * 100);
}

export async function getOpenCashSession() {
  if (!isDatabaseConfigured()) return null;

  try {
    return prisma.cashRegisterSession.findFirst({
      where: { status: "OPEN" },
      orderBy: { openedAt: "desc" },
      include: { movements: { select: { amount: true, type: true } } },
    });
  } catch {
    return null;
  }
}

export async function getPosProducts(): Promise<PosProductOption[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const variants = await prisma.productVariant.findMany({
      where: { active: true, product: { status: "PUBLISHED" } },
      include: { product: { select: { id: true, name: true } } },
      orderBy: [{ product: { name: "asc" } }, { colorName: "asc" }, { size: "asc" }],
    });

    return variants.map((variant) => ({
      variantId: variant.id,
      productId: variant.productId,
      name: variant.product.name,
      variantLabel: `${variant.size} / ${variant.colorName}`,
      internalSku: variant.internalSku,
      priceCents: decimalToCents(variant.price),
      stock: variant.stock - variant.stockReserved,
    }));
  } catch {
    return [];
  }
}

export async function getPosCustomers(): Promise<PosCustomerOption[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const customers = await prisma.customer.findMany({ orderBy: { name: "asc" }, take: 300 });

    return customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      debtCents: decimalToCents(customer.debtAccumulated),
      creditLimitCents: decimalToCents(customer.creditLimit),
    }));
  } catch {
    return [];
  }
}