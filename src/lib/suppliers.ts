import { isDatabaseConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export type AdminSupplier = {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  purchaseOrdersCount: number;
};

export type PurchaseVariantOption = {
  id: string;
  label: string;
  costCents: number;
  stock: number;
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

function decimalToCents(value: { toString(): string }) {
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
      purchaseOrdersCount: supplier._count.purchaseOrders,
    }));
  } catch {
    return [];
  }
}

export async function getPurchaseVariantOptions(): Promise<PurchaseVariantOption[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const variants = await prisma.productVariant.findMany({
      include: { product: { select: { name: true } } },
      orderBy: [{ product: { name: "asc" } }, { colorName: "asc" }, { size: "asc" }],
    });

    return variants.map((variant) => ({
      id: variant.id,
      label: `${variant.product.name} · ${variant.size} / ${variant.colorName} · ${variant.internalSku}`,
      costCents: decimalToCents(variant.cost),
      stock: variant.stock,
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