import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type CartItem = {
  id: string;
  productId?: string;
  variantId?: string;
  internalSku?: string;
  variantLabel?: string;
  size?: string;
  colorName?: string;
  slug: string;
  name: string;
  image: string;
  priceCents: number;
  quantity: number;
};

export type CartItemInput = Omit<CartItem, "quantity">;

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: CartItemInput) => void;
  decrementItem: (id: string) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((entry) => entry.id === item.id);

          if (existing) {
            return {
              items: state.items.map((entry) =>
                entry.id === item.id
                  ? { ...entry, quantity: entry.quantity + 1 }
                  : entry,
              ),
            };
          }

          return {
            items: [...state.items, { ...item, quantity: 1 }],
          };
        }),
      decrementItem: (id) =>
        set((state) => {
          const existing = state.items.find((entry) => entry.id === id);
          if (!existing) return state;
          if (existing.quantity <= 1) {
            return { items: state.items.filter((item) => item.id !== id) };
          }
          return {
            items: state.items.map((entry) =>
              entry.id === id
                ? { ...entry, quantity: entry.quantity - 1 }
                : entry,
            ),
          };
        }),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
    }),
    {
      name: "studio-catalog-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);