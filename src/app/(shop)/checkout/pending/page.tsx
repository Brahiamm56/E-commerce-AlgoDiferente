import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function CheckoutPendingPage() {
  return (
    <main className="container mx-auto px-4 py-12 text-center">
      <section className="surface-panel mx-auto max-w-xl rounded-[2rem] p-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">Pago pendiente</h1>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">Mercado Pago nos va a avisar cuando el pago cambie de estado.</p>
        <Button asChild className="mt-6" variant="accent">
          <Link href="/productos">Seguir mirando productos</Link>
        </Button>
      </section>
    </main>
  );
}