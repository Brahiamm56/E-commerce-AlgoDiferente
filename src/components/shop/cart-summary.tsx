"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCurrencyFromCents } from "@/lib/utils";
import { useCartStore } from "@/store/cart";

export function CartSummary() {
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const decrementItem = useCartStore((state) => state.decrementItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  const total = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="surface-panel flex min-h-[24rem] flex-col items-center justify-center rounded-[2.5rem] px-6 py-12 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-[var(--background)]">
          <ShoppingBag className="size-7 text-[var(--muted-foreground)]" />
        </div>
        <p className="mt-4 font-[family-name:var(--font-display)] text-2xl font-semibold">
          Tu carrito está vacío
        </p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted-foreground)]">
          Explorá el catálogo y agregá los productos que te gusten. ¡Tu pedido se arma automáticamente!
        </p>
        <Button asChild className="mt-6" variant="accent">
          <Link href="/productos">Explorar productos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="space-y-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="cart-item-enter surface-panel flex gap-4 rounded-[1.5rem] p-4 sm:rounded-[2rem]"
          >
            {/* Product image */}
            <Link
              href={`/productos/${item.slug}`}
              className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[var(--background)] sm:h-28 sm:w-28"
            >
              <Image alt={item.name} className="object-cover" fill sizes="112px" src={item.image} />
            </Link>

            {/* Product info */}
            <div className="flex flex-1 flex-col gap-1.5">
              <Link
                href={`/productos/${item.slug}`}
                className="font-[family-name:var(--font-display)] text-base font-semibold leading-tight hover:underline sm:text-lg"
              >
                {item.name}
              </Link>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {formatCurrencyFromCents(item.priceCents)}
                <span className="ml-1 text-xs text-[var(--muted-foreground)]">c/u</span>
              </p>
              {item.variantLabel ? (
                <p className="text-xs text-[var(--muted-foreground)]">
                  {item.variantLabel}{item.internalSku ? ` · SKU ${item.internalSku}` : ""}
                </p>
              ) : null}

              {/* Quantity controls + delete */}
              <div className="mt-auto flex items-center gap-3 pt-1">
                <div className="flex items-center rounded-full border border-[var(--border)] bg-white">
                  <button
                    aria-label="Disminuir cantidad"
                    className="flex size-8 items-center justify-center rounded-full text-[var(--muted-foreground)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                    onClick={() => decrementItem(item.id)}
                    type="button"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="min-w-7 text-center text-sm font-semibold">
                    {item.quantity}
                  </span>
                  <button
                    aria-label="Aumentar cantidad"
                    className="flex size-8 items-center justify-center rounded-full text-[var(--muted-foreground)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                    onClick={() => addItem(item)}
                    type="button"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                {/* Subtotal */}
                <span className="text-sm font-semibold">
                  {formatCurrencyFromCents(item.priceCents * item.quantity)}
                </span>

                {/* Delete */}
                <button
                  aria-label={`Quitar ${item.name}`}
                  className="ml-auto flex size-8 items-center justify-center rounded-full text-[var(--muted-foreground)] transition hover:bg-red-50 hover:text-red-500"
                  onClick={() => removeItem(item.id)}
                  type="button"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Summary sidebar */}
      <aside className="surface-panel h-fit rounded-[2rem] p-6 lg:sticky lg:top-24">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted-foreground)]">Resumen del pedido</p>

        <div className="mt-4 space-y-2.5 border-b border-[var(--border)] pb-4">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--muted-foreground)]">
              {itemCount} {itemCount === 1 ? "producto" : "productos"}
            </span>
            <span className="font-medium">{formatCurrencyFromCents(total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--muted-foreground)]">Envío</span>
            <span className="font-medium text-[var(--accent)]">A coordinar</span>
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-sm font-medium text-[var(--muted-foreground)]">Total</span>
          <span className="font-[family-name:var(--font-display)] text-3xl font-bold">
            {formatCurrencyFromCents(total)}
          </span>
        </div>

        <p className="mt-3 text-xs leading-5 text-[var(--muted-foreground)]">
          Al confirmar, se crea el pedido y continuás el pago con Mercado Pago.
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          <Button asChild size="lg" variant="accent">
            <Link href="/checkout">Ir al checkout</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/productos">Seguir comprando</Link>
          </Button>
          <button
            className="text-center text-xs font-medium text-[var(--muted-foreground)] transition hover:text-red-500"
            onClick={clearCart}
            type="button"
          >
            Vaciar carrito
          </button>
        </div>
      </aside>
    </div>
  );
}