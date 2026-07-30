"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

type ViewId = "exterior" | "interior";

const views = [
  { id: "exterior" as ViewId, label: "Extérieur",        src: "/da-40.webp",       alt: "Diamond DA40 en vol" },
  { id: "interior" as ViewId, label: "Intérieur cabine",  src: "/da-40-seats.webp", alt: "Intérieur Diamond DA40" },
];

const SPECS = [
  "Cockpit vitré, vue à 360°",
  "Jusqu'à 3 passagers",
  "Casques antibruit fournis",
  "École certifiée ATO-005, EBCI",
  "Croisière 120 kt (220 km/h)",
];

function ViewTabs({ active, onSelect }: { active: ViewId; onSelect: (id: ViewId) => void }) {
  return (
    <div className="flex gap-2">
      {views.map((view) => (
        <button
          key={view.id}
          onClick={() => onSelect(view.id)}
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
  );
}

export function DA40Section() {
  const [active, setActive] = useState<ViewId>("exterior");
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((prev) => (prev === "exterior" ? "interior" : "exterior"));
    }, 5000);
    return () => clearInterval(id);
  }, [resetKey]);

  const handleSelect = useCallback((id: ViewId) => {
    setActive(id);
    setResetKey((k) => k + 1);
  }, []);

  return (
    <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 lg:items-center">

      <div className="lg:col-span-7 relative aspect-[4/3] lg:aspect-[16/11] rounded-2xl overflow-hidden">
        {views.map((view) => (
          <Image
            key={view.id}
            src={view.src}
            alt={view.alt}
            fill
            className={`object-cover transition-opacity duration-500 ${
              active === view.id ? "opacity-100" : "opacity-0"
            }`}
            sizes="(max-width: 1024px) 100vw, 60vw"
            priority={view.id === "exterior"}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-4 left-4">
          <ViewTabs active={active} onSelect={handleSelect} />
        </div>
      </div>

      <div className="lg:col-span-5">
        <p className="text-xs font-bold text-[#F2B705] uppercase tracking-[3px] mb-4">
          L&apos;avion
        </p>
        <h2 className="text-3xl sm:text-4xl font-black text-foreground leading-none tracking-tight mb-6">
          Diamond DA40
        </h2>

        <div className="flex flex-wrap gap-2">
          {SPECS.map((spec) => (
            <span
              key={spec}
              className="inline-flex items-center bg-white border border-border text-foreground/70 text-[12px] font-medium px-3 py-1.5 rounded-full"
            >
              {spec}
            </span>
          ))}
        </div>
      </div>

    </div>
  );
}
