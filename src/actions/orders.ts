"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/admin";
import { isDatabaseConfigured } from "@/lib/env";
import { logAndMaskError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const VALID_ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "IN_PREPARATION",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

type ValidOrderStatus = (typeof VALID_ORDER_STATUSES)[number];

function isValidOrderStatus(value: string): value is ValidOrderStatus {
  return (VALID_ORDER_STATUSES as readonly string[]).includes(value);
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function updateOrderStatusAction(formData: FormData) {
  await requireAdminSession();
  if (!isDatabaseConfigured()) return;

  const orderId = getString(formData, "orderId");
  const newStatus = getString(formData, "status");

  if (!orderId || !isValidOrderStatus(newStatus)) return;

  try {
    const extra: Record<string, unknown> = {};

    if (newStatus === "PAID") {
      extra.paymentStatus = "APPROVED";
      extra.paidAt = new Date();
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus, ...extra },
    });
  } catch (error) {
    logAndMaskError("update-order-status", error, "No fue posible actualizar el estado.");
  }

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
}
