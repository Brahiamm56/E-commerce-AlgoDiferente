import Link from "next/link";

import { receivePurchaseOrderAction } from "@/actions/purchase-orders";
import { PurchaseOrderBuilder } from "@/components/admin/purchase-order-builder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAdminPurchaseOrders, getAdminSuppliers, getPurchaseOrderBuilderProducts } from "@/lib/suppliers";
import { formatCurrencyFromCents } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  PARTIALLY_RECEIVED: "Parcial",
  RECEIVED: "Recibida",
  CANCELLED: "Cancelada",
};

export default async function AdminPurchasesPage() {
  const [suppliers, products, orders] = await Promise.all([
    getAdminSuppliers(),
    getPurchaseOrderBuilderProducts(),
    getAdminPurchaseOrders(),
  ]);

  return (
    <div className="space-y-8">
      <section className="surface-panel rounded-[2rem] px-6 py-6">
        <Badge>Abastecimiento</Badge>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--foreground)]">
          Ordenes de compra
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
          Genera pedidos formales para proveedores, distribuye cantidades por talle y descarga un archivo listo para enviar o procesar internamente.
        </p>
      </section>

      <PurchaseOrderBuilder products={products} suppliers={suppliers} />

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <Badge>Historial</Badge>
            <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--foreground)]">
              Ordenes emitidas
            </h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Revisa el estado, descarga el documento nuevamente o recepciona mercaderia cuando llegue al local.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-white/80 shadow-[0_24px_80px_rgba(17,24,39,0.06)]">
          {orders.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-base font-semibold text-[var(--foreground)]">Todavia no hay ordenes de compra</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Cuando finalices tu primera orden, aparecera aqui con su estado y accesos de gestion.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {orders.map((order) => (
                <div
                  className="grid gap-4 px-6 py-5 lg:grid-cols-[1.1fr_1fr_0.8fr_0.7fr_auto]"
                  key={order.id}
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{order.orderNumber}</p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      Emitida el {order.createdAt.toLocaleDateString("es-AR")}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{order.supplierName}</p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">{order.itemCount} lineas cargadas</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                      Estado
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                      {STATUS_LABEL[order.status] ?? order.status}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                      Total
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                      {formatCurrencyFromCents(order.subtotalCents)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/api/admin/purchase-orders/${order.id}/export`}>Exportar</Link>
                    </Button>

                    <form action={receivePurchaseOrderAction}>
                      <input name="purchaseOrderId" type="hidden" value={order.id} />
                      <Button
                        disabled={order.status === "RECEIVED"}
                        size="sm"
                        type="submit"
                        variant="accent"
                      >
                        {order.status === "RECEIVED" ? "Recepcionada" : "Recepcionar"}
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
