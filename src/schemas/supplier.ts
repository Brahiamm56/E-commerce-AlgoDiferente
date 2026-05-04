import { z } from "zod";

export const supplierCreateSchema = z.object({
  name: z.string().trim().min(2).max(140),
  contactName: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().max(180).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type SupplierCreateInput = z.infer<typeof supplierCreateSchema>;