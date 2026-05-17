"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarCheck, Gift, Lock, ShoppingBag, Check, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/cart";

interface VolDetailClientProps {
  id: string;
  slug: string;
  title: string;
  price: number;
  duree: number;
  image_url: string | null;
}

export function VolDetailClient({ id, slug, title, price, duree, image_url }: VolDetailClientProps) {
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  function handleAddToCart() {
    addItem({
      id,
      title,
      price,
      quantity: 1,
      image_url,
      slug,
      product_type: "voucher",
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 3000);
  }

  return (
    <div className="space-y-3">

      {/* ── Réservation directe ── */}
      <div className="bg-[#0b2238] rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <p className="text-white/40 text-[10px] uppercase tracking-[2px] font-semibold mb-1">Prix du vol</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">{price}&nbsp;€</span>
            <span className="text-white/40 text-sm">/ avion</span>
          </div>
        </div>

        <Link
          href={`/reservation?duree=${duree}`}
          className="w-full h-12 flex items-center justify-center gap-2 bg-[#F2B705] text-[#113356] rounded-xl font-bold text-sm hover:bg-[#e6a800] transition-colors"
        >
          <CalendarCheck size={16} />
          Réserver une date
        </Link>

        <p className="text-[10px] text-white/30 flex items-center gap-1.5">
          <Lock size={9} />
          Confirmation par email après réservation
        </p>
      </div>

      {/* ── Offrir comme cadeau ── */}
      <div className="bg-[#fffbeb] border border-[#F2B705]/30 rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#F2B705]/20 flex items-center justify-center shrink-0">
            <Gift size={14} className="text-[#b38a00]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#6b4c00]">Offrir ce vol en cadeau</p>
            <p className="text-[11px] text-[#a37e00]/80 mt-0.5 leading-relaxed">
              Le code voucher est envoyé par email immédiatement après le paiement. Valable 1 an.
            </p>
          </div>
        </div>

        <button
          onClick={handleAddToCart}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-xl font-semibold text-sm
            bg-[#0b2238] text-white
            hover:bg-[#0e2f4a] hover:shadow-[0_4px_14px_rgba(17,51,86,0.25)]
            active:scale-95
            transition-all duration-200"
        >
          {added ? (
            <><Check size={14} className="text-[#F2B705]" /> Ajouté au panier !</>
          ) : (
            <><ShoppingBag size={14} /> Ajouter au panier</>
          )}
        </button>

        {added && (
          <Link
            href="/cart"
            className="flex items-center justify-center gap-1.5 text-[12px] font-bold text-[#113356] hover:underline"
          >
            Voir mon panier et finaliser
            <ArrowRight size={12} />
          </Link>
        )}
      </div>

    </div>
  );
}
