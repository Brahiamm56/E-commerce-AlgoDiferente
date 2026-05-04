import { getCatalogProducts, getCategories, type CatalogProduct, type CatalogCategory } from "@/lib/catalog";
import { isDatabaseConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export type AdminProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type AdminProductKind = "APPAREL" | "FOOTWEAR";

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: AdminProductKind;
  category: { name: string; slug: string };
  categoryId: string;
  priceCents: number;
  stock: number;
  featured: boolean;
  image: string;
  imageAlt: string;
  imagePublicId: string | null;
  sku: string | null;
  status: AdminProductStatus;
  createdAt: Date;
  updatedAt: Date;
  accent: string;
};

export type AdminCategory = CatalogCategory;

function mapFallbackProduct(product: CatalogProduct): AdminProduct {
  const now = new Date();
  return {
    ...product,
    kind: "APPAREL",
    categoryId: product.category.slug,
    imageAlt: product.name,
    imagePublicId: null,
    sku: null,
    status: "PUBLISHED",
    createdAt: now,
    updatedAt: now,
  };
}

export async function getAdminProducts() {
  const fallback = (await getCatalogProducts()).map(mapFallbackProduct);

  if (!isDatabaseConfigured()) {
    return fallback;
  }

  try {
    const products = await prisma.product.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          select: {
            alt: true,
            publicId: true,
            url: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
          take: 1,
        },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    return products.length > 0
      ? products.map((product) => ({
          id: product.id,
          slug: product.slug,
          name: product.name,
          description: product.description,
          kind: product.kind,
          category: {
            name: product.category.name,
            slug: product.category.slug,
          },
          categoryId: product.categoryId,
          priceCents: product.priceCents,
          stock: product.stock,
          featured: product.featured,
          image: product.images[0]?.url ?? fallback[0]?.image ?? "",
          imageAlt: product.images[0]?.alt ?? product.name,
          imagePublicId: product.images[0]?.publicId ?? null,
          sku: product.sku,
          status: product.status,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          accent: fallback.find((item) => item.slug === product.slug)?.accent ?? fallback[0]?.accent ?? "from-[#f6d0c7] via-[#fff8f5] to-[#d9ece8]",
        }))
      : [];
  } catch {
    return fallback;
  }
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  const fallback = await getCategories();

  if (!isDatabaseConfigured()) {
    return fallback;
  }

  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });

    return categories.length > 0
      ? categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description ?? "Categoria administrable desde el panel.",
          productCount: category._count.products,
          order: category.order,
        }))
      : fallback;
  } catch {
    return fallback;
  }
}

export type AdminBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string;
  imagePublicId: string | null;
  order: number;
  active: boolean;
};

export async function getAdminBanners(): Promise<AdminBanner[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    const banners = await prisma.heroBanner.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    return banners.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      ctaLabel: b.ctaLabel,
      ctaHref: b.ctaHref,
      imageUrl: b.imageUrl,
      imagePublicId: b.imagePublicId,
      order: b.order,
      active: b.active,
    }));
  } catch {
    return [];
  }
}
