"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Eye, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { WishlistButton } from "@/components/shop/wishlist-button";
import { Badge } from "@/components/ui/badge";
import type { CatalogProduct } from "@/lib/catalog";
import { formatPriceRangeFromCents } from "@/lib/utils";

type QuickViewProps = {
  product: CatalogProduct;
};

export function QuickView({ product }: QuickViewProps) {
  const [open, setOpen] = useState(false);
  const lowStock = product.stock > 0 && product.stock <= 3;
  const lastUnit = product.stock <= 0;

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        aria-label={`Vista rápida de ${product.name}`}
        className="btn-press flex size-9 items-center justify-center rounded-full bg-white/95 text-[var(--foreground)] shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-[var(--accent)]"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        type="button"
      >
        <Eye className="size-4" />
      </button>

      {open && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-backdrop sm:items-center"
          onClick={() => setOpen(false)}
          role="dialog"
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-t-[2rem] bg-white shadow-2xl animate-modal-in sm:rounded-[2rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              aria-label="Cerrar vista rápida"
              className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-white/90 text-[var(--foreground)] shadow-md backdrop-blur transition hover:bg-white"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X className="size-4" />
            </button>

            <div className="grid gap-0 sm:grid-cols-2">
              <div className="relative aspect-square sm:aspect-auto sm:min-h-[420px]">
                <Image
                  alt={product.name}
                  className="object-cover"
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  src={product.image}
                />
                <div className="absolute left-3 top-3 flex flex-col gap-1.5">
                  {product.isNew && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm animate-soft-pulse">
                      <Sparkles className="size-3" />
                      Nuevo
                    </span>
                  )}
                  {product.featured && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      Destacado
                    </span>
                  )}
                </div>
                <div className="absolute right-3 top-12 sm:top-3">
                  <WishlistButton product={product} />
                </div>
              </div>

              <div className="flex flex-col p-5 sm:p-7">
                <Badge>{product.category.name}</Badge>
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
                  {product.name}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted-foreground)]">
                  {product.description}
                </p>

                <div className="mt-5 flex items-baseline gap-2">
                  <p className="font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
                    {formatPriceRangeFromCents(product.minPriceCents, product.maxPriceCents)}
                  </p>
                  {lowStock && (
                    <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                      ¡Últimas {product.stock}!
                    </span>
                  )}
                  {lastUnit && (
                    <span className="text-xs font-semibold uppercase tracking-wide text-neutral-700">
                      Último en stock
                    </span>
                  )}
                </div>

                <div className="mt-6 flex flex-col gap-2.5">
                  <AddToCartButton className="w-full" label="Añadir al carrito" product={product} />
                  <Link
                    className="btn-press flex w-full items-center justify-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
                    href={`/productos/${product.slug}`}
                    onClick={() => setOpen(false)}
                  >
                    Ver detalle completo
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>

                <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  {lastUnit ? "Venta habilitada bajo consulta de stock" : `Stock disponible: ${product.stock}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
