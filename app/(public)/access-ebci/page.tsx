import React from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Car, Bus, Clock, Navigation, ParkingSquare, AlertTriangle, KeyRound } from "lucide-react";
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

const STEPS: { src: string; label: React.ReactNode }[] = [
  { src: "/access-ebci/access-ebci-step-1.png", label: "Depuis le rond-point, prendre la direction de l'aérodrome" },
  { src: "/access-ebci/access-ebci-step-2.png", label: "Suivre la route jusqu'à l'entrée du parking" },
  { src: "/access-ebci/access-ebci-step-3.png", label: "Prendre la direction du parking P31" },
  {
    src: "/access-ebci/access-ebci-step-4.png",
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
          <div className="mb-8 pt-12">
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

          {/* Rdv + parking */}
          <div className="bg-card rounded-2xl border border-border p-6 mb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              <div className="flex gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin size={15} className="text-primary" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Point de rendez-vous</p>
                  <p className="text-sm font-semibold text-foreground">Aéroport de Charleroi (EBCI)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">GPS : 50.4579° N, 4.4541° E</p>
                  <a
                    href={GMAPS_DIR}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-foreground font-semibold hover:text-primary transition-colors cursor-pointer"
                  >
                    <Navigation size={11} />
                    Itinéraire GPS
                  </a>
                </div>
              </div>

              <div className="flex gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
                  <ParkingSquare size={15} className="text-primary" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Parking</p>
                  <p className="text-sm font-semibold text-foreground">Parking à code</p>
                  <p className="text-xs text-muted-foreground mt-0.5">À 50 m du point de rendez-vous</p>
                  <a
                    href={GMAPS_PARK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-foreground font-semibold hover:text-primary transition-colors cursor-pointer"
                  >
                    <Navigation size={11} />
                    Voir le parking
                  </a>
                </div>
              </div>

            </div>
          </div>

          {/* Plan parking + codes */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden mb-5">
            <div className="bg-secondary border-b border-border px-5 py-2.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px]">Vue aérienne · accès parking</span>
            </div>
            <div className="relative">
              <Image
                src="/access-ebci/access-ebci-plan.png"
                alt="Vue aérienne de l'accès au parking"
                width={800}
                height={420}
                className="w-full object-cover"
                unoptimized
              />
              {/* Codes d'accès en overlay */}
              <div className="absolute top-3 right-3">
                <div className="bg-navy/90 backdrop-blur-sm border border-primary/40 rounded-xl px-4 py-3 shadow-lg">
                  <div className="flex items-center gap-1.5 mb-2">
                    <KeyRound size={11} className="text-primary" />
                    <span className="text-[10px] font-bold text-primary uppercase tracking-[1.5px]">Code parking</span>
                  </div>
                  <div className="flex gap-2">
                    {PARK_CODES.map((code) => (
                      <span key={code} className="px-3 py-1.5 bg-primary/20 border border-primary/50 rounded-lg text-primary font-black text-lg tracking-widest">
                        {code}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">Si l&apos;un ne fonctionne pas, essayez l&apos;autre</p>
                </div>
              </div>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {STEPS.map(({ src, label }, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="relative rounded-xl overflow-hidden border border-border">
                    <Image
                      src={src}
                      alt={label}
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

          {/* En voiture */}
          <div className="bg-card rounded-2xl border border-border p-6 mb-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0">
                <Car size={14} className="text-primary" />
              </div>
              <h2 className="font-bold text-foreground">En voiture</h2>
            </div>

            <div className="bg-secondary border border-border rounded-lg px-4 py-3 mb-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px] mb-1">Adresse GPS</p>
              <p className="text-sm font-mono font-semibold text-foreground">Aéroport de Charleroi (EBCI)</p>
              <p className="text-xs text-muted-foreground mt-0.5">Gosselies, 6041 Charleroi, Belgique</p>
            </div>

            <div className="flex items-start gap-2.5">
              <AlertTriangle size={13} className="text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Ne pas suivre les panneaux <strong className="text-foreground font-semibold">«&nbsp;Terminal passagers&nbsp;»</strong>. L&apos;accès aviation légère est distinct, à l&apos;écart du terminal commercial.
              </p>
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

          {/* En transports */}
          <div className="bg-card rounded-2xl border border-border p-6 mb-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0">
                <Bus size={14} className="text-primary" />
              </div>
              <h2 className="font-bold text-foreground">En transports en commun</h2>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Depuis <strong className="text-foreground font-semibold">Charleroi-Sud</strong>, prenez le bus TEC <strong className="text-foreground font-semibold">ligne 68 ou 68A</strong> direction Aéroport.
              Descendre à l&apos;arrêt <strong className="text-foreground font-semibold">Gosselies Aéroport</strong> (environ 20 min), puis 5 minutes à pied jusqu&apos;au point de rendez-vous.
            </p>

            <div className="flex items-start gap-2.5">
              <Clock size={13} className="text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Consultez les horaires en temps réel sur{" "}
                <a href="https://www.infotec.be" target="_blank" rel="noopener noreferrer"
                  className="text-foreground font-semibold hover:text-primary transition-colors">
                  infotec.be
                </a>.
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
