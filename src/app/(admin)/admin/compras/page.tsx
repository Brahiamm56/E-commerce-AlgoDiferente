import { createPurchaseOrderAction, receivePurchaseOrderAction } from "@/actions/purchase-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getAdminPurchaseOrders, getAdminSuppliers, getPurchaseVariantOptions } from "@/lib/suppliers";
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
  const [suppliers, variants, orders] = await Promise.all([
    getAdminSuppliers(),
    getPurchaseVariantOptions(),
    getAdminPurchaseOrders(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-slate-800">Órdenes de compra</h2>
        <p className="mt-1 text-sm text-slate-500">Generá compras a proveedor y recepcioná mercadería actualizando stock y costo.</p>
      </div>

      <form action={createPurchaseOrderAction} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_1.5fr_0.6fr_0.7fr_1fr_auto]">
        <Select name="supplierId" defaultValue="">
          <option value="">Proveedor</option>
          {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
        </Select>
        <Select name="variantId" defaultValue="">
          <option value="">Variante</option>
          {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}
        </Select>
        <Input name="quantity" placeholder="Cantidad" type="number" />
        <Input name="unitCost" placeholder="Costo unit." step="0.01" type="number" />
        <Textarea className="min-h-12" name="notes" placeholder="Notas" />
        <Button type="submit" variant="accent">Crear OC</Button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {orders.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">No hay órdenes de compra.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((order) => (
              <div className="grid gap-3 px-5 py-4 text-sm lg:grid-cols-[1fr_1fr_0.7fr_0.7fr_auto]" key={order.id}>
                <div>
                  <p className="font-semibold text-slate-800">{order.orderNumber}</p>
                  <p className="text-xs text-slate-400">{order.createdAt.toLocaleDateString("es-AR")}</p>
                </div>
                <span>{order.supplierName}</span>
                <span>{STATUS_LABEL[order.status] ?? order.status}</span>
                <span className="font-semibold">{formatCurrencyFromCents(order.subtotalCents)}</span>
                <form action={receivePurchaseOrderAction}>
                  <input name="purchaseOrderId" type="hidden" value={order.id} />
                  <Button disabled={order.status === "RECEIVED"} size="sm" type="submit" variant="outline">Recepcionar</Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}