import { z } from "zod";

export const productStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const productKindSchema = z.enum(["APPAREL", "FOOTWEAR"]);

const httpsImageUrl = z
  .string()
  .url()
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, { message: "La imagen debe servirse por HTTPS." });

export const productSchema = z.object({
  name: z.string().min(2).max(140),
  slug: z.string().min(2).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Usa minúsculas, números y guiones."),
  description: z.string().min(10).max(2000),
  kind: productKindSchema.default("APPAREL"),
  priceCents: z.coerce.number().int().positive().max(1_000_000_000),
  stock: z.coerce.number().int().min(0).max(1_000_000),
  categoryId: z.string().min(1).max(64),
  featured: z.coerce.boolean().default(false),
  imageUrl: httpsImageUrl.optional().or(z.literal("")),
  imageAlt: z.string().trim().max(120).optional().or(z.literal("")),
  imagePublicId: z.string().trim().max(255).optional().or(z.literal("")),
  sku: z.string().trim().max(64).optional().or(z.literal("")),
  status: productStatusSchema.default("PUBLISHED"),
});

export const productVariantDraftSchema = z.object({
  size: z.string().trim().min(1).max(24),
  colorName: z.string().trim().min(1).max(80),
  colorHex: z.string().trim().max(20).optional().or(z.literal("")),
  stock: z.coerce.number().int().min(0).max(1_000_000),
});

export const productVariantDraftsSchema = z
  .array(productVariantDraftSchema)
  .min(1, "Agregá al menos un talle para crear variantes.")
  .max(300, "Demasiadas variantes para un solo producto.")
  .superRefine((variants, context) => {
    const seen = new Set<string>();

    for (const variant of variants) {
      const key = `${variant.size.trim().toLowerCase()}::${variant.colorName.trim().toLowerCase()}`;

      if (seen.has(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `La variante ${variant.size} / ${variant.colorName} está repetida.`,
        });
        return;
      }

      seen.add(key);
    }
  });

export type ProductInput = z.infer<typeof productSchema>;
export type ProductKindInput = z.infer<typeof productKindSchema>;
export type ProductVariantDraftInput = z.infer<typeof productVariantDraftSchema>;