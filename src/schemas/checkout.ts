import { z } from "zod";

export const checkoutCartItemSchema = z.object({
  id: z.string().min(1).max(80),
  productId: z.string().min(1).max(80).optional(),
  variantId: z.string().min(1).max(80).optional(),
  internalSku: z.string().min(1).max(120).optional(),
  variantLabel: z.string().min(1).max(160).optional(),
  name: z.string().min(1).max(180),
  priceCents: z.number().int().min(0).max(100_000_000),
  quantity: z.number().int().min(1).max(999),
});

export const checkoutShippingMethodSchema = z.enum(["PICKUP", "LOCAL_COURIER", "ANDREANI"]);

export const checkoutRequestSchema = z.object({
  customerName: z.string().trim().min(2, "Ingresá tu nombre").max(120),
  customerPhone: z
    .string()
    .trim()
    .min(8, "Ingresá un teléfono válido")
    .max(24)
    .regex(/^[+\d\s()-]+$/u, "Teléfono inválido"),
  customerEmail: z.string().trim().email("Email inválido").optional().or(z.literal("")),
  shippingMethod: checkoutShippingMethodSchema,
  street: z.string().trim().max(120).optional().or(z.literal("")),
  streetNumber: z.string().trim().max(20).optional().or(z.literal("")),
  apartment: z.string().trim().max(40).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  province: z.string().trim().max(80).optional().or(z.literal("")),
  postalCode: z.string().trim().max(12).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  items: z.array(checkoutCartItemSchema).min(1, "El carrito está vacío"),
});

export type CheckoutRequestInput = z.infer<typeof checkoutRequestSchema>;
export type CheckoutCartItemInput = z.infer<typeof checkoutCartItemSchema>;
export type CheckoutShippingMethod = z.infer<typeof checkoutShippingMethodSchema>;