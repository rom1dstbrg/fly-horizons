"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Images, X, ChevronLeft, ChevronRight } from "lucide-react";

// Galerie de la page produit (nouvelle DA, maquette-page-produit.html) :
// téléphone = carrousel pleine largeur à glisser + compteur ; ordinateur = mosaïque
// (1 grande + 4) + bouton « Voir les N photos » qui ouvre la visionneuse.
export function VolGallery({ images, title, badge }: { images: string[]; title: string; badge: string }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const n = images.length;

  useEffect(() => {
    if (open === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % n));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + n) % n));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, n]);

  const Badge = (
    <span className="absolute left-3.5 top-3.5 lg:left-[18px] lg:top-[18px] z-10 pointer-events-none rounded-lg border border-white/20 bg-black/40 backdrop-blur-md px-3.5 py-2 text-[15px] lg:text-[17px] font-black leading-none text-primary">
      {badge}
    </span>
  );

  if (n === 0) {
    return (
      <div className="relative -mx-4 sm:-mx-6 lg:mx-0 mt-5 lg:mt-8 aspect-[4/3] lg:aspect-[21/8] lg:rounded-[14px] overflow-hidden bg-gradient-to-br from-[#0b2238] via-[#0e3060] to-[#1a4a8a]">
        {Badge}
      </div>
    );
  }

  const mosaic = n >= 5;
  const desktopCols = n === 1 ? "lg:grid-cols-1" : mosaic ? "lg:grid-cols-[2fr_1fr_1fr]" : "lg:grid-cols-[2fr_1fr]";
  // Classes écrites en entier : Tailwind ne génère pas les noms construits dynamiquement.
  const ROWS: Record<number, string> = { 1: "lg:grid-rows-1", 2: "lg:grid-rows-2", 3: "lg:grid-rows-3" };
  const desktopRows = mosaic ? "lg:grid-rows-2" : n > 1 ? ROWS[Math.min(n - 1, 3)] : "";

  return (
    <>
      <div className="relative -mx-4 sm:-mx-6 lg:mx-0 mt-5 lg:mt-8 lg:rounded-[14px] lg:overflow-hidden">
        <div
          ref={scroller}
          onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className={`flex overflow-x-auto snap-x snap-mandatory no-scrollbar lg:grid lg:overflow-visible lg:gap-2 lg:h-[520px] ${desktopCols} ${desktopRows}`}
        >
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Agrandir la photo ${i + 1}`}
              className={`relative shrink-0 w-full aspect-[4/3] snap-start bg-[#0b2238] cursor-pointer lg:aspect-auto lg:min-h-0 group ${
                i === 0 && n > 1 ? "lg:row-span-full" : ""
              } ${i >= 5 ? "lg:hidden" : ""}`}
            >
              <Image
                src={src}
                alt={i === 0 ? title : ""}
                fill
                priority={i === 0}
                sizes={i === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 100vw"}
                className="object-cover transition-[filter] group-hover:brightness-95"
              />
            </button>
          ))}
        </div>
        {Badge}
        {n > 1 && (
          <span className="lg:hidden absolute right-3.5 bottom-3.5 rounded-full bg-black/45 backdrop-blur-md px-3 py-1 text-xs font-bold text-white">
            {index + 1} / {n}
          </span>
        )}
        {n > 1 && (
          <button
            type="button"
            onClick={() => setOpen(0)}
            className="hidden lg:inline-flex absolute right-4 bottom-4 items-center gap-2 rounded-[10px] bg-white px-3.5 py-2.5 text-[13px] font-bold text-foreground shadow-[0_2px_14px_rgba(11,34,56,.12)] cursor-pointer hover:bg-secondary"
          >
            <Images size={16} /> Voir les {n} photos
          </button>
        )}
      </div>

      {open !== null && (
        <div className="fixed inset-0 z-[1300] bg-black/95 flex items-center justify-center" onClick={() => setOpen(null)}>
          <button onClick={() => setOpen(null)} aria-label="Fermer" className="absolute top-3 right-3 p-2 text-white/70 hover:text-white cursor-pointer">
            <X size={26} />
          </button>
          {n > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + n) % n); }}
                aria-label="Photo précédente"
                className="absolute left-3 sm:left-6 z-10 p-2 text-white/70 hover:text-white cursor-pointer"
              >
                <ChevronLeft size={30} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % n); }}
                aria-label="Photo suivante"
                className="absolute right-3 sm:right-6 z-10 p-2 text-white/70 hover:text-white cursor-pointer"
              >
                <ChevronRight size={30} />
              </button>
            </>
          )}
          <div className="relative w-full h-[80vh] mx-12 sm:mx-20" onClick={(e) => e.stopPropagation()}>
            <Image src={images[open]} alt={title} fill sizes="100vw" className="object-contain" />
          </div>
          <p className="absolute bottom-5 text-xs tracking-widest text-white/50">{open + 1} / {n}</p>
        </div>
      )}
    </>
  );
}
