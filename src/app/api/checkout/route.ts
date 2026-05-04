import { NextResponse } from "next/server";

import { isDatabaseConfigured, isMercadoPagoConfigured } from "@/lib/env";
import { logAndMaskError } from "@/lib/errors";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createCheckoutOrder, createMercadoPagoPreferenceForOrder } from "@/lib/services/checkout-service";
import { checkoutRequestSchema } from "@/schemas/checkout";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limit = rateLimit({ key: `checkout:${getClientIp(request)}`, limit: 15, windowMs: 60_000 });
  if (!limit.success) {
    return rateLimitResponse(limit);
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "La base de datos no está configurada." }, { status: 503 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = checkoutRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Revisá los datos del checkout.", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const order = await createCheckoutOrder(parsed.data);
    const preference = isMercadoPagoConfigured()
      ? await createMercadoPagoPreferenceForOrder(order.id)
      : { id: null, initPoint: null, sandboxInitPoint: null };

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      preferenceId: preference.id,
      initPoint: preference.initPoint ?? preference.sandboxInitPoint,
      paymentConfigured: isMercadoPagoConfigured(),
    });
  } catch (error) {
    const masked = logAndMaskError("checkout", error, "No fue posible crear el pedido.");
    return NextResponse.json({ error: `${masked.message} (cod. ${masked.code})` }, { status: 500 });
  }
}