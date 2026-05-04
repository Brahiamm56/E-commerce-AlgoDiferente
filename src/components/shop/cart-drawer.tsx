"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { formatCurrencyFromCents } from "@/lib/utils";
import { useCartStore } from "@/store/cart";

type CartDrawerProps = {
  open: boolean;
  whatsappNumber: string;
  freeShippingThresholdCents?: number;
  onClose: () => void;
};

export function CartDrawer({ open, whatsappNumber, freeShippingThresholdCents, onClose }: CartDrawerProps) {
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const decrementItem = useCartStore((state) => state.decrementItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"envio" | "retiro">("retiro");
  const [notes, setNotes] = useState("");

  const total = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const checkoutUrl =
    items.length > 0
      ? buildWhatsappLink(
          items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            priceCents: item.priceCents,
            variantLabel: item.variantLabel,
            internalSku: item.internalSku,
          })),
          { name: customerName, deliveryMethod, notes },
          whatsappNumber
        )
      : "#";

  // Lock body scroll when open
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

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        if (showCheckoutForm) {
          setShowCheckoutForm(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, showCheckoutForm]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <aside
        aria-label="Carrito de compras"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-[-8px_0_30px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="size-5 text-[var(--foreground)]" />
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Carrito
            </h2>
            {itemCount > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-bold text-white">
                {itemCount}
              </span>
            ) : null}
          </div>
          <button
            aria-label="Cerrar carrito"
            className="flex size-9 items-center justify-center rounded-full text-[var(--muted-foreground)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-[var(--background)]">
                <ShoppingBag className="size-7 text-[var(--muted-foreground)]" />
              </div>
              <p className="mt-4 font-[family-name:var(--font-display)] text-xl font-semibold">
                Tu carrito está vacío
              </p>
              <p className="mt-2 max-w-xs text-sm leading-6 text-[var(--muted-foreground)]">
                Agrega productos desde el catálogo para generar el pedido por WhatsApp.
              </p>
            </div>
          ) : showCheckoutForm ? (
            <div className="flex flex-col px-5 py-6 space-y-5 animate-[fadeInUp_0.2s_ease-out]">
              <div>
                <label htmlFor="customer-name" className="block text-sm font-semibold mb-1.5 text-[var(--foreground)]">Tu Nombre y Apellido</label>
                <input 
                  id="customer-name" 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(211,93,71,0.08)]" 
                  placeholder="Ej: María López" 
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5 text-[var(--foreground)]">Método de Entrega</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("retiro")}
                    className={`flex h-11 items-center justify-center rounded-xl border text-sm font-medium transition ${deliveryMethod === "retiro" ? "border-[var(--foreground)] bg-[var(--foreground)] text-white" : "border-[var(--border)] bg-white text-[var(--muted-foreground)] hover:border-[var(--foreground)]/30"}`}
                  >
                    Retiro en local
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("envio")}
                    className={`flex h-11 items-center justify-center rounded-xl border text-sm font-medium transition ${deliveryMethod === "envio" ? "border-[var(--foreground)] bg-[var(--foreground)] text-white" : "border-[var(--border)] bg-white text-[var(--muted-foreground)] hover:border-[var(--foreground)]/30"}`}
                  >
                    Envío a domicilio
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-semibold mb-1.5 text-[var(--foreground)]">Notas adicionales <span className="font-normal text-[var(--muted-foreground)]">(Opcional)</span></label>
                <textarea 
                  id="notes" 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm outline-none transition focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(211,93,71,0.08)] min-h-[80px] resize-none" 
                  placeholder="Ej: Dirección de envío, horario preferido, talle específico..." 
                />
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)] animate-[fadeIn_0.2s_ease-out]">
              {items.map((item) => (
                <div className="cart-item-enter flex gap-3.5 px-5 py-4" key={item.id}>
                  <Link
                    href={`/productos/${item.slug}`}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--background)]"
                    onClick={onClose}
                  >
                    <Image
                      alt={item.name}
                      className="object-cover"
                      fill
                      sizes="80px"
                      src={item.image}
                    />
                  </Link>
                  <div className="flex flex-1 flex-col gap-1">
                    <p className="text-sm font-medium leading-tight">{item.name}</p>
                    {item.variantLabel ? (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {item.variantLabel}{item.internalSku ? ` · SKU ${item.internalSku}` : ""}
                      </p>
                    ) : null}
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {formatCurrencyFromCents(item.priceCents)}
                    </p>
                    <div className="mt-auto flex items-center gap-2">
                      <div className="flex items-center rounded-full border border-[var(--border)]">
                        <button
                          aria-label="Disminuir cantidad"
                          className="flex size-7 items-center justify-center rounded-full text-[var(--muted-foreground)] transition hover:bg-[var(--background)]"
                          onClick={() => decrementItem(item.id)}
                          type="button"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="min-w-6 text-center text-xs font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          aria-label="Aumentar cantidad"
                          className="flex size-7 items-center justify-center rounded-full text-[var(--muted-foreground)] transition hover:bg-[var(--background)]"
                          onClick={() => addItem(item)}
                          type="button"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                      <button
                        aria-label={`Quitar ${item.name}`}
                        className="ml-auto flex size-7 items-center justify-center rounded-full text-[var(--muted-foreground)] transition hover:bg-red-50 hover:text-red-500"
                        onClick={() => removeItem(item.id)}
                        type="button"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 ? (
          <div className="border-t border-[var(--border)] px-5 py-4 space-y-3">
            {freeShippingThresholdCents && freeShippingThresholdCents > 0 ? (
              (() => {
                const remaining = Math.max(0, freeShippingThresholdCents - total);
                const pct = Math.min(100, Math.round((total / freeShippingThresholdCents) * 100));
                const reached = remaining === 0;
                return (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/60 p-3">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide">
                      <span className={reached ? "text-emerald-600" : "text-[var(--foreground)]"}>
                        {reached ? "\uD83C\uDF89 \u00a1Tenes envio gratis!" : `Te faltan ${formatCurrencyFromCents(remaining)} para envio gratis`}
                      </span>
                      <span className="text-[var(--muted-foreground)]">{pct}%</span>
                    </div>
                    <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-[var(--border)]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${reached ? "bg-emerald-500" : "bg-[var(--accent)]"}`}
                        style={{ width: `${pct}%` }}
                      />
                      {!reached && pct > 5 && (
                        <div className="progress-shine absolute inset-0" style={{ width: `${pct}%` }} />
                      )}
                    </div>
                  </div>
                );
              })()
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted-foreground)]">Total</span>
              <span className="font-[family-name:var(--font-display)] text-xl font-semibold">
                {formatCurrencyFromCents(total)}
              </span>
            </div>
            
            {!showCheckoutForm ? (
              <>
                <Button asChild className="w-full" size="lg" variant="accent">
                  <Link href="/checkout" onClick={onClose}>Ir al checkout</Link>
                </Button>
                <Link
                  className="block w-full text-center text-sm font-medium text-[var(--accent)] transition hover:underline"
                  href="/productos"
                  onClick={onClose}
                >
                  Seguir comprando
                </Link>
                <button
                  className="w-full text-center text-xs font-medium text-[var(--muted-foreground)] transition hover:text-red-500"
                  onClick={clearCart}
                  type="button"
                >
                  Vaciar carrito
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Button onClick={() => setShowCheckoutForm(false)} variant="outline" className="w-12 shrink-0 px-0">
                  <ChevronLeft className="size-5" />
                </Button>
                <Button 
                  asChild={customerName.trim() !== ""} 
                  className="flex-1" 
                  size="lg" 
                  variant="accent" 
                  disabled={!customerName.trim()}
                >
                  {customerName.trim() ? (
                    <a 
                      href={checkoutUrl} 
                      rel="noreferrer" 
                      target="_blank" 
                      onClick={() => {
                        // Small delay before clearing cart and closing drawer
                        setTimeout(() => {
                          setShowCheckoutForm(false);
                          clearCart();
                          onClose();
                        }, 500);
                      }}
                    >
                      Enviar a WhatsApp
                    </a>
                  ) : (
                    <span>Completar datos</span>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </aside>
    </>
  );
}
