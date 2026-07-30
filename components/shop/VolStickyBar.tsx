"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { CalendarCheck } from "lucide-react";

interface VolStickyBarProps {
  id: string;
  slug: string;
  title: string;
  price: number;
  duree: number;
  image_url: string | null;
}

// Bouton "Offrir" (ajout panier) retiré le 30/07/2026 — arrêt de la vente publique de vouchers,
// voir audit-legal-fly-horizons.html point critique n°1. Ne reste que la réservation directe.
export function VolStickyBar({ title, price, duree }: VolStickyBarProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = document.getElementById("vol-cta");
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${show ? "translate-y-0" : "translate-y-full"}`}>
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

          {/* Droite : bouton */}
          <Link
            href={`/reservation?duree=${duree}`}
            className="h-10 px-5 flex items-center gap-2 bg-[#F2B705] text-[#0b2238] rounded-lg text-sm font-black hover:bg-[#e6a800] transition-colors shadow-[0_2px_8px_rgba(242,183,5,0.35)] whitespace-nowrap shrink-0"
          >
            <CalendarCheck size={15} />
            Réserver
          </Link>

        </div>
      </div>
    </div>
  );
}
