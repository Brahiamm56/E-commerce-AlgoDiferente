import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { QuickView } from "@/components/shop/quick-view";
import { WishlistButton } from "@/components/shop/wishlist-button";
import { Badge } from "@/components/ui/badge";
import { type CatalogProduct } from "@/lib/catalog";
import { formatPriceRangeFromCents } from "@/lib/utils";

const BLUR_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjEwIiB2aWV3Qm94PSIwIDAgOCAxMCI+PHJlY3Qgd2lkdGg9IjgiIGhlaWdodD0iMTAiIGZpbGw9IiNlOGUyZGEiLz48L3N2Zz4=";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const lowStock = product.stock > 0 && product.stock <= 3;
  const lastUnit = product.stock <= 0;

  return (
    <article
      className="group card-lift relative overflow-hidden border backdrop-blur-sm"
      style={{
        backgroundColor: "var(--card-bg, #fff)",
        borderColor: "var(--card-border, #e8e2da)",
        borderRadius: "var(--card-radius, 1rem)",
      }}
    >
      <Link
        className="relative block aspect-[4/5] overflow-hidden bg-gradient-to-br from-[var(--background)] to-white sm:aspect-[3/4]"
        href={`/productos/${product.slug}`}
      >
        <Image
          alt={product.name}
          blurDataURL={BLUR_PLACEHOLDER}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          height={900}
          loading="lazy"
          placeholder="blur"
          src={product.image}
          width={720}
        />

        <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5 sm:left-4 sm:top-4">
          {product.isNew ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm animate-soft-pulse sm:text-[10px]">
              <Sparkles className="size-2.5 sm:size-3" />
              Nuevo
            </span>
          ) : null}
          {lowStock ? (
            <span className="inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm sm:text-[10px]">
              Últimas {product.stock}
            </span>
          ) : null}
          {lastUnit ? (
            <span className="inline-flex items-center rounded-full bg-neutral-700/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm sm:text-[10px]">
              Último en stock
            </span>
          ) : null}
        </div>

        <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-1.5 sm:right-4 sm:top-4">
          <WishlistButton product={product} />
          <div className="hidden opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block">
            <QuickView product={product} />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-3 sm:p-4">
          <Badge className="bg-white/90 text-[var(--foreground)] text-[10px] sm:text-[11px]">{product.category.name}</Badge>
          {!lastUnit ? (
            <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm sm:px-3 sm:py-1 sm:text-xs">
              Stock {product.stock}
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-col gap-2.5 p-3.5 sm:gap-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5 sm:space-y-1">
            <h3 className="truncate font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight sm:text-lg">{product.name}</h3>
            <p className="line-clamp-1 text-[11px] leading-4 text-[var(--muted-foreground)] sm:text-xs sm:leading-5">{product.description}</p>
          </div>
          <Link
            aria-label={`Ver ${product.name}`}
            className="hidden shrink-0 rounded-full border border-[var(--border)] p-1.5 transition hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:bg-white hover:text-[var(--accent)] sm:block sm:p-2"
            href={`/productos/${product.slug}`}
          >
            <ArrowUpRight className="size-3.5 sm:size-4" />
          </Link>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-[var(--foreground)] sm:text-base">
            {formatPriceRangeFromCents(product.minPriceCents, product.maxPriceCents)}
          </p>
          <AddToCartButton product={product} />
        </div>
      </div>
    </article>
  );
}
