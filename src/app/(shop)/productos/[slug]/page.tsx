import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronRight, Home, ShieldCheck, Truck } from "lucide-react";

import { StickyAddToCart } from "@/components/shop/sticky-add-to-cart";
import { ProductGallery } from "@/components/shop/product-gallery";
import { ProductCarousel } from "@/components/shop/product-carousel";
import { ProductPurchasePanel } from "@/components/shop/product-purchase-panel";
import { ShopHeader } from "@/components/shop/shop-header";
import { WhatsappFloatingButton } from "@/components/shop/whatsapp-button";
import { StoreFooter } from "@/components/shop/store-footer";
import { getCatalogProducts, getProductBySlug, getStoreSettings } from "@/lib/catalog";
import { siteConfig } from "@/lib/site-config";
import { sanitizeWhatsappNumber } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [product, settings] = await Promise.all([
    getProductBySlug(slug),
    getStoreSettings(),
  ]);
  if (!product) {
    return { title: "Producto no encontrado" };
  }
  const title = `${product.name} | ${settings.name}`;
  const description = product.description.slice(0, 160);
  const url = `${siteConfig.appUrl}/productos/${product.slug}`;
  const image = product.image;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: settings.name,
      type: "website",
      images: [{ url: image, width: 1200, height: 1200, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    alternates: { canonical: url },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, settings, allProducts] = await Promise.all([
    getProductBySlug(slug),
    getStoreSettings(),
    getCatalogProducts(),
  ]);

  if (!product) {
    notFound();
  }

  const whatsappHref = `https://wa.me/${sanitizeWhatsappNumber(settings.whatsappNumber)}`;

  const galleryImages =
    product.images && product.images.length > 0
      ? product.images
      : [{ url: product.image, alt: product.name }];

  // Related products: same category, exclude current product
  const relatedProducts = allProducts
    .filter((p) => p.category.slug === product.category.slug && p.id !== product.id)
    .slice(0, 8);

  return (
    <>
      <ShopHeader
        logoUrl={settings.logoUrl}
        storeName={settings.name}
        whatsappHref={whatsappHref}
        whatsappNumber={settings.whatsappNumber}
        freeShippingThresholdCents={settings.freeShippingThresholdCents}
      />

      <main className="pb-28 sm:pb-12">
        {/* Breadcrumbs */}
        <nav className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6 lg:px-10" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <li>
              <Link className="flex items-center gap-1 transition hover:text-[var(--foreground)]" href="/">
                <Home className="size-3.5" />
                <span className="hidden sm:inline">Inicio</span>
              </Link>
            </li>
            <ChevronRight className="size-3 opacity-40" />
            <li>
              <Link className="transition hover:text-[var(--foreground)]" href="/productos">
                Productos
              </Link>
            </li>
            <ChevronRight className="size-3 opacity-40" />
            <li>
              <Link className="transition hover:text-[var(--foreground)]" href={`/productos?cat=${product.category.slug}`}>
                {product.category.name}
              </Link>
            </li>
            <ChevronRight className="size-3 opacity-40" />
            <li className="truncate font-medium text-[var(--foreground)]">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-4 sm:px-6 sm:pt-6 lg:gap-10 lg:px-10">
          <section className="surface-panel grid gap-6 rounded-[2rem] p-4 sm:rounded-[2.5rem] sm:p-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10 lg:p-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
            <ProductGallery images={galleryImages} accent={product.accent} />

            <div>
              <ProductPurchasePanel product={product} whatsappNumber={settings.whatsappNumber} />

              <ul className="mt-7 grid gap-3 border-t border-[var(--border)] pt-6 text-sm sm:grid-cols-2">
                <li className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                    <Truck className="size-4" />
                  </span>
                  <div>
                    <p className="font-medium">Envío coordinado</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Acordamos por WhatsApp.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                    <ShieldCheck className="size-4" />
                  </span>
                  <div>
                    <p className="font-medium">Compra segura</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Atención directa con la tienda.</p>
                  </div>
                </li>
              </ul>
            </div>
          </section>
        </div>

        {/* Related products */}
        {relatedProducts.length > 0 ? (
          <div className="mt-12 sm:mt-16">
            <ProductCarousel
              badge={`Más de ${product.category.name}`}
              href="/productos"
              products={relatedProducts}
              title="También te puede gustar"
            />
          </div>
        ) : null}
      </main>

      {/* Floating WhatsApp button */}
      <WhatsappFloatingButton whatsappHref={whatsappHref} />

      {/* Store footer */}
      <StoreFooter
        businessHours={settings.businessHours}
        description={settings.description}
        locationAddress={settings.locationAddress}
        locationLat={settings.locationLat}
        locationLng={settings.locationLng}
        socialFacebook={settings.socialFacebook}
        socialInstagram={settings.socialInstagram}
        storeName={settings.name}
        whatsappHref={whatsappHref}
      />

      {/* Sticky mobile CTA */}
      <StickyAddToCart product={product} />
    </>
  );
}