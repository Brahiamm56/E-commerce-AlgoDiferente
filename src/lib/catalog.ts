import { createClient } from "@supabase/supabase-js";

import { siteConfig } from "@/lib/site-config";
import { storeSettingsSchema, type StoreSettings } from "@/schemas/settings";

// Use the Supabase REST API (HTTPS) for all catalog reads.
// Supabase free tier direct connections are IPv6-only and unreachable from
// Vercel serverless functions. The REST API works over HTTPS from all environments.
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function isDatabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("change-me"),
  );
}

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: {
    name: string;
    slug: string;
  };
  priceCents: number;
  minPriceCents: number;
  maxPriceCents: number;
  stock: number;
  featured: boolean;
  image: string;
  images?: { url: string; alt: string }[];
  accent: string;
  isNew?: boolean;
  variantCount: number;
  defaultVariant: CatalogVariant | null;
  variants: CatalogVariant[];
};

export type CatalogVariant = {
  id: string;
  internalSku: string;
  size: string;
  colorName: string;
  colorHex: string | null;
  priceCents: number;
  stock: number;
  stockReserved: number;
  availableStock: number;
  label: string;
};

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  productCount: number;
  order: number;
};

const demoProducts: CatalogProduct[] = [
  {
    id: "camisa-atelier",
    slug: "camisa-atelier",
    name: "Camisa Atelier",
    description: "Silueta limpia, textura premium y narrativa visual lista para vender por WhatsApp.",
    category: { name: "Nuevos ingresos", slug: "nuevos-ingresos" },
    priceCents: 129900,
    stock: 8,
    minPriceCents: 129900,
    maxPriceCents: 129900,
    featured: true,
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
    accent: "from-[#f6d0c7] via-[#fff8f5] to-[#d9ece8]",
    variantCount: 1,
    defaultVariant: {
      id: "camisa-atelier-unico",
      internalSku: "CAMISA-ATELIER-UNICO",
      size: "UNICO",
      colorName: "Crudo",
      colorHex: "#F4EEE6",
      priceCents: 129900,
      stock: 8,
      stockReserved: 0,
      availableStock: 8,
      label: "UNICO / Crudo",
    },
    variants: [],
  },
  {
    id: "chaqueta-prisma",
    slug: "chaqueta-prisma",
    name: "Chaqueta Prisma",
    description: "Una pieza editorial para tiendas que quieren verse modernas sin caer en lo generico.",
    category: { name: "Edicion limitada", slug: "edicion-limitada" },
    priceCents: 249900,
    stock: 4,
    minPriceCents: 249900,
    maxPriceCents: 249900,
    featured: true,
    image:
      "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1200&q=80",
    accent: "from-[#d7dfc8] via-[#f8f6ef] to-[#f4c6bb]",
    variantCount: 1,
    defaultVariant: {
      id: "chaqueta-prisma-unico",
      internalSku: "CHAQUETA-PRISMA-UNICO",
      size: "UNICO",
      colorName: "Verde",
      colorHex: "#73806A",
      priceCents: 249900,
      stock: 4,
      stockReserved: 0,
      availableStock: 4,
      label: "UNICO / Verde",
    },
    variants: [],
  },
  {
    id: "bolso-elemental",
    slug: "bolso-elemental",
    name: "Bolso Elemental",
    description: "Accesorio pensado para mostrar stock, precio y accion directa sin friccion.",
    category: { name: "Accesorios", slug: "accesorios" },
    priceCents: 189900,
    stock: 12,
    minPriceCents: 189900,
    maxPriceCents: 189900,
    featured: false,
    image:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=80",
    accent: "from-[#f3dfc3] via-[#faf7f1] to-[#d5e2f4]",
    variantCount: 1,
    defaultVariant: {
      id: "bolso-elemental-unico",
      internalSku: "BOLSO-ELEMENTAL-UNICO",
      size: "UNICO",
      colorName: "Camel",
      colorHex: "#B78A5B",
      priceCents: 189900,
      stock: 12,
      stockReserved: 0,
      availableStock: 12,
      label: "UNICO / Camel",
    },
    variants: [],
  },
  {
    id: "tenis-solar",
    slug: "tenis-solar",
    name: "Tenis Solar",
    description: "Base ideal para marcas urbanas, deportivas o concept stores con enfoque visual.",
    category: { name: "Nuevos ingresos", slug: "nuevos-ingresos" },
    priceCents: 219900,
    stock: 6,
    minPriceCents: 219900,
    maxPriceCents: 219900,
    featured: true,
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
    accent: "from-[#ffd0bf] via-[#fff5ee] to-[#d7e4de]",
    variantCount: 1,
    defaultVariant: {
      id: "tenis-solar-unico",
      internalSku: "TENIS-SOLAR-UNICO",
      size: "UNICO",
      colorName: "Blanco",
      colorHex: "#FFFFFF",
      priceCents: 219900,
      stock: 6,
      stockReserved: 0,
      availableStock: 6,
      label: "UNICO / Blanco",
    },
    variants: [],
  },
];

for (const product of demoProducts) {
  product.variants = product.defaultVariant ? [product.defaultVariant] : [];
}

const demoCategories: CatalogCategory[] = [
  {
    id: "nuevos-ingresos",
    name: "Nuevos ingresos",
    slug: "nuevos-ingresos",
    description: "Productos que abren la conversacion con una propuesta actual y visualmente fuerte.",
    productCount: 2,
    order: 1,
  },
  {
    id: "edicion-limitada",
    name: "Edicion limitada",
    slug: "edicion-limitada",
    description: "Capsulas y colecciones pequeñas para reforzar exclusividad.",
    productCount: 1,
    order: 2,
  },
  {
    id: "accesorios",
    name: "Accesorios",
    slug: "accesorios",
    description: "Complementos faciles de vender y simples de gestionar desde el admin.",
    productCount: 1,
    order: 3,
  },
];

type DecimalLike = number | string | { toString(): string };

function decimalToCents(value: DecimalLike) {
  return Math.round(Number(value.toString()) * 100);
}

function mapVariant(variant: {
  id: string;
  internalSku: string;
  size: string;
  colorName: string;
  colorHex: string | null;
  price: DecimalLike;
  stock: number;
  stockReserved: number;
}): CatalogVariant {
  const label = `${variant.size} / ${variant.colorName}`;

  return {
    id: variant.id,
    internalSku: variant.internalSku,
    size: variant.size,
    colorName: variant.colorName,
    colorHex: variant.colorHex,
    priceCents: decimalToCents(variant.price),
    stock: variant.stock,
    stockReserved: variant.stockReserved,
    availableStock: variant.stock - variant.stockReserved,
    label,
  };
}

export function mapCatalogProduct(product: {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  featured: boolean;
  category: { name: string; slug: string };
  images: { url: string }[];
  createdAt?: Date;
  variants?: {
    id: string;
    internalSku: string;
    size: string;
    colorName: string;
    colorHex: string | null;
    price: DecimalLike;
    stock: number;
    stockReserved: number;
  }[];
}): CatalogProduct {
  const NEW_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000;
  const isNew = product.createdAt
    ? Date.now() - product.createdAt.getTime() < NEW_THRESHOLD_MS
    : false;
  const variants = (product.variants ?? []).map(mapVariant);
  const fallbackVariant: CatalogVariant = {
    id: product.id,
    internalSku: product.id,
    size: "UNICO",
    colorName: "Sin color",
    colorHex: null,
    priceCents: product.priceCents,
    stock: product.stock,
    stockReserved: 0,
    availableStock: product.stock,
    label: "UNICO / Sin color",
  };
  const visibleVariants = variants.length > 0 ? variants : [fallbackVariant];
  const defaultVariant =
    visibleVariants.find((variant) => variant.availableStock > 0) ?? visibleVariants[0] ?? null;
  const prices = visibleVariants.map((variant) => variant.priceCents);
  const minPriceCents = prices.length > 0 ? Math.min(...prices) : product.priceCents;
  const maxPriceCents = prices.length > 0 ? Math.max(...prices) : product.priceCents;
  const aggregateStock = visibleVariants.reduce((sum, variant) => sum + variant.availableStock, 0);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    category: product.category,
    priceCents: defaultVariant?.priceCents ?? product.priceCents,
    minPriceCents,
    maxPriceCents,
    stock: aggregateStock,
    featured: product.featured,
    image: product.images[0]?.url ?? demoProducts[0].image,
    accent: demoProducts.find((item) => item.slug === product.slug)?.accent ?? demoProducts[0].accent,
    isNew,
    variantCount: visibleVariants.length,
    defaultVariant,
    variants: visibleVariants,
  };
}

export async function getCatalogProducts() {
  if (!isDatabaseConfigured()) {
    return demoProducts;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: products, error } = await supabase
      .from("Product")
      .select(
        `id, slug, name, description, priceCents, stock, featured, status, createdAt,
         category:Category(name, slug),
         images:ProductImage(url, sortOrder),
         variants:ProductVariant(id, internalSku, size, colorName, colorHex, price, stock, stockReserved, active)`,
      )
      .eq("status", "PUBLISHED")
      .order("featured", { ascending: false })
      .order("createdAt", { ascending: false });

    if (error || !products) return demoProducts;
    if (products.length === 0) return demoProducts;

    return products.map((p) => {
      const category = Array.isArray(p.category) ? p.category[0] : p.category;
      const images = ((p.images as { url: string; sortOrder: number }[]) ?? []).sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );
      const activeVariants = (
        p.variants as {
          id: string;
          internalSku: string;
          size: string;
          colorName: string;
          colorHex: string | null;
          price: string;
          stock: number;
          stockReserved: number;
          active: boolean;
        }[]
      ).filter((v) => v.active);

      return mapCatalogProduct({
        ...p,
        category: category ?? { name: "Sin categoría", slug: "sin-categoria" },
        images,
        variants: activeVariants,
      });
    });
  } catch {
    return demoProducts;
  }
}

export async function getFeaturedProducts() {
  const products = await getCatalogProducts();
  return products.filter((product) => product.featured).slice(0, 4);
}

export async function getProductBySlug(slug: string): Promise<CatalogProduct | null> {
  if (!isDatabaseConfigured()) {
    return demoProducts.find((product) => product.slug === slug) ?? null;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: product, error } = await supabase
      .from("Product")
      .select(
        `id, slug, name, description, priceCents, stock, featured, status, createdAt,
         category:Category(name, slug),
         images:ProductImage(url, alt, sortOrder),
         variants:ProductVariant(id, internalSku, size, colorName, colorHex, price, stock, stockReserved, active)`,
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error || !product || product.status !== "PUBLISHED") {
      return null;
    }

    const category = Array.isArray(product.category) ? product.category[0] : product.category;
    const images = ((product.images as { url: string; alt: string | null; sortOrder: number }[]) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const activeVariants = (
      product.variants as {
        id: string;
        internalSku: string;
        size: string;
        colorName: string;
        colorHex: string | null;
        price: string;
        stock: number;
        stockReserved: number;
        active: boolean;
      }[]
    ).filter((v) => v.active);

    const accent =
      demoProducts.find((item) => item.slug === product.slug)?.accent ?? demoProducts[0].accent;

    return {
      ...mapCatalogProduct({
        ...product,
        category: category ?? { name: "Sin categoría", slug: "sin-categoria" },
        images,
        variants: activeVariants,
      }),
      images: images.map((img) => ({
        url: img.url,
        alt: img.alt ?? product.name,
      })),
      accent,
    };
  } catch {
    const products = await getCatalogProducts();
    return products.find((product) => product.slug === slug) ?? null;
  }
}

export async function getCategories() {
  if (!isDatabaseConfigured()) {
    return demoCategories;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: categories, error } = await supabase
      .from("Category")
      .select(`id, name, slug, description, order, products:Product(id)`)
      .order("order", { ascending: true })
      .order("name", { ascending: true });

    if (error || !categories) return demoCategories;

    const mapped = categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description:
        category.description ??
        demoCategories.find((item) => item.slug === category.slug)?.description ??
        "Categoria administrable desde el panel.",
      productCount: Array.isArray(category.products) ? category.products.length : 0,
      order: category.order,
    }));

    return mapped.length > 0 ? mapped : demoCategories;
  } catch {
    return demoCategories;
  }
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const fallback = {
    name: siteConfig.name,
    description: siteConfig.description,
    whatsappNumber: siteConfig.whatsappNumber,
    currency: siteConfig.currency,
    themeAccent: "#7c3aed",
    themeAccentStrong: "#5b21b6",
    themeBackground: "#f7f4fb",
    themeCardBg: "#ffffff",
    themeCardBorder: "#e7e0f2",
    themeCardRadius: "xl" as const,
    themeButtonRadius: "full" as const,
  };

  if (!isDatabaseConfigured()) {
    return fallback;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("Setting")
      .select("value")
      .eq("key", "store")
      .maybeSingle();

    if (error || !data) return fallback;
    const parsed = storeSettingsSchema.safeParse(data.value);
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export type CatalogBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string;
};

const demoBanners: CatalogBanner[] = [
  {
    id: 'demo-1',
    title: 'Nueva coleccion',
    subtitle: 'Descubre las piezas mas buscadas de la temporada',
    ctaLabel: 'Ver catalogo',
    ctaHref: '/productos',
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'demo-2',
    title: 'Envio gratis',
    subtitle: 'En compras superiores a $150.000',
    ctaLabel: 'Comprar ahora',
    ctaHref: '/productos',
    imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80',
  },
];

export async function getActiveBanners(): Promise<CatalogBanner[]> {
  if (!isDatabaseConfigured()) return demoBanners;
  try {
    const supabase = getSupabaseAdmin();
    const { data: banners, error } = await supabase
      .from("HeroBanner")
      .select("id, title, subtitle, ctaLabel, ctaHref, imageUrl")
      .eq("active", true)
      .order("order", { ascending: true })
      .order("createdAt", { ascending: false });

    if (error || !banners || banners.length === 0) return demoBanners;
    return banners as CatalogBanner[];
  } catch {
    return demoBanners;
  }
}

export async function getRecentProducts(limit = 12) {
  const products = await getCatalogProducts();
  return products.slice(0, limit);
}
