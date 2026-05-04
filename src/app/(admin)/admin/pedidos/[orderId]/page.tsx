import { notFound } from "next/navigation";
import Link from "next/link";

import { updateOrderStatusAction } from "@/actions/orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { getAdminOrderDetail } from "@/lib/orders";
import { cn, formatCurrencyFromCents } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ORDER_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  PENDING_PAYMENT: "Pago pendiente",
  PAID: "Pagado",
  IN_PREPARATION: "En preparación",
  READY_TO_SHIP: "Listo para enviar",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

const ORDER_STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-500",
  PENDING_PAYMENT: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  IN_PREPARATION: "bg-blue-100 text-blue-700",
  READY_TO_SHIP: "bg-indigo-100 text-indigo-700",
  SHIPPED: "bg-violet-100 text-violet-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-600",
  REFUNDED: "bg-slate-100 text-slate-500",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  IN_PROCESS: "En proceso",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  REFUNDED: "Reembolsado",
  CANCELLED: "Cancelado",
  PARTIALLY_REFUNDED: "Parcial",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CREDIT_CARD: "Tarjeta de crédito",
  DEBIT_CARD: "Tarjeta de débito",
  MERCADO_PAGO: "Mercado Pago",
  CURRENT_ACCOUNT: "Cuenta corriente",
  MIXED: "Mixto",
};

const SHIPMENT_LABEL: Record<string, string> = {
  PICKUP: "Retiro en local",
  LOCAL_COURIER: "Remis local",
  ANDREANI: "Andreani",
  MANUAL: "Manual",
};

const UPDATE_STATUSES = [
  { value: "PENDING_PAYMENT", label: "Pago pendiente" },
  { value: "PAID", label: "Pagado" },
  { value: "IN_PREPARATION", label: "En preparación" },
  { value: "READY_TO_SHIP", label: "Listo para enviar" },
  { value: "SHIPPED", label: "Enviado" },
  { value: "DELIVERED", label: "Entregado" },
  { value: "CANCELLED", label: "Cancelado" },
  { value: "REFUNDED", label: "Reembolsado" },
];

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await getAdminOrderDetail(orderId);

  if (!order) notFound();

  const addressParts = order.shippingAddress
    ? [
        [order.shippingAddress.street, order.shippingAddress.streetNumber]
          .filter(Boolean)
          .join(" "),
        order.shippingAddress.apartment,
        order.shippingAddress.city,
        order.shippingAddress.province,
        order.shippingAddress.postalCode,
      ].filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/pedidos"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        ← Volver a pedidos
      </Link>

      {/* Header */}
      <section className="surface-panel rounded-[2rem] px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge>Pedido web</Badge>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--foreground)]">
              {order.orderNumber}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Recibido el{" "}
              {order.createdAt.toLocaleDateString("es-AR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              a las{" "}
              {order.createdAt.toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex rounded-full px-3 py-1.5 text-xs font-semibold",
                ORDER_STATUS_COLOR[order.status] ?? "bg-slate-100 text-slate-500",
              )}
            >
              {ORDER_STATUS_LABEL[order.status] ?? order.status}
            </span>
            <span
              className={cn(
                "inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold",
                order.paymentStatus === "APPROVED"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700",
              )}
            >
              Pago: {PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}
            </span>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Items */}
          <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-white/80 shadow-sm">
            <div className="border-b border-[var(--border)] px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Productos
              </p>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-[var(--foreground)]">
                      {item.name}
                    </p>
                    {item.variantLabel && (
                      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                        {item.variantLabel}
                      </p>
                    )}
                    {item.internalSku && (
                      <p className="text-[11px] text-[var(--muted-foreground)]">
                        SKU: {item.internalSku}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {item.quantity} × {formatCurrencyFromCents(item.unitPriceCents)}
                    </p>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {formatCurrencyFromCents(item.totalCents)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-2 border-t border-[var(--border)] px-6 py-4">
              <div className="flex justify-between text-sm text-[var(--muted-foreground)]">
                <span>Subtotal</span>
                <span>{formatCurrencyFromCents(order.subtotalCents)}</span>
              </div>
              {order.shippingTotalCents > 0 && (
                <div className="flex justify-between text-sm text-[var(--muted-foreground)]">
                  <span>Envío</span>
                  <span>{formatCurrencyFromCents(order.shippingTotalCents)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-[var(--foreground)]">
                <span>Total</span>
                <span>{formatCurrencyFromCents(order.totalCents)}</span>
              </div>
            </div>
          </div>

          {/* Customer + Shipping */}
          <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-white/80 shadow-sm">
            <div className="border-b border-[var(--border)] px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Cliente y envío
              </p>
            </div>
            <div className="grid gap-6 px-6 py-5 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Contacto
                </p>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {order.customerName}
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">{order.customerPhone}</p>
                {order.customerEmail && (
                  <p className="text-sm text-[var(--muted-foreground)]">{order.customerEmail}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Dirección de entrega
                </p>
                {order.shipment && (
                  <p className="text-xs font-semibold text-[var(--accent)]">
                    {SHIPMENT_LABEL[order.shipment.provider] ?? order.shipment.provider}
                  </p>
                )}
                {addressParts.length > 0 ? (
                  addressParts.map((part, i) => (
                    <p key={i} className="text-sm text-[var(--foreground)]">
                      {part}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]">Retiro en local</p>
                )}
                {order.shipment?.trackingNumber && (
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                    Tracking: {order.shipment.trackingNumber}
                  </p>
                )}
              </div>
            </div>

            {order.notes && (
              <div className="border-t border-[var(--border)] px-6 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Notas del pedido
                </p>
                <p className="mt-1 text-sm text-[var(--foreground)]">{order.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Status updater */}
          <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-white/80 shadow-sm">
            <div className="border-b border-[var(--border)] px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Actualizar estado
              </p>
            </div>
            <div className="px-6 py-5">
              <form action={updateOrderStatusAction} className="space-y-3">
                <input type="hidden" name="orderId" value={order.id} />
                <Select name="status" defaultValue={order.status}>
                  {UPDATE_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
                <Button className="w-full" type="submit" variant="accent">
                  Guardar cambio
                </Button>
              </form>
            </div>
          </div>

          {/* Payment info */}
          <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-white/80 shadow-sm">
            <div className="border-b border-[var(--border)] px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Información de pago
              </p>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {order.payments.length === 0 ? (
                <p className="px-6 py-5 text-sm text-[var(--muted-foreground)]">
                  Sin registros de pago aún.
                </p>
              ) : (
                order.payments.map((payment) => (
                  <div key={payment.id} className="space-y-2 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {PAYMENT_METHOD_LABEL[payment.method] ?? payment.method}
                      </p>
                      <p className="text-sm font-bold text-[var(--foreground)]">
                        {formatCurrencyFromCents(payment.amountCents)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--muted-foreground)]">Estado</span>
                      <span className="text-xs font-semibold text-[var(--foreground)]">
                        {PAYMENT_STATUS_LABEL[payment.status] ?? payment.status}
                      </span>
                    </div>
                    {payment.paidAt && (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Pagado: {payment.paidAt.toLocaleDateString("es-AR")}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="space-y-1 border-t border-[var(--border)] px-6 py-4">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Estado global</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}
                </span>
              </div>
              {order.paidAt && (
                <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                  <span>Confirmado</span>
                  <span>{order.paidAt.toLocaleDateString("es-AR")}</span>
                </div>
              )}
            </div>
          </div>

          {/* MercadoPago pending notice */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Pagos
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Una vez conectado Mercado Pago, el estado de pago se actualizará automáticamente al confirmar cada transacción.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
