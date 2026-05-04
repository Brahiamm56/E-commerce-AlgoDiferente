import { sanitizeWhatsappNumber } from "@/lib/utils";

export const siteConfig = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  name: process.env.NEXT_PUBLIC_STORE_NAME ?? "Studio Catalog",
  description:
    process.env.NEXT_PUBLIC_STORE_DESCRIPTION ??
    "Catalogo moderno con checkout directo a WhatsApp",
  whatsappNumber: sanitizeWhatsappNumber(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "573001234567",
  ),
  currency: process.env.NEXT_PUBLIC_CURRENCY ?? "ARS",
};