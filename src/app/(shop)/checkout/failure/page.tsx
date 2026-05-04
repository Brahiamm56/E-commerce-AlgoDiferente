import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function CheckoutFailurePage() {
  return (
    <main className="container mx-auto px-4 py-12 text-center">
      <section className="surface-panel mx-auto max-w-xl rounded-[2rem] p-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">El pago no se completó</h1>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">Podés volver al carrito y reintentar el pago o coordinar el pedido con la tienda.</p>
        <Button asChild className="mt-6" variant="accent">
          <Link href="/carrito">Volver al carrito</Link>
        </Button>
      </section>
    </main>
  );
}