"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, SlidersHorizontal, X, Package, ChevronDown } from "lucide-react";

import { ProductCard } from "@/components/shop/product-card";
import { useGsapContext, gsap } from "@/lib/gsap";
import { useWishlistStore } from "@/store/wishlist";
import type { CatalogProduct, CatalogCategory } from "@/lib/catalog";

type CatalogViewProps = {
  categories: CatalogCategory[];
  products: CatalogProduct[];
  initialQuery?: string;
  showFavoritesOnly?: boolean;
};

export function CatalogView({ categories, products, initialQuery = "", showFavoritesOnly = false }: CatalogViewProps) {
  const wishlistItems = useWishlistStore((state) => state.items);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc" | "name">("default");
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const chipScrollRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);

    return () => window.clearTimeout(timer);
  }, []);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = showFavoritesOnly ? wishlistItems : [...products];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.category.name.toLowerCase().includes(q),
      );
    }

    // Filter by category
    if (activeCategory) {
      result = result.filter((p) => p.category.slug === activeCategory);
    }

    // Sort
    switch (sortBy) {
      case "price-asc":
        result.sort((a, b) => a.minPriceCents - b.minPriceCents);
        break;
      case "price-desc":
        result.sort((a, b) => b.maxPriceCents - a.maxPriceCents);
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [products, wishlistItems, showFavoritesOnly, searchQuery, activeCategory, sortBy]);

  const activeCategoryName = activeCategory
    ? categories.find((c) => c.slug === activeCategory)?.name ?? "Productos"
    : null;

  const productCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    const baseProducts = showFavoritesOnly ? wishlistItems : products;
    for (const p of baseProducts) {
      counts[p.category.slug] = (counts[p.category.slug] || 0) + 1;
    }
    return counts;
  }, [products, wishlistItems, showFavoritesOnly]);

  // Scroll active chip into view
  useEffect(() => {
    if (activeCategory && chipScrollRef.current) {
      const activeChip = chipScrollRef.current.querySelector("[data-active='true']");
      if (activeChip) {
        activeChip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [activeCategory]);

  return (
    <div className="flex flex-col gap-0">
      {/* Search bar — sticky below header */}
      <div className="sticky top-[57px] z-20 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-xl sm:top-[61px]">
        <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex items-center gap-2">
            <form
              className="relative flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                searchInputRef.current?.blur();
              }}
            >
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                ref={searchInputRef}
                className="h-11 w-full rounded-2xl border border-[var(--border)] bg-white pl-10 pr-10 text-sm outline-none transition-all duration-200 placeholder:text-[var(--muted-foreground)]/60 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(211,93,71,0.08)]"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos..."
                type="search"
                value={searchQuery}
              />
              {searchQuery && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[var(--muted-foreground)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                  onClick={() => setSearchQuery("")}
                  type="button"
                >
                  <X className="size-4" />
                </button>
              )}
            </form>

            {/* Sort / filter toggle */}
            <button
              className={`flex h-11 items-center gap-1.5 rounded-2xl border px-3.5 text-sm font-medium transition-all duration-200 ${
                showFilters
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--accent)]/30"
              }`}
              onClick={() => setShowFilters(!showFilters)}
              type="button"
            >
              <SlidersHorizontal className="size-4" />
              <span className="hidden sm:inline">Filtros</span>
            </button>
          </div>

          {/* Sort dropdown — shown when filters toggled */}
          {showFilters && (
            <div className="mt-3 flex items-center gap-3 animate-[fadeInUp_0.2s_ease-out]">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">Ordenar:</span>
              <div className="relative">
                <select
                  className="h-9 appearance-none rounded-xl border border-[var(--border)] bg-white pl-3 pr-8 text-xs font-medium outline-none transition focus:border-[var(--accent)]"
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  value={sortBy}
                >
                  <option value="default">Relevancia</option>
                  <option value="price-asc">Precio: menor a mayor</option>
                  <option value="price-desc">Precio: mayor a menor</option>
                  <option value="name">Nombre A-Z</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category chips — horizontally scrollable */}
      <div className="border-b border-[var(--border)] bg-[var(--background)]">
        <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 lg:px-10">
          <div
            ref={chipScrollRef}
            className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5"
          >
            <button
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold shadow-sm transition-all duration-200 hover:shadow-md sm:text-sm ${
                activeCategory === null
                  ? "border-[var(--foreground)] bg-[var(--foreground)] text-white shadow-[var(--foreground)]/20"
                  : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--foreground)]/20"
              }`}
              data-active={activeCategory === null}
              onClick={() => setActiveCategory(null)}
              type="button"
            >
              Todas
              <span className="ml-1.5 opacity-60">
                {showFavoritesOnly ? wishlistItems.length : products.length}
              </span>
            </button>
            {categories
              .filter((c) => c.name && c.name.trim() !== "")
              .map((category) => (
                <button
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold shadow-sm transition-all duration-200 hover:shadow-md sm:text-sm ${
                    activeCategory === category.slug
                      ? "border-[var(--foreground)] bg-[var(--foreground)] text-white shadow-[var(--foreground)]/20"
                      : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--foreground)]/20"
                  }`}
                  data-active={activeCategory === category.slug}
                  key={category.id}
                  onClick={() =>
                    setActiveCategory(activeCategory === category.slug ? null : category.slug)
                  }
                  type="button"
                >
                  {category.name}
                  <span className="ml-1.5 opacity-60">
                    {productCountByCategory[category.slug] || 0}
                  </span>
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Results info bar */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-5 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {activeCategoryName ? (
              <div className="flex items-center gap-2">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight sm:text-xl">
                  {activeCategoryName}
                </h2>
                <button
                  className="flex items-center gap-1 rounded-full bg-[var(--foreground)]/5 px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--foreground)]/10"
                  onClick={() => setActiveCategory(null)}
                  type="button"
                >
                  <X className="size-3" />
                  Limpiar
                </button>
              </div>
            ) : (
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight sm:text-xl">
                {showFavoritesOnly
                  ? "Tus Favoritos"
                  : searchQuery
                    ? "Resultados"
                    : "Todos los productos"}
              </h2>
            )}
          </div>
          <p className="shrink-0 text-xs font-medium text-[var(--muted-foreground)] sm:text-sm">
            {filteredProducts.length}{" "}
            {filteredProducts.length === 1 ? "producto" : "productos"}
          </p>
        </div>
      </div>

      {/* Products grid */}
      <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 sm:px-6 sm:pb-12 lg:px-10">
        {!mounted ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-[var(--card-radius,1rem)] bg-[var(--border)] sm:aspect-[3/4]"></div>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <ProductGrid products={filteredProducts} />
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-[var(--border)] bg-white/50">
            <div className="flex size-16 items-center justify-center rounded-full bg-[var(--foreground)]/5">
              <Package className="size-7 text-[var(--muted-foreground)]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                No se encontraron productos
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {showFavoritesOnly
                  ? "Aún no has guardado ningún producto en favoritos."
                  : searchQuery
                    ? `No hay resultados para "${searchQuery}"`
                    : "No hay productos en esta categoría."}
              </p>
            </div>
            {(searchQuery || activeCategory) && (
              <button
                className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--foreground)] shadow-sm transition hover:shadow-md"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory(null);
                }}
                type="button"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductGrid({ products }: { products: CatalogProduct[] }) {
  const signature = products.map((p) => p.id).join(",");
  const gridRef = useGsapContext<HTMLDivElement>(() => {
    gsap.fromTo(
      "[data-anim='product-grid'] > article",
      { y: 24, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.45,
        ease: "power3.out",
        stagger: { each: 0.04, from: "start" },
        overwrite: "auto",
      },
    );
  }, [signature]);

  return (
    <div
      ref={gridRef}
      data-anim="product-grid"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:gap-5"
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
