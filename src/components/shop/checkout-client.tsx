"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertCircle, CreditCard, MapPin, PackageCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrencyFromCents } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import type { CheckoutShippingMethod } from "@/schemas/checkout";

type CheckoutResponse = {
  orderId: string;
  orderNumber: string;
  initPoint: string | null;
  paymentConfigured: boolean;
  error?: string;
};

export function CheckoutClient() {
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [shippingMethod, setShippingMethod] = useState<CheckoutShippingMethod>("PICKUP");
  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [apartment, setApartment] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<CheckoutResponse | null>(null);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0),
    [items],
  );
  const needsAddress = shippingMethod !== "PICKUP";

  async function submitCheckout() {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName,
        customerPhone,
        customerEmail,
        shippingMethod,
        street,
        streetNumber,
        apartment,
        city,
        province,
        postalCode,
        notes,
        items,
      }),
    });
    const data = (await response.json()) as CheckoutResponse;

    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error ?? "No pudimos crear el pedido.");
      return;
    }

    setCreatedOrder(data);
    clearCart();

    if (data.initPoint) {
      window.location.href = data.initPoint;
    }
  }

  if (items.length === 0 && !createdOrder) {
    return (
      <section className="surface-panel mx-auto max-w-2xl rounded-[2rem] p-8 text-center">
        <PackageCheck className="mx-auto size-10 text-[var(--muted-foreground)]" />
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold">Tu carrito está vacío</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">Agregá productos antes de iniciar el checkout.</p>
        <Button asChild className="mt-6" variant="accent">
          <Link href="/productos">Volver al catálogo</Link>
        </Button>
      </section>
    );
  }

  if (createdOrder && !createdOrder.initPoint) {
    return (
      <section className="surface-panel mx-auto max-w-2xl rounded-[2rem] p-8 text-center">
        <PackageCheck className="mx-auto size-10 text-emerald-600" />
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold">Pedido creado</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Se generó el pedido {createdOrder.orderNumber}. Falta configurar Mercado Pago para redirigir al pago.
        </p>
        <Button asChild className="mt-6" variant="accent">
          <Link href="/productos">Seguir comprando</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.65fr)]">
      <div className="surface-panel rounded-[2rem] p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <CreditCard className="size-5 text-[var(--accent)]" />
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">Checkout</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Datos del cliente, envío y pago por Mercado Pago.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input placeholder="Nombre y apellido" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
          <Input placeholder="Teléfono" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
          <Input className="sm:col-span-2" placeholder="Email (opcional)" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} />
        </div>

        <div className="mt-6">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <MapPin className="size-4" /> Entrega
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ["PICKUP", "Retiro"],
              ["LOCAL_COURIER", "Remis local"],
              ["ANDREANI", "Andreani"],
            ].map(([value, label]) => (
              <button
                className={`h-11 rounded-xl border text-sm font-semibold transition ${
                  shippingMethod === value
                    ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                    : "border-[var(--border)] bg-white text-[var(--muted-foreground)] hover:border-[var(--foreground)]/40"
                }`}
                key={value}
                onClick={() => setShippingMethod(value as CheckoutShippingMethod)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {needsAddress ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Input placeholder="Calle" value={street} onChange={(event) => setStreet(event.target.value)} />
            <Input placeholder="Número" value={streetNumber} onChange={(event) => setStreetNumber(event.target.value)} />
            <Input placeholder="Piso / depto" value={apartment} onChange={(event) => setApartment(event.target.value)} />
            <Input placeholder="Código postal" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} />
            <Input placeholder="Ciudad" value={city} onChange={(event) => setCity(event.target.value)} />
            <Input placeholder="Provincia" value={province} onChange={(event) => setProvince(event.target.value)} />
          </div>
        ) : null}

        <Textarea className="mt-4" placeholder="Notas para el pedido (opcional)" value={notes} onChange={(event) => setNotes(event.target.value)} />

        {shippingMethod === "ANDREANI" ? (
          <div className="mt-4 flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>La cotización Andreani queda registrada como pendiente de verificación hasta validar credenciales y endpoints oficiales.</p>
          </div>
        ) : null}

        {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        <Button className="mt-6 w-full" disabled={isSubmitting || !customerName || !customerPhone} onClick={submitCheckout} size="lg" variant="accent">
          {isSubmitting ? "Creando pedido..." : "Crear pedido y pagar"}
        </Button>
      </div>

      <aside className="surface-panel h-fit rounded-[2rem] p-5 sm:p-6 lg:sticky lg:top-24">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted-foreground)]">Resumen</p>
        <div className="mt-4 divide-y divide-[var(--border)]">
          {items.map((item) => (
            <div className="py-3" key={item.id}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-medium">{item.quantity}x {item.name}</span>
                <span>{formatCurrencyFromCents(item.priceCents * item.quantity)}</span>
              </div>
              {item.variantLabel ? <p className="mt-1 text-xs text-[var(--muted-foreground)]">{item.variantLabel}</p> : null}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-sm text-[var(--muted-foreground)]">Subtotal</span>
          <span className="font-[family-name:var(--font-display)] text-2xl font-semibold">{formatCurrencyFromCents(total)}</span>
        </div>
      </aside>
    </section>
  );
}