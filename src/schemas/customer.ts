import { z } from "zod";

export const customerCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .min(8)
    .max(24)
    .regex(/^[+\d\s()-]+$/u, "Teléfono inválido"),
  email: z.string().trim().email().optional().or(z.literal("")),
  document: z.string().trim().max(30).optional().or(z.literal("")),
  creditLimitCents: z.number().int().min(0).max(100_000_000),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const debtPaymentSchema = z.object({
  customerId: z.string().min(1),
  amountCents: z.number().int().min(1).max(100_000_000),
  method: z.enum(["CASH", "TRANSFER"]),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type DebtPaymentInput = z.infer<typeof debtPaymentSchema>;