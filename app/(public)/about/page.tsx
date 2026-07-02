import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { DA40Section } from "@/components/about/DA40Section";
import {
  BadgeCheck, Route, ArrowRight, MapPin, Clock,
  Banknote, Compass, Users,
} from "lucide-react";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";

export const metadata: Metadata = {
  title: "À propos · Fly Horizons",
  description:
    "Découvrez Romain DESTANBERG, fondateur et pilote de Fly Horizons. Vols en avion léger depuis Charleroi, dans un cadre de partage de frais accessible à tous.",
  alternates: { canonical: `${siteUrl}/about` },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f7]">

      {/* ══ ROMAIN ══ */}
      <section className="bg-[#f5f5f7] pt-[98px]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 pt-2 sm:pt-12 pb-16 sm:pb-24">

          {/*
            Mobile / tablette (< lg) : DOM order → A, photo, B
            Desktop (lg+) : grid 2 col — A col1 row1 | photo col2 rows1-2 | B col1 row2
          */}
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">

            {/* A — Eyebrow + H1 + sous-titre */}
            <div>
              <p className="text-xs font-bold text-[#F2B705] uppercase tracking-[3px] mb-5">Votre pilote</p>
              <h1 className="text-5xl sm:text-6xl xl:text-7xl font-black text-foreground leading-none tracking-tight mb-3">
                Romain<br />
                <span className="text-[#0b2238]">Destanberg</span>
              </h1>
              <p className="text-foreground/40 text-xs font-semibold uppercase tracking-[2px]">
                Fondateur &amp; Pilote · Fly Horizons
              </p>
            </div>

            {/* Photo — col droite desktop (row-span-2), entre A et B sur mobile */}
            <div className="lg:row-span-2 relative aspect-[4/5] lg:aspect-auto rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
              <Image
                src="/photo-pilote.jpg"
                alt="Romain, pilote et fondateur de Fly Horizons"
                fill
                className="object-cover object-top"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
                <div className="inline-flex items-center gap-2 bg-black/55 backdrop-blur-md rounded-xl px-3.5 py-2.5">
                  <BadgeCheck size={14} className="text-[#F2B705] shrink-0" />
                  <span className="text-white text-xs font-semibold">Licence CPL(A)</span>
                </div>
                <div className="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm text-right">
                  <p className="text-xl font-black text-[#0b2238] leading-none">4 ans</p>
                  <p className="text-foreground/45 text-[10px] font-medium uppercase tracking-wide">d&apos;expérience</p>
                </div>
              </div>
            </div>

            {/* B — Citation + bio + tags */}
            <div className="flex flex-col">
              <div className="border-l-[3px] border-[#F2B705] pl-5 mb-8">
                <p className="text-foreground/65 text-[15px] italic leading-relaxed">
                  &ldquo;Depuis que j&apos;ai découvert ce que c&apos;était de voir le sol
                  s&apos;éloigner à sept ans, je n&apos;ai jamais vraiment atterri.&rdquo;
                </p>
              </div>

              <div className="space-y-3.5 text-foreground/60 text-sm leading-relaxed mb-9">
                <p>
                  Cette passion pour l&apos;aviation, je l&apos;ai construite année après année.
                  Depuis 4 ans, je la vis pleinement. Et depuis Fly Horizons, je la partage.
                </p>
                <p>
                  Pas de barrière d&apos;entrée, pas de jargon inutile. Juste vous, l&apos;avion,
                  et l&apos;horizon que vous choisissez. Chaque vol est préparé avec vous :
                  itinéraire adapté à la météo et à vos envies, briefing sécurité complet avant
                  le départ, casques audio fournis pour suivre le vol en temps réel.
                </p>
                <p>
                  La sécurité n&apos;est pas un argument de vente. C&apos;est simplement
                  la façon dont je travaille.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {[
                  { icon: <BadgeCheck size={12} />, label: "Licence CPL(A)" },
                  { icon: <Clock size={12} />,       label: "Pilote depuis 4 ans" },
                  { icon: <MapPin size={12} />,      label: "Aérodrome EBCI · Charleroi" },
                ].map(({ icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 bg-white border border-border text-foreground/65 text-[11px] font-medium px-3 py-1.5 rounded-full"
                  >
                    <span className="text-[#F2B705]">{icon}</span>
                    {label}
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ L'AVION ══ */}
      <section className="bg-white border-t border-border py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">
          <DA40Section />
        </div>
      </section>

      {/* ══ L'APPROCHE ══ */}
      <section className="bg-[#f5f5f7] py-20 sm:py-28 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

          <p className="text-xs font-bold text-[#F2B705] uppercase tracking-[3px] mb-4">
            L&apos;approche Fly Horizons
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-foreground leading-none tracking-tight mb-16">
            Sans marge.<br />
            <span className="text-[#0b2238]">Uniquement les frais réels.</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                icon: <Banknote size={22} />,
                title: "Partage de frais",
                text: "Les vols sont organisés dans le cadre réglementé du partage de frais (NCO.GEN.104). Chaque passager contribue aux coûts réels : carburant, redevances, maintenance.",
              },
              {
                num: "02",
                icon: <Compass size={22} />,
                title: "Votre vol, vos règles",
                text: "Destination, durée, nombre de passagers, escales : vous décidez de tout. Personne d'autre ne propose ça. L'itinéraire est composé avec vous, pas à votre place.",
              },
              {
                num: "03",
                icon: <Users size={22} />,
                title: "Accessible à tous",
                text: "L'aviation légère reste hors de portée pour beaucoup. Fly Horizons a été conçu pour changer ça, sans compromis sur la qualité ni sur la sécurité.",
              },
            ].map(({ num, icon, title, text }) => (
              <div key={title} className="relative bg-white rounded-2xl p-8 flex flex-col gap-5 shadow-[0_2px_20px_rgba(0,0,0,0.06)] overflow-hidden">
                <span className="absolute -top-3 right-4 text-[96px] font-black leading-none select-none pointer-events-none tabular-nums text-foreground/[0.05]">
                  {num}
                </span>
                <div className="relative z-10 w-14 h-14 rounded-2xl bg-[#F2B705] flex items-center justify-center text-[#0b2238] shadow-[0_6px_24px_rgba(242,183,5,0.35)]">
                  {icon}
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-foreground font-black text-[17px] leading-snug">{title}</p>
                  <p className="text-foreground/60 text-sm leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="bg-white border-t border-border py-14">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="text-center lg:text-left">
              <p className="text-xs font-bold text-[#F2B705] uppercase tracking-[3px] mb-3">Prêt à partir ?</p>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground leading-snug mb-1.5">
                Regardez ce qu&apos;on propose,<br className="hidden sm:block" />
                ou dites-nous ce que vous avez en tête.
              </h2>
              <p className="text-foreground/50 text-sm">Romain vous revient sous 24 heures.</p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start shrink-0">
              <Link
                href="/nos-offres"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#F2B705] text-[#0b2238] rounded-lg text-sm font-black hover:bg-[#e6a800] transition-colors shadow-[0_4px_16px_rgba(242,183,5,0.25)]"
              >
                Voir les vols
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/vol-sur-mesure"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 border border-border text-foreground/70 rounded-lg text-sm font-semibold hover:border-foreground hover:text-foreground transition-colors"
              >
                <Route size={15} />
                Vol sur mesure
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ChatWidget />
    </main>
  );
}
