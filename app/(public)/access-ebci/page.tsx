import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Navigation, ParkingSquare, KeyRound } from "lucide-react";
import { ChatWidget } from "@/components/chat/ChatWidget";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plan d'accès · Fly Horizons",
  description: "Toutes les informations pour rejoindre le point de rendez-vous à l'aéroport de Charleroi (EBCI).",
  robots: { index: false },
};

const MEET_COORDS = "50.45787645919888,4.454058485690142";
const PARK_COORDS = "50.45774619491722,4.45481899614136";
const GMAPS_DIR   = `https://www.google.com/maps/dir/?api=1&destination=${MEET_COORDS}`;
const GMAPS_PARK  = `https://www.google.com/maps?q=${PARK_COORDS}`;
const GMAPS_EMBED = `https://maps.google.com/maps?q=${MEET_COORDS}&z=17&t=k&output=embed`;

const PARK_CODES = ["1477", "2022"];

const STEPS: { src: string; alt: string; label: React.ReactNode }[] = [
  { src: "/access-ebci/access-ebci-step-1.png", alt: "Depuis le rond-point, prendre la direction de l'aérodrome", label: "Depuis le rond-point, prendre la direction de l'aérodrome" },
  { src: "/access-ebci/access-ebci-step-2.png", alt: "Suivre la route jusqu'à l'entrée du parking", label: "Suivre la route jusqu'à l'entrée du parking" },
  { src: "/access-ebci/access-ebci-step-3.png", alt: "Prendre la direction du parking P31", label: "Prendre la direction du parking P31" },
  {
    src: "/access-ebci/access-ebci-step-4.png",
    alt: "Saisir le code à la barrière",
    label: (
      <>
        Saisir le code à la barrière.{" "}
        <span className="font-semibold text-foreground">
          Codes : {PARK_CODES.join(" ou ")}
        </span>
      </>
    ),
  },
];

export default function AccessEbciPage() {
  return (
    <main className="min-h-screen bg-background">

      <section className="pt-[98px] pb-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

          {/* En-tête */}
          <div className="mb-8 pt-2 sm:pt-12">
            <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-4">Point de rendez-vous</p>
            <h1 className="text-4xl sm:text-5xl font-black text-foreground leading-none tracking-tight mb-4">
              Plan d&apos;accès
            </h1>
            <p className="text-muted-foreground text-sm max-w-lg leading-relaxed mb-6">
              Toutes les informations pour rejoindre le point de rendez-vous à l&apos;aéroport de Charleroi&nbsp;(EBCI).
              Présentez-vous <strong className="text-foreground font-semibold">15 minutes avant</strong> l&apos;heure indiquée.
            </p>
            <a
              href={GMAPS_DIR}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground font-black text-sm rounded-lg hover:brightness-105 transition-all shadow-gold cursor-pointer"
            >
              <Navigation size={16} />
              Lancer l&apos;itinéraire GPS
            </a>
          </div>

          {/* Plan parking + codes */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden mb-5">
            <div className="bg-secondary border-b border-border px-5 py-2.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px]">Vue aérienne · accès parking</span>
            </div>
            <Image
              src="/access-ebci/access-ebci-plan.png"
              alt="Vue aérienne de l'accès au parking"
              width={800}
              height={420}
              className="w-full object-cover"
              unoptimized
            />
            {/* Codes d'accès en bande */}
            <div className="border-t border-border px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <KeyRound size={14} className="text-primary shrink-0" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wide">Code parking</span>
              </div>
              <div className="flex items-center gap-3">
                {PARK_CODES.map((code, i) => (
                  <React.Fragment key={code}>
                    {i > 0 && <span className="text-muted-foreground text-sm">ou</span>}
                    <span className="px-4 py-1.5 bg-secondary border border-border rounded-lg text-foreground font-black text-xl tracking-widest">
                      {code}
                    </span>
                  </React.Fragment>
                ))}
                <span className="hidden sm:inline text-xs text-muted-foreground">Si l&apos;un ne fonctionne pas, essayez l&apos;autre</span>
              </div>
              <p className="sm:hidden text-xs text-muted-foreground">Si l&apos;un ne fonctionne pas, essayez l&apos;autre</p>
            </div>
          </div>

          {/* Comment accéder au parking : 4 étapes */}
          <div className="bg-card rounded-2xl border border-border p-6 mb-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0">
                <ParkingSquare size={14} className="text-primary" />
              </div>
              <h2 className="font-bold text-foreground">Accéder au parking</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {STEPS.map(({ src, alt, label }, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="relative rounded-xl overflow-hidden border border-border">
                    <Image
                      src={src}
                      alt={alt}
                      width={400}
                      height={280}
                      className="w-full object-cover"
                      unoptimized
                    />
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-navy/90 border border-primary/40 flex items-center justify-center">
                      <span className="text-[10px] font-black text-primary">{i + 1}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Photo point de rendez-vous */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden mb-5">
            <div className="bg-secondary border-b border-border px-5 py-2.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px]">Vue au sol · point de rendez-vous</span>
            </div>
            <Image
              src="/access-ebci/access-ebci-metting-point.png"
              alt="Point de rendez-vous, vue au sol"
              width={800}
              height={380}
              className="w-full object-cover"
              unoptimized
            />
            <div className="px-5 py-4 border-t border-border space-y-1.5">
              <p className="text-xs font-semibold text-foreground">En attendant votre vol</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Vous pouvez patienter devant le bâtiment ou entrer dans le terminal, accessible au public.
                Vous y trouverez des <strong className="text-foreground font-semibold">toilettes</strong> et un <strong className="text-foreground font-semibold">distributeur de boissons</strong>.
              </p>
            </div>
          </div>

          {/* Carte Google Maps */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden mb-6">
            <div className="bg-secondary border-b border-border px-5 py-2.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px]">Carte interactive</span>
            </div>
            <iframe
              src={GMAPS_EMBED}
              title="Point de rendez-vous Fly Horizons"
              className="w-full h-72 border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {/* CTA itinéraire */}
          <a
            href={GMAPS_DIR}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-primary-foreground font-black text-sm rounded-lg hover:brightness-105 transition-all shadow-gold cursor-pointer"
          >
            <Navigation size={16} />
            Lancer l&apos;itinéraire GPS
          </a>

          {/* Pied de page */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 text-xs text-muted-foreground">
            <span>
              Problème pour nous trouver ?{" "}
              <a href="mailto:info@fly-horizons.com" className="text-foreground font-semibold hover:text-primary transition-colors">
                info@fly-horizons.com
              </a>
            </span>
            <span className="hidden sm:inline">·</span>
            <Link href="/faq" className="text-foreground font-semibold hover:text-primary transition-colors">
              Consulter la FAQ
            </Link>
          </div>

        </div>
      </section>

      <ChatWidget />
    </main>
  );
}
