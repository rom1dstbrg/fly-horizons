"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { ArrowRight, Clock, MapPin, Users, ChevronDown, Check, X, ArrowDown } from "lucide-react";
import { ChatWidget } from "@/components/chat/ChatWidget";

const RouteMapReadOnly = dynamic(
  () => import("@/components/maps/RouteMapReadOnly"),
  { ssr: false, loading: () => <div className="w-full h-[240px] bg-secondary animate-pulse rounded-xl" /> }
);

// ── Types ──────────────────────────────────────────────────────────
interface Waypoint { lat: number; lng: number; nom: string }
interface RouteVariant { waypoints: Waypoint[]; description: string; highlight: string }
type Dur = 30 | 45 | 60 | 90;

// ── Données durées ─────────────────────────────────────────────────
const DURATIONS: { min: Dur; price: number; label: string; desc: string; dots: number }[] = [
  { min: 30, price: 149, label: "Découverte rapide",   dots: 1, desc: "Un premier survol. Les sensations avant tout." },
  { min: 45, price: 199, label: "Vol découverte",      dots: 2, desc: "Le temps d'explorer une région proche." },
  { min: 60, price: 249, label: "Expérience complète", dots: 3, desc: "Un itinéraire mémorable, plusieurs étapes." },
  { min: 90, price: 349, label: "Grand tour",          dots: 4, desc: "Un voyage aérien d'exception." },
];

// ── Données thèmes ─────────────────────────────────────────────────
const THEMES = [
  { id: "abbayes",   emoji: "🏰", name: "Châteaux & Abbayes",  subtitle: "Histoire & patrimoine",  img: "/gallery/5.png"  },
  { id: "ardennes",  emoji: "🌲", name: "Ardennes Sauvages",    subtitle: "Nature & grands espaces", img: "/gallery/9.png"  },
  { id: "cote",      emoji: "🌊", name: "Côte Belge",           subtitle: "Mer & dunes",             img: "/gallery/8.png"  },
  { id: "bruxelles", emoji: "🏙", name: "Bruxelles Capitale",   subtitle: "Monuments & skyline",     img: "/gallery/10.jpg" },
  { id: "meuse",     emoji: "🍃", name: "Vallée de la Meuse",   subtitle: "Châteaux & rivière",      img: "/gallery/7.png"  },
  { id: "surprise",  emoji: "✨", name: "Surprise-moi",         subtitle: "L'inattendu garanti",     img: "/gallery/11.jpg" },
];

const SURPRISE_POOL = ["abbayes", "ardennes", "cote", "bruxelles", "meuse"];

// ── Itinéraires par thème × durée ──────────────────────────────────
const ROUTES: Record<string, Record<Dur, RouteVariant>> = {
  abbayes: {
    30: { waypoints: [{ lat: 50.5772, lng: 4.5361, nom: "Abbaye de Villers-la-Ville" }], description: "Les ruines médiévales de Villers-la-Ville, à quelques minutes de Charleroi. Un site hors du temps vu depuis les airs.", highlight: "Ruines de Villers-la-Ville" },
    45: { waypoints: [{ lat: 50.5772, lng: 4.5361, nom: "Villers-la-Ville" }, { lat: 50.4272, lng: 4.7672, nom: "Abbaye de Floreffe" }], description: "De Villers-la-Ville à l'abbaye de Floreffe dominant la Sambre. Deux joyaux du patrimoine wallon.", highlight: "Vue sur la Sambre depuis Floreffe" },
    60: { waypoints: [{ lat: 50.5772, lng: 4.5361, nom: "Villers-la-Ville" }, { lat: 50.4272, lng: 4.7672, nom: "Floreffe" }, { lat: 50.2811, lng: 4.7539, nom: "Maredsous" }], description: "Le grand circuit des abbayes : Villers-la-Ville, Floreffe, Maredsous dans son vallon ardennais.", highlight: "Maredsous nichée dans son vallon" },
    90: { waypoints: [{ lat: 50.5772, lng: 4.5361, nom: "Villers-la-Ville" }, { lat: 50.4597, lng: 4.8619, nom: "Citadelle de Namur" }, { lat: 50.4272, lng: 4.7672, nom: "Floreffe" }, { lat: 50.2811, lng: 4.7539, nom: "Maredsous" }], description: "Le grand tour incluant la citadelle de Namur et la confluence Sambre-Meuse.", highlight: "Confluence Sambre-Meuse" },
  },
  ardennes: {
    30: { waypoints: [{ lat: 50.2608, lng: 4.9122, nom: "Dinant & Citadelle" }], description: "Dinant et sa citadelle perchée au-dessus de la Meuse. Un paysage spectaculaire à 30 minutes de vol.", highlight: "Citadelle de Dinant" },
    45: { waypoints: [{ lat: 50.2608, lng: 4.9122, nom: "Dinant" }, { lat: 50.2597, lng: 4.9061, nom: "Rocher Bayard" }], description: "Dinant et le rocher Bayard, deux monuments emblématiques de la Meuse ardennaise.", highlight: "Rocher Bayard dominant la Meuse" },
    60: { waypoints: [{ lat: 50.2608, lng: 4.9122, nom: "Dinant" }, { lat: 50.1253, lng: 5.1856, nom: "Han-sur-Lesse" }, { lat: 49.7928, lng: 5.0667, nom: "Château de Bouillon" }], description: "Dinant, Han-sur-Lesse et le château de Bouillon au cœur des bois. Le survol le plus dépaysant.", highlight: "Château de Bouillon dans la forêt" },
    90: { waypoints: [{ lat: 50.2608, lng: 4.9122, nom: "Dinant" }, { lat: 50.1253, lng: 5.1856, nom: "Han-sur-Lesse" }, { lat: 49.7928, lng: 5.0667, nom: "Bouillon" }, { lat: 49.8861, lng: 5.5678, nom: "Bastogne" }], description: "Le grand tour des Ardennes : Dinant, Han, Bouillon, Bastogne. Forêts et horizons à perte de vue.", highlight: "Les forêts ardennaises" },
  },
  cote: {
    30: { waypoints: [{ lat: 51.2293, lng: 2.9125, nom: "Ostende & la Côte" }], description: "Un survol de la Mer du Nord et des dunes d'Ostende. La Belgique côtière vue depuis les airs.", highlight: "La Mer du Nord" },
    45: { waypoints: [{ lat: 51.2293, lng: 2.9125, nom: "Ostende" }, { lat: 51.2093, lng: 3.2247, nom: "Bruges" }], description: "Ostende et ses plages, Bruges et ses canaux médiévaux. La Flandre dans toute sa splendeur.", highlight: "Les canaux de Bruges" },
    60: { waypoints: [{ lat: 51.0543, lng: 3.7174, nom: "Gand" }, { lat: 51.2093, lng: 3.2247, nom: "Bruges" }, { lat: 51.2293, lng: 2.9125, nom: "Ostende" }], description: "Gand, Bruges et la Côte. Un vol entre patrimoine flamand et horizon maritime.", highlight: "Bruges vue du ciel" },
    90: { waypoints: [{ lat: 50.8503, lng: 4.3517, nom: "Bruxelles" }, { lat: 51.0543, lng: 3.7174, nom: "Gand" }, { lat: 51.2093, lng: 3.2247, nom: "Bruges" }, { lat: 51.2293, lng: 2.9125, nom: "Ostende" }], description: "De Charleroi à la Mer du Nord en passant par Bruxelles, Gand et Bruges. Un vol d'exception.", highlight: "De Bruxelles à la Mer du Nord" },
  },
  bruxelles: {
    30: { waypoints: [{ lat: 50.8947, lng: 4.3414, nom: "Atomium" }], description: "Un passage spectaculaire au-dessus de l'Atomium, l'icône de Bruxelles. Inoubliable.", highlight: "L'Atomium" },
    45: { waypoints: [{ lat: 50.8947, lng: 4.3414, nom: "Atomium" }, { lat: 50.8467, lng: 4.3525, nom: "Grand-Place" }], description: "L'Atomium et la Grand-Place, les deux symboles de Bruxelles vus depuis les airs.", highlight: "Grand-Place de Bruxelles" },
    60: { waypoints: [{ lat: 50.7144, lng: 4.3997, nom: "Waterloo" }, { lat: 50.8947, lng: 4.3414, nom: "Atomium" }, { lat: 50.8467, lng: 4.3525, nom: "Grand-Place" }], description: "Le champ de bataille de Waterloo, l'Atomium, la Grand-Place. Bruxelles de A à Z.", highlight: "La skyline de Bruxelles" },
    90: { waypoints: [{ lat: 50.7144, lng: 4.3997, nom: "Waterloo" }, { lat: 50.8947, lng: 4.3414, nom: "Atomium" }, { lat: 50.8467, lng: 4.3525, nom: "Grand-Place" }, { lat: 50.9005, lng: 4.4844, nom: "Forêt de Soignes" }], description: "Tour complet : Waterloo, Atomium, Grand-Place, Forêt de Soignes. Bruxelles sans limite.", highlight: "Forêt de Soignes" },
  },
  meuse: {
    30: { waypoints: [{ lat: 50.4597, lng: 4.8619, nom: "Citadelle de Namur" }], description: "Survol de la citadelle de Namur et de la confluence Sambre-Meuse. Un classique.", highlight: "Confluence Sambre-Meuse" },
    45: { waypoints: [{ lat: 50.4597, lng: 4.8619, nom: "Namur" }, { lat: 50.2597, lng: 4.9061, nom: "Rocher Bayard" }], description: "Namur et sa citadelle, puis le rocher Bayard à Dinant. La Meuse à l'état pur.", highlight: "Citadelle de Namur" },
    60: { waypoints: [{ lat: 50.4597, lng: 4.8619, nom: "Citadelle de Namur" }, { lat: 50.2597, lng: 4.9061, nom: "Rocher Bayard" }, { lat: 50.2311, lng: 4.9297, nom: "Château de Freÿr" }], description: "La Meuse de Namur à Freÿr : citadelle, rocher Bayard, château Renaissance au bord de l'eau.", highlight: "Château de Freÿr" },
    90: { waypoints: [{ lat: 50.4597, lng: 4.8619, nom: "Namur" }, { lat: 50.4272, lng: 4.7672, nom: "Floreffe" }, { lat: 50.2597, lng: 4.9061, nom: "Dinant" }, { lat: 50.2311, lng: 4.9297, nom: "Château de Freÿr" }], description: "La vallée de la Meuse dans toute sa splendeur : Namur, Floreffe, Dinant, Freÿr.", highlight: "La Meuse de Namur à Freÿr" },
  },
};

// ── Composant indicateur de niveau ─────────────────────────────────
function LevelDots({ count, active }: { count: number; active: boolean }) {
  return (
    <div className="flex gap-1 mt-2">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-300 ${
            i < count
              ? active ? "w-5 bg-[#F2B705]" : "w-4 bg-[#F2B705]/50"
              : "w-3 bg-border"
          }`}
        />
      ))}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────
export default function ExperiencePage() {
  const router = useRouter();

  // État sélections
  const [duration, setDuration] = useState<Dur | null>(null);
  const [theme, setTheme] = useState<string | null>(null);
  const [resolved, setResolved] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Refs pour scroll
  const step1Ref = useRef<HTMLElement>(null);
  const step2Ref = useRef<HTMLElement>(null);
  const step3Ref = useRef<HTMLElement>(null);

  // Computed
  const effectiveId  = theme === "surprise" ? resolved : theme;
  const effectiveTheme  = THEMES.find(t => t.id === effectiveId);
  const selectedDur  = DURATIONS.find(d => d.min === duration);
  const route        = effectiveId && duration ? ROUTES[effectiveId]?.[duration] : null;
  const waypoints    = route?.waypoints.filter(wp => !removed.has(wp.nom)) ?? [];
  const isReady      = duration !== null && theme !== null;

  // Handlers
  function pickDuration(min: Dur) {
    setDuration(min);
    setTheme(null);
    setResolved(null);
    setRemoved(new Set());
    setStep(2);
    setTimeout(() => step2Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function pickTheme(id: string) {
    if (id === "surprise") {
      setResolved(SURPRISE_POOL[Math.floor(Math.random() * SURPRISE_POOL.length)]);
    }
    setTheme(id);
    setRemoved(new Set());
    setCustomOpen(false);
    setStep(3);
    setTimeout(() => step3Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function handleContinue() {
    if (!isReady) return;
    sessionStorage.setItem("vol-experience", JSON.stringify({
      duration,
      themeId: effectiveId,
      themeName: effectiveTheme?.name,
      waypoints: waypoints.map(w => w.nom),
      note,
    }));
    router.push("/nos-offres");
  }

  return (
    <main className="bg-[#f5f5f7]">

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="relative flex items-end min-h-[80vh] pt-[98px] overflow-hidden bg-[#0b2238]">
        {/* Photo de fond */}
        <Image
          src="/gallery/2.png"
          alt=""
          fill
          className="object-cover opacity-50"
          priority
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b2238] via-[#0b2238]/60 to-[#0b2238]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b2238]/80 via-transparent to-transparent" />

        {/* Contenu */}
        <div className="relative w-full max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 pb-16 sm:pb-20">
          <div className="max-w-[560px]">
            <p className="text-[10px] font-black text-[#F2B705] uppercase tracking-[3px] mb-5">
              Au départ de Charleroi · Jusqu&apos;à 3 passagers
            </p>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[0.95] tracking-tight mb-5">
              Créez votre<br />
              <span className="text-[#F2B705]">vol idéal.</span>
            </h1>
            <p className="text-white/65 text-base sm:text-lg leading-relaxed mb-8 max-w-[440px]">
              Choisissez ce que vous souhaitez découvrir depuis le ciel.
              Nous adaptons l&apos;itinéraire à votre durée de vol.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => step1Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#F2B705] text-[#0b2238] font-black text-sm rounded-xl hover:bg-[#e6a800] transition-colors cursor-pointer shadow-lg shadow-[#F2B705]/25"
              >
                Commencer mon expérience
                <ArrowDown size={16} />
              </button>
              <button
                onClick={() => step2Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/8 border border-white/15 text-white font-semibold text-sm rounded-xl hover:bg-white/14 transition-colors cursor-pointer"
              >
                Découvrir nos itinéraires
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CONTENU PRINCIPAL
      ══════════════════════════════════════════ */}
      <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 py-12 ${isReady ? "pb-28 lg:pb-14" : "pb-14"}`}>
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── Colonne étapes ── */}
          <div className="flex-1 min-w-0 space-y-14">

            {/* Indicateur d'étapes */}
            <div className="flex items-center gap-2">
              {[{ n: 1, label: "Durée" }, { n: 2, label: "Thème" }, { n: 3, label: "Votre vol" }].map(({ n, label }, i) => (
                <div key={n} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${step > n ? "bg-[#F2B705] text-[#0b2238]" : step === n ? "bg-[#0b2238] text-white" : "bg-border text-muted-foreground"}`}>
                      {step > n ? <Check size={10} strokeWidth={3} /> : n}
                    </div>
                    <span className={`text-[11px] font-semibold hidden sm:block transition-colors ${step >= n ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                  </div>
                  {i < 2 && <div className={`w-6 sm:w-10 h-px transition-colors ${step > n ? "bg-[#F2B705]" : "bg-border"}`} />}
                </div>
              ))}
            </div>

            {/* ═══ ÉTAPE 1 — Durée ═══ */}
            <section ref={step1Ref} className="scroll-mt-[108px]">
              <p className="text-[10px] font-black text-[#F2B705] uppercase tracking-[3px] mb-1.5">Étape 1</p>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-6 leading-tight">
                Combien de temps souhaitez-vous voler ?
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {DURATIONS.map((d) => {
                  const sel = duration === d.min;
                  return (
                    <button
                      key={d.min}
                      onClick={() => pickDuration(d.min)}
                      className={`relative text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                        sel
                          ? "bg-white border-[#F2B705] shadow-[0_4px_24px_rgba(242,183,5,0.2)]"
                          : "bg-white border-border hover:border-[#F2B705]/40 hover:shadow-md"
                      }`}
                    >
                      {sel && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#F2B705] flex items-center justify-center">
                          <Check size={10} strokeWidth={3} className="text-[#0b2238]" />
                        </div>
                      )}
                      <p className="text-3xl sm:text-4xl font-black text-foreground leading-none">
                        {d.min}
                        <span className="text-sm font-semibold text-muted-foreground ml-1">min</span>
                      </p>
                      <LevelDots count={d.dots} active={sel} />
                      <p className="text-xs sm:text-sm font-bold text-foreground mt-3">{d.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug hidden sm:block">{d.desc}</p>
                      <p className={`text-sm font-black mt-3 transition-colors ${sel ? "text-[#F2B705]" : "text-foreground"}`}>
                        à partir de {d.price}€
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ═══ ÉTAPE 2 — Thème ═══ */}
            <section
              ref={step2Ref}
              className={`scroll-mt-[108px] transition-all duration-500 ${step >= 2 ? "opacity-100" : "opacity-25 pointer-events-none"}`}
            >
              <p className="text-[10px] font-black text-[#F2B705] uppercase tracking-[3px] mb-1.5">Étape 2</p>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-2 leading-tight">
                Qu&apos;avez-vous envie de découvrir ?
              </h2>
              <p className="text-sm text-muted-foreground mb-6">Choisissez un thème — votre itinéraire s&apos;adapte automatiquement.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {THEMES.map((t) => {
                  const sel = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => pickTheme(t.id)}
                      className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-200 cursor-pointer group ${
                        sel ? "border-[#F2B705] shadow-[0_4px_24px_rgba(242,183,5,0.25)]" : "border-transparent hover:border-white/40"
                      }`}
                      style={{ aspectRatio: "4/3" }}
                    >
                      <Image src={t.img} alt={t.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className={`absolute inset-0 transition-opacity duration-200 ${sel ? "bg-[#0b2238]/40" : "bg-[#0b2238]/60 group-hover:bg-[#0b2238]/45"}`} />

                      {sel && (
                        <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-[#F2B705] flex items-center justify-center shadow-md">
                          <Check size={11} strokeWidth={3} className="text-[#0b2238]" />
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                        <span className="text-xl sm:text-2xl block mb-0.5">{t.emoji}</span>
                        <p className="text-white font-black text-xs sm:text-sm leading-tight">{t.name}</p>
                        <p className="text-white/65 text-[10px] mt-0.5 hidden sm:block">{t.subtitle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ═══ ÉTAPE 3 — Votre vol ═══ */}
            <section
              ref={step3Ref}
              className={`scroll-mt-[108px] transition-all duration-500 ${step >= 3 ? "opacity-100" : "opacity-25 pointer-events-none"}`}
            >
              <p className="text-[10px] font-black text-[#F2B705] uppercase tracking-[3px] mb-1.5">Étape 3</p>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-1 leading-tight">
                Votre expérience {effectiveTheme?.emoji}
              </h2>
              {theme === "surprise" && effectiveTheme && (
                <p className="text-sm text-muted-foreground mb-5">
                  Votre surprise : <span className="font-bold text-foreground">{effectiveTheme.name}</span>
                </p>
              )}
              {!route && (
                <p className="text-sm text-muted-foreground mt-2">Sélectionnez une durée et un thème pour voir votre itinéraire.</p>
              )}

              {route && (
                <div className="mt-5 space-y-3">
                  {/* Carte */}
                  <div className="rounded-2xl overflow-hidden border border-border shadow-[0_4px_24px_rgba(11,34,56,0.08)]">
                    <RouteMapReadOnly
                      key={waypoints.map(w => w.nom).join("|")}
                      waypoints={waypoints}
                      height="240px"
                      className="w-full h-full"
                    />
                  </div>

                  {/* Récap */}
                  <div className="bg-white rounded-2xl border border-border shadow-[0_2px_14px_rgba(11,34,56,0.06)] p-4 sm:p-5 space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{route.description}</p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Durée", value: `${duration} min` },
                        { label: "Étapes", value: `${waypoints.length}` },
                        { label: "Passagers", value: "1 à 3" },
                      ].map(({ label, value }) => (
                        <div key={label} className="text-center bg-secondary rounded-xl py-3">
                          <p className="text-base sm:text-lg font-black text-foreground">{value}</p>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Timeline POIs */}
                    <div className="space-y-2">
                      <TimelineRow icon="✈" label="Charleroi (EBCI) · Départ" muted />
                      {waypoints.map((wp, i) => (
                        <TimelineRow key={wp.nom} icon={String(i + 1)} label={wp.nom} gold />
                      ))}
                      <TimelineRow icon="✈" label="Charleroi (EBCI) · Retour" muted />
                    </div>

                    <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                      ✦ Votre pilote confirme et adapte l&apos;itinéraire selon les conditions du jour.
                    </p>
                  </div>

                  {/* Personnalisation avancée */}
                  <div className="bg-white rounded-2xl border border-border shadow-[0_2px_14px_rgba(11,34,56,0.06)] overflow-hidden">
                    <button
                      onClick={() => setCustomOpen(v => !v)}
                      className="w-full flex items-center justify-between px-4 sm:px-5 py-4 cursor-pointer hover:bg-secondary/50 transition-colors"
                    >
                      <span className="text-sm font-bold text-foreground">Personnaliser davantage</span>
                      <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-200 ${customOpen ? "rotate-180" : ""}`} />
                    </button>

                    {customOpen && (
                      <div className="px-4 sm:px-5 pb-5 border-t border-border pt-4 space-y-5">
                        {route.waypoints.length > 1 && (
                          <div>
                            <p className="text-[11px] font-bold text-foreground uppercase tracking-wide mb-2.5">Retirer une étape</p>
                            <div className="space-y-1.5">
                              {route.waypoints.map(wp => (
                                <div key={wp.nom} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-secondary rounded-xl">
                                  <span className="text-sm text-foreground">{wp.nom}</span>
                                  {removed.has(wp.nom) ? (
                                    <button
                                      onClick={() => setRemoved(prev => { const n = new Set(prev); n.delete(wp.nom); return n; })}
                                      className="text-[11px] font-bold text-[#F2B705] cursor-pointer hover:underline"
                                    >Remettre</button>
                                  ) : (
                                    <button
                                      onClick={() => setRemoved(prev => new Set([...prev, wp.nom]))}
                                      className="w-5 h-5 rounded-full bg-border hover:bg-muted flex items-center justify-center cursor-pointer transition-colors"
                                    >
                                      <X size={9} className="text-muted-foreground" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="text-[11px] font-bold text-foreground uppercase tracking-wide mb-2">Indiquer un lieu ou une précision</p>
                          <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="Ex : je voudrais survoler Gembloux, voir le château de X, éviter telle zone…"
                            className="w-full text-sm text-foreground placeholder:text-muted-foreground bg-secondary border border-border rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#F2B705]/30 focus:border-[#F2B705] transition-all"
                            rows={3}
                          />
                          <p className="text-[10px] text-muted-foreground mt-1.5">Votre pilote en tiendra compte lors de la préparation du vol.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* ── Sidebar desktop ── */}
          <aside className="hidden lg:block lg:w-[290px] xl:w-[310px] shrink-0 sticky top-[108px]">
            <div className="bg-white rounded-2xl border border-border shadow-[0_4px_24px_rgba(11,34,56,0.08)] overflow-hidden">
              <div className="bg-[#0b2238] px-5 py-5">
                <p className="text-[10px] font-black text-[#F2B705] uppercase tracking-[3px] mb-1.5">Votre vol</p>
                <p className="text-white text-xl font-black leading-snug">
                  {selectedDur ? `${duration} min · ${selectedDur.label}` : "Choisissez votre durée"}
                </p>
                {effectiveTheme && (
                  <p className="text-white/65 text-sm mt-1">{effectiveTheme.emoji} {effectiveTheme.name}</p>
                )}
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-3">
                  <SummaryRow icon={<Clock size={14} />} label="Durée" value={duration ? `${duration} min` : "—"} />
                  <SummaryRow icon={<MapPin size={14} />} label="Thème" value={effectiveTheme?.name ?? "—"} />
                  {waypoints.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-[#F2B705]"><MapPin size={14} /></div>
                      <div className="flex-1">
                        <p className="text-[11px] text-muted-foreground mb-1">Étapes</p>
                        {waypoints.map(wp => (
                          <p key={wp.nom} className="text-sm font-medium text-foreground leading-snug">{wp.nom}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  <SummaryRow icon={<Users size={14} />} label="Passagers" value="Jusqu'à 3" />
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-muted-foreground">Prix indicatif</span>
                    <span className="text-lg font-black text-foreground">
                      {selectedDur ? `à partir de ${selectedDur.price}€` : "—"}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-4">Prix final confirmé à la réservation.</p>

                  <button
                    onClick={handleContinue}
                    disabled={!isReady}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black transition-all cursor-pointer ${
                      isReady
                        ? "bg-[#F2B705] text-[#0b2238] hover:bg-[#e6a800] shadow-md shadow-[#F2B705]/20"
                        : "bg-border text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    Continuer vers la réservation
                    <ArrowRight size={15} />
                  </button>
                  {!isReady && (
                    <p className="text-[11px] text-muted-foreground text-center mt-2">
                      {!duration ? "Choisissez une durée pour commencer" : "Choisissez un thème pour continuer"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          BARRE MOBILE STICKY
      ══════════════════════════════════════════ */}
      {isReady && (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/95 backdrop-blur-md border-t border-border shadow-[0_-4px_24px_rgba(0,0,0,0.10)] px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black text-foreground">{duration} min</span>
              {effectiveTheme && (
                <span className="text-xs text-muted-foreground truncate">· {effectiveTheme.emoji} {effectiveTheme.name}</span>
              )}
            </div>
            <p className="text-base font-black text-foreground">
              {selectedDur ? `à partir de ${selectedDur.price}€` : ""}
            </p>
          </div>
          <button
            onClick={handleContinue}
            className="flex items-center gap-1.5 px-5 py-3 bg-[#F2B705] text-[#0b2238] font-black text-sm rounded-xl hover:bg-[#e6a800] transition-colors cursor-pointer shrink-0 shadow-md shadow-[#F2B705]/20"
          >
            Réserver
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      <ChatWidget />
    </main>
  );
}

// ── Sous-composants ────────────────────────────────────────────────
function TimelineRow({ icon, label, muted, gold }: { icon: string; label: string; muted?: boolean; gold?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black ${
        gold ? "bg-[#F2B705] text-[#0b2238]" : "bg-[#0b2238] border-2 border-[#F2B705] text-[#F2B705]"
      }`}>
        {icon}
      </div>
      <span className={`text-sm ${muted ? "text-muted-foreground" : "font-semibold text-foreground"}`}>{label}</span>
    </div>
  );
}

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-[#F2B705] shrink-0">{icon}</div>
      <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold text-foreground text-right truncate max-w-[140px]">{value}</span>
      </div>
    </div>
  );
}
