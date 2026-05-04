import { createClient } from "@supabase/supabase-js";

import { getCatalogProducts, getCategories, type CatalogProduct, type CatalogCategory } from "@/lib/catalog";

function isDatabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("change-me"),
  );
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

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
    const supabase = getSupabaseAdmin();
    const { data: products, error } = await supabase
      .from("Product")
      .select(
        `id, slug, name, description, kind, priceCents, stock, featured, status, sku, createdAt, updatedAt, categoryId,
         category:Category(id, name, slug),
         images:ProductImage(url, alt, publicId, sortOrder)`,
      )
      .order("updatedAt", { ascending: false })
      .order("createdAt", { ascending: false });

    if (error || !products || products.length === 0) return [];

    return products.map((product) => {
      const category = Array.isArray(product.category) ? product.category[0] : product.category;
      const images = ((product.images as { url: string; alt: string | null; publicId: string | null; sortOrder: number }[]) ?? [])
        .sort((a, b) => a.sortOrder - b.sortOrder);
      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        kind: product.kind as AdminProductKind,
        category: { name: category?.name ?? "", slug: category?.slug ?? "" },
        categoryId: product.categoryId,
        priceCents: product.priceCents,
        stock: product.stock,
        featured: product.featured,
        image: images[0]?.url ?? fallback[0]?.image ?? "",
        imageAlt: images[0]?.alt ?? product.name,
        imagePublicId: images[0]?.publicId ?? null,
        sku: product.sku,
        status: product.status as AdminProductStatus,
        createdAt: new Date(product.createdAt),
        updatedAt: new Date(product.updatedAt),
        accent: fallback.find((item) => item.slug === product.slug)?.accent ?? fallback[0]?.accent ?? "from-[#f6d0c7] via-[#fff8f5] to-[#d9ece8]",
      };
    });
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
    const supabase = getSupabaseAdmin();
    const { data: categories, error } = await supabase
      .from("Category")
      .select(`id, name, slug, description, order, products:Product(id)`)
      .order("order", { ascending: true })
      .order("name", { ascending: true });

    if (error || !categories) return fallback;

    const mapped = categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? "Categoria administrable desde el panel.",
      productCount: Array.isArray(category.products) ? category.products.length : 0,
      order: category.order,
    }));

    return mapped.length > 0 ? mapped : fallback;
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
    const supabase = getSupabaseAdmin();
    const { data: banners, error } = await supabase
      .from("HeroBanner")
      .select("id, title, subtitle, ctaLabel, ctaHref, imageUrl, imagePublicId, order, active")
      .order("order", { ascending: true })
      .order("createdAt", { ascending: false });

    if (error || !banners) return [];
    return banners as AdminBanner[];
  } catch {
    return [];
  }
}
