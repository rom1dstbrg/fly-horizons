import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image_url: string | null;
  slug: string;
  product_type?: "physical" | "voucher";
}

const CART_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

interface CartStore {
  items: CartItem[];
  _savedAt: number | null;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      _savedAt: null,

      addItem: (item) => {
        const existing = get().items.find((i) => i.id === item.id);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.id === item.id
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
            _savedAt: Date.now(),
          });
        } else {
          set({ items: [...get().items, item], _savedAt: Date.now() });
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () => set({ items: [], _savedAt: null }),

      totalItems: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: "fly-horizons-cart",
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state._savedAt != null && Date.now() - state._savedAt > CART_TTL_MS) {
          state.items = [];
          state._savedAt = null;
        }
      },
    }
  )
);
