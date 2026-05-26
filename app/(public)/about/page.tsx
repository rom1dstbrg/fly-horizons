import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck, Plane, ShieldCheck, Heart,
  CalendarCheck, MapPin, Users, ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "À propos — Fly Horizons",
  description:
    "Découvrez Romain DESTANBERG, fondateur et pilote de Fly Horizons. Vols en avion léger depuis Charleroi, dans un cadre de partage de frais accessible à tous.",
  alternates: { canonical: "https://fly-horizons.com/about" },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-navy pt-24 pb-16">
      <div className="container-shop max-w-4xl">

        {/* ── En-tête ── */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">À propos</p>
          <h1 className="text-3xl font-bold text-foreground">Qui sommes-nous ?</h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-xl">
            Fly Horizons, c'est un pilote, un avion, et une idée simple : rendre l'aviation accessible à tous ceux qui n'ont jamais eu l'occasion d'essayer.
          </p>
        </div>

        {/* ── Carte pilote ── */}
        <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-sm mb-8">
          <div className="flex flex-col md:flex-row">

            {/* Photo */}
            <div className="relative md:w-64 md:shrink-0 h-72 md:h-auto bg-[#0b2238]">
              <Image
                src="/photo-pilote.jpg"
                alt="Romain DESTANBERG — Fondateur & Pilote Fly Horizons"
                fill
                className="object-cover object-top"
                sizes="(max-width: 768px) 100vw, 256px"
                priority
              />
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent md:hidden" />
            </div>

            {/* Contenu */}
            <div className="flex-1 p-7 md:p-10 flex flex-col justify-center gap-6">

              <div>
                <p className="text-[#F2B705] text-[10px] font-bold tracking-[3px] uppercase mb-1">Votre pilote</p>
                <h2 className="text-[#0b2238] text-2xl font-extrabold leading-tight">Romain DESTANBERG</h2>
                <p className="text-muted-foreground text-sm mt-0.5">Fondateur &amp; Pilote — Fly Horizons</p>
              </div>

              <div className="space-y-3 text-foreground/70 text-sm leading-relaxed">
                <p>
                  Depuis que j'ai découvert ce que c'était de voir le sol s'éloigner à sept ans, je n'ai jamais vraiment atterri. Cette passion pour l'aviation, je l'ai construite année après année — et depuis 7 ans, je la vis pleinement.
                </p>
                <p>
                  Fly Horizons est né d'une envie simple : partager cette sensation avec ceux qui n'ont jamais eu l'occasion d'y accéder. Pas de barrière d'entrée, pas de jargon inutile. Juste vous, l'avion, et l'horizon que vous choisissez.
                </p>
                <p>
                  Chaque vol est une conversation. Vous me dites où vous voulez aller, je vous emmène.
                </p>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-1.5 bg-[#f5f5f7] border border-border rounded-lg px-3 py-1.5">
                  <BadgeCheck size={13} className="text-[#0b2238] shrink-0" />
                  <span className="text-[#0b2238] text-[11px] font-semibold">Pilote certifié CPL(A)</span>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-[#f5f5f7] border border-border rounded-lg px-3 py-1.5">
                  <Plane size={13} className="text-[#0b2238] shrink-0" />
                  <span className="text-[#0b2238] text-[11px] font-semibold">Diamond DA40 · Charleroi EBCI</span>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-[#f5f5f7] border border-border rounded-lg px-3 py-1.5">
                  <ShieldCheck size={13} className="text-[#0b2238] shrink-0" />
                  <span className="text-[#0b2238] text-[11px] font-semibold">Assuré Air Academy New CAG</span>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-[#f5f5f7] border border-border rounded-lg px-3 py-1.5">
                  <Users size={13} className="text-[#0b2238] shrink-0" />
                  <span className="text-[#0b2238] text-[11px] font-semibold">7 ans de passion</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── L'avion ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

          <div className="bg-white rounded-2xl border border-border p-7 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#0b2238]/8 border border-[#0b2238]/12 flex items-center justify-center">
                <Plane size={17} className="text-[#0b2238]" />
              </div>
              <h3 className="text-[#0b2238] font-extrabold text-base">L&apos;avion</h3>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Le <strong className="text-foreground">Diamond DA40</strong> est un avion léger 4 places, reconnu pour sa stabilité, son cockpit vitré panoramique et son confort en vol.
            </p>
            <ul className="space-y-2">
              {[
                "Cockpit vitré — vue à 360°",
                "Jusqu'à 3 passagers à bord",
                "Vitesse de croisière : 120 kt (220 km/h)",
                "Altitude typique : 600 à 1 000 m",
                "Casques antibruit fournis",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-[#F2B705] font-black text-base leading-none mt-0.5">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-border p-7 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#0b2238]/8 border border-[#0b2238]/12 flex items-center justify-center">
                <ShieldCheck size={17} className="text-[#0b2238]" />
              </div>
              <h3 className="text-[#0b2238] font-extrabold text-base">Sécurité &amp; assurance</h3>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              L&apos;avion appartient à <strong className="text-foreground">Air Academy New CAG</strong> (ATO-005, EBCI), école d&apos;aviation certifiée basée à Charleroi. Leur assurance couvre tous les occupants à bord, pilote et passagers.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Les vols sont organisés dans le cadre du partage de frais réglementé par le règlement européen <strong className="text-foreground">NCO.GEN.104</strong>. Vous ne payez pas un service commercial : vous participez aux frais réels du vol.
            </p>
          </div>

        </div>

        {/* ── L'approche ── */}
        <div className="bg-[#0b2238] rounded-3xl p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#F2B705]/8 -translate-y-1/2 translate-x-1/4" aria-hidden />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#F2B705]/15 border border-[#F2B705]/20 flex items-center justify-center">
                <Heart size={16} className="text-[#F2B705]" />
              </div>
              <h3 className="text-white font-extrabold text-lg">L&apos;approche Fly Horizons</h3>
            </div>
            <div className="space-y-3 text-white/65 text-sm leading-relaxed max-w-2xl">
              <p>
                Fly Horizons ne cherche pas à faire du profit sur vos vols. Le concept repose sur le <strong className="text-white/85">partage de frais</strong> : vous contribuez aux coûts réels de l'avion (carburant, redevances, maintenance), ni plus ni moins.
              </p>
              <p>
                C'est ce qui rend l'aviation accessible. Pas de marge commerciale cachée, pas de "tarif découverte" gonflé. Le prix affiché correspond à la réalité du vol — calculé à la minute réelle après atterrissage.
              </p>
              <p>
                L'objectif : que chacun puisse vivre cette expérience au moins une fois, peu importe son budget ou son rapport à l'aviation.
              </p>
            </div>
          </div>
        </div>

        {/* ── Où on vole ── */}
        <div className="bg-white rounded-2xl border border-border p-7 shadow-sm mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#0b2238]/8 border border-[#0b2238]/12 flex items-center justify-center">
              <MapPin size={17} className="text-[#0b2238]" />
            </div>
            <h3 className="text-[#0b2238] font-extrabold text-base">Où on vole</h3>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            Les vols partent de l&apos;aéroport de <strong className="text-foreground">Brussels South Charleroi (EBCI)</strong>. Les itinéraires peuvent s&apos;étendre à la Belgique, la France, l&apos;Allemagne, les Pays-Bas et le Royaume-Uni — selon les autorisations et la météo.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Vous dessinez votre route sur la carte, nous vérifions la faisabilité. Les destinations impossibles (espaces aériens restreints, conditions météo) sont toujours expliquées avec une alternative proposée.
          </p>
        </div>

        {/* ── CTAs ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/nos-offres"
            className="flex items-center justify-center gap-2.5 h-13 px-6 py-4 bg-[#F2B705] text-[#113356] rounded-2xl font-bold text-sm hover:bg-[#e6a800] transition-colors shadow-sm"
          >
            <CalendarCheck size={16} />
            Voir nos vols
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/contact"
            className="flex items-center justify-center gap-2.5 h-13 px-6 py-4 bg-white border border-border text-[#113356] rounded-2xl font-bold text-sm hover:bg-secondary transition-colors shadow-sm"
          >
            <span>Une question ? Contactez Romain</span>
            <ArrowRight size={14} />
          </Link>
        </div>

      </div>
    </main>
  );
}
