"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { CreditCard, Minus, Plus, Search, Trash2 } from "lucide-react";

import { initialAdminFormState, type AdminFormState } from "@/actions/admin-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrencyFromCents } from "@/lib/utils";
import type { PosCustomerOption, PosProductOption } from "@/lib/pos";
import type { PosPaymentMethod } from "@/schemas/pos";

type PosLine = PosProductOption & { quantity: number };

type PosTerminalProps = {
  action: (state: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  products: PosProductOption[];
  customers: PosCustomerOption[];
  cardSurchargePercent: number;
};

export function PosTerminal({ action, products, customers, cardSurchargePercent }: PosTerminalProps) {
  const [state, formAction] = useActionState(action, initialAdminFormState);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PosLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>("CASH");
  const [customerId, setCustomerId] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [notes, setNotes] = useState("");
  const handledSubmission = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (state.status === "success" && state.submissionKey !== handledSubmission.current) {
      handledSubmission.current = state.submissionKey;
      setItems([]);
      setQuery("");
      setPaymentMethod("CASH");
      setCustomerId("");
      setAmountReceived("");
      setNotes("");
    }
  }, [state]);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products.slice(0, 12);

    return products
      .filter((product) =>
        [product.name, product.variantLabel, product.internalSku].some((value) =>
          value.toLowerCase().includes(term),
        ),
      )
      .slice(0, 24);
  }, [products, query]);
  const subtotal = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const surcharge = paymentMethod === "CREDIT_CARD" ? Math.round(subtotal * (cardSurchargePercent / 100)) : 0;
  const total = subtotal + surcharge;

  function addProduct(product: PosProductOption) {
    setItems((current) => {
      const index = current.findIndex((item) => item.variantId === product.variantId);
      if (index >= 0) {
        const next = [...current];
        next[index] = { ...next[index], quantity: next[index].quantity + 1 };
        return next;
      }
      return [...current, { ...product, quantity: 1 }];
    });
  }

  function updateQuantity(variantId: string, delta: number) {
    setItems((current) =>
      current
        .map((item) =>
          item.variantId === variantId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
      <input name="items" type="hidden" value={JSON.stringify(items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })))} />
      <input name="paymentMethod" type="hidden" value={paymentMethod} />
      <input name="customerId" type="hidden" value={customerId} />
      <input name="amountReceived" type="hidden" value={amountReceived} />
      <input name="notes" type="hidden" value={notes} />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Buscar por SKU interno, producto, talle o color" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <button className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-left transition hover:border-slate-400 hover:bg-white" key={product.variantId} onClick={() => addProduct(product)} type="button">
              <p className="text-sm font-semibold text-slate-800">{product.name}</p>
              <p className="mt-1 text-xs text-slate-500">{product.variantLabel}</p>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400">{product.internalSku}</span>
                <span className="font-semibold text-slate-900">{formatCurrencyFromCents(product.priceCents)}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-8 lg:self-start">
        <div className="flex items-center gap-2 text-slate-800">
          <CreditCard className="size-5" />
          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">Venta actual</h3>
        </div>

        <div className="mt-4 min-h-44 divide-y divide-slate-100">
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Agregá productos para iniciar la venta.</p>
          ) : (
            items.map((item) => (
              <div className="py-3" key={item.variantId}>
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.variantLabel}</p>
                  </div>
                  <button aria-label="Quitar" className="text-slate-300 hover:text-red-500" onClick={() => updateQuantity(item.variantId, -item.quantity)} type="button">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center rounded-full border border-slate-200">
                    <button className="flex size-8 items-center justify-center" onClick={() => updateQuantity(item.variantId, -1)} type="button"><Minus className="size-3" /></button>
                    <span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button className="flex size-8 items-center justify-center" onClick={() => updateQuantity(item.variantId, 1)} type="button"><Plus className="size-3" /></button>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrencyFromCents(item.priceCents * item.quantity)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PosPaymentMethod)}>
            <option value="CASH">Efectivo</option>
            <option value="TRANSFER">Transferencia</option>
            <option value="CREDIT_CARD">Tarjeta de crédito (+{cardSurchargePercent}%)</option>
            <option value="CURRENT_ACCOUNT">Cuenta corriente</option>
          </Select>
          {paymentMethod === "CURRENT_ACCOUNT" ? (
            <Select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              <option value="">Seleccionar cliente</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name} - deuda {formatCurrencyFromCents(customer.debtCents)}</option>
              ))}
            </Select>
          ) : null}
          {paymentMethod === "CASH" ? <Input placeholder="Efectivo recibido" type="number" value={amountReceived} onChange={(event) => setAmountReceived(event.target.value)} /> : null}
          <Textarea placeholder="Nota interna" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrencyFromCents(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Recargo</span><span>{formatCurrencyFromCents(surcharge)}</span></div>
          <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatCurrencyFromCents(total)}</span></div>
        </div>

        {state.message ? <p className={`mt-3 rounded-xl p-3 text-sm ${state.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{state.message}</p> : null}

        <Button className="mt-4 w-full" disabled={items.length === 0} size="lg" type="submit" variant="accent">Cobrar</Button>
      </aside>
    </form>
  );
}