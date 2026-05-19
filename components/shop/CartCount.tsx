"use client";

import { useEffect, useRef, useState } from "react";
import { useCartStore } from "@/store/cart";

export function CartCount() {
  const [mounted, setMounted] = useState(false);
  const count = useCartStore((s) => s.totalItems());
  const [pop, setPop] = useState(false);
  const prevCount = useRef(count);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (count > prevCount.current) {
      setPop(true);
      const t = setTimeout(() => setPop(false), 400);
      prevCount.current = count;
      return () => clearTimeout(t);
    }
    prevCount.current = count;
  }, [count]);

  if (!mounted || count === 0) return null;

  return (
    <span
      className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none${pop ? " animate-badge-pop" : ""}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}