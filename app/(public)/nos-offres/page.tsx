import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Clock, Route, Zap, PlaneTakeoff, ArrowRight, MousePointerClick,
  Check, EuroIcon, Users, MapPin,
} from "lucide-react";
import { PackCard } from "@/components/shop/PackCard";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";

export const metadata = {
  title: "Baptême de l'air en Belgique | Vols 30 à 120 min | Fly Horizons",
  description:
    "Baptêmes de l'air en avion léger depuis Charleroi — vols de 30 à 120 min ou sur mesure. Itinéraire libre, jusqu'à 3 passagers. Réservez votre vol en Belgique.",
  alternates: { canonical: `${siteUrl}/nos-offres` },
  openGraph: {
    title: "Baptême de l'air en Belgique | Vols 30 à 120 min | Fly Horizons",
    description:
      "Baptêmes de l'air en avion léger depuis Charleroi — vols de 30 à 120 min ou sur mesure. Itinéraire libre, jusqu'à 3 passagers.",
    url: `${siteUrl}/nos-offres`,
    images: [{ url: `${siteUrl}/piste.jpg`, width: 1200, height: 630, alt: "Baptême de l'air — Fly Horizons Charleroi" }],
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
    <main className="bg-[#f5f5f7]">

      {/* ══════════════════════════════════════════
          HERO — Vol sur mesure
      ══════════════════════════════════════════ */}
      <div className="bg-[#0b2238] pt-[98px] pb-0 relative overflow-hidden">

        {/* Fond décoratif */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#F2B705]/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#113356]/60 rounded-full translate-y-1/2 -translate-x-1/4" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#F2B705]/15 border border-[#F2B705]/30 text-[#F2B705] text-[10px] font-black tracking-[3px] uppercase px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F2B705] animate-pulse" />
            Exclusivité Fly Horizons
          </div>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start pb-12">

            {/* Texte gauche */}
            <div>
              <h1 className="text-4xl sm:text-5xl font-black text-white leading-[1.1] mb-4">
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
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 mb-7 flex items-start gap-3">
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
                    desc: "Namur, Bruxelles, la côte, les Ardennes, un château, une ferme… n&apos;importe où en Belgique et au-delà.",
                  },
                  {
                    n: "2",
                    icon: <Zap size={13} />,
                    title: "Durée et prix s'affichent en temps réel",
                    desc: "L&apos;algorithme calcule la route optimale à chaque ajout. Vous voyez le coût évoluer avant de confirmer quoi que ce soit.",
                  },
                  {
                    n: "3",
                    icon: <PlaneTakeoff size={13} />,
                    title: "Romain valide votre itinéraire sous 24 h",
                    desc: "Il vérifie la faisabilité (espaces aériens, restrictions) et vous envoie la route définitive avec possibilité d&apos;ajustement.",
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
                      <p className="text-white/45 text-[11px] leading-relaxed" dangerouslySetInnerHTML={{ __html: desc }} />
                    </div>
                  </div>
                ))}
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
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#F2B705] text-[#113356] rounded-xl text-sm font-black hover:bg-[#e6a800] transition-colors shadow-lg shadow-[#F2B705]/20"
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

            {/* Visuel droite — aperçu carte interactive */}
            <div className="hidden lg:flex flex-col gap-3 self-start pt-2">

              {/* Fenêtre carte */}
              <div className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden" style={{ height: 340 }}>

                {/* Fond carte */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0d3a6e] via-[#0b2238] to-[#061624]" />

                {/* Grille */}
                <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid-no" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#F2B705" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid-no)" />
                </svg>

                {/* Route */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 340" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 75,270 L 155,90 L 310,125 L 285,265 Z" fill="none" stroke="#F2B705" strokeWidth="5" strokeLinejoin="round" opacity="0.12" strokeLinecap="round"/>
                  <path d="M 75,270 L 155,90 L 310,125 L 285,265 Z" fill="none" stroke="#F2B705" strokeWidth="2" strokeDasharray="10 5" strokeLinejoin="round" opacity="0.85" strokeLinecap="round"/>
                  <polygon points="0,-4 7,0 0,4" fill="#F2B705" opacity="0.65" transform="translate(118,177) rotate(-64)"/>
                  <polygon points="0,-4 7,0 0,4" fill="#F2B705" opacity="0.65" transform="translate(240,107) rotate(8)"/>
                  <polygon points="0,-4 7,0 0,4" fill="#F2B705" opacity="0.65" transform="translate(296,212) rotate(94)"/>
                  <polygon points="0,-4 7,0 0,4" fill="#F2B705" opacity="0.65" transform="translate(168,272) rotate(188)"/>

                  {/* Waypoint 1 — Namur */}
                  <circle cx="155" cy="90" r="10" fill="#F2B705"/>
                  <text x="155" y="94" textAnchor="middle" fill="#113356" fontSize="9" fontWeight="800">1</text>
                  <rect x="168" y="82" width="46" height="14" rx="3" fill="#0b2238" opacity="0.9"/>
                  <text x="191" y="92" textAnchor="middle" fill="#F2B705" fontSize="8" fontWeight="700">Namur</text>

                  {/* Waypoint 2 — Bruxelles */}
                  <circle cx="310" cy="125" r="10" fill="#F2B705"/>
                  <text x="310" y="129" textAnchor="middle" fill="#113356" fontSize="9" fontWeight="800">2</text>
                  <rect x="323" y="117" width="56" height="14" rx="3" fill="#0b2238" opacity="0.9"/>
                  <text x="351" y="127" textAnchor="middle" fill="#F2B705" fontSize="8" fontWeight="700">Bruxelles</text>

                  {/* Waypoint 3 — Wavre */}
                  <circle cx="285" cy="265" r="10" fill="#F2B705"/>
                  <text x="285" y="269" textAnchor="middle" fill="#113356" fontSize="9" fontWeight="800">3</text>
                  <rect x="298" y="257" width="38" height="14" rx="3" fill="#0b2238" opacity="0.9"/>
                  <text x="317" y="267" textAnchor="middle" fill="#F2B705" fontSize="8" fontWeight="700">Wavre</text>

                  {/* CRL */}
                  <circle cx="75" cy="270" r="14" fill="#113356" stroke="#F2B705" strokeWidth="3"/>
                  <text x="75" y="274" textAnchor="middle" fill="#F2B705" fontSize="12">✈</text>
                  <rect x="92" y="259" width="90" height="13" rx="3" fill="#0b2238" opacity="0.9"/>
                  <text x="137" y="269" textAnchor="middle" fill="#F2B705" fontSize="8" fontWeight="700">CRL · Charleroi</text>
                  <text x="137" y="279" textAnchor="middle" fill="white" fontSize="7" opacity="0.45">Départ &amp; Retour</text>

                  {/* Curseur clique */}
                  <circle cx="310" cy="125" r="18" fill="none" stroke="#F2B705" strokeWidth="1.5" opacity="0.35"/>
                  <circle cx="310" cy="125" r="25" fill="none" stroke="#F2B705" strokeWidth="0.8" opacity="0.15"/>
                </svg>

                {/* Pill durée */}
                <div className="absolute top-3 left-3 bg-[#0b2238]/90 border border-white/10 rounded-xl px-3 py-2 backdrop-blur-sm">
                  <p className="text-white/45 text-[9px] font-bold uppercase tracking-widest leading-none mb-1">Durée estimée</p>
                  <p className="text-white text-lg font-black leading-none">~94 <span className="text-xs font-semibold text-white/55">min</span></p>
                </div>

                {/* Pill prix */}
                <div className="absolute top-3 right-3 bg-[#F2B705] rounded-xl px-3 py-2">
                  <p className="text-[#113356] text-[9px] font-bold uppercase tracking-widest leading-none mb-1">Prix estimé</p>
                  <p className="text-[#113356] text-lg font-black leading-none">397 <span className="text-xs font-semibold opacity-65">€</span></p>
                </div>

                {/* Badge LIVE */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/50 border border-white/10 rounded-full px-2.5 py-1 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white/70 text-[9px] font-bold tracking-wider">CALCUL EN DIRECT</span>
                </div>
              </div>

              {/* Légende étapes */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: <MousePointerClick size={11} />, label: "Cliquez pour ajouter" },
                  { icon: <Zap size={11} />, label: "Prix mis à jour" },
                  { icon: <Check size={11} />, label: "Route optimisée" },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5 bg-white/4 border border-white/8 rounded-xl py-2.5 px-2">
                    <span className="text-[#F2B705]">{icon}</span>
                    <p className="text-white/45 text-[9px] text-center leading-tight">{label}</p>
                  </div>
                ))}
              </div>
              <p className="text-center text-white/20 text-[9px]">Aperçu illustratif — les valeurs sont calculées sur votre vraie route</p>
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
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
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
            {packs.map((pack) => (
              <PackCard key={pack.id} pack={pack} />
            ))}
          </div>
        )}

        {/* CTA retour vers vol sur mesure */}
        <div className="mt-6 bg-[#0b2238] rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-white font-bold text-sm">Vous ne savez pas encore combien de temps vous voulez voler ?</p>
            <p className="text-white/50 text-xs mt-1">Tracez votre route : le prix et la durée se calculent automatiquement.</p>
          </div>
          <Link
            href="/vol-sur-mesure"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-[#F2B705] text-[#113356] rounded-xl text-xs font-black hover:bg-[#e6a800] transition-colors whitespace-nowrap"
          >
            <Route size={13} />
            Essayer le vol sur mesure
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          Réservation directe
      ══════════════════════════════════════════ */}
      <div className="border-t border-border bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 py-6">
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { icon: <Users size={14} className="text-[#113356]" />, text: "Jusqu'à 3 passagers" },
              { icon: <MapPin size={14} className="text-[#113356]" />, text: "Depuis Charleroi (EBCI)" },
              { icon: <Clock size={14} className="text-[#113356]" />, text: "Durées de 30 min à 2 h+" },
              { icon: <Route size={14} className="text-[#113356]" />, text: "Itinéraire flexible" },
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
