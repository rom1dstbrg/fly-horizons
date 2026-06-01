"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowRight, ShoppingBag, Check } from "lucide-react";
import { formatDuration } from "@/lib/vouchers";
import { useCartStore } from "@/store/cart";

interface PackBase {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  price: number;
  voucher_duration_minutes: number | null;
  images?: { url: string }[] | null;
}

// ── Version "lien" — landing page & nos-offres ─────────────────────────
export function PackCard({ pack, isPopular }: { pack: PackBase; isPopular?: boolean }) {
  const duree = pack.voucher_duration_minutes ?? 60;
  const image = pack.images?.[0]?.url ?? null;

  return (
    <Link href={`/vols/${pack.slug}`} className="group block focus-visible:outline-none">
      <article className="relative overflow-hidden rounded-lg aspect-[4/3] sm:aspect-[3/4]">
        {image ? (
          <Image
            src={image}
            alt={pack.title}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            sizes="(max-width:640px) 100vw, (max-width:1280px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b2238] via-[#0e3060] to-[#1a4a8a]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/20 to-transparent" />

        {/* Badges haut */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
          <div className="inline-flex items-center bg-black/40 backdrop-blur-md border border-white/20 rounded-lg px-3.5 py-2">
            <span className="text-[#F2B705] font-black text-[15px] leading-none">{duree} min</span>
          </div>
          {isPopular && (
            <div className="inline-flex items-center bg-[#F2B705] rounded-lg px-3 py-2">
              <span className="text-[#0b2238] font-black text-[11px] leading-none uppercase tracking-wide">Le plus offert</span>
            </div>
          )}
        </div>

        {/* Contenu bas */}
        <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-5">
          <h3 className="text-white font-bold text-[19px] sm:text-[21px] leading-tight mb-1.5">
            {pack.title}
          </h3>
          {pack.short_description && (
            <p className="text-white/70 text-[13px] leading-snug mb-2.5 line-clamp-2">
              {pack.short_description}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-white font-black text-[24px] leading-none">{pack.price} €</span>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold
              bg-white/12 text-white border border-white/18
              px-3 py-2 rounded-lg backdrop-blur-sm shrink-0
              group-hover:bg-[#F2B705] group-hover:text-[#0b2238] group-hover:border-transparent
              transition-all duration-300">
              Réserver
              <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

// ── Version "achat" — VoucherBuyGrid, page vouchers ───────────────────
export function PackBuyCard({ pack }: { pack: PackBase }) {
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const duree = pack.voucher_duration_minutes ?? 60;
  const image = pack.images?.[0]?.url ?? null;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    addItem({
      id: pack.id,
      title: pack.title,
      price: pack.price,
      quantity: 1,
      image_url: image,
      slug: pack.slug,
      product_type: "voucher",
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <article className="flex flex-col h-full rounded-3xl overflow-hidden bg-white
      shadow-[0_4px_20px_rgba(11,34,56,0.07),0_0_0_1px_rgba(0,0,0,0.06)]
      hover:shadow-[0_10px_40px_rgba(11,34,56,0.16),0_0_0_1px_rgba(242,183,5,0.22)]
      transition-all duration-500 ease-out group">

      <div className="relative h-44 sm:h-48 shrink-0 overflow-hidden bg-[#0b2238]">
        {image ? (
          <Image
            src={image}
            alt={pack.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b2238] via-[#0e3060] to-[#1a4a8a] flex flex-col items-center justify-center select-none">
            <span className="text-white/90 font-black text-5xl leading-none tracking-tight">
              {formatDuration(duree)}
            </span>
            <span className="text-[#F2B705]/70 text-[10px] font-bold tracking-[4px] uppercase mt-3">
              Vol privé
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent pointer-events-none" />
        <div className="absolute top-3.5 left-3.5">
          <div className="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/15 rounded-xl px-3 py-1.5">
            <span className="text-[#F2B705] font-black text-[13px] leading-none">{formatDuration(duree)}</span>
            <span className="text-white/50 text-[11px] leading-none">avion léger</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 p-5">
        <div className="flex-1">
          <h3 className="font-bold text-[#0b2238] text-[15px] sm:text-base leading-snug mb-2 line-clamp-1">
            {pack.title}
          </h3>
          <p className="text-[#0b2238]/50 text-[12.5px] leading-relaxed line-clamp-2 min-h-[2.6rem] mb-3">
            {pack.short_description ?? ""}
          </p>
          <p className="text-[11px] text-[#0b2238]/50/55 tracking-wide flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-[#F2B705] shrink-0" />
            Briefing · Casques · 3 passagers
          </p>
        </div>

        <div className="pt-4 mt-4 border-t border-[#0b2238]/10 space-y-3">
          <div>
            <p className="text-[10px] font-semibold text-[#F2B705] uppercase tracking-[2px] mb-1">
              À partir de
            </p>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[#0b2238] font-black text-[26px] leading-none">{pack.price}</span>
              <span className="text-[#0b2238]/50 text-[13px] font-medium ml-0.5">€</span>
            </div>
          </div>

          <p className="text-[10px] text-[#0b2238]/50/60 text-center">
            ✓ Valable 12 mois · Transférable librement
          </p>

          <button
            onClick={handleAdd}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
              text-[13px] font-semibold tracking-wide
              bg-[#F2B705] text-[#0b2238]
              hover:bg-[#e6a800] hover:shadow-[0_4px_14px_rgba(242,183,5,0.35)]
              active:scale-95
              transition-all duration-200"
          >
            {added
              ? <><Check size={14} /> Ajouté au panier</>
              : <><ShoppingBag size={14} /> Offrir ce vol</>
            }
          </button>
        </div>
      </div>
    </article>
  );
}
