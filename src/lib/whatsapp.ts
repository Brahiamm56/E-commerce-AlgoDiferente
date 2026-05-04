import { siteConfig } from "@/lib/site-config";
import { formatCurrencyFromCents, sanitizeWhatsappNumber } from "@/lib/utils";

type WhatsappItem = {
  name: string;
  quantity: number;
  priceCents: number;
  variantLabel?: string;
  internalSku?: string;
};

export type CustomerDetails = {
  name: string;
  deliveryMethod: "envio" | "retiro";
  notes?: string;
};

export function buildWhatsappLink(
  items: WhatsappItem[],
  customerDetails?: CustomerDetails,
  phoneNumber = siteConfig.whatsappNumber,
  currency = siteConfig.currency,
) {
  const normalizedPhone = sanitizeWhatsappNumber(phoneNumber);
  const total = items.reduce((sum, item) => sum + item.quantity * item.priceCents, 0);
  const lines = items.map((item) => {
    const variantParts = [item.variantLabel, item.internalSku ? `SKU ${item.internalSku}` : null]
      .filter(Boolean)
      .join(" · ");
    const variantText = variantParts ? ` (${variantParts})` : "";

    return `• ${item.quantity}x ${item.name}${variantText} — ${formatCurrencyFromCents(item.quantity * item.priceCents, currency)}`;
  });

  const messageParts = [
    `Hola, quiero hacer este pedido en ${siteConfig.name}:`,
    "",
    ...lines,
    "",
    `*Total:* ${formatCurrencyFromCents(total, currency)}`,
  ];

  if (customerDetails) {
    messageParts.push("");
    messageParts.push("*Mis datos:*");
    messageParts.push(`Nombre: ${customerDetails.name}`);
    messageParts.push(`Entrega: ${customerDetails.deliveryMethod === "envio" ? "Envío a domicilio" : "Retiro en local"}`);
    if (customerDetails.notes) {
      messageParts.push(`Notas: ${customerDetails.notes}`);
    }
  }

  const message = messageParts.join("\n");

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}