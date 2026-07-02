"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Eye, Users, Gauge, MountainSnow, Headphones, ShieldCheck } from "lucide-react";

type ViewId = "exterior" | "interior";

const views = [
  { id: "exterior" as ViewId, label: "Extérieur",        src: "/da-40.webp",       alt: "Diamond DA40 en vol" },
  { id: "interior" as ViewId, label: "Intérieur cabine",  src: "/da-40-seats.webp", alt: "Intérieur Diamond DA40" },
];

function ViewTabs({
  active,
  onSelect,
  variant,
}: {
  active: ViewId;
  onSelect: (id: ViewId) => void;
  variant: "overlay" | "panel";
}) {
  return (
    <div className="flex gap-2">
      {views.map((view) => (
        <button
          key={view.id}
          onClick={() => onSelect(view.id)}
          className={`cursor-pointer px-3 py-1.5 rounded-md text-[11px] font-semibold tracking-wide transition-all ${
            variant === "overlay"
              ? active === view.id
                ? "bg-white text-foreground shadow-sm backdrop-blur-sm"
                : "bg-black/40 text-white/70 hover:bg-black/60 hover:text-white backdrop-blur-sm"
              : active === view.id
                ? "bg-foreground text-background"
                : "border border-border text-foreground/50 hover:text-foreground hover:border-foreground/40"
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
    /*
      Mobile / tablette (< lg) : DOM order → A (titre), B (image), C (specs)
      Desktop (lg+) : grid 2 col — B image col1 rows1-2 | A titre col2 row1 | C specs col2 row2
    */
    <div className="grid lg:grid-cols-[3fr_2fr] gap-8 lg:gap-12 items-start">

      {/* A — Titre (col droite row1 sur desktop, premier sur mobile) */}
      <div className="lg:col-start-2 lg:row-start-1 lg:pt-2">
        <p className="text-xs font-bold text-[#F2B705] uppercase tracking-[3px] mb-4">L&apos;avion</p>
        <h2 className="text-4xl sm:text-5xl font-black text-foreground leading-none tracking-tight">
          Diamond DA40
        </h2>
      </div>

      {/* B — Image (col gauche rows1-2 sur desktop, deuxième sur mobile) */}
      <div className="lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:self-stretch relative aspect-[4/3] lg:aspect-auto rounded-lg overflow-hidden">
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
          <ViewTabs active={active} onSelect={handleSelect} variant="overlay" />
        </div>
      </div>

      {/* C — Specs + sécurité (col droite row2 sur desktop, troisième sur mobile) */}
      <div className="lg:col-start-2 lg:row-start-2">
        <div className="mb-6">
          {[
            { icon: <Eye size={14} />,         text: "Cockpit vitré, vue à 360°" },
            { icon: <Users size={14} />,        text: "Jusqu'à 3 passagers à bord" },
            { icon: <Gauge size={14} />,        text: "Vitesse de croisière : 120 kt (220 km/h)" },
            { icon: <MountainSnow size={14} />, text: "Altitude typique : 600 à 1 000 m" },
            { icon: <Headphones size={14} />,   text: "Casques antibruit fournis" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 py-3.5 border-b border-border/60 last:border-0">
              <span className="text-[#F2B705] shrink-0">{icon}</span>
              <span className="text-sm text-foreground/70">{text}</span>
            </div>
          ))}
        </div>

        <div className="bg-secondary border border-border rounded-lg p-5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#F2B705] shrink-0" />
            <p className="text-foreground text-sm font-black">Sécurité &amp; assurance</p>
          </div>
          <p className="text-foreground/60 text-sm leading-relaxed">
            L&apos;avion appartient à <strong className="text-foreground/85">Air Academy New CAG</strong>{" "}
            (ATO-005, EBCI). Leur assurance couvre tous les occupants. Les vols sont organisés dans
            le cadre du partage de frais réglementé par{" "}
            <strong className="text-foreground/85">NCO.GEN.104</strong>.
          </p>
        </div>
      </div>

    </div>
  );
}
