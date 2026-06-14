"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryImage {
  src: string;
  alt: string;
  width:  number | null;
  height: number | null;
}

const GAP           = 12;
const INITIAL_COUNT = 24;
const LOAD_MORE     = 24;

function distributeGreedy(
  images: GalleryImage[],
  numCols: number,
  colWidth: number,
): Array<Array<{ img: GalleryImage; originalIndex: number }>> {
  const columns: Array<Array<{ img: GalleryImage; originalIndex: number }>> =
    Array.from({ length: numCols }, () => []);
  const heights = Array<number>(numCols).fill(0);

  images.forEach((img, i) => {
    const ratio = img.width && img.height ? img.height / img.width : 9 / 16;
    const imgHeight = colWidth * ratio;
    const shortest = heights.indexOf(Math.min(...heights));
    columns[shortest].push({ img, originalIndex: i });
    heights[shortest] += imgHeight + GAP;
  });

  return columns;
}

export default function GalleryClient({ images }: { images: GalleryImage[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount]   = useState(INITIAL_COUNT);
  const containerRef = useRef<HTMLDivElement>(null);
  const [colWidth, setColWidth] = useState(400);
  const [numCols,  setNumCols]  = useState(3);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      const cols = w < 1024 ? 2 : 3;
      setNumCols(cols);
      setColWidth((w - GAP * (cols - 1)) / cols);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visibleImages = images.slice(0, visibleCount);
  const columns       = distributeGreedy(visibleImages, numCols, colWidth);
  const hasMore       = visibleCount < images.length;

  const close = useCallback(() => setLightboxIndex(null), []);
  const prev  = useCallback(() => setLightboxIndex(i => i !== null ? (i - 1 + images.length) % images.length : null), [images.length]);
  const next  = useCallback(() => setLightboxIndex(i => i !== null ? (i + 1) % images.length : null), [images.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")     close();
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxIndex, close, prev, next]);

  return (
    <>
      <div ref={containerRef} className="flex gap-3 items-start">
        {columns.map((col, c) => (
          <div key={c} className="flex-1 flex flex-col gap-3">
            {col.map(({ img, originalIndex }) => (
              <button
                key={img.src}
                onClick={() => setLightboxIndex(originalIndex)}
                className="relative block w-full rounded-xl overflow-hidden cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  width={0}
                  height={0}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-xs font-semibold tracking-widest uppercase">
                    Voir
                  </span>
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Voir plus */}
      {hasMore && (
        <div className="mt-10 flex flex-col items-center gap-2">
          <button
            onClick={() => setVisibleCount(c => c + LOAD_MORE)}
            className="px-8 py-3 rounded-full border border-foreground/20 text-sm font-semibold text-foreground hover:bg-foreground hover:text-background transition-colors cursor-pointer"
          >
            Voir plus
          </button>
          <p className="text-xs text-muted-foreground">
            {visibleCount} / {images.length} photos
          </p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center"
          onClick={close}
        >
          <button
            onClick={e => { e.stopPropagation(); close(); }}
            className="absolute top-3 right-3 z-10 p-2 text-white/60 hover:text-white transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X size={26} />
          </button>

          <button
            onClick={e => { e.stopPropagation(); prev(); }}
            className="absolute left-4 sm:left-6 z-10 text-white/60 hover:text-white transition-colors cursor-pointer"
            aria-label="Photo précédente"
          >
            <ChevronLeft size={40} />
          </button>

          <button
            onClick={e => { e.stopPropagation(); next(); }}
            className="absolute right-4 sm:right-6 z-10 text-white/60 hover:text-white transition-colors cursor-pointer"
            aria-label="Photo suivante"
          >
            <ChevronRight size={40} />
          </button>

          <div
            className="relative flex items-center justify-center w-full px-10 sm:px-20"
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={images[lightboxIndex].src}
              alt={images[lightboxIndex].alt}
              width={0}
              height={0}
              sizes="100vw"
              className="max-w-full max-h-[88vh] w-auto h-auto mx-auto"
              priority
            />
          </div>

          <p className="absolute bottom-5 text-white/40 text-xs tracking-widest">
            {lightboxIndex + 1} / {images.length}
          </p>
        </div>
      )}
    </>
  );
}
