import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import {
  Clock, Route, Zap, PlaneTakeoff, ArrowRight, MousePointerClick,
  EuroIcon, Users, MapPin,
} from "lucide-react";
import { PackCard } from "@/components/shop/PackCard";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";

export const metadata = {
  title: "Baptême de l'air en Belgique | Vols 30 à 120 min | Fly Horizons",
  description:
    "Baptêmes de l'air en avion léger depuis Charleroi, vols de 30 à 120 min ou sur mesure. Itinéraire libre, jusqu'à 3 passagers. Réservez votre vol en Belgique.",
  alternates: { canonical: `${siteUrl}/nos-offres` },
  openGraph: {
    title: "Baptême de l'air en Belgique | Vols 30 à 120 min | Fly Horizons",
    description:
      "Baptêmes de l'air en avion léger depuis Charleroi, vols de 30 à 120 min ou sur mesure. Itinéraire libre, jusqu'à 3 passagers.",
    url: `${siteUrl}/nos-offres`,
    images: [{ url: `${siteUrl}/piste.jpg`, width: 1200, height: 630, alt: "Baptême de l'air, Fly Horizons Charleroi" }],
  },
};

export default async function NosOffresPage() {
  const supabase = await createClient();

  const { data: packs } = await supabase
    .from("products")
    .select("*, images:product_images(*)")
    .eq("active", true)
    .eq("product_type", "voucher")
    .order("voucher_duration_minutes", { ascending: true });

  return (
    <main className="bg-gradient-navy">

      {/* ══════════════════════════════════════════
          HERO — Vol sur mesure
      ══════════════════════════════════════════ */}
      <div className="bg-[#0b2238] pt-[98px] pb-0 relative overflow-hidden">

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6">

          {/* Eyebrow label */}
          <p className="text-xs font-bold text-[#F2B705] uppercase tracking-[3px] mb-6">
            Vol sur mesure
          </p>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start pb-12">

            {/* Texte gauche */}
            <div>
              <h1 className="text-5xl sm:text-6xl font-black text-white leading-none mb-4">
                Vous choisissez<br />
                où vous allez.<br />
                <span className="text-[#F2B705]">On calcule le reste.</span>
              </h1>
              <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-md">
                Contrairement aux vols à durée fixe, ici c&apos;est votre itinéraire qui
                détermine le prix. Tracez votre route sur la carte : durée et tarif s&apos;affichent
                instantanément, au kilomètre près.
              </p>

              {/* Différenciation vs packs */}
              <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3.5 mb-7 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#F2B705]/20 border border-[#F2B705]/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap size={11} className="text-[#F2B705]" />
                </div>
                <p className="text-white/70 text-xs leading-relaxed">
                  <span className="text-white font-semibold">Pas de minuterie. Pas de formule fixe.</span>{" "}
                  Vous volez 52 minutes ? Vous payez 52 minutes. L&apos;algorithme optimise
                  automatiquement la route pour que chaque km compte.
                </p>
              </div>

              {/* 3 étapes */}
              <div className="space-y-3 mb-8">
                {[
                  {
                    n: "1",
                    icon: <MousePointerClick size={13} />,
                    title: "Cliquez sur la carte pour placer vos destinations",
                    desc: "Namur, Bruxelles, la côte, les Ardennes, un château, une ferme… n'importe où en Belgique et au-delà.",
                  },
                  {
                    n: "2",
                    icon: <Zap size={13} />,
                    title: "Durée et prix s'affichent en temps réel",
                    desc: "L'algorithme calcule la route optimale à chaque ajout. Vous voyez le coût évoluer avant de confirmer quoi que ce soit.",
                  },
                  {
                    n: "3",
                    icon: <PlaneTakeoff size={13} />,
                    title: "Notre pilote valide votre itinéraire sous 24 h",
                    desc: "Il vérifie la faisabilité (espaces aériens, restrictions) et vous envoie la route définitive avec possibilité d'ajustement.",
                  },
                ].map(({ n, icon, title, desc }) => (
                  <div key={n} className="flex gap-3.5">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-8 h-8 rounded-full bg-[#F2B705]/15 border border-[#F2B705]/30 flex items-center justify-center text-[#F2B705]">
                        {icon}
                      </div>
                      {n !== "3" && <div className="w-px flex-1 bg-white/10 mt-1.5 min-h-[20px]" />}
                    </div>
                    <div className="pb-3">
                      <p className="text-white text-sm font-semibold leading-snug mb-0.5">{title}</p>
                      <p className="text-white/45 text-[11px] leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Image mobile */}
              <div className="block lg:hidden rounded-lg overflow-hidden border border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.4)] mb-7">
                <Image
                  src="/vol-sur-mesure.png"
                  alt="Aperçu de l'outil de planification vol sur mesure"
                  width={900}
                  height={600}
                  className="w-full h-auto"
                />
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-7">
                {[
                  { icon: <Users size={10} />, label: "Jusqu'à 3 passagers" },
                  { icon: <EuroIcon size={10} />, label: "Prix au km, sans surprise" },
                  { icon: <PlaneTakeoff size={10} />, label: "Escales possibles" },
                  { icon: <Clock size={10} />, label: "Annulation gratuite 48 h avant" },
                ].map(({ icon, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 bg-white/6 border border-white/10 text-white/60 text-[11px] font-medium px-2.5 py-1 rounded-full">
                    {icon}{label}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/vol-sur-mesure"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#F2B705] text-[#0b2238] rounded-lg text-sm font-black hover:bg-[#e6a800] transition-colors shadow-lg shadow-[#F2B705]/20"
                >
                  <Route size={16} />
                  Créer mon vol sur mesure
                  <ArrowRight size={15} />
                </Link>
                <p className="flex items-center gap-1.5 text-white/35 text-xs self-center">
                  <Clock size={12} />
                  Aucun paiement immédiat
                </p>
              </div>
            </div>

            {/* Visuel droite */}
            <div className="hidden lg:flex flex-col self-start pt-2">
              <div className="rounded-lg overflow-hidden border border-white/12 shadow-[0_24px_64px_rgba(0,0,0,0.55)]">
                <Image
                  src="/vol-sur-mesure.png"
                  alt="Aperçu de l'outil de planification vol sur mesure"
                  width={900}
                  height={600}
                  className="w-full h-auto"
                />
              </div>
              <p className="text-center text-white/15 text-[9px] mt-2.5">Aperçu de l&apos;outil de planification</p>
            </div>

          </div>
        </div>

        {/* Vague de transition */}
        <div className="relative h-12 overflow-hidden">
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,48 L0,24 Q360,0 720,24 Q1080,48 1440,24 L1440,48 Z" fill="#f5f5f7"/>
          </svg>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECTION — Vols à durée fixe
      ══════════════════════════════════════════ */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 py-14">

        {/* En-tête */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <Clock size={13} className="text-[#F2B705]" />
            <p className="text-xs font-bold text-[#F2B705] uppercase tracking-[3px]">Durée fixe</p>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-foreground">
            Vous préférez une durée prédéfinie ?
          </h2>
          <div className="w-10 h-0.5 bg-[#F2B705] mx-auto mt-4 mb-3 rounded-full" />
          <p className="text-muted-foreground text-sm mt-0 max-w-lg mx-auto">
            Choisissez votre durée de vol : 30, 60, 90 ou 120 minutes.
            La date se fixe quand vous êtes prêt.
          </p>
        </div>

        {/* Grille packs */}
        {(!packs || packs.length === 0) ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Aucun vol disponible pour le moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {packs.map((pack, index) => (
              <PackCard key={pack.id} pack={pack} isPopular={index === 1} />
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Vous avez un itinéraire précis en tête ?{" "}
            <Link href="/vol-sur-mesure" className="text-foreground font-semibold hover:underline">
              Créez un vol entièrement sur mesure →
            </Link>
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          Réassurance
      ══════════════════════════════════════════ */}
      <div className="border-t border-border bg-card">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 py-6">
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { icon: <Users size={14} className="text-foreground" />, text: "Jusqu'à 3 passagers" },
              { icon: <MapPin size={14} className="text-foreground" />, text: "Depuis Charleroi (EBCI)" },
              { icon: <Clock size={14} className="text-foreground" />, text: "Durées de 30 min à 2 h+" },
              { icon: <Route size={14} className="text-foreground" />, text: "Itinéraire flexible" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                {icon}
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

    </main>
  );
}
