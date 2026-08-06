"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

interface PackBase {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  price: number;
  voucher_duration_minutes: number | null;
  images?: { url: string; position?: number }[] | null;
}

// ── Version "lien" — landing page & nos-offres ─────────────────────────
export function PackCard({ pack }: { pack: PackBase }) {
  const duree = pack.voucher_duration_minutes ?? 60;
  const image = [...(pack.images ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.url ?? null;

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

        {/* Badge durée */}
        <div className="absolute top-4 left-4 right-4 flex items-start">
          <div className="inline-flex items-center bg-black/40 backdrop-blur-md border border-white/20 rounded-lg px-3.5 py-2">
            <span className="text-[#F2B705] font-black text-[15px] leading-none">{duree} min</span>
          </div>
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
              Plus d&apos;infos
              <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
