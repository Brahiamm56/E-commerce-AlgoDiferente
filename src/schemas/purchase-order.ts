import { z } from "zod";

export const purchaseOrderCreateSchema = z.object({
  supplierId: z.string().min(1),
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(100_000),
  unitCostCents: z.number().int().min(0).max(100_000_000),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const purchaseOrderReceiveSchema = z.object({
  purchaseOrderId: z.string().min(1),
});

export type PurchaseOrderCreateInput = z.infer<typeof purchaseOrderCreateSchema>;