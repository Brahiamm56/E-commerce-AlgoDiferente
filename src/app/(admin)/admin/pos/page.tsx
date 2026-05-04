import { closeCashSessionAction, createPosSaleAction, openCashSessionAction } from "@/actions/pos";
import { PosTerminal } from "@/components/admin/pos-terminal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getOpenCashSession, getPosCustomers, getPosProducts } from "@/lib/pos";
import { formatCurrencyFromCents } from "@/lib/utils";

export const dynamic = "force-dynamic";

function decimalToCents(value: { toString(): string }) {
  return Math.round(Number(value.toString()) * 100);
}

export default async function AdminPosPage() {
  const [cashSession, products, customers] = await Promise.all([
    getOpenCashSession(),
    getPosProducts(),
    getPosCustomers(),
  ]);
  const expectedCents = cashSession?.movements.reduce((sum, movement) => sum + decimalToCents(movement.amount), 0) ?? 0;
  const cardSurchargePercent = Number(process.env.POS_CARD_SURCHARGE_PERCENT ?? 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-slate-800">POS físico</h2>
          <p className="mt-1 text-sm text-slate-500">Venta rápida por SKU interno, caja diaria y medios de pago.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
          {cashSession ? (
            <p><span className="font-semibold text-emerald-700">Caja abierta</span> · esperado {formatCurrencyFromCents(expectedCents)}</p>
          ) : (
            <p className="font-semibold text-amber-700">Caja cerrada</p>
          )}
        </div>
      </div>

      {cashSession ? (
        <form action={closeCashSessionAction} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto]">
          <input name="sessionId" type="hidden" value={cashSession.id} />
          <Input name="closingAmount" placeholder="Monto contado al cierre" type="number" />
          <Input name="notes" placeholder="Notas de cierre" />
          <Button type="submit" variant="outline">Cerrar caja</Button>
        </form>
      ) : (
        <form action={openCashSessionAction} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto]">
          <Input name="openingAmount" placeholder="Monto inicial" type="number" />
          <Input name="notes" placeholder="Notas de apertura" />
          <Button type="submit" variant="accent">Abrir caja</Button>
        </form>
      )}

      <PosTerminal action={createPosSaleAction} cardSurchargePercent={cardSurchargePercent} customers={customers} products={products} />
    </div>
  );
}