import "server-only";

import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

function requireEnv(key: string) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`[mercadopago] Missing required environment variable: ${key}`);
  }

  return value;
}

let cachedClient: MercadoPagoConfig | null = null;

export function getMercadoPagoClient() {
  if (!cachedClient) {
    cachedClient = new MercadoPagoConfig({
      accessToken: requireEnv("MERCADO_PAGO_ACCESS_TOKEN"),
      options: {
        timeout: 5000,
      },
    });
  }

  return cachedClient;
}

export function getMercadoPagoPreferenceClient() {
  return new Preference(getMercadoPagoClient());
}

export function getMercadoPagoPaymentClient() {
  return new Payment(getMercadoPagoClient());
}

export function getMercadoPagoBackUrls() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    success: process.env.MERCADO_PAGO_SUCCESS_URL ?? `${appUrl}/checkout/success`,
    failure: process.env.MERCADO_PAGO_FAILURE_URL ?? `${appUrl}/checkout/failure`,
    pending: process.env.MERCADO_PAGO_PENDING_URL ?? `${appUrl}/checkout/pending`,
  };
}

export function getMercadoPagoNotificationUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return `${appUrl}/api/webhooks/mercadopago`;
}