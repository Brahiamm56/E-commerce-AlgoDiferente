import { z } from "zod";

export const variantStockUpdateSchema = z.object({
  variantId: z.string().min(1),
  stock: z.number().int().min(-100_000).max(100_000),
  cost: z.number().min(0).max(100_000_000),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export type VariantStockUpdateInput = z.infer<typeof variantStockUpdateSchema>;