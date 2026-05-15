"use client";

import Link from "next/link";
import { CalendarCheck, Gift } from "lucide-react";

interface VolDetailClientProps {
  price: number;
  duree: number;
}

export function VolDetailClient({ price, duree }: VolDetailClientProps) {
  return (
    <div className="space-y-3">

      {/* ── Réserver pour moi ── */}
      <div className="bg-[#0b2238] rounded-2xl p-6 flex flex-col gap-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CalendarCheck size={15} className="text-[#F2B705]" />
            <span className="text-xs font-bold text-white uppercase tracking-[2px]">Réserver pour moi</span>
          </div>
          <p className="text-sm text-white/60 leading-relaxed">
            Choisissez votre date et créneau directement avec le pilote. Confirmation envoyée par email avec votre numéro de référence.
          </p>
        </div>
        <div>
          <span className="text-4xl font-black text-white">{price}&nbsp;€</span>
        </div>
        <Link
          href={`/reservation?duree=${duree}`}
          className="w-full h-12 flex items-center justify-center gap-2 bg-[#F2B705] text-[#113356] rounded-xl font-bold text-sm hover:bg-[#e6a800] transition-colors"
        >
          <CalendarCheck size={16} />
          Choisir une date
        </Link>
        <p className="text-[10px] text-white/35">
          Paiement sécurisé via Stripe · Confirmation instantanée avec votre #REF
        </p>
      </div>

      {/* ── Offrir — lien secondaire ── */}
      <div className="flex items-center gap-2 justify-center py-1">
        <Gift size={12} className="text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Vous souhaitez offrir ce vol ?{" "}
          <Link href="/vouchers" className="text-[#113356] font-semibold hover:underline">
            Acheter un voucher cadeau →
          </Link>
        </p>
      </div>

    </div>
  );
}
