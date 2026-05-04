"use client";

import { Heart } from "lucide-react";
import { useWishlistStore } from "@/store/wishlist";
import { type CatalogProduct } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function WishlistButton({
  product,
  className,
}: {
  product: CatalogProduct;
  className?: string;
}) {
  const toggleItem = useWishlistStore((state) => state.toggleItem);
  const isInWishlist = useWishlistStore((state) => state.isInWishlist(product.id));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (!mounted) {
    return (
      <button
        aria-label="Agregar a favoritos"
        className={cn(
          "flex size-8 items-center justify-center rounded-full bg-white/80 text-[var(--muted-foreground)] shadow-sm backdrop-blur-md transition-all hover:scale-110 sm:size-9",
          className,
        )}
        type="button"
      >
        <Heart className="size-4 sm:size-4.5" />
      </button>
    );
  }

  return (
    <button
      aria-label={isInWishlist ? "Quitar de favoritos" : "Agregar a favoritos"}
      className={cn(
        "flex size-8 items-center justify-center rounded-full bg-white/80 shadow-sm backdrop-blur-md transition-all hover:scale-110 sm:size-9",
        isInWishlist ? "text-red-500" : "text-[var(--muted-foreground)] hover:text-red-500",
        className,
      )}
      onClick={(e) => {
        e.preventDefault(); // Prevent link navigation if inside a Link
        e.stopPropagation();
        toggleItem(product);
      }}
      type="button"
    >
      <Heart
        className={cn("size-4 sm:size-4.5", isInWishlist && "fill-current")}
      />
    </button>
  );
}
