"use client";

import { useEffect } from "react";
import { useCartStore } from "@/store/cart";

export function ClearCart() {
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return null;
}