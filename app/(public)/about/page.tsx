import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChatWidget } from "@/components/chat/ChatWidget";
import {
  BadgeCheck, ShieldCheck, Eye, Users, Gauge,
  MountainSnow, Headphones, Route, ArrowRight, MapPin, Clock,
} from "lucide-react";

export const metadata: Metadata = {
  title: "À propos · Fly Horizons",
  description:
    "Découvrez Romain DESTANBERG, fondateur et pilote de Fly Horizons. Vols en avion léger depuis Charleroi, dans un cadre de partage de frais accessible à tous.",
  alternates: { canonical: "https://fly-horizons.com/about" },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f7]">

      {/* ══ ROMAIN ══ */}
      <section className="bg-secondary pt-[98px] pb-20 sm:pb-28">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 pt-10">

          {/*
            Mobile  : 1-header · 2-photo · 3-body (order utilities)
            Desktop : col-1 = photo (row-span-2) · col-2 row-1 = header · col-2 row-2 = body
          */}
          <div className="grid md:grid-cols-[400px_1fr] lg:grid-cols-[460px_1fr] gap-x-10 lg:gap-x-16 gap-y-6 md:gap-y-8">

            {/* 1. Header */}
            <div className="order-1 md:col-start-2 md:row-start-1">
              <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-4">Votre pilote</p>
              <h1 className="text-5xl sm:text-6xl font-black text-foreground leading-none tracking-tight mb-2">
                Romain<br />
                <span className="text-primary">Destanberg</span>
              </h1>
              <p className="text-foreground/40 text-xs font-semibold uppercase tracking-[2px]">
                Fondateur &amp; Pilote · Fly Horizons
              </p>
            </div>

            {/* 2. Photo */}
            <div className="order-2 md:order-none md:col-start-1 md:row-start-1 md:row-span-2 relative aspect-[4/5] md:aspect-auto rounded-lg overflow-hidden shadow-xl">
              <Image
                src="/photo-pilote.jpg"
                alt="Romain, pilote et fondateur de Fly Horizons"
                fill
                className="object-cover object-top"
                sizes="(max-width: 768px) 100vw, 460px"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4">
                <div className="inline-flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                  <BadgeCheck size={13} className="text-primary shrink-0" />
                  <span className="text-white text-[12px] font-semibold">Licence CPL(A)</span>
                </div>
              </div>
            </div>

            {/* 3. Body */}
            <div className="order-3 md:order-none md:col-start-2 md:row-start-2 flex flex-col">
              <div className="space-y-4 text-foreground/65 text-sm leading-relaxed mb-10">
                <p>
                  Depuis que j&apos;ai découvert ce que c&apos;était de voir le sol s&apos;éloigner
                  à sept ans, je n&apos;ai jamais vraiment atterri. Cette passion pour l&apos;aviation,
                  je l&apos;ai construite année après année. Depuis 4 ans, je la vis pleinement.
                </p>
                <p>
                  Fly Horizons est né d&apos;une envie simple : partager cette sensation avec ceux
                  qui n&apos;ont jamais eu l&apos;occasion d&apos;y accéder. Pas de barrière
                  d&apos;entrée, pas de jargon inutile. Juste vous, l&apos;avion, et l&apos;horizon
                  que vous choisissez.
                </p>
                <p>
                  Chaque vol est préparé avec vous : itinéraire adapté à la météo et à vos envies,
                  briefing sécurité complet avant le départ, casques audio fournis pour suivre
                  le vol en temps réel. La sécurité n&apos;est pas un argument de vente — c&apos;est
                  simplement la façon dont je travaille.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {[
                  { icon: <BadgeCheck size={12} />, label: "Licence CPL(A)" },
                  { icon: <Clock size={12} />,       label: "Pilote depuis 4 ans" },
                  { icon: <MapPin size={12} />,      label: "Aérodrome EBCI · Charleroi" },
                  { icon: <ShieldCheck size={12} />, label: "Assurance passagers incluse" },
                ].map(({ icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 bg-white border border-border text-foreground/65 text-[11px] font-medium px-3 py-1.5 rounded-full"
                  >
                    <span className="text-primary">{icon}</span>
                    {label}
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ L'AVION ══ */}
      <section className="bg-white py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

          {/*
            Mobile  : 1-header · 2-photo · 3-body
            Desktop : col-1 = photo (row-span-2) · col-2 row-1 = header · col-2 row-2 = body
          */}
          <div className="grid md:grid-cols-2 lg:grid-cols-[1fr_480px] gap-x-10 lg:gap-x-16 gap-y-6 md:gap-y-8">

            {/* 1. Header */}
            <div className="order-1 md:col-start-2 md:row-start-1">
              <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-4">L&apos;avion</p>
              <h2 className="text-4xl sm:text-5xl font-black text-foreground leading-none tracking-tight">
                Diamond DA40
              </h2>
            </div>

            {/* 2. Photo */}
            <div className="order-2 md:order-none md:col-start-1 md:row-start-1 md:row-span-2 relative aspect-[4/3] md:aspect-auto rounded-lg overflow-hidden">
              <Image
                src="/da-40.webp"
                alt="Diamond DA40 en vol"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-5">
                <p className="text-white/55 text-xs tracking-wide">Avion léger 4 places</p>
              </div>
            </div>

            {/* 3. Body */}
            <div className="order-3 md:order-none md:col-start-2 md:row-start-2">
              <div className="mb-7">
                {[
                  { icon: <Eye size={14} />,         text: "Cockpit vitré, vue à 360°" },
                  { icon: <Users size={14} />,        text: "Jusqu'à 3 passagers à bord" },
                  { icon: <Gauge size={14} />,        text: "Vitesse de croisière : 120 kt (220 km/h)" },
                  { icon: <MountainSnow size={14} />, text: "Altitude typique : 600 à 1 000 m" },
                  { icon: <Headphones size={14} />,   text: "Casques antibruit fournis" },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3 py-3.5 border-b border-border/60 last:border-0">
                    <span className="text-primary shrink-0">{icon}</span>
                    <span className="text-sm text-foreground/70">{text}</span>
                  </div>
                ))}
              </div>

              <div className="bg-secondary border border-border rounded-lg p-5 flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-primary shrink-0" />
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
        </div>
      </section>

      {/* ══ L'APPROCHE ══ */}
      <section className="bg-secondary py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

          <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-4">
            L&apos;approche Fly Horizons
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-foreground leading-none tracking-tight mb-12">
            Sans marge.<br />
            <span className="text-primary">Uniquement les frais réels.</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                title: "Partage de frais",
                text: "Les vols sont organisés dans le cadre réglementé du partage de frais (NCO.GEN.104). Chaque passager contribue aux coûts réels : carburant, redevances, maintenance.",
              },
              {
                title: "Votre vol, vos règles",
                text: "Destination, durée, nombre de passagers, escales : vous décidez de tout. Personne d'autre ne propose ça. L'itinéraire est composé avec vous, pas à votre place.",
              },
              {
                title: "Accessible à tous",
                text: "L'aviation légère reste hors de portée pour beaucoup. Fly Horizons a été conçu pour changer ça, sans compromis sur la qualité ni sur la sécurité.",
              },
            ].map(({ title, text }) => (
              <div key={title} className="card-premium p-7 flex flex-col gap-4">
                <div className="w-8 h-1 bg-primary rounded-full" />
                <p className="text-foreground font-bold text-sm">{title}</p>
                <p className="text-foreground/60 text-sm leading-relaxed flex-1">{text}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="bg-white border-t border-border py-14">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-3">Prêt à décoller ?</p>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground leading-tight">
              Réservez votre vol ou créez votre itinéraire.
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href="/nos-offres"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-lg text-sm font-black hover:bg-[#e6a800] active:scale-[0.98] transition-all shadow-gold"
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
      </section>

      <ChatWidget />
    </main>
  );
}
