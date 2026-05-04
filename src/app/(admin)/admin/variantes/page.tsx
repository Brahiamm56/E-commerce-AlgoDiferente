import { Save } from "lucide-react";

import { updateVariantStockAction } from "@/actions/stock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminVariants } from "@/lib/admin-variants";
import { formatCurrencyFromCents } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminVariantsPage() {
  const variants = await getAdminVariants();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-slate-800">Variantes y stock</h2>
        <p className="mt-1 text-sm text-slate-500">Gestioná SKU interno, costo y stock real por talle/color.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr_0.8fr_1.1fr] gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <span>Producto</span>
          <span>Variante</span>
          <span>Precio</span>
          <span>Stock</span>
          <span>Costo</span>
          <span>Ajuste</span>
        </div>
        {variants.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">No hay variantes cargadas.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {variants.map((variant) => (
              <form action={updateVariantStockAction} className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr_0.8fr_1.1fr] gap-3 px-5 py-4 text-sm" key={variant.id}>
                <input name="variantId" type="hidden" value={variant.id} />
                <div>
                  <p className="font-semibold text-slate-800">{variant.productName}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{variant.categoryName} · {variant.internalSku}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-700">{variant.size}</p>
                  <p className="text-xs text-slate-400">{variant.colorName}</p>
                </div>
                <span className="font-semibold text-slate-700">{formatCurrencyFromCents(variant.priceCents)}</span>
                <Input className="h-10 rounded-xl" defaultValue={variant.stock} name="stock" type="number" />
                <Input className="h-10 rounded-xl" defaultValue={variant.costCents / 100} min="0" name="cost" step="0.01" type="number" />
                <div className="flex gap-2">
                  <Input className="h-10 rounded-xl" name="notes" placeholder="Nota" />
                  <Button className="h-10 shrink-0 rounded-xl" size="sm" type="submit" variant="accent">
                    <Save className="size-4" />
                  </Button>
                </div>
              </form>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}