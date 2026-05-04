import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyFromCents(value: number, currency = process.env.NEXT_PUBLIC_CURRENCY ?? "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export function formatPriceRangeFromCents(minValue: number, maxValue: number, currency = process.env.NEXT_PUBLIC_CURRENCY ?? "ARS") {
  if (minValue === maxValue) {
    return formatCurrencyFromCents(minValue, currency);
  }

  return `${formatCurrencyFromCents(minValue, currency)} - ${formatCurrencyFromCents(maxValue, currency)}`;
}

export function sanitizeWhatsappNumber(value: string) {
  return value.replace(/\D/g, "");
}