"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarCheck, Gift, Lock, Check, ArrowRight } from "lucide-react";
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
    <div className="space-y-5">

      {/* Prix */}
      <div>
        <p className="text-[#0b2238]/40 text-[10px] uppercase tracking-[2px] font-semibold mb-1.5">Prix du vol</p>
        <div className="flex items-baseline gap-2">
          <span className="text-[42px] font-black text-[#0b2238] leading-none">{price}&nbsp;€</span>
          <span className="text-[#0b2238]/35 text-sm">/ avion</span>
        </div>
      </div>

      {/* Boutons */}
      <div className="flex flex-col gap-3">

        <Link
          href={`/reservation?duree=${duree}`}
          className="w-full h-12 flex items-center justify-center gap-2 bg-[#F2B705] text-[#113356] rounded-xl font-bold text-sm hover:bg-[#e6a800] transition-colors"
        >
          <CalendarCheck size={16} />
          Réserver une date
        </Link>

        <div className="relative flex items-center">
          <div className="flex-1 border-t border-border/60" />
          <span className="px-3 text-[10px] text-muted-foreground/40 uppercase tracking-widest">ou</span>
          <div className="flex-1 border-t border-border/60" />
        </div>

        <button
          onClick={handleAddToCart}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-xl font-semibold text-sm
            bg-white border border-border text-foreground/75
            hover:border-[#113356] hover:text-[#113356]
            active:scale-95 transition-all duration-200"
        >
          {added ? (
            <><Check size={14} className="text-[#F2B705]" /> Ajouté au panier !</>
          ) : (
            <><Gift size={14} /> Offrir ce vol en cadeau</>
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

      {/* Notes */}
      <div className="border-t border-border/60 pt-4 space-y-2">
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
          Code cadeau envoyé par email immédiatement après paiement. Valable 1 an.
        </p>
        <p className="text-[10px] text-muted-foreground/55 flex items-start gap-1.5 leading-relaxed">
          <Lock size={9} className="shrink-0 mt-0.5" />
          <span>
            Réservation jusqu'à <strong className="text-muted-foreground/80">48 h avant le vol</strong>. Demande urgente ?{" "}
            <Link href="/contact" className="underline underline-offset-2 hover:text-[#113356] transition-colors">Contactez-nous</Link>.
          </span>
        </p>
      </div>

    </div>
  );
}
