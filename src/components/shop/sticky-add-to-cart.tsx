"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";

import { useCartStore } from "@/store/cart";
import { formatCurrencyFromCents } from "@/lib/utils";
import type { CatalogProduct } from "@/lib/catalog";

type StickyAddToCartProps = {
  product: Pick<CatalogProduct, "id" | "slug" | "name" | "image" | "priceCents" | "defaultVariant">;
};

export function StickyAddToCart({ product }: StickyAddToCartProps) {
  const [isVisible, setIsVisible] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);
  const variant = product.defaultVariant;
  const priceCents = variant?.priceCents ?? product.priceCents;

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky bar when scrolled past 400px (approx past the main add to cart button)
      if (window.scrollY > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initial check
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 z-20 flex justify-center px-3 transition-all duration-300 ease-in-out sm:hidden ${
        isVisible
          ? "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] translate-y-0 opacity-100"
          : "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] translate-y-8 opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex w-full max-w-[26rem] items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/95 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-[var(--background)]">
            <Image alt={product.name} className="object-cover" fill sizes="40px" src={product.image} />
          </div>
          <div className="flex flex-col truncate">
            <span className="truncate text-xs font-semibold leading-tight">{product.name}</span>
            <span className="text-[11px] font-medium text-[var(--foreground)]">
              {formatCurrencyFromCents(priceCents)}
            </span>
          </div>
        </div>
        
        <button
          className="flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-4 text-xs font-semibold text-white transition hover:opacity-85"
          onClick={() => {
            addItem(
              variant
                ? {
                    id: variant.id,
                    productId: product.id,
                    variantId: variant.id,
                    internalSku: variant.internalSku,
                    variantLabel: variant.label,
                    size: variant.size,
                    colorName: variant.colorName,
                    slug: product.slug,
                    name: product.name,
                    image: product.image,
                    priceCents: variant.priceCents,
                  }
                : {
                    id: product.id,
                    productId: product.id,
                    slug: product.slug,
                    name: product.name,
                    image: product.image,
                    priceCents: product.priceCents,
                  },
            );
            openCart();
          }}
          style={{ backgroundColor: "#000", borderRadius: "var(--btn-radius, 9999px)" }}
          type="button"
        >
          <ShoppingBag className="size-3.5" />
          Comprar
        </button>
      </div>
    </div>
  );
}
