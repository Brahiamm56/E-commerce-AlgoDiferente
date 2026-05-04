import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { getAdminOrders } from "@/lib/orders";
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

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  IN_PROCESS: "bg-blue-50 text-blue-700 border border-blue-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  REJECTED: "bg-red-50 text-red-600 border border-red-200",
  REFUNDED: "bg-slate-100 text-slate-500 border border-slate-200",
  CANCELLED: "bg-red-50 text-red-500 border border-red-200",
  PARTIALLY_REFUNDED: "bg-orange-50 text-orange-600 border border-orange-200",
};

const SHIPMENT_LABEL: Record<string, string> = {
  PICKUP: "Retiro",
  LOCAL_COURIER: "Remis",
  ANDREANI: "Andreani",
  MANUAL: "Manual",
};

export default async function AdminPedidosPage() {
  const orders = await getAdminOrders();

  const total = orders.length;
  const pendingPayment = orders.filter((o) => o.status === "PENDING_PAYMENT").length;
  const inProcess = orders.filter((o) =>
    ["PAID", "IN_PREPARATION", "READY_TO_SHIP"].includes(o.status),
  ).length;
  const delivered = orders.filter((o) => o.status === "DELIVERED").length;

  const stats = [
    { label: "Total pedidos", value: total },
    { label: "Pendientes de pago", value: pendingPayment },
    { label: "En proceso", value: inProcess },
    { label: "Entregados", value: delivered },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="surface-panel rounded-[2rem] px-6 py-6">
        <Badge>Comercio web</Badge>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--foreground)]">
          Pedidos
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
          Gestioná los pedidos recibidos desde la tienda online. Una vez conectado Mercado Pago, los pagos se confirmaran automáticamente y los pedidos avanzarán de estado.
        </p>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-[var(--border)] bg-white/80 px-5 py-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-[var(--foreground)]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Orders list */}
      <section className="space-y-4">
        <div>
          <Badge>Historial</Badge>
          <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--foreground)]">
            Todas las órdenes
          </h3>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Hacé clic en una orden para ver el detalle completo y actualizar su estado.
          </p>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-white/80 shadow-[0_24px_80px_rgba(17,24,39,0.06)]">
          {orders.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-base font-semibold text-[var(--foreground)]">
                Todavía no hay pedidos web
              </p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Cuando un cliente complete una compra desde la tienda online, aparecerá aquí.
              </p>
            </div>
          ) : (
            <>
              {/* Table header — desktop only */}
              <div className="hidden border-b border-[var(--border)] bg-slate-50/70 px-6 py-3 lg:grid lg:grid-cols-[1.3fr_1fr_0.6fr_0.6fr_0.8fr_1fr_1fr]">
                {["Pedido", "Cliente", "Fecha", "Envío", "Total", "Pago", "Estado"].map((h) => (
                  <span
                    key={h}
                    className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]"
                  >
                    {h}
                  </span>
                ))}
              </div>

              <div className="divide-y divide-[var(--border)]">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/pedidos/${order.id}`}
                    className="grid gap-3 px-6 py-5 transition-colors hover:bg-slate-50/60 lg:grid-cols-[1.3fr_1fr_0.6fr_0.6fr_0.8fr_1fr_1fr] lg:items-center"
                  >
                    {/* Pedido */}
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {order.orderNumber}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                        {order.itemCount} {order.itemCount === 1 ? "producto" : "productos"}
                      </p>
                    </div>

                    {/* Cliente */}
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)] line-clamp-1">
                        {order.customerName}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                        {order.customerPhone}
                      </p>
                    </div>

                    {/* Fecha */}
                    <div>
                      <p className="text-sm text-[var(--foreground)]">
                        {order.createdAt.toLocaleDateString("es-AR")}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                        {order.createdAt.toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {/* Envío */}
                    <div>
                      <p className="text-sm text-[var(--foreground)]">
                        {order.shipmentProvider
                          ? (SHIPMENT_LABEL[order.shipmentProvider] ?? order.shipmentProvider)
                          : "—"}
                      </p>
                    </div>

                    {/* Total */}
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {formatCurrencyFromCents(order.totalCents)}
                      </p>
                    </div>

                    {/* Pago */}
                    <div>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          PAYMENT_STATUS_COLOR[order.paymentStatus] ??
                            "bg-slate-100 text-slate-500 border border-slate-200",
                        )}
                      >
                        {PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}
                      </span>
                    </div>

                    {/* Estado */}
                    <div>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          ORDER_STATUS_COLOR[order.status] ?? "bg-slate-100 text-slate-500",
                        )}
                      >
                        {ORDER_STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
