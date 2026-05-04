import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function decimalToCents(value: Prisma.Decimal | number | string) {
  return Math.round(Number(value.toString()) * 100);
}

export type AdminOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  totalCents: number;
  shippingTotalCents: number;
  itemCount: number;
  createdAt: Date;
  paidAt: Date | null;
  shipmentProvider: string | null;
};

export async function getAdminOrders(): Promise<AdminOrder[]> {
  const rows = await prisma.order.findMany({
    where: { channel: "WEB" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      shippingTotal: true,
      total: true,
      createdAt: true,
      paidAt: true,
      _count: { select: { items: true } },
      shipments: { select: { provider: true }, take: 1 },
    },
  });

  return rows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerEmail: o.customerEmail,
    totalCents: decimalToCents(o.total),
    shippingTotalCents: decimalToCents(o.shippingTotal),
    itemCount: o._count.items,
    createdAt: o.createdAt,
    paidAt: o.paidAt,
    shipmentProvider: o.shipments[0]?.provider ?? null,
  }));
}

export type AdminOrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  subtotalCents: number;
  shippingTotalCents: number;
  totalCents: number;
  createdAt: Date;
  paidAt: Date | null;
  notes: string | null;
  items: Array<{
    id: string;
    name: string;
    variantLabel: string | null;
    internalSku: string | null;
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
  }>;
  shippingAddress: {
    street: string;
    streetNumber: string | null;
    apartment: string | null;
    city: string;
    province: string;
    postalCode: string;
  } | null;
  shipment: {
    provider: string;
    status: string;
    city: string | null;
    addressLine: string | null;
    trackingNumber: string | null;
  } | null;
  payments: Array<{
    id: string;
    method: string;
    status: string;
    amountCents: number;
    paidAt: Date | null;
  }>;
};

export async function getAdminOrderDetail(orderId: string): Promise<AdminOrderDetail | null> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, channel: "WEB" },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      subtotal: true,
      shippingTotal: true,
      total: true,
      createdAt: true,
      paidAt: true,
      notes: true,
      items: {
        select: {
          id: true,
          name: true,
          variantLabel: true,
          internalSku: true,
          quantity: true,
          unitPrice: true,
          total: true,
        },
      },
      shippingAddress: {
        select: {
          street: true,
          streetNumber: true,
          apartment: true,
          city: true,
          province: true,
          postalCode: true,
        },
      },
      shipments: {
        select: {
          provider: true,
          status: true,
          city: true,
          addressLine: true,
          trackingNumber: true,
        },
        take: 1,
      },
      payments: {
        select: {
          id: true,
          method: true,
          status: true,
          amount: true,
          paidAt: true,
        },
      },
    },
  });

  if (!order) return null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    subtotalCents: decimalToCents(order.subtotal),
    shippingTotalCents: decimalToCents(order.shippingTotal),
    totalCents: decimalToCents(order.total),
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    notes: order.notes,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      variantLabel: item.variantLabel,
      internalSku: item.internalSku,
      quantity: item.quantity,
      unitPriceCents: decimalToCents(item.unitPrice),
      totalCents: decimalToCents(item.total),
    })),
    shippingAddress: order.shippingAddress
      ? {
          street: order.shippingAddress.street,
          streetNumber: order.shippingAddress.streetNumber,
          apartment: order.shippingAddress.apartment,
          city: order.shippingAddress.city,
          province: order.shippingAddress.province,
          postalCode: order.shippingAddress.postalCode,
        }
      : null,
    shipment: order.shipments[0]
      ? {
          provider: order.shipments[0].provider,
          status: order.shipments[0].status,
          city: order.shipments[0].city,
          addressLine: order.shipments[0].addressLine,
          trackingNumber: order.shipments[0].trackingNumber,
        }
      : null,
    payments: order.payments.map((p) => ({
      id: p.id,
      method: p.method,
      status: p.status,
      amountCents: decimalToCents(p.amount),
      paidAt: p.paidAt,
    })),
  };
}
