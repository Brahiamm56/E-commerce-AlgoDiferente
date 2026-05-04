"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { NewSaleDrawer } from "@/components/admin/new-sale-drawer";

type ProductOption = {
  id: string;
  name: string;
  priceCents: number;
  stock: number;
  sku: string | null;
};

export function NewSaleTrigger({ products }: { products: ProductOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(() => searchParams.get("new") === "1");

  // Auto-open when navigated with ?new=1 and clean the param
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [searchParams, router, pathname]);

  return (
    <>
      <button
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Plus className="size-4" />
        Nueva venta
      </button>

      <NewSaleDrawer onOpenChange={setOpen} open={open} products={products} />
    </>
  );
}
