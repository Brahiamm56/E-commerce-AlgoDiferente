import Image from "next/image";

import type { AdminProduct } from "@/lib/admin-catalog";
import { formatCurrencyFromCents } from "@/lib/utils";

export function ProductsTable({ products }: { products: AdminProduct[] }) {
  return (
    <div className="surface-panel overflow-hidden rounded-[2rem]">
      <div className="grid grid-cols-[1.6fr_0.8fr_0.6fr_0.7fr] gap-4 border-b border-[var(--border)] px-6 py-4 text-xs uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
        <span>Producto</span>
        <span>Categoria</span>
        <span>Precio</span>
        <span>Stock</span>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {products.map((product) => (
          <div
            key={product.id}
            className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-[1.6fr_0.8fr_0.6fr_0.7fr] md:items-center"
          >
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-white/80">
                <Image alt={product.name} className="object-cover" fill sizes="56px" src={product.image} />
              </div>
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-[var(--muted-foreground)]">/{product.slug}</p>
              </div>
            </div>
            <span className="text-sm text-[var(--muted-foreground)]">{product.category.name}</span>
            <span className="text-sm font-medium">{formatCurrencyFromCents(product.priceCents)}</span>
            <span className="text-sm font-medium">{product.stock}</span>
          </div>
        ))}
      </div>
    </div>
  );
}