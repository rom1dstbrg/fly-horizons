"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingBag, Check } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatDuration } from "@/lib/vouchers";

interface VoucherProduct {
  id: string;
  title: string;
  price: number;
  slug: string;
  short_description: string | null;
  voucher_duration_minutes: number | null;
  images: { url: string }[] | null;
}

export function VoucherBuyGrid({ vols }: { vols: VoucherProduct[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {vols.map((vol) => (
        <VoucherBuyCard key={vol.id} vol={vol} />
      ))}
    </div>
  );
}

function VoucherBuyCard({ vol }: { vol: VoucherProduct }) {
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const duree = vol.voucher_duration_minutes ?? 60;
  const img = vol.images?.[0]?.url ?? null;

  function handleAdd() {
    addItem({
      id: vol.id,
      title: vol.title,
      price: vol.price,
      quantity: 1,
      image_url: img,
      slug: vol.slug,
      product_type: "voucher",
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="flex flex-col w-full rounded-2xl overflow-hidden border border-border bg-white shadow-sm">

      {/* Visuel */}
      <div className="relative h-44 bg-[#0b2238] overflow-hidden shrink-0">
        {img ? (
          <Image
            src={img}
            alt={vol.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b2238] via-[#0e2d4a] to-[#113356] flex flex-col items-center justify-center gap-2">
            <span className="text-5xl font-black text-white leading-none tracking-tight">
              {formatDuration(duree)}
            </span>
            <span className="text-[#F2B705] text-[10px] font-bold tracking-[4px] uppercase opacity-75">
              Vol privé
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
        <div className="absolute bottom-3 left-4">
          <span className="bg-[#F2B705] text-[#113356] text-[11px] font-bold px-2.5 py-1 rounded-full">
            {formatDuration(duree)}
          </span>
        </div>
      </div>

      {/* Infos */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="flex-1">
          <h3 className="font-bold text-foreground text-sm leading-snug">{vol.title}</h3>
          {vol.short_description && (
            <p className="text-muted-foreground text-xs leading-relaxed mt-1 line-clamp-2">
              {vol.short_description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-[#113356] font-black text-2xl leading-none">{vol.price}&nbsp;€</span>
          <button
            onClick={handleAdd}
            className="h-9 px-4 flex items-center gap-1.5 bg-[#F2B705] text-[#113356] rounded-lg font-bold text-xs hover:bg-[#e6a800] active:scale-95 transition-all"
          >
            {added
              ? <><Check size={13} /> Ajouté</>
              : <><ShoppingBag size={13} /> Offrir</>
            }
          </button>
        </div>
      </div>

    </div>
  );
}
