import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Clock, Users, MapPin, Route, CalendarCheck,
  Zap, Shuffle, PlaneTakeoff, ArrowRight, MousePointerClick,
} from "lucide-react";
import { PackCard } from "@/components/shop/PackCard";

export const metadata = {
  title: "Nos offres de vol",
  description:
    "Baptêmes de l'air en avion léger depuis Charleroi — vols de 30 à 120 min ou sur mesure. Itinéraire libre, pilote CPL, jusqu'à 3 passagers. Réservez votre vol en Belgique.",
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

          <div className="grid lg:grid-cols-2 gap-12 items-end pb-12">

            {/* Texte gauche */}
            <div>
              <h1 className="text-4xl sm:text-5xl font-black text-white leading-[1.1] mb-4">
                Votre route.<br />
                <span className="text-[#F2B705]">Votre prix.</span><br />
                En temps réel.
              </h1>
              <p className="text-white/60 text-sm leading-relaxed mb-8 max-w-md">
                Tracez votre itinéraire directement sur la carte : le prix s&apos;ajuste
                instantanément à la distance. Aucune formule fixe, vous payez exactement
                ce que vous volez.
              </p>

              {/* Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {[
                  { icon: <MousePointerClick size={14} />, title: "Carte interactive", desc: "Cliquez pour placer vos destinations" },
                  { icon: <Shuffle size={14} />, title: "Route optimisée", desc: "Algorithme qui réduit la distance auto" },
                  { icon: <Zap size={14} />, title: "Prix instantané", desc: "Calculé au km, sans surprise" },
                  { icon: <PlaneTakeoff size={14} />, title: "Escales possibles", desc: "Namur, Le Touquet, Middelzeeland…" },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3 bg-white/6 border border-white/10 rounded-xl px-3.5 py-3">
                    <div className="w-7 h-7 rounded-lg bg-[#F2B705]/15 border border-[#F2B705]/25 flex items-center justify-center text-[#F2B705] shrink-0 mt-0.5">
                      {icon}
                    </div>
                    <div>
                      <p className="text-white text-xs font-semibold leading-snug">{title}</p>
                      <p className="text-white/45 text-[11px] leading-relaxed mt-0.5">{desc}</p>
                    </div>
                  </div>
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

            {/* Visuel droite — aperçu stylisé */}
            <div className="hidden lg:block relative self-end">
              <div className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden" style={{ height: 320 }}>

                {/* Fond carte */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0d3a6e] via-[#0b2238] to-[#061624]" />

                {/* Grille décorative */}
                <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#F2B705" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                {/* Circuit — boucle fermée avec flèche directionnelle */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 320" xmlns="http://www.w3.org/2000/svg">
                  {/* Ombre de la route */}
                  <path d="M 80,252 L 170,78 L 318,112 L 295,248 Z" fill="none" stroke="#F2B705" strokeWidth="5" strokeLinejoin="round" opacity="0.15" strokeLinecap="round"/>
                  {/* Route principale */}
                  <path d="M 80,252 L 170,78 L 318,112 L 295,248 Z" fill="none" stroke="#F2B705" strokeWidth="2" strokeDasharray="10 5" strokeLinejoin="round" opacity="0.9" strokeLinecap="round"/>

                  {/* Flèches directionnelles sur la route (sens du vol) */}
                  <polygon points="0,-4 7,0 0,4" fill="#F2B705" opacity="0.7" transform="translate(128,162) rotate(-64)"/>
                  <polygon points="0,-4 7,0 0,4" fill="#F2B705" opacity="0.7" transform="translate(248,95) rotate(6)"/>
                  <polygon points="0,-4 7,0 0,4" fill="#F2B705" opacity="0.7" transform="translate(305,200) rotate(96)"/>
                  <polygon points="0,-4 7,0 0,4" fill="#F2B705" opacity="0.7" transform="translate(175,256) rotate(192)"/>

                  {/* Waypoints intermédiaires */}
                  <circle cx="170" cy="78" r="9" fill="#F2B705"/>
                  <text x="170" y="82" textAnchor="middle" fill="#113356" fontSize="9" fontWeight="800">1</text>

                  <circle cx="318" cy="112" r="9" fill="#F2B705"/>
                  <text x="318" y="116" textAnchor="middle" fill="#113356" fontSize="9" fontWeight="800">2</text>

                  <circle cx="295" cy="248" r="9" fill="#F2B705"/>
                  <text x="295" y="252" textAnchor="middle" fill="#113356" fontSize="9" fontWeight="800">3</text>

                  {/* Point de départ/arrivée CRL */}
                  <circle cx="80" cy="252" r="13" fill="#113356" stroke="#F2B705" strokeWidth="3"/>
                  {/* Icône avion miniature */}
                  <text x="80" y="256" textAnchor="middle" fill="#F2B705" fontSize="11">✈</text>

                  {/* Label CRL */}
                  <rect x="96" y="240" width="96" height="16" rx="3" fill="#0b2238" opacity="0.85"/>
                  <text x="144" y="252" textAnchor="middle" fill="#F2B705" fontSize="9" fontWeight="700">CRL · Charleroi-Sud</text>
                  <text x="144" y="263" textAnchor="middle" fill="white" fontSize="7.5" opacity="0.5">Départ &amp; Retour</text>
                </svg>

                {/* Pill durée */}
                <div className="absolute top-4 left-4 bg-[#0b2238]/90 border border-white/10 rounded-xl px-3 py-2 backdrop-blur-sm">
                  <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Durée estimée</p>
                  <p className="text-white text-xl font-black leading-none">~94 <span className="text-sm font-semibold text-white/60">min</span></p>
                </div>

                {/* Pill prix */}
                <div className="absolute top-4 right-4 bg-[#F2B705] rounded-xl px-3 py-2">
                  <p className="text-[#113356] text-[10px] font-bold uppercase tracking-widest">Prix estimé</p>
                  <p className="text-[#113356] text-xl font-black leading-none">397 <span className="text-sm font-semibold opacity-70">€</span></p>
                </div>

              </div>
              <p className="text-center text-white/25 text-[10px] mt-2">Aperçu : les valeurs sont calculées en temps réel sur votre route</p>
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap justify-center sm:justify-start gap-6">
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
            <Link
              href="/reservation"
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-[#f5f8ff] border border-[#dce8ff] text-[#113356] rounded-xl text-xs font-bold hover:bg-[#113356] hover:text-white hover:border-[#113356] transition-all"
            >
              <CalendarCheck size={13} />
              Réserver un créneau fixe
            </Link>
          </div>
        </div>
      </div>

    </main>
  );
}
