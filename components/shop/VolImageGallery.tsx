"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDuration } from "@/lib/vouchers";

interface VolImageGalleryProps {
  images: { url: string }[];
  title: string;
  duree: number;
}

const AUTOPLAY_MS = 5000;

export function VolImageGallery({ images, title, duree }: VolImageGalleryProps) {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (images.length <= 1) return;
    timerRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % images.length);
    }, AUTOPLAY_MS);
  }, [images.length]);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  function goTo(i: number) {
    setActive(i);
    startTimer();
  }

  if (images.length === 0) {
    return (
      <div className="rounded-2xl overflow-hidden aspect-[16/10] relative bg-[#0b2238]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b2238] via-[#0e3060] to-[#1a4a8a] flex flex-col items-center justify-center gap-4">
          <p className="text-white text-7xl font-black leading-none tracking-tight">{formatDuration(duree)}</p>
          <p className="text-white/30 text-xs font-semibold uppercase tracking-[4px]">Vol privé · Au départ de Charleroi</p>
        </div>
        <div className="absolute top-5 left-5">
          <div className="inline-flex items-center bg-black/40 backdrop-blur-md border border-white/15 rounded-xl px-4 py-2">
            <span className="text-[#F2B705] font-black text-[20px] leading-none">{formatDuration(duree)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* Image principale */}
      <div className="rounded-2xl overflow-hidden aspect-[16/10] relative bg-[#0b2238]">
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
        <div className="absolute top-5 left-5 pointer-events-none">
          <div className="inline-flex items-center bg-black/40 backdrop-blur-md border border-white/15 rounded-xl px-4 py-2">
            <span className="text-[#F2B705] font-black text-[20px] leading-none">{formatDuration(duree)}</span>
          </div>
        </div>

        {/* Flèches */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo((active - 1 + images.length) % images.length)}
              aria-label="Image précédente"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white hover:bg-black/60 transition-colors cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => goTo((active + 1) % images.length)}
              aria-label="Image suivante"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white hover:bg-black/60 transition-colors cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* Compteur */}
        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/45 backdrop-blur-sm text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-xl pointer-events-none">
            {active + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Miniatures centrées */}
      {images.length > 1 && (
        <div className="flex justify-center gap-2 flex-wrap">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              className={`relative shrink-0 w-16 h-11 rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
                i === active
                  ? "border-[#F2B705] opacity-100"
                  : "border-transparent opacity-50 hover:opacity-75"
              }`}
            >
              <Image
                src={img.url}
                alt={`${title}, vue ${i + 1}`}
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
