import "server-only";

import { Prisma } from "@prisma/client";

import {
  getMercadoPagoBackUrls,
  getMercadoPagoNotificationUrl,
  getMercadoPagoPreferenceClient,
} from "@/lib/integrations/mercadopago";
import { prisma } from "@/lib/prisma";
import type { CheckoutRequestInput, CheckoutShippingMethod } from "@/schemas/checkout";

type CheckoutLine = {
  variantId: string;
  productId: string;
  name: string;
  variantLabel: string;
  internalSku: string;
  quantity: number;
  unitPriceCents: number;
  unitCostCents: number;
};

type ShippingQuote = {
  provider: CheckoutShippingMethod;
  label: string;
  costCents: number;
  requiresManualQuote: boolean;
};

type CheckoutVariant = Prisma.ProductVariantGetPayload<{
  include: { product: { select: { id: true; name: true } } };
}>;

function decimalToCents(value: Prisma.Decimal | number | string) {
  return Math.round(Number(value.toString()) * 100);
}

function centsToDecimal(value: number) {
  return new Prisma.Decimal(value).div(100);
}

function normalizedPhone(value: string) {
  return value.replace(/[^+\d]/g, "");
}

function buildOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `WEB-${stamp}-${suffix}`;
}

function getLocalCourierCostCents() {
  const raw = Number(process.env.LOCAL_COURIER_FIXED_COST ?? 0);

  if (!Number.isFinite(raw) || raw <= 0) {
    return 0;
  }

  return Math.round(raw * 100);
}

export function quoteCheckoutShipping(method: CheckoutShippingMethod): ShippingQuote {
  if (method === "PICKUP") {
    return { provider: method, label: "Retiro en local", costCents: 0, requiresManualQuote: false };
  }

  if (method === "LOCAL_COURIER") {
    return {
      provider: method,
      label: "Remis local",
      costCents: getLocalCourierCostCents(),
      requiresManualQuote: false,
    };
  }

  return {
    provider: method,
    label: "Andreani",
    costCents: 0,
    requiresManualQuote: true,
  };
}

function buildLines(input: CheckoutRequestInput, variants: CheckoutVariant[]) {
  const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
  const quantityByVariant = new Map<string, number>();

  for (const item of input.items) {
    const variantId = item.variantId ?? item.id;
    quantityByVariant.set(variantId, (quantityByVariant.get(variantId) ?? 0) + item.quantity);
  }

  const lines: CheckoutLine[] = [];

  for (const [variantId, quantity] of quantityByVariant) {
    const variant = variantMap.get(variantId);

    if (!variant) {
      throw new Error("Uno de los productos del carrito ya no está disponible.");
    }

    lines.push({
      variantId: variant.id,
      productId: variant.productId,
      name: variant.product.name,
      variantLabel: `${variant.size} / ${variant.colorName}`,
      internalSku: variant.internalSku,
      quantity,
      unitPriceCents: decimalToCents(variant.price),
      unitCostCents: decimalToCents(variant.cost),
    });
  }

  return lines;
}

export async function createCheckoutOrder(input: CheckoutRequestInput) {
  const variantIds = input.items.map((item) => item.variantId ?? item.id);
  const orderNumber = buildOrderNumber();
  const phone = normalizedPhone(input.customerPhone);
  const shippingQuote = quoteCheckoutShipping(input.shippingMethod);

  return prisma.$transaction(async (tx) => {
    const variants = await tx.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { select: { id: true, name: true } } },
    });
    const lines = buildLines(input, variants);
    const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
    const totalCents = subtotalCents + shippingQuote.costCents;

    const customer = await tx.customer.upsert({
      where: { phone },
      create: {
        name: input.customerName,
        phone,
        email: input.customerEmail || null,
      },
      update: {
        name: input.customerName,
        email: input.customerEmail || undefined,
      },
    });

    const address =
      input.shippingMethod === "PICKUP"
        ? null
        : await tx.customerAddress.create({
            data: {
              customerId: customer.id,
              recipientName: input.customerName,
              phone,
              street: input.street || "A coordinar",
              streetNumber: input.streetNumber || null,
              apartment: input.apartment || null,
              city: input.city || "A coordinar",
              province: input.province || "A coordinar",
              postalCode: input.postalCode || "",
              notes: input.notes || null,
            },
          });

    return tx.order.create({
      data: {
        orderNumber,
        externalReference: orderNumber,
        channel: "WEB",
        status: "PENDING_PAYMENT",
        paymentStatus: "PENDING",
        customerId: customer.id,
        shippingAddressId: address?.id ?? null,
        customerName: input.customerName,
        customerPhone: phone,
        customerEmail: input.customerEmail || null,
        subtotal: centsToDecimal(subtotalCents),
        shippingTotal: centsToDecimal(shippingQuote.costCents),
        total: centsToDecimal(totalCents),
        currency: process.env.NEXT_PUBLIC_CURRENCY ?? "ARS",
        shippingPostalCode: input.postalCode || null,
        notes: input.notes || null,
        items: {
          create: lines.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            name: line.name,
            variantLabel: line.variantLabel,
            internalSku: line.internalSku,
            quantity: line.quantity,
            unitPrice: centsToDecimal(line.unitPriceCents),
            unitCost: centsToDecimal(line.unitCostCents),
            total: centsToDecimal(line.unitPriceCents * line.quantity),
          })),
        },
        payments: {
          create: {
            customerId: customer.id,
            method: "MERCADO_PAGO",
            provider: "MERCADO_PAGO",
            status: "PENDING",
            amount: centsToDecimal(totalCents),
            currency: process.env.NEXT_PUBLIC_CURRENCY ?? "ARS",
            externalReference: orderNumber,
          },
        },
        shipments: {
          create: {
            provider: shippingQuote.provider,
            status: "QUOTED",
            quotedCost: centsToDecimal(shippingQuote.costCents),
            chargedCost: centsToDecimal(shippingQuote.costCents),
            postalCode: input.postalCode || null,
            city: input.city || null,
            addressLine: [input.street, input.streetNumber, input.apartment].filter(Boolean).join(" ") || null,
            providerPayload: {
              label: shippingQuote.label,
              requiresManualQuote: shippingQuote.requiresManualQuote,
              note:
                shippingQuote.provider === "ANDREANI"
                  ? "Verificar cotización y etiqueta contra la documentación oficial de Andreani antes de producción."
                  : undefined,
            },
          },
        },
      },
      include: {
        items: true,
        payments: true,
        shipments: true,
      },
    });
  });
}

export async function createMercadoPagoPreferenceForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      shipments: true,
    },
  });

  if (!order) {
    throw new Error("Pedido no encontrado.");
  }

  const preference = await getMercadoPagoPreferenceClient().create({
    body: {
      items: order.items.map((item) => ({
        id: item.variantId ?? item.productId,
        title: item.variantLabel ? `${item.name} - ${item.variantLabel}` : item.name,
        quantity: item.quantity,
        currency_id: order.currency,
        unit_price: Number(item.unitPrice),
      })),
      shipments: {
        cost: Number(order.shippingTotal),
        local_pickup: order.shipments[0]?.provider === "PICKUP",
      },
      external_reference: order.externalReference ?? order.orderNumber,
      back_urls: getMercadoPagoBackUrls(),
      notification_url: getMercadoPagoNotificationUrl(),
      auto_return: "approved",
      metadata: {
        order_id: order.id,
        order_number: order.orderNumber,
      },
      payer: {
        name: order.customerName,
        email: order.customerEmail ?? undefined,
      },
    },
  });

  return {
    id: preference.id ?? null,
    initPoint: preference.init_point ?? null,
    sandboxInitPoint: preference.sandbox_init_point ?? null,
  };
}