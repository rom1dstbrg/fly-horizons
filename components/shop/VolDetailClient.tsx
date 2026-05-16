"use client";

import Link from "next/link";
import { CalendarCheck, Gift, Lock } from "lucide-react";

interface VolDetailClientProps {
  price: number;
  duree: number;
}

export function VolDetailClient({ price, duree }: VolDetailClientProps) {
  return (
    <div className="space-y-3">

      {/* ── Réservation ── */}
      <div className="bg-[#0b2238] rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-white">{price}&nbsp;€</span>
          <span className="text-white/40 text-sm">/ avion</span>
        </div>

        <Link
          href={`/reservation?duree=${duree}`}
          className="w-full h-12 flex items-center justify-center gap-2 bg-[#F2B705] text-[#113356] rounded-xl font-bold text-sm hover:bg-[#e6a800] transition-colors"
        >
          <CalendarCheck size={16} />
          Réserver
        </Link>

        <p className="text-[10px] text-white/35 flex items-center gap-1">
          <Lock size={9} />
          Paiement sécurisé via Stripe · Confirmation instantanée par email
        </p>
      </div>

      {/* ── Offrir ── */}
      <Link
        href="/packs"
        className="flex items-center justify-between gap-3 bg-[#F2B705]/10 border border-[#F2B705]/30 rounded-xl px-4 py-3 hover:bg-[#F2B705]/20 transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          <Gift size={14} className="text-[#b38a00] shrink-0" />
          <span className="text-sm font-semibold text-[#7a5e00]">Vous souhaitez offrir ce vol ?</span>
        </div>
        <span className="text-sm font-bold text-[#113356] group-hover:underline whitespace-nowrap">
          Acheter un voucher cadeau →
        </span>
      </Link>

    </div>
  );
}
