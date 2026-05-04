import { NextResponse } from "next/server";

import { logAndMaskError } from "@/lib/errors";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import {
  getMercadoPagoResourceId,
  processMercadoPagoPaymentWebhook,
  verifyMercadoPagoSignature,
} from "@/lib/services/mercadopago-webhook-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limit = rateLimit({ key: `mp-webhook:${getClientIp(request)}`, limit: 120, windowMs: 60_000 });

  if (!limit.success) {
    return NextResponse.json({ ok: true });
  }

  const url = new URL(request.url);
  const bodyText = await request.text();
  let payload: unknown = {};

  try {
    payload = bodyText ? (JSON.parse(bodyText) as unknown) : {};
  } catch {
    payload = {};
  }
  const resourceId = getMercadoPagoResourceId(payload, url);
  const requestId = request.headers.get("x-request-id");
  const signature = request.headers.get("x-signature");
  const signatureIsValid = verifyMercadoPagoSignature({
    resourceId,
    requestId,
    signatureHeader: signature,
    secret: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
  });

  try {
    if (!resourceId) {
      throw new Error("Webhook Mercado Pago sin data.id.");
    }

    if (!signatureIsValid) {
      throw new Error("Firma Mercado Pago inválida o no verificable.");
    }

    await processMercadoPagoPaymentWebhook({ payload, resourceId, signature });
  } catch (error) {
    logAndMaskError("mercadopago-webhook", error, "No fue posible procesar el webhook.");
  }

  return NextResponse.json({ ok: true });
}