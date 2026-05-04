"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import type { AdminFormState } from "@/actions/admin-state";
import { requireAdminSession } from "@/lib/admin";
import { cloudinary } from "@/lib/cloudinary";
import { isCloudinaryConfigured, isDatabaseConfigured } from "@/lib/env";
import { logAndMaskError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { sanitizeWhatsappNumber } from "@/lib/utils";
import { categorySchema } from "@/schemas/category";
import { productSchema, productVariantDraftsSchema } from "@/schemas/product";
import { storeSettingsSchema } from "@/schemas/settings";
import { bannerSchema } from "@/schemas/banner";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function buildErrorState(message: string, fieldErrors?: Record<string, string[] | undefined>): AdminFormState {
  return {
    fieldErrors,
    message,
    submissionKey: Date.now(),
    status: "error",
  };
}

function buildSuccessState(message: string): AdminFormState {
  return {
    message,
    submissionKey: Date.now(),
    status: "success",
  };
}

function ensureDatabaseReady() {
  if (!isDatabaseConfigured()) {
    return buildErrorState("Configura una DATABASE_URL real antes de guardar cambios persistentes.");
  }

  return null;
}

function revalidateAdminRoutes(productSlug?: string) {
  revalidatePath("/");
  revalidatePath("/productos");
  revalidatePath("/admin");
  revalidatePath("/admin/productos");
  revalidatePath("/admin/categorias");
  revalidatePath("/admin/ajustes");
  revalidatePath("/admin/banners");

  if (productSlug) {
    revalidatePath(`/productos/${productSlug}`);
  }
}

function mapPrismaError(error: unknown, fallbackMessage: string) {
  const masked = logAndMaskError("admin-action", error, fallbackMessage);
  return buildErrorState(`${masked.message} (cod. ${masked.code})`);
}

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s]+/g, "-");
}

function centsToDecimal(value: number) {
  return new Prisma.Decimal(value).div(100);
}

function normalizeSkuPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function buildVariantSku(args: { colorName: string; productSku: string | null; size: string; slug: string }) {
  const base = normalizeSkuPart(args.productSku || args.slug) || "PRODUCTO";
  const size = normalizeSkuPart(args.size) || "TALLE";
  const color = normalizeSkuPart(args.colorName) || "COLOR";

  return `${base}-${size}-${color}`.slice(0, 120);
}

export async function createCategoryQuickAction(_: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdminSession();

  const databaseError = ensureDatabaseReady();

  if (databaseError) {
    return databaseError;
  }

  const name = getString(formData, "name").trim();

  if (name.length < 2) {
    return buildErrorState("El nombre debe tener al menos 2 caracteres.", { name: ["Mínimo 2 caracteres."] });
  }

  const slug = toSlug(name);

  try {
    const category = await prisma.category.create({
      data: { name, slug, order: 0 },
    });

    revalidateAdminRoutes();

    return {
      data: {
        description: category.description ?? "Categoria administrable desde el panel.",
        id: category.id,
        name: category.name,
        order: category.order,
        productCount: 0,
        slug: category.slug,
      },
      message: "Categoría creada.",
      status: "success",
    };
  } catch (error) {
    return mapPrismaError(error, "No fue posible crear la categoría.");
  }
}

function getProductPayload(formData: FormData) {
  const price = Number(getString(formData, "price"));
  const name = getString(formData, "name");
  const slugFromForm = getString(formData, "slug");

  return {
    categoryId: getString(formData, "categoryId"),
    description: getString(formData, "description"),
    featured: formData.get("featured") === "on",
    imageAlt: getString(formData, "imageAlt"),
    imagePublicId: getString(formData, "imagePublicId"),
    imageUrl: getString(formData, "imageUrl"),
    kind: getString(formData, "kind") || "APPAREL",
    name,
    priceCents: Number.isFinite(price) ? Math.round(price * 100) : Number.NaN,
    sku: getString(formData, "sku"),
    slug: slugFromForm || toSlug(name),
    status: getString(formData, "status") || "PUBLISHED",
    stock: Number(getString(formData, "stock")),
  };
}

function getProductVariantsPayload(formData: FormData, fallbackStock: number) {
  const rawVariants = getString(formData, "variants");

  if (!rawVariants) {
    return [{ colorHex: "", colorName: "Sin color", size: "UNICO", stock: fallbackStock }];
  }

  try {
    const parsed = JSON.parse(rawVariants) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    return [];
  }

  return [];
}

async function syncProductImage(args: {
  imageAlt: string;
  imagePublicId: string;
  imageUrl: string;
  productId: string;
}) {
  const existingImage = await prisma.productImage.findFirst({
    where: { productId: args.productId },
    orderBy: { sortOrder: "asc" },
  });

  if (!args.imageUrl) {
    if (existingImage) {
      await prisma.productImage.delete({
        where: { id: existingImage.id },
      });

      if (existingImage.publicId && isCloudinaryConfigured()) {
        await cloudinary.uploader.destroy(existingImage.publicId).catch(() => null);
      }
    }

    return;
  }

  if (existingImage) {
    const previousPublicId = existingImage.publicId;

    await prisma.productImage.update({
      where: { id: existingImage.id },
      data: {
        alt: args.imageAlt || null,
        publicId: args.imagePublicId || null,
        url: args.imageUrl,
      },
    });

    if (
      previousPublicId &&
      previousPublicId !== args.imagePublicId &&
      isCloudinaryConfigured()
    ) {
      await cloudinary.uploader.destroy(previousPublicId).catch(() => null);
    }

    return;
  }

  await prisma.productImage.create({
    data: {
      alt: args.imageAlt || null,
      productId: args.productId,
      publicId: args.imagePublicId || null,
      sortOrder: 1,
      url: args.imageUrl,
    },
  });
}

export async function createProductAction(_: AdminFormState, formData: FormData) {
  await requireAdminSession();

  const databaseError = ensureDatabaseReady();

  if (databaseError) {
    return databaseError;
  }

  const parsed = productSchema.safeParse(getProductPayload(formData));

  if (!parsed.success) {
    return buildErrorState(
      "Revisa los campos del producto antes de guardarlo.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const variants = productVariantDraftsSchema.safeParse(
    getProductVariantsPayload(formData, parsed.data.stock),
  );

  if (!variants.success) {
    return buildErrorState("Revisa los talles, colores y stock antes de guardar.", {
      variants: variants.error.issues.map((issue) => issue.message),
    });
  }

  try {
    const product = await prisma.$transaction(async (tx) => {
      const aggregateStock = variants.data.reduce((sum, variant) => sum + variant.stock, 0);
      const createdProduct = await tx.product.create({
        data: {
          categoryId: parsed.data.categoryId,
          description: parsed.data.description,
          featured: parsed.data.featured,
          kind: parsed.data.kind,
          name: parsed.data.name,
          priceCents: parsed.data.priceCents,
          sku: parsed.data.sku || null,
          slug: parsed.data.slug,
          status: parsed.data.status,
          stock: aggregateStock,
        },
      });

      for (const variant of variants.data) {
        const createdVariant = await tx.productVariant.create({
          data: {
            active: parsed.data.status === "PUBLISHED",
            colorHex: variant.colorHex || null,
            colorName: variant.colorName,
            cost: centsToDecimal(0),
            internalSku: buildVariantSku({
              colorName: variant.colorName,
              productSku: parsed.data.sku || null,
              size: variant.size,
              slug: parsed.data.slug,
            }),
            price: centsToDecimal(parsed.data.priceCents),
            productId: createdProduct.id,
            size: variant.size,
            stock: variant.stock,
          },
        });

        if (variant.stock !== 0) {
          await tx.stockMovement.create({
            data: {
              productId: createdProduct.id,
              quantity: variant.stock,
              stockAfter: variant.stock,
              stockBefore: 0,
              type: "INITIAL",
              variantId: createdVariant.id,
              notes: "Stock inicial cargado desde alta de producto.",
            },
          });
        }
      }

      return createdProduct;
    });

    await syncProductImage({
      imageAlt: parsed.data.imageAlt || parsed.data.name,
      imagePublicId: parsed.data.imagePublicId || "",
      imageUrl: parsed.data.imageUrl || "",
      productId: product.id,
    });

    revalidateAdminRoutes(product.slug);
    return buildSuccessState("Producto creado correctamente.");
  } catch (error) {
    return mapPrismaError(error, "No fue posible crear el producto.");
  }
}

export async function updateProductAction(_: AdminFormState, formData: FormData) {
  await requireAdminSession();

  const databaseError = ensureDatabaseReady();

  if (databaseError) {
    return databaseError;
  }

  const productId = getString(formData, "productId");

  if (!productId) {
    return buildErrorState("No se encontro el producto a actualizar.");
  }

  const parsed = productSchema.safeParse(getProductPayload(formData));

  if (!parsed.success) {
    return buildErrorState(
      "Revisa los campos del producto antes de actualizarlo.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        categoryId: parsed.data.categoryId,
        description: parsed.data.description,
        featured: parsed.data.featured,
        kind: parsed.data.kind,
        name: parsed.data.name,
        priceCents: parsed.data.priceCents,
        sku: parsed.data.sku || null,
        slug: parsed.data.slug,
        status: parsed.data.status,
        stock: parsed.data.stock,
      },
    });

    await syncProductImage({
      imageAlt: parsed.data.imageAlt || parsed.data.name,
      imagePublicId: parsed.data.imagePublicId || "",
      imageUrl: parsed.data.imageUrl || "",
      productId,
    });

    revalidateAdminRoutes(product.slug);
    return buildSuccessState("Producto actualizado.");
  } catch (error) {
    return mapPrismaError(error, "No fue posible actualizar el producto.");
  }
}

export async function updateProductStockAction(_: AdminFormState, formData: FormData) {
  await requireAdminSession();

  const databaseError = ensureDatabaseReady();

  if (databaseError) {
    return databaseError;
  }

  const productId = getString(formData, "productId");
  const delta = Number(getString(formData, "delta"));

  if (!productId) {
    return buildErrorState("No se encontro el producto para ajustar stock.");
  }

  if (!Number.isInteger(delta) || delta === 0) {
    return buildErrorState("No se recibio un ajuste de stock valido.");
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        slug: true,
        stock: true,
      },
    });

    if (!product) {
      return buildErrorState("El producto ya no existe o fue eliminado.");
    }

    const nextStock = Math.max(0, product.stock + delta);

    await prisma.product.update({
      where: { id: productId },
      data: {
        stock: nextStock,
      },
    });

    revalidateAdminRoutes(product.slug);

    if (nextStock === product.stock) {
      return buildSuccessState(`${product.name} ya estaba sin stock.`);
    }

    return buildSuccessState(`Stock de ${product.name} actualizado a ${nextStock} unidades.`);
  } catch (error) {
    return mapPrismaError(error, "No fue posible ajustar el stock.");
  }
}

export async function deleteProductAction(_: AdminFormState, formData: FormData) {
  await requireAdminSession();

  const databaseError = ensureDatabaseReady();

  if (databaseError) {
    return databaseError;
  }

  const productId = getString(formData, "productId");

  if (!productId) {
    return buildErrorState("No se encontro el producto a eliminar.");
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: {
          select: {
            publicId: true,
          },
        },
      },
    });

    if (!product) {
      return buildErrorState("El producto ya no existe o fue eliminado previamente.");
    }

    // Eliminar dependencias con onDelete: Restrict antes de borrar el producto.
    // Se usa una transacción para garantizar consistencia.
    await prisma.$transaction(async (tx) => {
      // Obtener IDs de variantes del producto
      const variants = await tx.productVariant.findMany({
        where: { productId },
        select: { id: true },
      });
      const variantIds = variants.map((v) => v.id);

      // 1. Eliminar movimientos de stock (Restrict en productId y variantId)
      await tx.stockMovement.deleteMany({ where: { productId } });

      // 2. Eliminar items de órdenes de compra que referencian las variantes (Restrict)
      if (variantIds.length > 0) {
        await tx.purchaseOrderItem.deleteMany({ where: { variantId: { in: variantIds } } });
      }

      // 3. Eliminar items de pedidos web (OrderItem.productId es Restrict y no nullable)
      await tx.orderItem.deleteMany({ where: { productId } });

      // 4. Borrar el producto; las variantes e imágenes se eliminan por Cascade
      await tx.product.delete({ where: { id: productId } });
    });

    if (isCloudinaryConfigured()) {
      await Promise.all(
        product.images
          .map((image) => image.publicId)
          .filter((value): value is string => Boolean(value))
          .map((publicId) => cloudinary.uploader.destroy(publicId).catch(() => null)),
      );
    }

    revalidateAdminRoutes(product.slug);
    return buildSuccessState("Producto eliminado.");
  } catch (error) {
    return mapPrismaError(error, "No fue posible eliminar el producto.");
  }
}

export async function createCategoryAction(_: AdminFormState, formData: FormData) {
  await requireAdminSession();

  const databaseError = ensureDatabaseReady();

  if (databaseError) {
    return databaseError;
  }

  const parsed = categorySchema.safeParse({
    description: getString(formData, "description"),
    name: getString(formData, "name"),
    order: Number(getString(formData, "order")),
    slug: getString(formData, "slug"),
  });

  if (!parsed.success) {
    return buildErrorState(
      "Revisa los datos de la categoria antes de guardarla.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    await prisma.category.create({
      data: parsed.data,
    });

    revalidateAdminRoutes();
    return buildSuccessState("Categoria creada.");
  } catch (error) {
    return mapPrismaError(error, "No fue posible crear la categoria.");
  }
}

export async function updateCategoryAction(_: AdminFormState, formData: FormData) {
  await requireAdminSession();

  const databaseError = ensureDatabaseReady();

  if (databaseError) {
    return databaseError;
  }

  const categoryId = getString(formData, "categoryId");

  if (!categoryId) {
    return buildErrorState("No se encontro la categoria a actualizar.");
  }

  const parsed = categorySchema.safeParse({
    description: getString(formData, "description"),
    name: getString(formData, "name"),
    order: Number(getString(formData, "order")),
    slug: getString(formData, "slug"),
  });

  if (!parsed.success) {
    return buildErrorState(
      "Revisa los datos de la categoria antes de actualizarla.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    await prisma.category.update({
      where: { id: categoryId },
      data: parsed.data,
    });

    revalidateAdminRoutes();
    return buildSuccessState("Categoria actualizada.");
  } catch (error) {
    return mapPrismaError(error, "No fue posible actualizar la categoria.");
  }
}

export async function deleteCategoryAction(_: AdminFormState, formData: FormData) {
  await requireAdminSession();

  const databaseError = ensureDatabaseReady();

  if (databaseError) {
    return databaseError;
  }

  const categoryId = getString(formData, "categoryId");

  if (!categoryId) {
    return buildErrorState("No se encontro la categoria a eliminar.");
  }

  try {
    const productCount = await prisma.product.count({
      where: { categoryId },
    });

    if (productCount > 0) {
      return buildErrorState("No puedes eliminar una categoria con productos asociados.");
    }

    await prisma.category.delete({
      where: { id: categoryId },
    });

    revalidateAdminRoutes();
    return buildSuccessState("Categoria eliminada.");
  } catch (error) {
    return mapPrismaError(error, "No fue posible eliminar la categoria.");
  }
}

export async function updateStoreSettingsAction(_: AdminFormState, formData: FormData) {
  await requireAdminSession();

  const databaseError = ensureDatabaseReady();

  if (databaseError) {
    return databaseError;
  }

  const rawAccent = getString(formData, "themeAccent").trim();
  const rawAccentStrong = getString(formData, "themeAccentStrong").trim();
  const rawLogoUrl = getString(formData, "logoUrl").trim();
  const rawLogoPublicId = getString(formData, "logoPublicId").trim();

  // Parse business hours from form
  const rawBusinessHours = getString(formData, "businessHours").trim();
  let businessHours: { day: string; open: string; close: string; closed?: boolean }[] | undefined;
  if (rawBusinessHours) {
    try {
      businessHours = JSON.parse(rawBusinessHours);
    } catch {
      businessHours = undefined;
    }
  }

  // Parse location
  const rawLocationAddress = getString(formData, "locationAddress").trim();
  const rawLocationLat = getString(formData, "locationLat").trim();
  const rawLocationLng = getString(formData, "locationLng").trim();

  const rawSocialFacebook = getString(formData, "socialFacebook").trim();
  const rawSocialInstagram = getString(formData, "socialInstagram").trim();
  const rawFreeShippingThreshold = getString(formData, "freeShippingThreshold").trim();

  // Parse theme design tokens
  const rawThemeBg = getString(formData, "themeBackground").trim();
  const rawCardBg = getString(formData, "themeCardBg").trim();
  const rawCardBorder = getString(formData, "themeCardBorder").trim();
  const rawCardRadius = getString(formData, "themeCardRadius").trim();
  const rawButtonRadius = getString(formData, "themeButtonRadius").trim();

  const parsed = storeSettingsSchema.safeParse({
    currency: getString(formData, "currency").toUpperCase(),
    description: getString(formData, "description"),
    name: getString(formData, "name"),
    whatsappNumber: sanitizeWhatsappNumber(getString(formData, "whatsappNumber")),
    logoUrl: rawLogoUrl || undefined,
    logoPublicId: rawLogoPublicId || undefined,
    themeAccent: rawAccent || undefined,
    themeAccentStrong: rawAccentStrong || undefined,
    themeBackground: rawThemeBg || undefined,
    themeCardBg: rawCardBg || undefined,
    themeCardBorder: rawCardBorder || undefined,
    themeCardRadius: rawCardRadius || undefined,
    themeButtonRadius: rawButtonRadius || undefined,
    businessHours: businessHours || undefined,
    locationAddress: rawLocationAddress || undefined,
    locationLat: rawLocationLat ? Number(rawLocationLat) : undefined,
    locationLng: rawLocationLng ? Number(rawLocationLng) : undefined,
    socialFacebook: rawSocialFacebook || undefined,
    socialInstagram: rawSocialInstagram || undefined,
    freeShippingThresholdCents: rawFreeShippingThreshold
      ? Math.round(Number(rawFreeShippingThreshold) * 100)
      : undefined,
  });

  if (!parsed.success) {
    return buildErrorState(
      "Revisa los ajustes de la tienda antes de guardarlos.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    await prisma.setting.upsert({
      where: { key: "store" },
      update: { value: parsed.data },
      create: {
        key: "store",
        value: parsed.data,
      },
    });

    revalidateAdminRoutes();
    return buildSuccessState("Ajustes actualizados.");
  } catch (error) {
    return mapPrismaError(error, "No fue posible guardar los ajustes.");
  }
}

function getBannerPayload(formData: FormData) {
  return {
    title: getString(formData, "title"),
    subtitle: getString(formData, "subtitle"),
    ctaLabel: getString(formData, "ctaLabel"),
    ctaHref: getString(formData, "ctaHref"),
    imageUrl: getString(formData, "imageUrl"),
    imagePublicId: getString(formData, "imagePublicId"),
    order: Number(getString(formData, "order")) || 0,
    active: formData.get("active") === "on",
  };
}

export async function createBannerAction(_: AdminFormState, formData: FormData) {
  await requireAdminSession();
  const databaseError = ensureDatabaseReady();
  if (databaseError) return databaseError;

  const parsed = bannerSchema.safeParse(getBannerPayload(formData));
  if (!parsed.success) {
    return buildErrorState("Revisa los datos del banner.", parsed.error.flatten().fieldErrors);
  }

  try {
    await prisma.heroBanner.create({
      data: {
        title: parsed.data.title,
        subtitle: parsed.data.subtitle || null,
        ctaLabel: parsed.data.ctaLabel || null,
        ctaHref: parsed.data.ctaHref || null,
        imageUrl: parsed.data.imageUrl,
        imagePublicId: parsed.data.imagePublicId || null,
        order: parsed.data.order,
        active: parsed.data.active,
      },
    });
    revalidateAdminRoutes();
    return buildSuccessState("Banner creado.");
  } catch (error) {
    return mapPrismaError(error, "No fue posible crear el banner.");
  }
}

export async function updateBannerAction(_: AdminFormState, formData: FormData) {
  await requireAdminSession();
  const databaseError = ensureDatabaseReady();
  if (databaseError) return databaseError;

  const bannerId = getString(formData, "bannerId");
  if (!bannerId) return buildErrorState("No se encontro el banner a actualizar.");

  const parsed = bannerSchema.safeParse(getBannerPayload(formData));
  if (!parsed.success) {
    return buildErrorState("Revisa los datos del banner.", parsed.error.flatten().fieldErrors);
  }

  try {
    await prisma.heroBanner.update({
      where: { id: bannerId },
      data: {
        title: parsed.data.title,
        subtitle: parsed.data.subtitle || null,
        ctaLabel: parsed.data.ctaLabel || null,
        ctaHref: parsed.data.ctaHref || null,
        imageUrl: parsed.data.imageUrl,
        imagePublicId: parsed.data.imagePublicId || null,
        order: parsed.data.order,
        active: parsed.data.active,
      },
    });
    revalidateAdminRoutes();
    return buildSuccessState("Banner actualizado.");
  } catch (error) {
    return mapPrismaError(error, "No fue posible actualizar el banner.");
  }
}

export async function deleteBannerAction(_: AdminFormState, formData: FormData) {
  await requireAdminSession();
  const databaseError = ensureDatabaseReady();
  if (databaseError) return databaseError;

  const bannerId = getString(formData, "bannerId");
  if (!bannerId) return buildErrorState("No se encontro el banner a eliminar.");

  try {
    await prisma.heroBanner.delete({ where: { id: bannerId } });
    revalidateAdminRoutes();
    return buildSuccessState("Banner eliminado.");
  } catch (error) {
    return mapPrismaError(error, "No fue posible eliminar el banner.");
  }
}
