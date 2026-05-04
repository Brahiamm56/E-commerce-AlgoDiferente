import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function CheckoutSuccessPage() {
  return (
    <main className="container mx-auto px-4 py-12 text-center">
      <section className="surface-panel mx-auto max-w-xl rounded-[2rem] p-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">Pago recibido</h1>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">Tu pedido quedó en armado. Te vamos a contactar para coordinar el envío o retiro.</p>
        <Button asChild className="mt-6" variant="accent">
          <Link href="/productos">Volver al catálogo</Link>
        </Button>
      </section>
    </main>
  );
}