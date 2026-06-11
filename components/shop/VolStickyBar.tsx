"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarCheck, Gift, Check } from "lucide-react";
import { useCartStore } from "@/store/cart";

interface VolStickyBarProps {
  id: string;
  slug: string;
  title: string;
  price: number;
  duree: number;
  image_url: string | null;
}

export function VolStickyBar({ id, slug, title, price, duree, image_url }: VolStickyBarProps) {
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  function handleAddToCart() {
    addItem({ id, title, price, quantity: 1, image_url, slug, product_type: "voucher" });
    setAdded(true);
    setTimeout(() => setAdded(false), 3000);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-white/96 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 h-[68px] flex items-center justify-between gap-4">

          {/* Gauche : nom + prix */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0 hidden xs:block">
              <p className="text-sm font-black text-[#0b2238] truncate max-w-[180px] sm:max-w-xs">
                {title}
              </p>
            </div>
            <div className="flex items-baseline gap-1 shrink-0">
              <span className="text-2xl font-black text-[#0b2238] leading-none">{price}&nbsp;€</span>
              <span className="text-xs text-[#0b2238]/50">/ avion</span>
            </div>
          </div>

          {/* Droite : boutons */}
          <div className="flex items-center gap-2 shrink-0">

            <button
              onClick={handleAddToCart}
              className="h-10 px-4 flex items-center gap-1.5 rounded-lg border border-[#0b2238]/20 text-sm font-semibold text-[#0b2238] hover:border-[#0b2238] transition-all cursor-pointer whitespace-nowrap"
            >
              {added ? (
                <><Check size={14} className="text-[#F2B705]" /> Ajouté !</>
              ) : (
                <><Gift size={14} /> Offrir</>
              )}
            </button>

            <Link
              href={`/reservation?duree=${duree}`}
              className="h-10 px-5 flex items-center gap-2 bg-[#F2B705] text-[#0b2238] rounded-lg text-sm font-black hover:bg-[#e6a800] transition-colors shadow-[0_2px_8px_rgba(242,183,5,0.35)] whitespace-nowrap"
            >
              <CalendarCheck size={15} />
              Réserver
            </Link>

          </div>
        </div>
      </div>
    </div>
  );
}
