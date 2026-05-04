import { createCustomerAction, recordDebtPaymentAction } from "@/actions/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getAdminCustomers } from "@/lib/customers";
import { formatCurrencyFromCents } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const customers = await getAdminCustomers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-slate-800">Clientes y cuenta corriente</h2>
        <p className="mt-1 text-sm text-slate-500">Alta de clientes habituales, límite de crédito y cobranza de deuda.</p>
      </div>

      <form action={createCustomerAction} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <Input name="name" placeholder="Nombre" />
        <Input name="phone" placeholder="Teléfono" />
        <Input name="email" placeholder="Email" />
        <Input name="document" placeholder="Documento" />
        <Input name="creditLimit" placeholder="Límite crédito" type="number" />
        <Textarea className="md:col-span-2" name="notes" placeholder="Notas" />
        <Button type="submit" variant="accent">Guardar cliente</Button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.1fr_0.8fr_0.7fr_1.3fr] gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <span>Cliente</span>
          <span>Saldo</span>
          <span>Límite</span>
          <span>Cobranza</span>
        </div>
        {customers.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">No hay clientes registrados.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {customers.map((customer) => (
              <div className="grid grid-cols-[1.1fr_0.8fr_0.7fr_1.3fr] gap-3 px-5 py-4 text-sm" key={customer.id}>
                <div>
                  <p className="font-semibold text-slate-800">{customer.name}</p>
                  <p className="text-xs text-slate-400">{customer.phone}{customer.email ? ` · ${customer.email}` : ""}</p>
                </div>
                <span className={customer.debtCents > 0 ? "font-bold text-amber-700" : "font-semibold text-emerald-700"}>{formatCurrencyFromCents(customer.debtCents)}</span>
                <span>{formatCurrencyFromCents(customer.creditLimitCents)}</span>
                <form action={recordDebtPaymentAction} className="grid grid-cols-[1fr_0.8fr_1fr_auto] gap-2">
                  <input name="customerId" type="hidden" value={customer.id} />
                  <Input className="h-10 rounded-xl" min="0" name="amount" placeholder="Monto" step="0.01" type="number" />
                  <Select className="h-10 rounded-xl" name="method" defaultValue="CASH">
                    <option value="CASH">Efectivo</option>
                    <option value="TRANSFER">Transferencia</option>
                  </Select>
                  <Input className="h-10 rounded-xl" name="notes" placeholder="Nota" />
                  <Button className="h-10 rounded-xl" size="sm" type="submit" variant="outline">Cobrar</Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}