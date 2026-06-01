import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { formatDuration } from "@/lib/vouchers";

interface Pack {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  price: number;
  voucher_duration_minutes: number | null;
  images?: { url: string }[] | null;
}

export default function PackShopGrid({ packs }: { packs: Pack[] }) {
  if (!packs.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      {packs.map((pack) => {
        const duree = pack.voucher_duration_minutes ?? 60;
        const image = pack.images?.[0]?.url ?? null;

        return (
          <Link
            key={pack.id}
            href={`/vols/${pack.slug}`}
            className="group block focus-visible:outline-none h-full"
          >
            <article className="flex flex-col h-full rounded-2xl overflow-hidden bg-white
              shadow-[0_2px_12px_rgba(11,34,56,0.08),0_0_0_1px_rgba(0,0,0,0.05)]
              hover:shadow-[0_8px_32px_rgba(11,34,56,0.14),0_0_0_1px_rgba(242,183,5,0.30)]
              transition-all duration-400 ease-out">

              {/* Image */}
              <div className="relative h-48 sm:h-52 shrink-0 overflow-hidden bg-[#0b2238]">
                {image ? (
                  <Image
                    src={image}
                    alt={pack.title}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
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

                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent pointer-events-none" />

                {/* Badge — durée seule */}
                <div className="absolute top-3.5 left-3.5 bg-black/30 backdrop-blur-md border border-white/15 rounded-lg px-2.5 py-1.5">
                  <span className="text-[#F2B705] font-black text-[13px] leading-none">{formatDuration(duree)}</span>
                </div>
              </div>

              {/* Contenu */}
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

                {/* Footer */}
                <div className="pt-4 mt-4 border-t border-[#0b2238]/10 flex items-center justify-between gap-3">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[#0b2238] font-black text-[26px] leading-none">{pack.price}</span>
                    <span className="text-[#0b2238]/50 text-[13px] font-medium ml-0.5">€</span>
                  </div>

                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                    bg-[#0b2238] text-white text-[13px] font-semibold
                    group-hover:bg-[#F2B705] group-hover:text-[#0b2238]
                    transition-all duration-300">
                    <span>Réserver</span>
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-300" />
                  </div>
                </div>
              </div>

            </article>
          </Link>
        );
      })}
    </div>
  );
}
