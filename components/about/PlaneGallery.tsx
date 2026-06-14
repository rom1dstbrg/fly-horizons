"use client";

import { useState } from "react";
import Image from "next/image";

const views = [
  { id: "exterior", label: "Extérieur",        src: "/da-40.webp",       alt: "Diamond DA40 en vol" },
  { id: "interior", label: "Intérieur cabine",  src: "/da-40-seats.webp", alt: "Intérieur Diamond DA40" },
] as const;

type ViewId = typeof views[number]["id"];

export function PlaneGallery() {
  const [active, setActive] = useState<ViewId>("exterior");

  return (
    <div className="relative aspect-[4/3] md:aspect-auto md:h-[600px] lg:h-[660px] rounded-lg overflow-hidden">
      {views.map((view) => (
        <Image
          key={view.id}
          src={view.src}
          alt={view.alt}
          fill
          className={`object-cover transition-opacity duration-500 ${
            active === view.id ? "opacity-100" : "opacity-0"
          }`}
          sizes="(max-width: 768px) 100vw, 60vw"
          priority={view.id === "exterior"}
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

      <div className="absolute bottom-4 left-4 flex gap-2">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => setActive(view.id)}
            className={`cursor-pointer px-3 py-1.5 rounded-md text-[11px] font-semibold tracking-wide backdrop-blur-sm transition-all ${
              active === view.id
                ? "bg-white text-foreground shadow-sm"
                : "bg-black/40 text-white/70 hover:bg-black/60 hover:text-white"
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>
    </div>
  );
}
