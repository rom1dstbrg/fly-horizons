import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Navigation } from "lucide-react";
import { ChatWidget } from "@/components/chat/ChatWidget";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plan d'accès · Fly Horizons",
  description: "Toutes les informations pour rejoindre le point de rendez-vous à l'aéroport de Charleroi (EBCI).",
  robots: { index: false },
};

// Nouvelle DA (maquette-access-ebci.html, 29/09).
// Ordinateur = structure B : titre + GPS + code, vue aérienne pleine largeur, 4 étapes sur une ligne,
// puis point de rendez-vous (photo | texte + carte).
// Téléphone = structure A : une colonne, photos pleine largeur, numéro et texte AU-DESSUS de chaque photo
// (ordre du DOM = ordre de lecture du trajet ; sur ordinateur la photo repasse au-dessus via flex-col-reverse).

const MEET_COORDS = "50.45787645919888,4.454058485690142";
const GMAPS_DIR   = `https://www.google.com/maps/dir/?api=1&destination=${MEET_COORDS}`;
const GMAPS_EMBED = `https://maps.google.com/maps?q=${MEET_COORDS}&z=17&t=k&output=embed`;

const PARK_CODES = ["1477", "2022"];

const WRAP = "max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10";
const LINK = "font-semibold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-[3px] hover:decoration-primary transition-colors";
// Photo : pleine largeur de l'écran sur téléphone, arrondie dès que le conteneur a des marges.
const PHOTO = "relative aspect-video overflow-hidden bg-secondary -mx-4 sm:mx-0 sm:rounded-[14px]";

const STEPS: { src: string; alt: string; label: string; note?: string }[] = [
  { src: "/access-ebci/access-ebci-step-1.png", alt: "Depuis le rond-point, direction de l'aérodrome", label: "Depuis le rond-point, prendre la direction de l'aérodrome" },
  { src: "/access-ebci/access-ebci-step-2.png", alt: "Route jusqu'à l'entrée du parking", label: "Suivre la route jusqu'à l'entrée du parking" },
  { src: "/access-ebci/access-ebci-step-3.png", alt: "Direction du parking P31", label: "Prendre la direction du parking P31" },
  { src: "/access-ebci/access-ebci-step-4.png", alt: "Barrière du parking", label: "Saisir le code à la barrière", note: `Codes : ${PARK_CODES.join(" ou ")}` },
];

function Num({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span className={`w-7 h-7 shrink-0 rounded-full bg-[#0b2238] text-primary text-[13px] font-extrabold grid place-items-center ${className}`}>
      {n}
    </span>
  );
}

function Photo({ src, alt, sizes, className = "" }: { src: string; alt: string; sizes: string; className?: string }) {
  return (
    <div className={`${PHOTO} ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
    </div>
  );
}

export default function AccessEbciPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="pt-page pb-16 lg:pb-28">
        <div className={WRAP}>

          {/* En-tête : titre à gauche, GPS + code à droite (ordinateur) */}
          <div className="lg:grid lg:grid-cols-[1fr_auto] lg:gap-x-[72px] lg:items-end">
            <div>
              <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3">Point de rendez-vous</p>
              <h1 className="text-[34px] lg:text-[52px] font-black text-foreground leading-[1.05] lg:leading-[1.02] tracking-[-0.02em]">
                Plan d&apos;accès.
              </h1>
              <p className="mt-3.5 max-w-[460px] text-base lg:text-[17px] leading-[1.7] text-foreground/80">
                Aéroport de Charleroi (EBCI). Présentez-vous <strong className="font-bold text-foreground">15&nbsp;minutes avant</strong> l&apos;heure indiquée.
              </p>
            </div>

            <div className="flex flex-col lg:items-start">
              <a
                href={GMAPS_DIR}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-[22px] lg:mt-0 inline-flex w-full lg:w-auto items-center justify-center gap-2 px-6 py-[15px] rounded-[10px] bg-primary text-[#0b2238] text-[15px] font-black shadow-gold hover:brightness-105 transition-all cursor-pointer"
              >
                <Navigation size={16} />
                Lancer l&apos;itinéraire GPS
              </a>
              <div className="mt-[22px]">
                <p className="text-[11px] font-bold uppercase tracking-[2px] text-muted-foreground mb-2">Code du parking</p>
                <div className="flex flex-wrap items-center gap-3">
                  {PARK_CODES.map((code, i) => (
                    <React.Fragment key={code}>
                      {i > 0 && <span className="text-[13px] text-muted-foreground">ou</span>}
                      <span className="px-4 py-1.5 rounded-[10px] bg-secondary text-[#0b2238] text-[26px] font-black tracking-[.14em]">
                        {code}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">Si l&apos;un ne fonctionne pas, essayez l&apos;autre.</p>
              </div>
            </div>
          </div>

          {/* Vue aérienne */}
          <Photo
            src="/access-ebci/access-ebci-plan.png"
            alt="Vue aérienne de l'accès au parking"
            sizes="(min-width: 1440px) 1320px, 100vw"
            className="mt-7 lg:mt-11 lg:aspect-[21/9]"
          />

          {/* Étapes 1 à 4 : téléphone = texte puis photo pleine largeur ; ordinateur = 4 colonnes, photo puis texte */}
          <ol className="mt-9 lg:mt-12 flex flex-col gap-9 lg:grid lg:grid-cols-4 lg:gap-6">
            {STEPS.map(({ src, alt, label, note }, i) => (
              <li key={src} className="flex flex-col gap-3 lg:flex-col-reverse">
                <div className="flex items-start gap-2.5">
                  <Num n={i + 1} />
                  <p className="pt-0.5 text-[15px] leading-[1.55] font-semibold text-foreground">
                    {label}
                    {note && <span className="block mt-1 text-sm font-medium text-foreground/70">{note}</span>}
                  </p>
                </div>
                <Photo src={src} alt={alt} sizes="(min-width: 1024px) 25vw, 100vw" />
              </li>
            ))}
          </ol>

          {/* Point de rendez-vous : téléphone = étape 5 ; ordinateur = photo à gauche, texte + carte à droite */}
          <div className="mt-9 lg:mt-[72px] flex flex-col gap-3 lg:grid lg:grid-cols-[7fr_5fr] lg:gap-x-20 lg:gap-y-0">
            <div className="flex items-start gap-2.5 lg:col-start-2 lg:row-start-1 lg:self-start">
              <Num n={5} className="lg:hidden" />
              <h2 className="pt-0.5 text-[15px] lg:pt-0 lg:text-xl lg:font-black font-semibold leading-[1.55] text-foreground lg:tracking-[-0.01em]">
                <span className="lg:hidden">Rejoindre le point de rendez-vous</span>
                <span className="hidden lg:inline">Au point de rendez-vous</span>
              </h2>
            </div>
            <Photo
              src="/access-ebci/access-ebci-metting-point.png"
              alt="Point de rendez-vous, vue au sol"
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="lg:col-start-1 lg:row-start-1 lg:row-span-3 lg:aspect-auto lg:min-h-[320px]"
            />
            <p className="mt-2 lg:mt-3 text-[15px] leading-[1.7] text-foreground/80 lg:col-start-2 lg:row-start-2 lg:self-start">
              <strong className="font-bold text-foreground">En attendant votre vol,</strong> vous pouvez patienter devant le bâtiment
              ou entrer dans le terminal, accessible au public. Vous y trouverez des{" "}
              <strong className="font-bold text-foreground">toilettes</strong> et un{" "}
              <strong className="font-bold text-foreground">distributeur de boissons</strong>.
            </p>
            <div className="mt-4 lg:mt-7 aspect-[4/3] rounded-[14px] overflow-hidden bg-secondary lg:col-start-2 lg:row-start-3 lg:self-start">
              <iframe
                src={GMAPS_EMBED}
                title="Point de rendez-vous Fly Horizons"
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          <p className="mt-8 lg:mt-12 text-sm leading-[1.8] text-foreground/70">
            Problème pour nous trouver ?{" "}
            <a href="mailto:info@fly-horizons.com" className={LINK}>info@fly-horizons.com</a>
            {" · "}
            <Link href="/faq" className={LINK}>FAQ</Link>
          </p>

        </div>
      </section>

      <ChatWidget />
    </main>
  );
}
