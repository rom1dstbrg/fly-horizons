"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, X, ArrowRight, Check, Loader2, PlaneTakeoff,
  ChevronLeft, Building2, Landmark, Heart, RotateCcw,
} from "lucide-react";
import { configuratorUrl } from "@/lib/configurator";

// ── Presets ──────────────────────────────────────────────────────
const PRESET_VILLES = [
  { id: "namur",  nom: "Namur",  sous: "Citadelle & Meuse",            lat: 50.4636, lng: 4.8666 },
  { id: "dinant", nom: "Dinant", sous: "Rocher Bayard & falaises",     lat: 50.2611, lng: 4.9122 },
  { id: "liege",  nom: "Liège",  sous: "Centre historique & Meuse",    lat: 50.6454, lng: 5.5730 },
  { id: "durbuy", nom: "Durbuy", sous: "La plus petite ville du monde", lat: 50.3578, lng: 5.4559 },
] as const;

const PRESET_MONUMENTS = [
  { id: "lion-waterloo",  nom: "Lion de Waterloo",  sous: "Champ de bataille 1815",       lat: 50.6757, lng: 4.4122 },
  { id: "abbaye-villers", nom: "Abbaye de Villers",  sous: "Ruines XIIe siècle",           lat: 50.5724, lng: 4.5298 },
  { id: "chateau-modave", nom: "Château de Modave",  sous: "Baroque sur éperon rocheux",   lat: 50.4491, lng: 5.2983 },
  { id: "chateau-freyr",  nom: "Château de Freÿr",   sous: "Renaissance au bord de Meuse", lat: 50.2280, lng: 4.8970 },
] as const;

const NOMINATIM_EU = "countrycodes=be,fr,de,nl,lu,gb,ie,es,pt,it,at,ch,dk,se,no,pl,cz,sk,hu,ro,bg,gr,hr,si,lt,lv,ee,fi,me,rs,ba,al,mk";

const ALL_PRESETS = [...PRESET_VILLES, ...PRESET_MONUMENTS] as const;

function matchPreset(p: SavedPOI): Waypoint {
  const hit = ALL_PRESETS.find(
    pr => pr.nom.toLowerCase() === p.nom.toLowerCase()
       || (Math.abs(pr.lat - p.lat) < 0.002 && Math.abs(pr.lng - p.lng) < 0.002)
  );
  return hit
    ? { id: hit.id, nom: hit.nom, sous: hit.sous, lat: hit.lat, lng: hit.lng }
    : { id: p.id,   nom: p.nom,                   lat: p.lat,  lng: p.lng  };
}

// ── Types ─────────────────────────────────────────────────────────
type GuideStep = 1 | 2 | 3;
interface Waypoint { id: string; nom: string; sous?: string; lat: number; lng: number }
interface NominatimResult { place_id: number; display_name: string; lat: string; lon: string }
type SavedPOI = { id: string; nom: string; lat: number; lng: number };

// ── Page ──────────────────────────────────────────────────────────
export default function VolSurMesurePage() {
  const router = useRouter();

  // Lu au render (synchrone) pour éviter le double-run StrictMode dans l'effet
  const _fromMapRef = useRef<boolean | null>(null);
  if (_fromMapRef.current === null && typeof window !== "undefined") {
    _fromMapRef.current = sessionStorage.getItem("vsm_from_map") === "true";
    if (_fromMapRef.current) sessionStorage.removeItem("vsm_from_map");
  }

  const [calendarClosed, setCalendarClosed] = useState(false);
  const [closedMessage,  setClosedMessage]  = useState("");
  const [guideStep,  setGuideStep]  = useState<GuideStep>(1);
  const [waypoints,  setWaypoints]  = useState<Waypoint[]>([]);
  const [adQ,       setAdQ]       = useState("");
  const [adResults, setAdResults] = useState<NominatimResult[]>([]);
  const [adLoading, setAdLoading] = useState(false);
  const [adOpen,    setAdOpen]    = useState(false);

  // Empêche le scroll (footer jamais visible)
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = prev; };
  }, []);

  // Reprendre : lit vsm_pois depuis sessionStorage
  const [savedPois, setSavedPois] = useState<SavedPOI[]>([]);
  const [showResume, setShowResume] = useState(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("vsm_pois");
      if (raw) {
        const pois: SavedPOI[] = JSON.parse(raw);
        if (Array.isArray(pois) && pois.length > 0) {
          if (_fromMapRef.current) {
            // Retour depuis la carte : pré-remplir le guide à l'étape 3
            setWaypoints(pois.map(matchPreset));
            setGuideStep(3);
          } else {
            // Retour après avoir quitté le site : écran "Reprendre"
            setSavedPois(pois);
            setShowResume(true);
          }
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRestart() {
    try {
      sessionStorage.removeItem("vsm_pois");
      sessionStorage.removeItem("vsm_popup_seen");
    } catch {}
    setSavedPois([]);
    setShowResume(false);
    setWaypoints([]);
    setGuideStep(1);
  }

  useEffect(() => {
    fetch("/api/site-settings")
      .then(r => r.json())
      .then(d => {
        if (d.calendar_closed === "true") {
          setCalendarClosed(true);
          setClosedMessage(d.calendar_closed_message ?? "");
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => { setAdQ(""); setAdResults([]); setAdOpen(false); }, [guideStep]);

  useEffect(() => {
    if (adQ.trim().length < 2) { setAdResults([]); setAdOpen(false); return; }
    const t = setTimeout(async () => {
      setAdLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adQ)}&limit=5&accept-language=fr&${NOMINATIM_EU}`;
        const d   = await (await fetch(url, { headers: { "Accept-Language": "fr" } })).json() as NominatimResult[];
        const seen = new Set<string>();
        const uniq = d.filter(i => { const k = i.display_name.split(",")[0].trim().toLowerCase(); return seen.has(k) ? false : (seen.add(k), true); });
        setAdResults(uniq); setAdOpen(uniq.length > 0);
      } catch { /* ignore */ } finally { setAdLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [adQ]);

  function toggleWaypoint(wp: Waypoint) {
    setWaypoints(prev => prev.some(w => w.id === wp.id) ? prev.filter(w => w.id !== wp.id) : [...prev, wp]);
  }

  function selectFromGuideSearch(r: NominatimResult) {
    const nom = r.display_name.split(",")[0].trim();
    toggleWaypoint({ id: `nom-${r.place_id}`, nom, sous: r.display_name.split(",").slice(1,3).join(",").trim(), lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
    setAdQ(""); setAdResults([]); setAdOpen(false);
  }

  function goToMap() {
    router.push(configuratorUrl(waypoints));
  }

  function advanceGuide() {
    if (guideStep < 3) setGuideStep(s => (s + 1) as GuideStep);
    else goToMap();
  }

  if (calendarClosed) {
    return (
      <div className="h-[100dvh] overflow-hidden bg-[#f5f5f7] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-border rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <p className="text-2xl font-black text-foreground">Réservations suspendues</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{closedMessage || "Les réservations sont temporairement suspendues."}</p>
          <Link href="/contact" className="inline-block mt-2 px-6 py-2.5 rounded-xl bg-[#0b2238] text-white text-sm font-bold hover:opacity-90 transition-opacity">Nous contacter</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#f5f5f7] flex flex-col">
      <div className="h-[80px] sm:h-[98px] shrink-0" />

      {/* Zone scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center">
          <div className="w-full max-w-[620px] mx-auto px-4 sm:px-6 py-3 sm:py-8 pb-24">

            <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-[2px] flex items-center gap-1.5 mb-4 sm:mb-6">
              <PlaneTakeoff size={11} /> EBCI · Vol sur mesure
            </p>

            {/* ── Reprendre ── */}
            {showResume && (
              <div className="animate-in fade-in duration-300 space-y-4">
                <div>
                  <h2 className="text-[17px] sm:text-xl font-black text-foreground leading-snug">Reprendre votre itinéraire</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {savedPois.length} lieu{savedPois.length > 1 ? "x" : ""} enregistré{savedPois.length > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="space-y-2">
                  {savedPois.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 shadow-sm">
                      <span className="w-6 h-6 rounded-full bg-[#0b2238]/8 text-[#0b2238] text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="text-sm font-semibold text-foreground">{p.nom}</span>
                    </div>
                  ))}
                </div>
                <button type="button"
                  onClick={() => router.push(configuratorUrl(savedPois))}
                  className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-[#0b2238] text-white text-sm font-black hover:opacity-90 transition-opacity cursor-pointer">
                  Reprendre la carte <ArrowRight size={14} />
                </button>
                <button type="button"
                  onClick={handleRestart}
                  className="w-full flex items-center justify-center gap-2 h-10 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <RotateCcw size={12} /> Recommencer depuis le début
                </button>
              </div>
            )}

            {/* ── Guide (3 étapes) ── */}
            {!showResume && (
              <>
                {/* Progress */}
                <div className="flex items-center mb-5 sm:mb-8">
                  {([1,2,3] as GuideStep[]).flatMap((n, i) => {
                    const done    = guideStep > n;
                    const current = guideStep === n;
                    const step = (
                      <div key={n} className="shrink-0 flex items-center gap-1.5">
                        <div className={[
                          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all",
                          done    ? "bg-green-100 text-green-600"
                          : current ? "bg-primary text-[#0b2238]"
                          :           "bg-border text-muted-foreground/40",
                        ].join(" ")}>
                          {done ? <Check size={10} /> : n}
                        </div>
                        <span className={[
                          "text-[11px] font-semibold hidden sm:block",
                          done    ? "text-muted-foreground/40"
                          : current ? "text-foreground"
                          :           "text-muted-foreground/40",
                        ].join(" ")}>
                          {n === 1 ? "Villes" : n === 2 ? "Monuments" : "Lieu perso"}
                        </span>
                      </div>
                    );
                    if (i === 0) return [step];
                    const line = <div key={`l${i}`} className={`flex-1 h-0.5 mx-3 transition-colors ${guideStep > i ? "bg-primary/30" : "bg-border"}`} />;
                    return [line, step];
                  })}
                </div>

                {/* Step 1 : Villes */}
                {guideStep === 1 && (
                  <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#0b2238]/8 flex items-center justify-center shrink-0 mt-0.5">
                        <Building2 size={17} className="text-[#0b2238] sm:hidden" />
                        <Building2 size={21} className="text-[#0b2238] hidden sm:block" />
                      </div>
                      <div>
                        <h2 className="text-[17px] sm:text-xl font-black text-foreground leading-snug">Quelles villes voulez-vous survoler ?</h2>
                        <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Vu depuis le ciel, chaque ville révèle une tout autre dimension.</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Autre ville ou région</label>
                      <GeoField q={adQ} setQ={setAdQ} loading={adLoading} open={adOpen} results={adResults}
                        placeholder="Ex : Bruxelles…" onSelect={selectFromGuideSearch}
                        examples={["Bruxelles", "Liège", "Huy", "Dinant", "Spa", "Mons", "Gand", "Aix-la-Chapelle"]} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2 sm:mb-3">Suggestions</p>
                      <div className="grid grid-cols-2 gap-2">
                        {PRESET_VILLES.map((v, i) => {
                          const sel = waypoints.some(w => w.id === v.id);
                          return (
                            <button key={v.id} type="button"
                              onClick={() => toggleWaypoint({ id: v.id, nom: v.nom, sous: v.sous, lat: v.lat, lng: v.lng })}
                              style={{ animationDelay: `${i * 70}ms` }}
                              className={["flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl border text-left cursor-pointer transition-all animate-in fade-in duration-300", sel ? "bg-primary/10 border-primary/40 scale-[1.02]" : "bg-card border-border hover:border-primary/40 hover:bg-primary/5"].join(" ")}>
                              <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${sel ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                                {sel && <Check size={8} className="text-[#0b2238]" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground leading-tight">{v.nom}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed hidden sm:block">{v.sous}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2 : Monuments */}
                {guideStep === 2 && (
                  <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#0b2238]/8 flex items-center justify-center shrink-0 mt-0.5">
                        <Landmark size={17} className="text-[#0b2238] sm:hidden" />
                        <Landmark size={21} className="text-[#0b2238] hidden sm:block" />
                      </div>
                      <div>
                        <h2 className="text-[17px] sm:text-xl font-black text-foreground leading-snug">Des monuments à voir depuis le ciel ?</h2>
                        <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Châteaux, abbayes, champs de bataille — l&apos;histoire s&apos;ouvre d&apos;en haut.</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Autre monument ou site</label>
                      <GeoField q={adQ} setQ={setAdQ} loading={adLoading} open={adOpen} results={adResults}
                        placeholder="Ex : Château de Bouillon…" onSelect={selectFromGuideSearch}
                        examples={["Château de Bouillon", "Abbaye d'Orval", "Fort de Huy", "Grottes de Han", "Château de Modave", "Château de Freÿr"]} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2 sm:mb-3">Suggestions</p>
                      <div className="grid grid-cols-2 gap-2">
                        {PRESET_MONUMENTS.map((m, i) => {
                          const sel = waypoints.some(w => w.id === m.id);
                          return (
                            <button key={m.id} type="button"
                              onClick={() => toggleWaypoint({ id: m.id, nom: m.nom, sous: m.sous, lat: m.lat, lng: m.lng })}
                              style={{ animationDelay: `${i * 70}ms` }}
                              className={["flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl border text-left cursor-pointer transition-all animate-in fade-in duration-300", sel ? "bg-primary/10 border-primary/40 scale-[1.02]" : "bg-card border-border hover:border-primary/40 hover:bg-primary/5"].join(" ")}>
                              <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${sel ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                                {sel && <Check size={8} className="text-[#0b2238]" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground leading-tight">{m.nom}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed hidden sm:block">{m.sous}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3 : Lieu personnel */}
                {guideStep === 3 && (
                  <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-rose-50 flex items-center justify-center shrink-0 mt-0.5">
                        <Heart size={17} className="text-rose-400 sm:hidden" />
                        <Heart size={21} className="text-rose-400 hidden sm:block" />
                      </div>
                      <div>
                        <h2 className="text-[17px] sm:text-xl font-black text-foreground leading-snug">Un endroit qui vous tient à cœur ?</h2>
                        <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Votre maison, un lieu d&apos;enfance, une adresse particulière — survolé comme jamais.</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Adresse ou lieu</label>
                      <GeoField q={adQ} setQ={setAdQ} loading={adLoading} open={adOpen} results={adResults}
                        placeholder="Ex : ma maison à Namur…" onSelect={selectFromGuideSearch}
                        examples={["ma maison à Namur", "Rue de la Loi 1, Bruxelles", "notre ferme à Libramont", "l'école des enfants", "le bureau à Liège"]} />
                    </div>
                    <div className="hidden sm:block bg-[#f5f5f7] rounded-xl px-4 py-3.5 text-[12px] text-muted-foreground leading-relaxed">
                      Pas de lieu spécifique ? Aucun problème — passez à la carte pour tracer librement votre route.
                    </div>
                  </div>
                )}

                {/* Waypoints sélectionnés */}
                {waypoints.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-border space-y-2.5">
                    <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-[1.5px]">
                      {waypoints.length} lieu{waypoints.length > 1 ? "x" : ""} dans votre itinéraire
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {waypoints.map(wp => (
                        <span key={wp.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0b2238]/6 border border-[#0b2238]/15 rounded-full text-xs font-semibold text-[#0b2238] animate-in zoom-in-90 fade-in duration-200">
                          {wp.nom}
                          <button type="button" onClick={() => toggleWaypoint(wp)} className="cursor-pointer opacity-50 hover:opacity-100 transition-opacity">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </div>

      {/* Sticky nav — masquée pendant l'écran "Reprendre" */}
      {!showResume && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="max-w-[620px] mx-auto px-4 py-3 flex items-center justify-between gap-3">

            {guideStep > 1 ? (
              <button type="button" onClick={() => setGuideStep(s => (s - 1) as GuideStep)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                <ChevronLeft size={14} /> Retour
              </button>
            ) : (
              <div />
            )}

            {waypoints.length > 0 ? (
              <button type="button" onClick={advanceGuide}
                className="flex items-center gap-1.5 h-10 px-5 rounded-xl bg-[#0b2238] text-white text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer">
                {guideStep === 3 ? "Voir la carte" : "Continuer"} <ArrowRight size={13} />
              </button>
            ) : (
              <button type="button" onClick={advanceGuide}
                className="flex items-center gap-1.5 h-10 px-5 rounded-xl bg-secondary text-muted-foreground text-sm font-semibold hover:bg-border transition-colors cursor-pointer">
                Passer <ArrowRight size={13} />
              </button>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

// ── GeoField ──────────────────────────────────────────────────────
function GeoField({ q, setQ, loading, open, results, onSelect, placeholder = "Rechercher un lieu…", examples }: {
  q: string; setQ: (v: string) => void; loading: boolean; open: boolean;
  results: NominatimResult[]; onSelect: (r: NominatimResult) => void; placeholder?: string; examples?: string[];
}) {
  const [animText, setAnimText] = useState(() =>
    examples?.length ? "Ex : " + examples[0] : ""
  );

  useEffect(() => {
    const exs = examples ?? [];
    if (exs.length === 0) return;
    let idx = 0, charIdx = exs[0].length, isTyping = false;
    let timer: ReturnType<typeof setTimeout>;
    function tick() {
      const word = "Ex : " + exs[idx];
      if (isTyping) {
        charIdx++;
        setAnimText(word.slice(0, charIdx));
        timer = charIdx >= word.length ? setTimeout(tick, 2000) : setTimeout(tick, 65);
        if (charIdx >= word.length) isTyping = false;
      } else {
        charIdx--;
        setAnimText(word.slice(0, Math.max(0, charIdx)));
        if (charIdx <= 0) { idx = (idx + 1) % exs.length; charIdx = 0; isTyping = true; timer = setTimeout(tick, 200); }
        else { timer = setTimeout(tick, 42); }
      }
    }
    timer = setTimeout(tick, 2000);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activePlaceholder = examples?.length ? animText : placeholder;

  return (
    <div className="relative">
      <div className="flex items-center gap-2.5 h-12 px-4 border border-gray-200 rounded-xl bg-white shadow-sm focus-within:border-foreground/25 focus-within:shadow-[0_0_0_3px_rgba(11,34,56,0.06)] transition-all">
        {loading
          ? <Loader2 size={15} className="animate-spin text-foreground/35 shrink-0" />
          : <Search size={15} className="text-foreground/35 shrink-0" />
        }
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={activePlaceholder}
          className="flex-1 text-sm bg-transparent text-foreground focus:outline-none placeholder:text-muted-foreground/55 font-medium" />
        {!loading && q && (
          <button type="button" onClick={() => setQ("")} className="cursor-pointer text-muted-foreground hover:text-foreground shrink-0">
            <X size={14} />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-premium z-50 overflow-hidden">
          {results.map(r => (
            <button key={r.place_id} type="button" onClick={() => onSelect(r)}
              className="w-full text-left px-4 py-3 text-sm hover:bg-secondary transition-colors cursor-pointer border-b border-border last:border-0">
              <p className="font-semibold text-foreground truncate">{r.display_name.split(",")[0]}</p>
              <p className="text-muted-foreground text-xs truncate mt-0.5">{r.display_name.split(",").slice(1,3).join(",")}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
