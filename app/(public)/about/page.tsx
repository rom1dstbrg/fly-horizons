import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { ArrowRight, Mail } from "lucide-react";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";

export const metadata: Metadata = {
  title: "À propos · Fly Horizons",
  description:
    "Découvrez Romain DESTANBERG, fondateur et pilote de Fly Horizons. Vols en avion léger depuis Charleroi, dans un cadre de partage de frais accessible à tous.",
  alternates: { canonical: `${siteUrl}/about` },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* ══ 1 · CE QU'EST FLY HORIZONS ══ */}
      <section className="bg-white pt-[98px]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 pt-10 sm:pt-20 pb-20 sm:pb-28 flex flex-col items-center text-center">
          <p className="text-xs font-bold text-[#F2B705] uppercase tracking-[3px] mb-4">
            Fly Horizons
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-foreground leading-[1.02] tracking-tight mb-8">
            Qu&apos;est-ce que Fly Horizons ?
          </h1>
          <div className="space-y-5 text-foreground/65 text-[15px] sm:text-base leading-relaxed">
            <p>
              Fly Horizons vous permet de monter à bord d&apos;un avion léger avec moi, au départ
              de l&apos;aérodrome de Charleroi (EBCI). Ce n&apos;est pas une compagnie aérienne ni
              une agence de vols touristiques : je vole pour entretenir mes heures de pilote, et je
              partage ce vol avec des passionnés qui souhaitent se joindre à moi. En échange, vous
              contribuez aux frais réels du vol (avion, carburant, taxes d&apos;aérodrome), sans
              marge commerciale ni tarif touristique.
            </p>
            <p>
              Concrètement, les vols durent de 30 minutes à 2 heures, jusqu&apos;à 3 passagers
              peuvent m&apos;accompagner, et l&apos;itinéraire se construit ensemble selon vos
              envies et la météo du jour. Casques audio et briefing sécurité sont inclus à chaque vol.
            </p>
          </div>
        </div>
      </section>

      {/* ══ 2 · LE PRINCIPE DU VOL PARTAGÉ ══ */}
      <div className="bg-[#0b2238] overflow-hidden relative">

        <div className="relative h-12 overflow-hidden">
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,0 L1440,0 L1440,24 Q720,48 0,24 Z" fill="#ffffff" />
          </svg>
        </div>

        <section className="py-20 sm:py-28">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">
            <p className="text-xs font-bold text-[#F2B705] uppercase tracking-[3px] mb-4">
              Vol partagé
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-[1.05] tracking-tight mb-6 max-w-2xl">
              Le principe du vol partagé.
            </h2>
            <p className="text-white/60 text-[15px] sm:text-base leading-relaxed max-w-2xl mb-14">
              Le vol partagé répond à un cadre précis, distinct d&apos;un transport aérien
              commercial classique. Il repose sur quatre principes essentiels.
            </p>

            <div className="grid sm:grid-cols-2 gap-x-16 gap-y-10">
              <div className="border-t border-white/10 pt-6">
                <p className="text-white font-black text-[17px] leading-snug mb-2">
                  Le pilote décide, vous ne commandez pas un vol
                </p>
                <p className="text-white/50 text-[14px] leading-relaxed">
                  Vous envoyez une demande pour vous joindre à un vol ; le pilote l&apos;accepte ou la décline selon ses disponibilités, à sa seule discrétion.
                </p>
              </div>
              <div className="border-t border-white/10 pt-6">
                <p className="text-white font-black text-[17px] leading-snug mb-2">
                  Partage des frais réels, sans marge commerciale
                </p>
                <p className="text-white/50 text-[14px] leading-relaxed">
                  Avion, carburant et taxes d&apos;aérodrome sont répartis entre les occupants.
                </p>
              </div>
              <div className="border-t border-white/10 pt-6">
                <p className="text-white font-black text-[17px] leading-snug mb-2">
                  Aucun créneau garanti
                </p>
                <p className="text-white/50 text-[14px] leading-relaxed">
                  La météo et mes disponibilités déterminent chaque vol, comme pour tout vol privé.
                </p>
              </div>
              <div className="border-t border-white/10 pt-6">
                <p className="text-white font-black text-[17px] leading-snug mb-2">
                  Un cadre non commercial
                </p>
                <p className="text-white/50 text-[14px] leading-relaxed">
                  Ce n&apos;est pas un service de transport aérien, mais une activité de partage
                  de coûts entre particuliers.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="relative h-12 overflow-hidden">
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,48 L0,24 Q360,0 720,24 Q1080,48 1440,24 L1440,48 Z" fill="#f5f5f7"/>
          </svg>
        </div>

      </div>

      {/* ══ 3 · VOTRE PILOTE ══ */}
      {/*
        Mobile (< lg) : la photo (déclarée une fois, dupliquée dans le markup) s'affiche entre
        l'identité et la citation. Desktop (lg+) : colonne texte (identité + citation + bio, empilées
        normalement, sans écart) à gauche, photo carrée dans sa propre colonne à droite — pas de
        row-span partagé entre les deux, pour éviter que la hauteur de la photo n'étire la grille
        et ne crée un vide entre l'identité et la citation.
      */}
      <section className="bg-[#f5f5f7]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 py-20 sm:py-28">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">

            {/* Colonne texte */}
            <div className="lg:col-span-7">
              <p className="text-xs font-bold text-[#F2B705] uppercase tracking-[3px] mb-4">
                Votre pilote
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground leading-none tracking-tight mb-3">
                Romain Destanberg
              </h2>
              <p className="text-foreground/45 text-[13px] font-medium uppercase tracking-wide">
                Pilote et fondateur de Fly Horizons
              </p>

              {/* Photo — visible uniquement sur mobile/tablette, entre l'identité et la citation */}
              <div className="relative aspect-square rounded-2xl overflow-hidden shadow-premium-xl my-7 lg:hidden">
                <Image
                  src="/photo-pilote.png"
                  alt="Romain, pilote et fondateur de Fly Horizons"
                  fill
                  className="object-cover object-top"
                  sizes="100vw"
                />
              </div>

              <div className="border-l-[3px] border-[#F2B705] pl-5 mb-6 mt-7">
                <p className="text-foreground/65 text-[15px] italic leading-relaxed">
                  &ldquo;Depuis que j&apos;ai découvert ce que c&apos;était de voir le sol
                  s&apos;éloigner à sept ans, je n&apos;ai jamais vraiment atterri.&rdquo;
                </p>
              </div>

              <p className="text-foreground/60 text-[15px] leading-relaxed">
                Cette passion, je l&apos;ai construite année après année. Depuis 4 ans, je la vis
                pleinement, et depuis Fly Horizons, je la partage. La sécurité n&apos;est pas un
                argument de vente : c&apos;est simplement la façon dont je travaille.
              </p>
            </div>

            {/* Photo — visible uniquement sur desktop, colonne indépendante */}
            <div className="hidden lg:block lg:col-span-5 lg:self-start">
              <div className="relative aspect-square rounded-2xl overflow-hidden shadow-premium-xl">
                <Image
                  src="/photo-pilote.png"
                  alt="Romain, pilote et fondateur de Fly Horizons"
                  fill
                  className="object-cover object-top"
                  sizes="42vw"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ 4 · FINAL CTA ══ */}
      <section className="bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 py-20 flex flex-col items-center text-center">

          <p className="text-xs font-bold text-[#F2B705] uppercase tracking-[3px] mb-4">Envie d&apos;essayer ?</p>
          <h2 className="text-3xl sm:text-5xl font-black text-foreground leading-tight tracking-tight mb-3 max-w-2xl">
            Prêt à embarquer ?
          </h2>
          <p className="text-foreground/50 text-sm mb-10">Romain vous répond sous 24 heures.</p>

          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/nos-offres"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#F2B705] text-[#0b2238] rounded-lg text-sm font-black hover:bg-[#e6a800] transition-colors shadow-gold-sm"
            >
              Voir les vols
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 border border-border text-foreground/70 rounded-lg text-sm font-semibold hover:border-foreground hover:text-foreground transition-colors"
            >
              <Mail size={15} />
              Nous contacter
            </Link>
          </div>

        </div>
      </section>

      <ChatWidget />
    </main>
  );
}
