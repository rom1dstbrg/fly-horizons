import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck, Plane, ShieldCheck, Heart,
  CalendarCheck, MapPin, ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "À propos — Fly Horizons",
  description:
    "Découvrez Romain DESTANBERG, fondateur et pilote de Fly Horizons. Vols en avion léger depuis Charleroi, dans un cadre de partage de frais accessible à tous.",
  alternates: { canonical: "https://fly-horizons.com/about" },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen">

      {/* ══════════════════════════════════════════
          ROMAIN — section hero navy
      ══════════════════════════════════════════ */}
      <section className="bg-[#0b2238] pt-28 pb-16 sm:pt-32 sm:pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">

            {/* Texte gauche */}
            <div className="order-2 md:order-1 flex flex-col gap-7">

              <div>
                <p className="text-[#F2B705] text-[10px] font-bold tracking-[3px] uppercase mb-3">
                  À propos
                </p>
                <h1 className="text-white text-4xl sm:text-5xl font-extrabold leading-tight">
                  Romain<br />DESTANBERG
                </h1>
                <p className="text-white/40 text-sm mt-2">
                  Fondateur &amp; Pilote — Fly Horizons
                </p>
              </div>

              <div className="space-y-4 text-white/70 text-sm leading-relaxed">
                <p>
                  Depuis que j&apos;ai découvert ce que c&apos;était de voir le sol s&apos;éloigner à sept ans,
                  je n&apos;ai jamais vraiment atterri. Cette passion pour l&apos;aviation, je l&apos;ai
                  construite année après année — et depuis 7 ans, je la vis pleinement.
                </p>
                <p>
                  Fly Horizons est né d&apos;une envie simple : partager cette sensation avec ceux qui
                  n&apos;ont jamais eu l&apos;occasion d&apos;y accéder. Pas de barrière d&apos;entrée,
                  pas de jargon inutile. Juste vous, l&apos;avion, et l&apos;horizon que vous choisissez.
                </p>
                <p>
                  Chaque vol est une conversation. Vous me dites où vous voulez aller, je vous emmène.
                </p>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: <BadgeCheck size={13} className="text-[#F2B705] shrink-0" />, label: "Pilote certifié CPL(A)" },
                  { icon: <Plane      size={13} className="text-[#F2B705] shrink-0" />, label: "Diamond DA40 · Charleroi EBCI" },
                  { icon: <ShieldCheck size={13} className="text-[#F2B705] shrink-0" />, label: "Assuré Air Academy New CAG" },
                ].map(({ icon, label }) => (
                  <div key={label} className="inline-flex items-center gap-1.5 bg-white/6 border border-white/12 rounded-lg px-3 py-1.5">
                    {icon}
                    <span className="text-white/75 text-[11px] font-semibold">{label}</span>
                  </div>
                ))}
              </div>

            </div>

            {/* Photo droite */}
            <div className="order-1 md:order-2 relative flex justify-center md:justify-end">
              <div className="relative w-72 sm:w-80 md:w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src="/photo-pilote.jpg"
                  alt="Romain DESTANBERG — Fondateur & Pilote Fly Horizons"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 320px, 440px"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b2238]/40 via-transparent to-transparent" />
                <div className="absolute inset-0 ring-1 ring-inset ring-[#F2B705]/20 rounded-2xl" />
              </div>
              <div className="absolute -bottom-4 -right-4 w-20 h-20 border-b-2 border-r-2 border-[#F2B705]/25 rounded-br-2xl hidden md:block pointer-events-none" />
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          L'AVION — blanc, 2 colonnes
      ══════════════════════════════════════════ */}
      <section className="bg-white py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-start">

            {/* Texte */}
            <div>
              <p className="text-[#F2B705] text-[10px] font-bold tracking-[3px] uppercase mb-3">
                L&apos;avion
              </p>
              <h2 className="text-[#0b2238] text-2xl sm:text-3xl font-extrabold mb-5">
                Diamond DA40
              </h2>
              <p className="text-foreground/65 text-sm leading-relaxed mb-6">
                Avion léger 4 places reconnu pour sa stabilité, son cockpit vitré panoramique
                et son confort en vol. C&apos;est à bord de cet appareil que Fly Horizons vous
                emmène survoler la Belgique.
              </p>

              <ul className="space-y-3 mb-8">
                {[
                  "Cockpit vitré — vue à 360°",
                  "Jusqu'à 3 passagers à bord",
                  "Vitesse de croisière : 120 kt (220 km/h)",
                  "Altitude typique : 600 à 1 000 m",
                  "Casques antibruit fournis",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-foreground/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F2B705] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              {/* Sécurité */}
              <div className="pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck size={14} className="text-[#F2B705] shrink-0" />
                  <p className="text-[#0b2238] text-sm font-bold">Sécurité &amp; assurance</p>
                </div>
                <p className="text-foreground/65 text-sm leading-relaxed mb-2">
                  L&apos;avion appartient à <strong className="text-foreground">Air Academy New CAG</strong>{" "}
                  (ATO-005, EBCI), école d&apos;aviation certifiée basée à Charleroi. Leur assurance
                  couvre tous les occupants à bord, pilote et passagers.
                </p>
                <p className="text-foreground/65 text-sm leading-relaxed">
                  Les vols sont organisés dans le cadre du partage de frais réglementé par{" "}
                  <strong className="text-foreground">NCO.GEN.104</strong>. Vous participez aux frais
                  réels du vol — rien de plus.
                </p>
              </div>
            </div>

            {/* Photos DA40 */}
            <div className="flex flex-col gap-3">
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden shadow-sm">
                <Image
                  src="/da-40-1.webp"
                  alt="Diamond DA40 — vue extérieure"
                  fill
                  className="object-cover hover:scale-[1.02] transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, 500px"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative aspect-square rounded-2xl overflow-hidden shadow-sm">
                  <Image
                    src="/da-40-2.webp"
                    alt="Diamond DA40 — cockpit"
                    fill
                    className="object-cover hover:scale-[1.02] transition-transform duration-300"
                    sizes="240px"
                  />
                </div>
                <div className="relative aspect-square rounded-2xl overflow-hidden shadow-sm">
                  <Image
                    src="/da-40-3.jpg"
                    alt="Diamond DA40 — à bord"
                    fill
                    className="object-cover hover:scale-[1.02] transition-transform duration-300"
                    sizes="240px"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          L'APPROCHE — navy, texte fort
      ══════════════════════════════════════════ */}
      <section className="bg-[#0b2238] py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          <div className="flex items-center gap-3 mb-6">
            <Heart size={16} className="text-[#F2B705] shrink-0" />
            <p className="text-[#F2B705] text-[10px] font-bold tracking-[3px] uppercase">
              L&apos;approche Fly Horizons
            </p>
          </div>

          <h2 className="text-white text-2xl sm:text-3xl font-extrabold leading-snug mb-8 max-w-2xl">
            Pas de marge. Pas de formule commerciale.<br />
            Juste les frais réels du vol.
          </h2>

          <div className="space-y-4 text-white/65 text-sm leading-relaxed max-w-2xl">
            <p>
              Fly Horizons ne cherche pas à faire du profit sur vos vols. Le concept repose sur
              le <strong className="text-white/85">partage de frais</strong> : vous contribuez aux
              coûts réels de l&apos;avion (carburant, redevances, maintenance), ni plus ni moins.
            </p>
            <p>
              C&apos;est ce qui rend l&apos;aviation accessible. Pas de marge commerciale cachée,
              pas de &laquo;&nbsp;tarif découverte&nbsp;&raquo; gonflé. Le prix affiché correspond
              à la réalité du vol — calculé à la minute réelle après atterrissage.
            </p>
            <p>
              L&apos;objectif : que chacun puisse vivre cette expérience au moins une fois, peu
              importe son budget ou son rapport à l&apos;aviation.
            </p>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          OÙ ON VOLE + CTAs — bleu pâle
      ══════════════════════════════════════════ */}
      <section className="bg-[#f5f8ff] py-14 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          <div className="flex items-center gap-2 mb-3">
            <MapPin size={14} className="text-[#F2B705] shrink-0" />
            <p className="text-[#F2B705] text-[10px] font-bold tracking-[3px] uppercase">
              Où on vole
            </p>
          </div>

          <h2 className="text-[#0b2238] text-2xl sm:text-3xl font-extrabold mb-5">
            Au départ de Charleroi (EBCI)
          </h2>

          <div className="space-y-3 text-foreground/65 text-sm leading-relaxed max-w-2xl mb-10">
            <p>
              Les vols partent de l&apos;aéroport de{" "}
              <strong className="text-foreground">Brussels South Charleroi (EBCI)</strong>.
              Les itinéraires peuvent s&apos;étendre à la Belgique, la France, l&apos;Allemagne,
              les Pays-Bas et le Royaume-Uni — selon les autorisations et la météo.
            </p>
            <p>
              Vous dessinez votre route sur la carte, nous vérifions la faisabilité. Les destinations
              impossibles (espaces aériens restreints, conditions météo) sont toujours expliquées
              avec une alternative proposée.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/nos-offres"
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#F2B705] text-[#113356] rounded-xl font-bold text-sm hover:bg-[#e6a800] transition-colors shadow-sm"
            >
              <CalendarCheck size={15} />
              Voir nos vols
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white border border-border text-[#113356] rounded-xl font-bold text-sm hover:bg-secondary transition-colors shadow-sm"
            >
              Une question ? Contacter Romain
              <ArrowRight size={14} />
            </Link>
          </div>

        </div>
      </section>

    </main>
  );
}
