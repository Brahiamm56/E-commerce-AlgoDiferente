"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Heart,
  House,
  LogIn,
  Menu,
  MessageCircleMore,
  Search,
  ShoppingBag,
  ShoppingCart,
  Tag,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CartDrawer } from "@/components/shop/cart-drawer";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { searchProducts } from "@/actions/shop";
import type { CatalogProduct } from "@/lib/catalog";
import { formatPriceRangeFromCents } from "@/lib/utils";

type ShopHeaderProps = {
  storeName: string;
  whatsappHref: string;
  whatsappNumber: string;
  logoUrl?: string;
  freeShippingThresholdCents?: number;
};

export function ShopHeader({ storeName, whatsappHref, whatsappNumber, logoUrl, freeShippingThresholdCents }: ShopHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const itemCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const cartOpen = useCartStore((state) => state.isOpen);
  const openCart = useCartStore((state) => state.openCart);
  const closeCart = useCartStore((state) => state.closeCart);
  const wishlistCount = useWishlistStore((state) => state.items.length);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CatalogProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const [cartBump, setCartBump] = useState(false);
  const lastScrollY = useRef(0);
  const lastItemCount = useRef(itemCount);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Hide bottom nav on scroll down, show on scroll up (mobile)
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      if (Math.abs(delta) < 8) return;
      // Always show near top
      if (y < 60) {
        setNavHidden(false);
      } else if (delta > 0) {
        setNavHidden(true);
      } else {
        setNavHidden(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Bounce cart badge whenever item count grows
  useEffect(() => {
    if (itemCount > lastItemCount.current) {
      setCartBump(true);
      const t = setTimeout(() => setCartBump(false), 500);
      lastItemCount.current = itemCount;
      return () => clearTimeout(t);
    }
    lastItemCount.current = itemCount;
  }, [itemCount]);

  // Predictive search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchProducts(searchQuery);
        setSearchResults(results);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Close overlays on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (menuOpen) setMenuOpen(false);
        if (searchOpen) setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen, searchOpen]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = searchQuery.trim() || searchInputRef.current?.value?.trim();
    if (query) {
      router.push(`/productos?q=${encodeURIComponent(query)}`);
      setSearchOpen(false);
      setMenuOpen(false);
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value);

    if (!value.trim()) {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const navLinks = [
    { href: "/", icon: House, label: "Inicio" },
    { href: "/productos", icon: Tag, label: "Productos" },
  ];

  return (
    <>
      {/* Top header */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:gap-4 sm:px-6 sm:py-3 lg:px-10">
          {/* Left side: hamburger + logo */}
          <div className="flex items-center gap-2">
            <button
              aria-label="Abrir menú"
              className="flex size-9 items-center justify-center rounded-full text-[var(--foreground)] transition hover:bg-[var(--background)] sm:size-10"
              onClick={() => setMenuOpen(true)}
              type="button"
            >
              <Menu className="size-5" />
            </button>

            <Link className="flex items-center gap-2" href="/">
              {logoUrl ? (
                <span className="relative size-9 overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-sm sm:size-10">
                  <Image
                    alt={storeName}
                    className="object-cover"
                    fill
                    sizes="40px"
                    src={logoUrl}
                  />
                </span>
              ) : (
                <span className="flex size-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--accent)] text-[10px] font-bold uppercase tracking-widest text-white shadow-sm sm:size-10 sm:text-[11px]">
                  {storeName.slice(0, 2)}
                </span>
              )}
              <p className="text-sm font-semibold leading-tight sm:text-base">{storeName}</p>
            </Link>
          </div>

          {/* Right side: wishlist & cart */}
          <div className="flex items-center gap-1">
            <Link
              aria-label="Favoritos"
              className="relative flex size-9 items-center justify-center rounded-full text-[var(--foreground)] transition hover:bg-[var(--background)] sm:size-10"
              href="/productos?favoritos=true"
            >
              <Heart className="size-5" />
              {wishlistCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white">
                  {wishlistCount}
                </span>
              ) : null}
            </Link>
            <button
              aria-label="Carrito"
              className="relative flex size-9 items-center justify-center rounded-full text-[var(--foreground)] transition hover:bg-[var(--background)] sm:size-10"
              onClick={openCart}
              type="button"
            >
              <ShoppingCart className="size-5" />
              {itemCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </header>

      {/* ========== MENU DRAWER (slides from left) ========== */}
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMenuOpen(false)}
      />
      {/* Drawer panel */}
      <aside
        aria-label="Menú de navegación"
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col bg-white shadow-[8px_0_30px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <span className="relative size-9 overflow-hidden rounded-full border border-[var(--border)] bg-white shadow-sm">
                <Image alt={storeName} className="object-cover" fill sizes="36px" src={logoUrl} />
              </span>
            ) : (
              <span className="flex size-9 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold uppercase tracking-widest text-white">
                {storeName.slice(0, 2)}
              </span>
            )}
            <div className="leading-tight">
              <p className="text-[9px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Tienda</p>
              <p className="text-sm font-semibold">{storeName}</p>
            </div>
          </div>
          <button
            aria-label="Cerrar menú"
            className="flex size-9 items-center justify-center rounded-full text-[var(--muted-foreground)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            onClick={() => setMenuOpen(false)}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Search inside drawer */}
        <div className="relative border-b border-[var(--border)] px-4 py-3">
          <form className="relative" onSubmit={handleSearchSubmit}>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-9 pr-4 text-sm outline-none transition focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(211,93,71,0.08)]"
              placeholder="Buscar producto..."
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearchQueryChange(e.target.value)}
            />
          </form>

          {/* Predictive Search Results Dropdown */}
          {searchQuery.trim() && (
            <div className="absolute left-4 right-4 top-[calc(100%-0.5rem)] z-10 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-xl">
              {isSearching ? (
                <div className="p-4 text-center text-sm text-[var(--muted-foreground)]">Buscando...</div>
              ) : searchResults.length > 0 ? (
                <div className="flex max-h-[50vh] flex-col overflow-y-auto p-2">
                  {searchResults.map((product) => (
                    <Link
                      key={product.id}
                      href={`/productos/${product.slug}`}
                      className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-[var(--background)]"
                      onClick={() => {
                        setMenuOpen(false);
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                    >
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-[var(--border)]">
                        <Image src={product.image} alt={product.name} fill className="object-cover" sizes="48px" />
                      </div>
                      <div className="flex flex-col">
                        <span className="line-clamp-1 text-sm font-medium">{product.name}</span>
                        <span className="text-xs font-semibold text-[var(--muted-foreground)]">{formatPriceRangeFromCents(product.minPriceCents, product.maxPriceCents)}</span>
                      </div>
                    </Link>
                  ))}
                  <button 
                    className="mt-2 w-full rounded-lg bg-[var(--background)] p-2.5 text-center text-xs font-semibold transition hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
                    onClick={() => {
                      router.push(`/productos?q=${encodeURIComponent(searchQuery)}`);
                      setMenuOpen(false);
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    type="button"
                  >
                    Ver todos los resultados
                  </button>
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-[var(--muted-foreground)]">No se encontraron productos.</div>
              )}
            </div>
          )}
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navLinks.map((link) => {
              const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              const LinkIcon = link.icon;
              return (
                <li key={link.href}>
                  <Link
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "text-[var(--foreground)] hover:bg-[var(--background)]"
                    }`}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                  >
                    <LinkIcon className="size-5" />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* WhatsApp link inside drawer */}
          <div className="mt-4 space-y-1 border-t border-[var(--border)] pt-4">
            <a
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#1b9c53] transition hover:bg-[#25D366]/10"
              href={whatsappHref}
              onClick={() => setMenuOpen(false)}
              rel="noreferrer"
              target="_blank"
            >
              <MessageCircleMore className="size-5" />
              Contactar por WhatsApp
            </a>
            <Link
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
              href="/login"
              onClick={() => setMenuOpen(false)}
            >
              <LogIn className="size-5" />
              Iniciar sesión
            </Link>
          </div>
        </nav>

        {/* Drawer footer */}
        <div className="border-t border-[var(--border)] px-5 py-4">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-black/85"
            onClick={() => {
              openCart();
              setMenuOpen(false);
            }}
            type="button"
          >
            <ShoppingBag className="size-4" />
            Ver carrito
            {itemCount > 0 ? (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-bold text-white">
                {itemCount}
              </span>
            ) : null}
          </button>
        </div>
      </aside>

      {/* Cart Drawer */}
      <CartDrawer freeShippingThresholdCents={freeShippingThresholdCents} onClose={closeCart} open={cartOpen} whatsappNumber={whatsappNumber} />

      {/* Mobile floating bottom navigation */}
      <nav className={`nav-auto-hide fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 flex justify-center px-3 sm:hidden ${navHidden ? "nav-hidden" : ""}`}>
        <div className="flex w-full max-w-[26rem] items-center justify-between gap-1 rounded-[2rem] border border-black/5 bg-white/94 px-2.5 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.14)] backdrop-blur-xl">
          <SideNavItem active={pathname === "/"} href="/" icon={House} label="Inicio" />
          {/* Buscar opens search overlay */}
          <SideNavButton
            active={searchOpen}
            icon={Search}
            label="Buscar"
            onClick={() => {
              setSearchOpen(!searchOpen);
              if (!searchOpen) {
                setMenuOpen(true);
                // Focus search after drawer opens
                setTimeout(() => searchInputRef.current?.focus(), 350);
              }
            }}
          />
          <CenterNavItem
            badge={itemCount}
            bump={cartBump}
            icon={ShoppingCart}
            label="Carrito"
            onClick={openCart}
          />
          <SideNavItem
            active={pathname.includes("favoritos=true")}
            href="/productos?favoritos=true"
            icon={Heart}
            label="Favoritos"
          />
          <SideNavItem
            active={pathname === "/perfil"}
            href="/perfil"
            icon={User}
            label="Perfil"
          />
        </div>
      </nav>
    </>
  );
}

type NavItemProps = {
  active?: boolean;
  external?: boolean;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  tone?: "default" | "whatsapp";
};

function SideNavItem({ active = false, external, href, icon: Icon, label, tone = "default" }: NavItemProps) {
  const className = [
    "flex min-w-[3.2rem] flex-col items-center justify-center gap-0.5 rounded-[1.2rem] px-2 py-1.5 transition",
    tone === "whatsapp"
      ? "text-[#1b9c53] hover:bg-[#25D366]/10"
      : active
        ? "bg-[var(--accent)]/10 text-[var(--accent)]"
        : "text-[var(--muted-foreground)] hover:bg-[var(--background)] hover:text-[var(--foreground)]",
  ].join(" ");

  const content = (
    <>
      <Icon className="size-5" strokeWidth={2} />
      <span className="text-[8px] font-semibold tracking-[0.1em] uppercase sm:text-[9px]">{label}</span>
    </>
  );

  if (external) {
    return (
      <a aria-label={label} className={className} href={href} rel="noreferrer" target="_blank">
        {content}
      </a>
    );
  }

  return (
    <Link aria-label={label} className={className} href={href}>
      {content}
    </Link>
  );
}

type SideNavButtonProps = {
  active?: boolean;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  onClick: () => void;
};

function SideNavButton({ active = false, icon: Icon, label, onClick }: SideNavButtonProps) {
  return (
    <button
      aria-label={label}
      className={[
        "flex min-w-[3.2rem] flex-col items-center justify-center gap-0.5 rounded-[1.2rem] px-2 py-1.5 transition",
        active
          ? "bg-[var(--accent)]/10 text-[var(--accent)]"
          : "text-[var(--muted-foreground)] hover:bg-[var(--background)] hover:text-[var(--foreground)]",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      <Icon className="size-5" strokeWidth={2} />
      <span className="text-[8px] font-semibold tracking-[0.1em] uppercase sm:text-[9px]">{label}</span>
    </button>
  );
}

type CenterNavItemProps = {
  badge?: number;
  bump?: boolean;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  onClick: () => void;
};

function CenterNavItem({
  badge,
  bump,
  icon: Icon,
  label,
  onClick,
}: CenterNavItemProps) {
  return (
    <button
      aria-label={label}
      className="btn-press relative flex size-14 shrink-0 items-center justify-center rounded-full bg-black text-white shadow-[0_8px_20px_rgba(0,0,0,0.24)] transition hover:scale-[1.03]"
      onClick={onClick}
      type="button"
    >
      <Icon className="size-6 text-white" strokeWidth={2.4} />
      {badge && badge > 0 ? (
        <span className={`absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-extrabold text-black ring-2 ring-black ${bump ? "animate-badge-bounce" : ""}`}>
          {badge}
        </span>
      ) : null}
    </button>
  );
}
