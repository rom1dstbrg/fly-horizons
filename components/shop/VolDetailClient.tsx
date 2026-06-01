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
      <div className="pb-5 border-b border-border">
        <p className="text-[10px] font-bold text-primary uppercase tracking-[2px] mb-2">Prix du vol</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[44px] font-black text-foreground leading-none">{price}&nbsp;€</span>
          <span className="text-muted-foreground text-sm">/ avion</span>
        </div>
      </div>

      {/* Boutons */}
      <div className="flex flex-col gap-3">

        <Link
          href={`/reservation?duree=${duree}`}
          className="w-full h-12 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg font-black text-sm hover:bg-[#e6a800] transition-colors shadow-gold"
        >
          <CalendarCheck size={16} />
          Réserver une date
        </Link>

        <div className="relative flex items-center">
          <div className="flex-1 border-t border-border" />
          <span className="px-3 text-[10px] text-muted-foreground/50 uppercase tracking-widest">ou</span>
          <div className="flex-1 border-t border-border" />
        </div>

        <button
          onClick={handleAddToCart}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-lg font-semibold text-sm
            border border-border text-muted-foreground
            hover:border-foreground hover:text-foreground
            active:scale-95 transition-all duration-200 cursor-pointer"
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
            className="flex items-center justify-center gap-1.5 text-[12px] font-bold text-foreground hover:underline"
          >
            Voir mon panier et finaliser
            <ArrowRight size={12} />
          </Link>
        )}

      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Code cadeau envoyé par email immédiatement après paiement. Valable 1 an.
        </p>
        <p className="text-[10px] text-[#0b2238]/40 flex items-start gap-1.5 leading-relaxed">
          <Lock size={9} className="shrink-0 mt-0.5" />
          <span>
            Réservation jusqu'à <strong className="text-foreground/60">48 h avant le vol</strong>. Demande urgente ?{" "}
            <Link href="/contact" className="underline underline-offset-2 hover:text-foreground transition-colors">Contactez-nous</Link>.
          </span>
        </p>
      </div>

    </div>
  );
}
