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

      {/* ══ HERO ══ */}
      <section className="bg-[#0b2238] pt-24 pb-14 sm:pt-32 sm:pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:grid md:grid-cols-2 md:gap-16 md:items-center">

            {/* Titre — en premier sur mobile, colonne gauche sur desktop */}
            <div className="md:order-1">
              <p className="text-[#F2B705] text-[10px] font-bold tracking-[3px] uppercase mb-3">
                À propos
              </p>
              <h1 className="text-white text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">
                Romain<br />DESTANBERG
              </h1>
              <p className="text-white/40 text-sm mt-2">
                Fondateur &amp; Pilote, Fly Horizons
              </p>
            </div>

            {/* Photo — deuxième sur mobile, colonne droite sur desktop */}
            <div className="md:order-2 mt-6 md:mt-0 flex justify-center md:justify-end">
              <div className="relative w-full max-w-[280px] sm:max-w-sm md:max-w-full md:w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src="/photo-pilote.jpg"
                  alt="Romain DESTANBERG, Fondateur & Pilote Fly Horizons"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 280px, 440px"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b2238]/40 via-transparent to-transparent" />
                <div className="absolute inset-0 ring-1 ring-inset ring-[#F2B705]/20 rounded-2xl" />
              </div>
            </div>

            {/* Description — troisième sur mobile, sous le titre sur desktop */}
            <div className="md:order-3 md:col-span-1 mt-6 md:mt-0 flex flex-col gap-4">
              <div className="space-y-3 text-white/70 text-sm leading-relaxed">
                <p>
                  Depuis que j&apos;ai découvert ce que c&apos;était de voir le sol s&apos;éloigner à sept ans,
                  je n&apos;ai jamais vraiment atterri. Cette passion pour l&apos;aviation, je l&apos;ai
                  construite année après année. Depuis 7 ans, je la vis pleinement.
                </p>
                <p>
                  Fly Horizons est né d&apos;une envie simple : partager cette sensation avec ceux qui
                  n&apos;ont jamais eu l&apos;occasion d&apos;y accéder. Pas de barrière d&apos;entrée,
                  pas de jargon inutile. Juste vous, l&apos;avion, et l&apos;horizon que vous choisissez.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-white/6 border border-white/12 rounded-lg px-3 py-1.5 w-fit">
                <BadgeCheck size={13} className="text-[#F2B705] shrink-0" />
                <span className="text-white/75 text-[11px] font-semibold">Pilote certifié CPL(A)</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ L'AVION ══ */}
      <section className="bg-[#f5f8ff] py-14 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:grid md:grid-cols-2 md:gap-16 md:items-start">

            {/* Titre — en premier sur mobile, colonne gauche sur desktop */}
            <div className="md:order-1">
              <p className="text-[#F2B705] text-[10px] font-bold tracking-[3px] uppercase mb-3">L&apos;avion</p>
              <h2 className="text-[#0b2238] text-2xl sm:text-3xl font-extrabold mb-4">Diamond DA40</h2>
              <p className="text-foreground/65 text-sm leading-relaxed md:mb-6">
                Avion léger 4 places reconnu pour sa stabilité, son cockpit vitré panoramique
                et son confort en vol. C&apos;est à bord de cet appareil que Fly Horizons vous
                emmène survoler la Belgique.
              </p>
            </div>

            {/* Photo — deuxième sur mobile, colonne droite sur desktop */}
            <div className="md:order-2 mt-6 md:mt-0 md:row-span-2">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-md">
                <Image
                  src="/da-40-3.jpg"
                  alt="Diamond DA40 en vol"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 520px"
                />
              </div>
            </div>

            {/* Specs + sécurité — troisième sur mobile, sous le titre sur desktop */}
            <div className="md:order-3 mt-6 md:mt-6 flex flex-col gap-6">
              <ul className="space-y-2.5">
                {[
                  { icon: <Eye size={14} />,         text: "Cockpit vitré, vue à 360°" },
                  { icon: <Users size={14} />,        text: "Jusqu'à 3 passagers à bord" },
                  { icon: <Gauge size={14} />,        text: "Vitesse de croisière : 120 kt (220 km/h)" },
                  { icon: <MountainSnow size={14} />, text: "Altitude typique : 600 à 1 000 m" },
                  { icon: <Headphones size={14} />,   text: "Casques antibruit fournis" },
                ].map(({ icon, text }) => (
                  <li key={text} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#F2B705]/10 flex items-center justify-center text-[#F2B705] shrink-0">
                      {icon}
                    </div>
                    <span className="text-sm text-foreground/70">{text}</span>
                  </li>
                ))}
              </ul>

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
