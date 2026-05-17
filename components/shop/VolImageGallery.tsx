"use client";

import { useState } from "react";
import Image from "next/image";
import { formatDuration } from "@/lib/vouchers";

interface VolImageGalleryProps {
  images: { url: string }[];
  title: string;
  duree: number;
}

export function VolImageGallery({ images, title, duree }: VolImageGalleryProps) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded-3xl overflow-hidden aspect-[16/10] relative bg-[#0b2238]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b2238] via-[#0e3060] to-[#1a4a8a] flex flex-col items-center justify-center gap-4">
            <p className="text-white text-7xl font-black leading-none tracking-tight">{formatDuration(duree)}</p>
            <p className="text-white/30 text-xs font-semibold uppercase tracking-[4px]">Vol privé · Au départ de Charleroi</p>
          </div>
          <div className="absolute top-5 left-5">
            <div className="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/15 rounded-xl px-3 py-1.5">
              <span className="text-[#F2B705] font-black text-[13px] leading-none">{formatDuration(duree)}</span>
              <span className="text-white/50 text-[11px] leading-none">vol privé</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* Image principale */}
      <div className="rounded-3xl overflow-hidden aspect-[16/10] relative bg-[#0b2238]">
        <Image
          src={images[active].url}
          alt={title}
          fill
          className="object-cover transition-opacity duration-300"
          sizes="(max-width: 1024px) 100vw, 58vw"
          priority={active === 0}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10 pointer-events-none" />

        {/* Badge durée */}
        <div className="absolute top-5 left-5">
          <div className="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/15 rounded-xl px-3 py-1.5">
            <span className="text-[#F2B705] font-black text-[13px] leading-none">{formatDuration(duree)}</span>
            <span className="text-white/50 text-[11px] leading-none">vol privé</span>
          </div>
        </div>

        {/* Compteur */}
        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/45 backdrop-blur-sm text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-xl">
            {active + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Miniatures */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`relative shrink-0 w-16 h-11 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                i === active
                  ? "border-[#F2B705] opacity-100"
                  : "border-transparent opacity-50 hover:opacity-75"
              }`}
            >
              <Image
                src={img.url}
                alt={`${title} — vue ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}

    </div>
  );
}
