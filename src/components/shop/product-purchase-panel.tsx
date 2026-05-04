"use client";

import { MessageCircleMore, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { WhatsappButton } from "@/components/shop/whatsapp-button";
import { Badge } from "@/components/ui/badge";
import type { CatalogProduct, CatalogVariant } from "@/lib/catalog";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { cn, formatCurrencyFromCents } from "@/lib/utils";

type ProductPurchasePanelProps = {
  product: CatalogProduct;
  whatsappNumber: string;
};

export function ProductPurchasePanel({ product, whatsappNumber }: ProductPurchasePanelProps) {
  const [selectedVariant, setSelectedVariant] = useState<CatalogVariant | null>(
    product.defaultVariant ?? product.variants[0] ?? null,
  );

  const colors = useMemo(() => {
    const unique = new Map<string, CatalogVariant>();
    for (const variant of product.variants) {
      if (!unique.has(variant.colorName)) {
        unique.set(variant.colorName, variant);
      }
    }
    return Array.from(unique.values());
  }, [product.variants]);

  const selectedColor = selectedVariant?.colorName ?? colors[0]?.colorName ?? "";
  const variantsForColor = product.variants.filter((variant) => variant.colorName === selectedColor);
  const hasVariantChoices = product.variants.length > 1;
  const selectedStock = selectedVariant?.availableStock ?? product.stock;
  const lowStock = selectedStock > 0 && selectedStock <= 3;
  const lastUnit = selectedStock <= 0;
  const priceCents = selectedVariant?.priceCents ?? product.priceCents;
  const whatsappHref = buildWhatsappLink(
    [
      {
        name: product.name,
        quantity: 1,
        priceCents,
        variantLabel: selectedVariant?.label,
        internalSku: selectedVariant?.internalSku,
      },
    ],
    undefined,
    whatsappNumber,
  );

  function selectColor(colorName: string) {
    const nextVariant =
      product.variants.find(
        (variant) => variant.colorName === colorName && variant.size === selectedVariant?.size,
      ) ?? product.variants.find((variant) => variant.colorName === colorName);

    if (nextVariant) {
      setSelectedVariant(nextVariant);
    }
  }

  return (
    <div className="flex flex-col lg:sticky lg:top-24 lg:self-start lg:pt-4" data-variant-selector>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{product.category.name}</Badge>
        <Badge>{lastUnit ? "Último en stock" : `Stock ${selectedStock}`}</Badge>
        {product.featured ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-white/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            <Sparkles className="size-3" />
            Destacado
          </span>
        ) : null}
      </div>

      <h1 className="mt-5 font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-[3.25rem]">
        {product.name}
      </h1>

      <p className="mt-4 text-sm leading-7 text-[var(--muted-foreground)] sm:text-base sm:leading-8">
        {product.description}
      </p>

      <div className="mt-6 flex flex-wrap items-baseline gap-3">
        <p className="font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
          {formatCurrencyFromCents(priceCents)}
        </p>
        {lowStock ? (
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
            ¡Quedan pocas unidades!
          </span>
        ) : null}
        {lastUnit ? (
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
            Venta habilitada bajo consulta de stock
          </span>
        ) : null}
      </div>

      {hasVariantChoices ? (
        <div className="mt-6 space-y-5 rounded-2xl border border-[var(--border)] bg-white/70 p-4">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Color</p>
              <p className="text-xs font-medium text-[var(--foreground)]">{selectedColor}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {colors.map((variant) => {
                const selected = variant.colorName === selectedColor;
                return (
                  <button
                    className={cn(
                      "flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-medium transition hover:border-[var(--foreground)]/40",
                      selected
                        ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                        : "border-[var(--border)] bg-white text-[var(--foreground)]",
                    )}
                    key={variant.colorName}
                    onClick={() => selectColor(variant.colorName)}
                    type="button"
                  >
                    <span
                      className="size-4 rounded-full border border-black/10"
                      style={{ backgroundColor: variant.colorHex ?? "#f4f4f5" }}
                    />
                    {variant.colorName}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Talle</p>
              <p className="text-xs font-medium text-[var(--foreground)]">{selectedVariant?.size}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {variantsForColor.map((variant) => {
                const selected = variant.id === selectedVariant?.id;
                return (
                  <button
                    className={cn(
                      "flex h-11 items-center justify-center rounded-xl border text-sm font-semibold transition hover:border-[var(--foreground)]/40",
                      selected
                        ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                        : "border-[var(--border)] bg-white text-[var(--foreground)]",
                    )}
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    type="button"
                  >
                    {variant.size}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : selectedVariant ? (
        <p className="mt-5 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          {selectedVariant.label} · SKU {selectedVariant.internalSku}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <AddToCartButton
          className="sm:flex-1"
          label="Añadir al carrito"
          product={product}
          selectedVariant={selectedVariant}
        />
        <WhatsappButton href={whatsappHref}>
          <MessageCircleMore className="mr-2 size-4" />
          Pedir por WhatsApp
        </WhatsappButton>
      </div>

      {selectedVariant ? (
        <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          SKU {selectedVariant.internalSku}
        </p>
      ) : null}
    </div>
  );
}