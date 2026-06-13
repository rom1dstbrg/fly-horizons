"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryImage {
  src: string;
  alt: string;
}

export default function GalleryClient({ images }: { images: GalleryImage[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const close = useCallback(() => setLightboxIndex(null), []);
  const prev = useCallback(() => setLightboxIndex(i => i !== null ? (i - 1 + images.length) % images.length : null), [images.length]);
  const next = useCallback(() => setLightboxIndex(i => i !== null ? (i + 1) % images.length : null), [images.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {images.map((img, i) => (
          <button
            key={img.src}
            onClick={() => setLightboxIndex(i)}
            className="relative aspect-video rounded-xl overflow-hidden cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300 flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-xs font-semibold tracking-widest uppercase">
                Voir
              </span>
            </div>
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center"
          onClick={close}
        >
          <button
            onClick={e => { e.stopPropagation(); close(); }}
            className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X size={26} />
          </button>

          <button
            onClick={e => { e.stopPropagation(); prev(); }}
            className="absolute left-4 sm:left-6 text-white/60 hover:text-white transition-colors cursor-pointer"
            aria-label="Photo précédente"
          >
            <ChevronLeft size={40} />
          </button>

          <button
            onClick={e => { e.stopPropagation(); next(); }}
            className="absolute right-4 sm:right-6 text-white/60 hover:text-white transition-colors cursor-pointer"
            aria-label="Photo suivante"
          >
            <ChevronRight size={40} />
          </button>

          <div
            className="relative w-full max-w-5xl mx-16 sm:mx-20"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative aspect-video">
              <Image
                src={images[lightboxIndex].src}
                alt={images[lightboxIndex].alt}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            </div>
          </div>

          <p className="absolute bottom-5 text-white/40 text-xs tracking-widest">
            {lightboxIndex + 1} / {images.length}
          </p>
        </div>
      )}
    </>
  );
}
