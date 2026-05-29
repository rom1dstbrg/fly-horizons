import type { Metadata } from "next";
import Image from "next/image";
import { BadgeCheck, ShieldCheck, Eye, Users, Gauge, MountainSnow, Headphones } from "lucide-react";

export const metadata: Metadata = {
  title: "À propos · Fly Horizons",
  description:
    "Découvrez Romain DESTANBERG, fondateur et pilote de Fly Horizons. Vols en avion léger depuis Charleroi, dans un cadre de partage de frais accessible à tous.",
  alternates: { canonical: "https://fly-horizons.com/about" },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen">

      {/* ══ ROMAIN ══ */}
      <section className="bg-[#0b2238] pt-32 pb-16 sm:pb-20 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          <div className="grid grid-cols-1 md:grid-cols-[5fr_7fr] md:grid-rows-[auto_1fr] gap-x-14 gap-y-7 items-start">

            {/* Titre — en premier sur mobile et desktop (col 2, row 1) */}
            <div className="md:col-start-2 md:row-start-1">
              <p className="text-[#F2B705] text-[10px] font-bold tracking-[3px] uppercase mb-4">
                Votre pilote
              </p>
              <h1 className="text-white font-black leading-[0.92] tracking-tight text-[clamp(2.4rem,5.5vw,3.75rem)]">
                ROMAIN<br />
                <span className="text-[#F2B705]">DESTANBERG</span>
              </h1>
              <div className="flex items-center gap-3 mt-4">
                <div className="w-5 h-px bg-[#F2B705]/50" />
                <p className="text-white/40 text-[11px] font-medium tracking-[2px] uppercase">
                  Fondateur &amp; Pilote · Fly Horizons
                </p>
              </div>
            </div>

            {/* Photo — après le titre sur mobile, col 1 rows 1-2 sur desktop */}
            <div className="relative md:col-start-1 md:row-start-1 md:row-span-2">
              <div className="relative w-full max-w-[260px] mx-auto md:mx-0 md:max-w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src="/photo-pilote.jpg"
                  alt="Romain DESTANBERG, Fondateur & Pilote Fly Horizons"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 260px, 380px"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b2238]/50 via-transparent to-transparent" />
                <div className="absolute inset-0 ring-1 ring-inset ring-[#F2B705]/20 rounded-2xl" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                  <BadgeCheck size={12} className="text-[#F2B705] shrink-0" />
                  <span className="text-white/85 text-[11px] font-semibold">Licence CPL(A)</span>
                </div>
              </div>
              <div className="hidden md:block absolute -left-5 top-10 w-px h-20 bg-gradient-to-b from-transparent via-[#F2B705]/40 to-transparent" />
            </div>

            {/* Texte + stats — après la photo sur mobile, col 2 row 2 sur desktop */}
            <div className="md:col-start-2 md:row-start-2 flex flex-col">
              <div className="space-y-3 text-white/65 text-sm leading-relaxed mb-8">
                <p>
                  Depuis que j&apos;ai découvert ce que c&apos;était de voir le sol s&apos;éloigner à sept ans,
                  je n&apos;ai jamais vraiment atterri. Cette passion pour l&apos;aviation, je l&apos;ai
                  construite année après année. Depuis 4 ans, je la vis pleinement.
                </p>
                <p>
                  Fly Horizons est né d&apos;une envie simple : partager cette sensation avec ceux qui
                  n&apos;ont jamais eu l&apos;occasion d&apos;y accéder. Pas de barrière d&apos;entrée,
                  pas de jargon inutile. Juste vous, l&apos;avion, et l&apos;horizon que vous choisissez.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
                <div>
                  <p className="text-white font-black text-2xl leading-none mb-1">4</p>
                  <p className="text-white/30 text-[10px] tracking-widest uppercase">ans de vol</p>
                </div>
                <div>
                  <p className="text-[#F2B705] font-bold text-base leading-none mb-1">CPL(A)</p>
                  <p className="text-white/30 text-[10px] tracking-widest uppercase">Licence</p>
                </div>
                <div>
                  <p className="text-white font-bold text-base leading-none mb-1">EBCI</p>
                  <p className="text-white/30 text-[10px] tracking-widest uppercase">Charleroi</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ L'AVION ══ */}
      <section className="bg-[#f5f8ff] py-14 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          {/* En-tête */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-7 gap-1">
            <div>
              <p className="text-[#F2B705] text-[10px] font-bold tracking-[3px] uppercase mb-2">L&apos;avion</p>
              <h2 className="text-[#0b2238] text-3xl sm:text-4xl font-extrabold">Diamond DA40</h2>
            </div>
            <p className="text-foreground/35 text-xs font-medium tracking-widest uppercase hidden sm:block">
              Avion léger · 4 places
            </p>
          </div>

          {/* Photo panoramique pleine largeur */}
          <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden shadow-md mb-5">
            <Image
              src="/da-40-3.jpg"
              alt="Diamond DA40 en vol"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 960px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b2238]/60 via-[#0b2238]/10 to-transparent" />
            <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
              <p className="text-white/60 text-xs tracking-wide">
                Avion léger 4 places reconnu pour sa stabilité et sa fiabilité
              </p>
            </div>
          </div>

          {/* Specs — liste plate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 mb-5">
            {[
              { icon: <Eye size={14} />,         text: "Cockpit vitré, vue à 360°" },
              { icon: <Users size={14} />,        text: "Jusqu'à 3 passagers à bord" },
              { icon: <Gauge size={14} />,        text: "Vitesse de croisière : 120 kt (220 km/h)" },
              { icon: <MountainSnow size={14} />, text: "Altitude typique : 600 à 1 000 m" },
              { icon: <Headphones size={14} />,   text: "Casques antibruit fournis" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3 py-3 border-b border-border/60 last:border-0 sm:[&:nth-last-child(2)]:border-0">
                <div className="text-[#F2B705] shrink-0">{icon}</div>
                <span className="text-sm text-foreground/70">{text}</span>
              </div>
            ))}
          </div>

          {/* Assurance */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-2.5">
              <ShieldCheck size={14} className="text-[#F2B705] shrink-0" />
              <p className="text-[#0b2238] text-sm font-bold">Sécurité &amp; assurance</p>
            </div>
            <p className="text-foreground/60 text-sm leading-relaxed">
              L&apos;avion appartient à <strong className="text-foreground">Air Academy New CAG</strong>{" "}
              (ATO-005, EBCI). Leur assurance couvre tous les occupants à bord. Les vols sont
              organisés dans le cadre du partage de frais réglementé par{" "}
              <strong className="text-foreground">NCO.GEN.104</strong>.
            </p>
          </div>

        </div>
      </section>

      {/* ══ L'APPROCHE ══ */}
      <section className="bg-white py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          <p className="text-[#F2B705] text-[10px] font-bold tracking-[3px] uppercase mb-5">
            L&apos;approche Fly Horizons
          </p>

          <h2 className="text-[#0b2238] text-3xl sm:text-4xl md:text-5xl font-black leading-[1.05] mb-12 max-w-2xl">
            Sans marge.<br />
            <span className="text-[#F2B705]">Uniquement les frais</span><br />
            réels du vol.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 border-t border-[#e8edf5] pt-10">
            {[
              {
                num: "01",
                title: "Partage de frais",
                text: "Les vols sont organisés dans le cadre réglementé du partage de frais (NCO.GEN.104). Chaque passager contribue aux coûts réels du vol : carburant, redevances, maintenance.",
              },
              {
                num: "02",
                title: "Transparence totale",
                text: "Le tarif correspond à la réalité du vol, calculé à la minute après atterrissage. Aucune marge commerciale, aucun supplément non annoncé.",
              },
              {
                num: "03",
                title: "Accessibilité",
                text: "L&apos;aviation légère reste hors de portée pour beaucoup. Fly Horizons a été conçu pour changer cela, sans compromis sur la qualité ni sur la sécurité.",
              },
            ].map(({ num, title, text }) => (
              <div key={num} className="flex flex-col gap-3">
                <span className="text-[#F2B705]/35 text-3xl font-black leading-none">{num}</span>
                <div className="w-7 h-0.5 bg-[#F2B705]" />
                <p className="text-[#0b2238] font-bold text-sm">{title}</p>
                <p className="text-foreground/55 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

    </main>
  );
}
