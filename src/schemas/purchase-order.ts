import { z } from "zod";

export const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(100_000),
  unitCostCents: z.number().int().min(0).max(100_000_000),
});

export const purchaseOrderCreateSchema = z.object({
  supplierId: z.string().min(1),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  items: z.array(purchaseOrderItemSchema).min(1).max(500),
});

export const purchaseOrderReceiveSchema = z.object({
  purchaseOrderId: z.string().min(1),
});

export type PurchaseOrderCreateInput = z.infer<typeof purchaseOrderCreateSchema>;
export type PurchaseOrderItemInput = z.infer<typeof purchaseOrderItemSchema>;
