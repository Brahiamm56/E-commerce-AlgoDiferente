import type { ProductKind } from "@prisma/client";

import { isDatabaseConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export type AdminSupplier = {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  purchaseOrdersCount: number;
};

export type PurchaseOrderBuilderVariant = {
  id: string;
  size: string;
  colorName: string;
  colorHex: string | null;
  internalSku: string;
  stock: number;
  costCents: number;
  supplierCosts: Record<string, number>;
};

export type PurchaseOrderBuilderProduct = {
  id: string;
  name: string;
  brand: string | null;
  kind: ProductKind;
  variants: PurchaseOrderBuilderVariant[];
};

export type AdminPurchaseOrder = {
  id: string;
  orderNumber: string;
  supplierName: string;
  status: string;
  subtotalCents: number;
  createdAt: Date;
  itemCount: number;
};

function decimalToCents(value: { toString(): string } | null | undefined) {
  if (!value) return 0;
  return Math.round(Number(value.toString()) * 100);
}

export async function getAdminSuppliers(): Promise<AdminSupplier[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const suppliers = await prisma.supplier.findMany({
      include: { _count: { select: { purchaseOrders: true } } },
      orderBy: { name: "asc" },
    });

    return suppliers.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      contactName: supplier.contactName,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      notes: supplier.notes,
      purchaseOrdersCount: supplier._count.purchaseOrders,
    }));
  } catch {
    return [];
  }
}

export async function getPurchaseOrderBuilderProducts(): Promise<PurchaseOrderBuilderProduct[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const products = await prisma.product.findMany({
      where: {
        variants: {
          some: {
            active: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        brand: true,
        kind: true,
        variants: {
          where: { active: true },
          select: {
            id: true,
            size: true,
            colorName: true,
            colorHex: true,
            internalSku: true,
            stock: true,
            cost: true,
            supplierProducts: {
              select: {
                supplierId: true,
                lastCost: true,
              },
            },
          },
          orderBy: [{ colorName: "asc" }, { size: "asc" }],
        },
      },
      orderBy: [{ name: "asc" }],
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      kind: product.kind,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        size: variant.size,
        colorName: variant.colorName,
        colorHex: variant.colorHex,
        internalSku: variant.internalSku,
        stock: variant.stock,
        costCents: decimalToCents(variant.cost),
        supplierCosts: Object.fromEntries(
          variant.supplierProducts.map((supplierProduct) => [
            supplierProduct.supplierId,
            decimalToCents(supplierProduct.lastCost),
          ]),
        ),
      })),
    }));
  } catch {
    return [];
  }
}

export async function getAdminPurchaseOrders(): Promise<AdminPurchaseOrder[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: { supplier: { select: { name: true } }, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      supplierName: order.supplier.name,
      status: order.status,
      subtotalCents: decimalToCents(order.subtotal),
      createdAt: order.createdAt,
      itemCount: order._count.items,
    }));
  } catch {
    return [];
  }
}
