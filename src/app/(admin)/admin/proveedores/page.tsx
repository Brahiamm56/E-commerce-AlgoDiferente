import { createSupplierAction } from "@/actions/suppliers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAdminSuppliers } from "@/lib/suppliers";

export const dynamic = "force-dynamic";

export default async function AdminSuppliersPage() {
  const suppliers = await getAdminSuppliers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-slate-800">Proveedores</h2>
        <p className="mt-1 text-sm text-slate-500">Agenda comercial y base para órdenes de compra.</p>
      </div>

      <form action={createSupplierAction} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <Input name="name" placeholder="Proveedor" />
        <Input name="contactName" placeholder="Contacto" />
        <Input name="phone" placeholder="Teléfono" />
        <Input name="email" placeholder="Email" />
        <Input name="address" placeholder="Dirección" />
        <Textarea className="md:col-span-2" name="notes" placeholder="Notas" />
        <Button type="submit" variant="accent">Crear proveedor</Button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {suppliers.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">No hay proveedores cargados.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {suppliers.map((supplier) => (
              <div className="grid gap-3 px-5 py-4 text-sm md:grid-cols-[1fr_1fr_0.6fr]" key={supplier.id}>
                <div>
                  <p className="font-semibold text-slate-800">{supplier.name}</p>
                  <p className="text-xs text-slate-400">{supplier.contactName ?? "Sin contacto"}</p>
                </div>
                <p className="text-slate-500">{supplier.phone ?? "Sin teléfono"}{supplier.email ? ` · ${supplier.email}` : ""}</p>
                <p className="font-semibold text-slate-700">{supplier.purchaseOrdersCount} OC</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}