import "server-only";

import crypto from "node:crypto";

import { Prisma } from "@prisma/client";

import { getMercadoPagoPaymentClient } from "@/lib/integrations/mercadopago";
import { prisma } from "@/lib/prisma";

type SignatureInput = {
  resourceId: string | null;
  requestId: string | null;
  signatureHeader: string | null;
  secret: string | undefined;
};

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function readObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function parseSignatureHeader(value: string) {
  const parts = new Map<string, string>();

  for (const segment of value.split(",")) {
    const [key, partValue] = segment.split("=");
    if (key && partValue) {
      parts.set(key.trim(), partValue.trim());
    }
  }

  return {
    timestamp: parts.get("ts") ?? null,
    signature: parts.get("v1") ?? null,
  };
}

function timingSafeEqualHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyMercadoPagoSignature({
  resourceId,
  requestId,
  signatureHeader,
  secret,
}: SignatureInput) {
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  if (!resourceId || !requestId || !signatureHeader) {
    return false;
  }

  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed.timestamp || !parsed.signature) {
    return false;
  }

  const manifest = `id:${resourceId};request-id:${requestId};ts:${parsed.timestamp};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  return timingSafeEqualHex(expected, parsed.signature);
}

export function getMercadoPagoResourceId(payload: unknown, url: URL) {
  const fromQuery = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  if (fromQuery) return fromQuery;

  const object = readObject(payload);
  const data = readObject(object?.data);
  const id = data?.id ?? object?.id;

  return typeof id === "string" || typeof id === "number" ? String(id) : null;
}

function getPayloadString(payload: unknown, key: string) {
  const object = readObject(payload);
  const value = object?.[key];

  return typeof value === "string" ? value : null;
}

function mapPaymentStatus(status: string | undefined) {
  switch (status) {
    case "approved":
      return { paymentStatus: "APPROVED" as const, orderStatus: "IN_PREPARATION" as const };
    case "pending":
      return { paymentStatus: "PENDING" as const, orderStatus: "PENDING_PAYMENT" as const };
    case "in_process":
      return { paymentStatus: "IN_PROCESS" as const, orderStatus: "PENDING_PAYMENT" as const };
    case "rejected":
      return { paymentStatus: "REJECTED" as const, orderStatus: "PENDING_PAYMENT" as const };
    case "refunded":
      return { paymentStatus: "REFUNDED" as const, orderStatus: "REFUNDED" as const };
    case "cancelled":
      return { paymentStatus: "CANCELLED" as const, orderStatus: "CANCELLED" as const };
    default:
      return { paymentStatus: "PENDING" as const, orderStatus: "PENDING_PAYMENT" as const };
  }
}

export async function processMercadoPagoPaymentWebhook(input: {
  payload: unknown;
  resourceId: string;
  signature: string | null;
}) {
  const eventKey = `${input.resourceId}:${getPayloadString(input.payload, "action") ?? "payment"}`;
  const existingEvent = await prisma.mercadoPagoWebhookEvent.findUnique({
    where: { eventKey },
    select: { id: true, processedAt: true },
  });

  if (existingEvent?.processedAt) {
    return { status: "duplicate" as const };
  }

  const event =
    existingEvent ??
    (await prisma.mercadoPagoWebhookEvent.create({
      data: {
        eventKey,
        resourceId: input.resourceId,
        topic: getPayloadString(input.payload, "type") ?? getPayloadString(input.payload, "topic"),
        action: getPayloadString(input.payload, "action"),
        signature: input.signature,
        rawPayload: toInputJson(input.payload),
      },
      select: { id: true },
    }));

  try {
    const payment = await getMercadoPagoPaymentClient().get({ id: input.resourceId });
    const externalReference = payment.external_reference ?? null;
    const mapped = mapPaymentStatus(payment.status);

    if (!externalReference) {
      throw new Error("Mercado Pago no devolvió external_reference.");
    }

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { externalReference },
        include: { items: true },
      });

      if (!order) {
        throw new Error("No se encontró el pedido interno para el pago.");
      }

      await tx.payment.upsert({
        where: { externalPaymentId: String(payment.id ?? input.resourceId) },
        create: {
          orderId: order.id,
          customerId: order.customerId,
          method: "MERCADO_PAGO",
          provider: "MERCADO_PAGO",
          status: mapped.paymentStatus,
          amount: new Prisma.Decimal(payment.transaction_amount ?? Number(order.total)),
          currency: payment.currency_id ?? order.currency,
          externalPaymentId: String(payment.id ?? input.resourceId),
          externalReference,
          installments: payment.installments ?? null,
          rawPayload: toInputJson(payment),
          paidAt: payment.date_approved ? new Date(payment.date_approved) : null,
        },
        update: {
          status: mapped.paymentStatus,
          rawPayload: toInputJson(payment),
          paidAt: payment.date_approved ? new Date(payment.date_approved) : undefined,
        },
      });

      if (mapped.paymentStatus === "APPROVED" && !order.paidAt) {
        for (const item of order.items) {
          if (!item.variantId) continue;

          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            select: { stock: true, productId: true },
          });

          if (!variant) continue;

          const nextStock = variant.stock - item.quantity;

          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: nextStock },
          });
          await tx.product.update({
            where: { id: variant.productId },
            data: { stock: { decrement: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              variantId: item.variantId,
              productId: variant.productId,
              type: "ORDER_PAID",
              quantity: -item.quantity,
              stockBefore: variant.stock,
              stockAfter: nextStock,
              relatedOrderId: order.id,
              unitCost: item.unitCost,
              notes: `Pago Mercado Pago aprobado para ${order.orderNumber}.`,
            },
          });
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: mapped.orderStatus,
          paymentStatus: mapped.paymentStatus,
          paidAt: mapped.paymentStatus === "APPROVED" ? new Date() : order.paidAt,
        },
      });

      await tx.mercadoPagoWebhookEvent.update({
        where: { id: event.id },
        data: { orderId: order.id, processedAt: new Date(), processingError: null },
      });
    });

    return { status: "processed" as const };
  } catch (error) {
    await prisma.mercadoPagoWebhookEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date(), processingError: error instanceof Error ? error.message : "Error desconocido" },
    });

    throw error;
  }
}