import { z } from "zod";

export const posPaymentMethodSchema = z.enum(["CASH", "TRANSFER", "CREDIT_CARD", "CURRENT_ACCOUNT"]);

export const posLineSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(999),
});

export const posSaleSchema = z.object({
  customerId: z.string().min(1).optional().or(z.literal("")),
  paymentMethod: posPaymentMethodSchema,
  amountReceivedCents: z.number().int().min(0).optional().default(0),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  items: z.array(posLineSchema).min(1, "Agregá al menos un producto"),
});

export const cashSessionOpenSchema = z.object({
  openingAmountCents: z.number().int().min(0).max(100_000_000),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export const cashSessionCloseSchema = z.object({
  sessionId: z.string().min(1),
  closingAmountCents: z.number().int().min(0).max(100_000_000),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export type PosSaleInput = z.infer<typeof posSaleSchema>;
export type PosPaymentMethod = z.infer<typeof posPaymentMethodSchema>;