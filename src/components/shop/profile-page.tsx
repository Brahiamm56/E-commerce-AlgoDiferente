"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Package, ShoppingCart, User, X } from "lucide-react";
import { useEffect, useState } from "react";

import { formatCurrencyFromCents, formatPriceRangeFromCents } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";

type ProfileData = {
  name: string;
  phone: string;
  address: string;
  deliveryMethod: "retiro" | "envio";
};

const STORAGE_KEY = "studio-catalog-profile";

function loadProfile(): ProfileData {
  if (typeof window === "undefined") {
    return { name: "", phone: "", address: "", deliveryMethod: "retiro" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { name: "", phone: "", address: "", deliveryMethod: "retiro" };
}

function saveProfile(data: ProfileData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>(loadProfile);
  const [saved, setSaved] = useState(false);

  const cartItems = useCartStore((s) => s.items);
  const wishlistItems = useWishlistStore((s) => s.items);
  const removeWishlistItem = useWishlistStore((s) => s.removeItem);
  const clearWishlist = useWishlistStore((s) => s.clearWishlist);
  const addToCart = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const cartTotal = cartItems.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  // Hydration guard
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);

    return () => window.clearTimeout(timer);
  }, []);

  function handleSave() {
    saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!mounted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6 sm:px-6 sm:py-10">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)] sm:size-20">
          <User className="size-7 sm:size-9" />
        </div>
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight sm:text-3xl">
            {profile.name || "Mi Perfil"}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Tus datos, favoritos y resumen de carrito
          </p>
        </div>
      </div>

      {/* Personal info form */}
      <section className="surface-panel overflow-hidden rounded-2xl">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold">
            <User className="size-4 text-[var(--accent)]" />
            Datos personales
          </h2>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            Se guardan en tu dispositivo para agilizar el checkout.
          </p>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium">
                Nombre y Apellido
              </label>
              <input
                id="profile-name"
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 text-sm outline-none transition focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(211,93,71,0.08)]"
                placeholder="Ej: María López"
              />
            </div>
            <div>
              <label htmlFor="profile-phone" className="mb-1.5 block text-sm font-medium">
                Teléfono
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 text-sm outline-none transition focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(211,93,71,0.08)]"
                placeholder="Ej: +54 379 4123456"
              />
            </div>
          </div>
          <div>
            <label htmlFor="profile-address" className="mb-1.5 block text-sm font-medium">
              Dirección de envío <span className="font-normal text-[var(--muted-foreground)]">(Opcional)</span>
            </label>
            <input
              id="profile-address"
              type="text"
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 text-sm outline-none transition focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(211,93,71,0.08)]"
              placeholder="Ej: Av. Corrientes 1234, CABA"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Método de entrega preferido</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProfile({ ...profile, deliveryMethod: "retiro" })}
                className={`flex h-11 items-center justify-center rounded-xl border text-sm font-medium transition ${
                  profile.deliveryMethod === "retiro"
                    ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                    : "border-[var(--border)] bg-white text-[var(--muted-foreground)] hover:border-[var(--foreground)]/30"
                }`}
              >
                Retiro en local
              </button>
              <button
                type="button"
                onClick={() => setProfile({ ...profile, deliveryMethod: "envio" })}
                className={`flex h-11 items-center justify-center rounded-xl border text-sm font-medium transition ${
                  profile.deliveryMethod === "envio"
                    ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                    : "border-[var(--border)] bg-white text-[var(--muted-foreground)] hover:border-[var(--foreground)]/30"
                }`}
              >
                Envío a domicilio
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-sm font-semibold text-[var(--accent-fg,white)] shadow-md transition hover:-translate-y-0.5 hover:shadow-lg sm:w-auto sm:px-8"
          >
            {saved ? "✓ Guardado" : "Guardar datos"}
          </button>
        </div>
      </section>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Link
          href="/productos?favoritos=true"
          className="surface-panel flex flex-col items-center gap-2 rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <Heart className="size-6 text-[var(--accent)]" />
          <span className="font-[family-name:var(--font-display)] text-2xl font-bold">{wishlistItems.length}</span>
          <span className="text-xs text-[var(--muted-foreground)]">Favoritos</span>
        </Link>
        <button
          type="button"
          onClick={openCart}
          className="surface-panel flex flex-col items-center gap-2 rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <ShoppingCart className="size-6 text-[var(--accent)]" />
          <span className="font-[family-name:var(--font-display)] text-2xl font-bold">{cartCount}</span>
          <span className="text-xs text-[var(--muted-foreground)]">En carrito</span>
        </button>
        <button
          type="button"
          onClick={openCart}
          className="surface-panel col-span-2 flex flex-col items-center gap-2 rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-md sm:col-span-1"
        >
          <Package className="size-6 text-[var(--accent)]" />
          <span className="font-[family-name:var(--font-display)] text-2xl font-bold">
            {cartTotal > 0 ? formatCurrencyFromCents(cartTotal) : "$0"}
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">Total carrito</span>
        </button>
      </div>

      {/* Wishlist preview */}
      <section className="surface-panel overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold">
            <Heart className="size-4 text-[var(--accent)]" />
            Mis favoritos
          </h2>
          {wishlistItems.length > 0 && (
            <button
              type="button"
              onClick={clearWishlist}
              className="text-xs font-medium text-[var(--muted-foreground)] transition hover:text-red-500"
            >
              Vaciar
            </button>
          )}
        </div>

        {wishlistItems.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-10 text-center">
            <Heart className="size-10 text-[var(--border)]" />
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">
              Aún no tienes productos favoritos.
            </p>
            <Link
              href="/productos"
              className="mt-3 text-sm font-medium text-[var(--accent)] transition hover:underline"
            >
              Explorar productos →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {wishlistItems.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center gap-3.5 px-5 py-3.5">
                <Link
                  href={`/productos/${item.slug}`}
                  className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-[var(--background)]"
                >
                  <Image
                    alt={item.name}
                    className="object-cover"
                    fill
                    sizes="56px"
                    src={item.image}
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/productos/${item.slug}`} className="text-sm font-medium leading-tight hover:underline line-clamp-1">
                    {item.name}
                  </Link>
                  <p className="mt-0.5 text-sm font-semibold">{formatPriceRangeFromCents(item.minPriceCents, item.maxPriceCents)}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    aria-label={`Agregar ${item.name} al carrito`}
                    onClick={() => {
                      const variant = item.defaultVariant;
                      addToCart(
                        variant
                          ? {
                              id: variant.id,
                              productId: item.id,
                              variantId: variant.id,
                              internalSku: variant.internalSku,
                              variantLabel: variant.label,
                              size: variant.size,
                              colorName: variant.colorName,
                              slug: item.slug,
                              name: item.name,
                              image: item.image,
                              priceCents: variant.priceCents,
                            }
                          : {
                              id: item.id,
                              productId: item.id,
                              slug: item.slug,
                              name: item.name,
                              image: item.image,
                              priceCents: item.priceCents,
                            },
                      );
                      openCart();
                    }}
                    className="flex size-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted-foreground)] transition hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-white"
                  >
                    <ShoppingCart className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Quitar ${item.name} de favoritos`}
                    onClick={() => removeWishlistItem(item.id)}
                    className="flex size-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted-foreground)] transition hover:bg-red-50 hover:border-red-200 hover:text-red-500"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {wishlistItems.length > 6 && (
              <div className="px-5 py-3 text-center">
                <Link
                  href="/productos?favoritos=true"
                  className="text-sm font-medium text-[var(--accent)] transition hover:underline"
                >
                  Ver todos ({wishlistItems.length}) →
                </Link>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
