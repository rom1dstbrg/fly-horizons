"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createAdminVolMesure } from "@/lib/actions/reservations";
import {
  MapPin, Clock, Search, Trash2, X,
  Check, Loader2, Mail,
  PlaneTakeoff, Plus,
  Users, UserPlus, ArrowRight, Link2, BanknoteIcon,
  Star,
} from "lucide-react";
import type {
  AdventureRouteData, AdventureMapHandle, POI,
} from "@/components/vol-sur-mesure/LeafletMapAdventure";

const LeafletMapAdventure = dynamic(
  () => import("@/components/vol-sur-mesure/LeafletMapAdventure"),
  { ssr: false }
);

interface Client {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
}

interface Stopover {
  id: string;
  icao: string;
  nom: string;
  taxe: number;
  lat?: number | null;
  lng?: number | null;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface Props {
  clients: Client[];
  stopovers: Stopover[];
  prixHeure: number;
  acompteH: number;
}

export function AdminVolMesureFlow({ clients, stopovers: availableStops, prixHeure, acompteH }: Props) {
  const router  = useRouter();
  const mapRef  = useRef<AdventureMapHandle | null>(null);
  const searchRef      = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Route state
  const [route, setRoute] = useState<AdventureRouteData>({
    pois: [], distKm: 0, transitMin: 0, obsMin: 0, totalMin: 0,
  });

  // ── Nominatim search
  const [searchQ,       setSearchQ]       = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);

  useEffect(() => {
    if (searchQ.trim().length < 2) { setSearchResults([]); setSearchOpen(false); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQ)}&limit=6&accept-language=fr&viewbox=2.5,51.5,6.4,49.4&bounded=0`;
        const r   = await fetch(url, { headers: { "Accept-Language": "fr" } });
        const d   = await r.json() as NominatimResult[];
        const seen = new Set<string>();
        const unique = d.filter(item => {
          const key = item.display_name.split(",")[0].trim().toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key); return true;
        });
        setSearchResults(unique);
        setSearchOpen(unique.length > 0);
      } catch { /* ignore */ }
      finally { setSearchLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQ]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function addSearchResult(r: NominatimResult) {
    const poi: POI = {
      id: `nom-${r.place_id}`,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      nom: r.display_name.split(",")[0].trim(),
    };
    mapRef.current?.addPOI(poi);
    setSearchQ(""); setSearchOpen(false);
  }

  // ── Escales
  const [selectedStops, setSelectedStops] = useState<Stopover[]>([]);
  const [stopsOpen,     setStopsOpen]     = useState(false);

  function addStop(s: Stopover) {
    setSelectedStops(prev => prev.some(x => x.id === s.id) ? prev : [...prev, s]);
    if (s.lat != null && s.lng != null) {
      mapRef.current?.addPOI({ id: `stop-${s.id}`, lat: s.lat, lng: s.lng, nom: s.nom });
    }
    setStopsOpen(false);
  }
  function removeStop(id: string) {
    setSelectedStops(prev => prev.filter(x => x.id !== id));
    mapRef.current?.removePOI(`stop-${id}`);
  }

  // Reverse-sync: if a stopover POI is removed from the map, deselect it
  useEffect(() => {
    const routePOIIds = new Set(route.pois.map(p => p.id));
    setSelectedStops(prev =>
      prev.filter(s => s.lat == null || s.lng == null || routePOIIds.has(`stop-${s.id}`))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.pois]);

  // ── Client
  const [clientMode,      setClientMode]      = useState<"existing" | "new">("existing");
  const [clientSearch,    setClientSearch]    = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newPrenom,       setNewPrenom]       = useState("");
  const [newNom,          setNewNom]          = useState("");
  const [newEmail,        setNewEmail]        = useState("");
  const [newTelephone,    setNewTelephone]    = useState("");

  const filteredClients = clients.filter(c => {
    const q = clientSearch.toLowerCase();
    return c.prenom.toLowerCase().includes(q) || c.nom.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });
  const selectedClient = clients.find(c => c.id === selectedClientId);

  // ── Vol details
  const [dateVol,    setDateVol]    = useState("");
  const [heureVol,   setHeureVol]   = useState("10:00");
  const [passagers,  setPassagers]  = useState(1);
  const [poidsTotal, setPoidsTotal] = useState("");
  const [commentaire, setCommentaire] = useState("");

  // ── Price
  const taxesEscalesTotal = selectedStops.reduce((acc, s) => acc + s.taxe, 0);
  const prixEstime  = route.totalMin > 0 ? Math.round((prixHeure / 60) * route.totalMin) : 0;
  const acompteBase = route.totalMin > 0 ? Math.round((acompteH  / 60) * route.totalMin) : 0;
  const totalAcompte = acompteBase + taxesEscalesTotal;

  // ── Montant override (cash / virement)
  const [montantOverride, setMontantOverride] = useState("");
  const montantEffectif = montantOverride !== "" ? (parseInt(montantOverride) || 0) : totalAcompte;

  // ── Mode paiement
  const [envoyerPaiement, setEnvoyerPaiement] = useState(true);

  // ── Modal + submit
  const [showModal,  setShowModal]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  const clientEmail = clientMode === "existing" ? selectedClient?.email : newEmail;

  function handleCreateClick() {
    setError("");
    if (route.pois.length === 0) { setError("Ajoutez au moins un lieu sur la carte."); return; }
    if (!dateVol)                 { setError("La date est obligatoire."); return; }
    if (!heureVol)                { setError("L'heure est obligatoire."); return; }
    if (clientMode === "existing" && !selectedClientId) { setError("Sélectionnez un client."); return; }
    if (clientMode === "new" && (!newPrenom || !newNom || !newEmail)) {
      setError("Prénom, nom et email du client sont obligatoires."); return;
    }
    setShowModal(true);
  }

  async function handleSubmit(sendEmail: boolean) {
    setSubmitting(true);
    try {
      const result = await createAdminVolMesure({
        client_id:    clientMode === "existing" ? selectedClientId : undefined,
        prenom:       clientMode === "new" ? newPrenom   : undefined,
        nom:          clientMode === "new" ? newNom      : undefined,
        email:        clientMode === "new" ? newEmail    : undefined,
        telephone:    clientMode === "new" ? newTelephone : undefined,
        date_vol:     dateVol,
        heure_vol:    heureVol,
        duree:        route.totalMin || 60,
        passagers,
        poids_total:  poidsTotal ? parseInt(poidsTotal) : null,
        distance_km:  route.distKm || null,
        commentaire:  commentaire || undefined,
        taxes_escales: taxesEscalesTotal > 0 ? taxesEscalesTotal : null,
        waypoints:    route.pois.map(p => ({ lat: p.lat, lng: p.lng, nom: p.nom })),
        stopovers:    selectedStops.map(s => ({ icao: s.icao, nom: s.nom, taxe: s.taxe })),
        montant_override: montantOverride !== "" ? (parseInt(montantOverride) || 0) : undefined,
        envoyer_paiement: envoyerPaiement,
        send_email:   sendEmail,
      });

      if (result.error) { setError(result.error); setShowModal(false); return; }
      router.push("/admin/vols?tab=sur-mesure");
    } catch {
      setError("Erreur réseau.");
      setShowModal(false);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = route.pois.length > 0 && dateVol && heureVol &&
    (clientMode === "existing" ? !!selectedClientId : !!(newPrenom && newNom && newEmail));

  // ── Render
  return (
    <>
      <div className="flex" style={{ height: "calc(100vh - 150px)" }}>

        {/* ══ LEFT : carte ══ */}
        <div className="flex-1 relative overflow-hidden">

          {/* Carte */}
          <div className="absolute inset-0">
            <LeafletMapAdventure
              ref={mapRef}
              styleMode="rapide"
              onRouteChange={setRoute}
            />
          </div>

          {/* Barre de recherche */}
          <div ref={searchRef} className="absolute top-3 left-0 right-0 flex justify-center z-[450] px-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-lg flex items-center gap-2">
              <div className="relative flex-1">
                <div className={[
                  "flex items-center gap-2.5 h-10 rounded-lg px-3.5 transition-all border-2",
                  searchOpen
                    ? "bg-white border-primary shadow-[0_0_0_4px_rgba(242,183,5,0.15)]"
                    : "bg-white/95 border-[#cdd5e0] shadow-md hover:border-primary/70 backdrop-blur-sm",
                ].join(" ")}>
                  {searchLoading
                    ? <Loader2 size={14} className="text-primary animate-spin shrink-0" />
                    : <Search   size={14} className="text-[#6b7280] shrink-0" />
                  }
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
                    onBlur={() => setTimeout(() => {}, 150)}
                    placeholder="Ajouter un point de survol : ville, château, lac…"
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/55 outline-none min-w-0"
                    autoComplete="off"
                  />
                  {searchQ && (
                    <button onClick={() => { setSearchQ(""); setSearchOpen(false); }}
                      className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0">
                      <X size={13} />
                    </button>
                  )}
                </div>

                {searchOpen && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-border rounded-lg shadow-2xl z-[600] overflow-hidden mt-1.5">
                    <div className="px-4 py-2 border-b border-border bg-muted/30">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {searchResults.length} résultat{searchResults.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    {searchResults.map(r => (
                      <button key={r.place_id} type="button"
                        onClick={() => addSearchResult(r)}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-primary/5 text-left transition-colors border-b border-border last:border-0 cursor-pointer group">
                        <div className="w-7 h-7 rounded-lg bg-navy flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary transition-colors">
                          <MapPin size={12} className="text-primary group-hover:text-primary-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground truncate">{r.display_name.split(",")[0]}</p>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {r.display_name.split(",").slice(1, 3).join(", ").trim()}
                          </p>
                        </div>
                        <span className="text-[10px] text-primary font-bold shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          Ajouter
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {route.pois.length > 0 && (
                <button type="button"
                  onClick={() => mapRef.current?.clearAll()}
                  className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-white/70 bg-white/95 text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors cursor-pointer shrink-0 backdrop-blur-sm shadow-md">
                  <Trash2 size={12} /> Effacer
                </button>
              )}
            </div>
          </div>

          {/* Légende */}
          <div className="absolute bottom-5 left-3 z-[400] pointer-events-none">
            <div className="bg-[#0b2238]/88 backdrop-blur-sm border border-white/12 rounded-xl px-3 py-2.5 space-y-1.5">
              <p className="text-[#F2B705] text-[7px] font-black tracking-[2px] uppercase mb-2 leading-none">Légende</p>
              {[
                { icon: <span className="w-3 h-3 rounded-sm shrink-0 border border-dashed border-red-400" style={{ background: "rgba(239,68,68,0.45)" }} />, label: "Zone interdite (EBR)" },
                { icon: <span className="w-3 h-3 rounded-full shrink-0 bg-[#F2B705] flex items-center justify-center text-[6px] font-black text-[#0b2238]">1</span>, label: "Lieu à survoler" },
                { icon: <span className="w-3 h-3 rounded-[3px] shrink-0 bg-[#0b2238] border border-[#F2B705] flex items-center justify-center text-[7px]">✈</span>, label: "Escale" },
                { icon: <span className="w-3 h-3 rounded-full shrink-0 bg-[#F2B705] flex items-center justify-center"><PlaneTakeoff size={7} className="text-[#0b2238]" /></span>, label: "Charleroi EBCI" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-3 h-3 shrink-0">{icon}</div>
                  <span className="text-white/60 text-[9px] font-medium whitespace-nowrap">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ RIGHT : sidebar ══ */}
        <div className="w-[380px] xl:w-[420px] shrink-0 flex flex-col border-l border-border bg-card">

          {/* Scrollable content */}
          <div className="flex-1 min-h-0 overflow-y-auto">

            {/* Stats route */}
            <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
              {[
                { icon: <Clock size={9} />, label: "DURÉE",
                  main: route.totalMin > 0
                    ? (route.totalMin >= 60 ? `${Math.floor(route.totalMin/60)}h${String(route.totalMin%60).padStart(2,"0")}` : `${route.totalMin}`)
                    : "—",
                  sub: route.totalMin >= 60 ? "heures" : route.totalMin > 0 ? "min" : "",
                },
                { icon: <MapPin size={9} />, label: "DISTANCE",
                  main: route.distKm > 0 ? `${route.distKm}` : "—",
                  sub: route.distKm > 0 ? "km" : "",
                },
                { icon: <Star size={9} />, label: "PROVISION",
                  main: montantEffectif > 0 ? `${montantEffectif}` : montantOverride === "0" ? "0" : "—",
                  sub: montantEffectif > 0 || montantOverride === "0" ? "€" : "",
                },
              ].map(({ icon, label, main, sub }) => (
                <div key={label} className="py-4 px-2.5 text-center">
                  <p className="flex items-center justify-center gap-1 text-[7px] font-bold text-muted-foreground/70 uppercase tracking-[1.5px] mb-1.5">
                    {icon}{label}
                  </p>
                  <p className="text-xl font-black text-[#0b2238] leading-none">{main}</p>
                  {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
                </div>
              ))}
            </div>

            {/* Parcours */}
            <div className="px-4 py-4 border-b border-border">
              <p className="text-[9px] font-black text-foreground/40 uppercase tracking-[2px] mb-2.5">Parcours</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-[#F2B705] shrink-0 ring-4 ring-[#F2B705]/15" />
                  <div className="flex-1 flex items-center justify-between bg-navy rounded-lg px-3 py-2">
                    <span className="text-xs font-bold text-white">Charleroi EBCI</span>
                    <span className="text-[9px] font-bold text-[#F2B705] uppercase tracking-wide">Départ</span>
                  </div>
                </div>

                {route.pois.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic px-1 py-0.5">
                    Cliquez sur la carte pour ajouter des lieux…
                  </p>
                ) : (
                  route.pois.map(poi => (
                    <div key={poi.id} className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full bg-white border-2 border-muted-foreground/30 shrink-0" />
                      <div className="flex-1 flex items-center justify-between bg-navy rounded-lg px-3 py-2">
                        <span className="text-xs font-bold text-white truncate flex-1 min-w-0 mr-2">{poi.nom}</span>
                        <button
                          onClick={() => mapRef.current?.removePOI(poi.id)}
                          className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded bg-white/8 hover:bg-red-500/20 text-white/35 hover:text-red-400 transition-all cursor-pointer border border-white/10 hover:border-red-400/30">
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  ))
                )}

                {route.pois.length > 0 && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-[#F2B705] shrink-0 ring-4 ring-[#F2B705]/15" />
                    <div className="flex-1 flex items-center justify-between bg-navy rounded-lg px-3 py-2">
                      <span className="text-xs font-bold text-white">Charleroi EBCI</span>
                      <span className="text-[9px] font-bold text-[#F2B705] uppercase tracking-wide">Retour</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Escales */}
            {availableStops.length > 0 && (
              <div className="px-4 py-4 border-b border-border">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[9px] font-black text-foreground/40 uppercase tracking-[2px]">Escales</p>
                  {availableStops.some(s => !selectedStops.find(ss => ss.id === s.id)) && (
                    <button type="button" onClick={() => setStopsOpen(v => !v)}
                      className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer">
                      <Plus size={11} /> Ajouter
                    </button>
                  )}
                </div>
                {selectedStops.length === 0 && !stopsOpen && (
                  <p className="text-[11px] text-muted-foreground italic">Aucune escale</p>
                )}
                {selectedStops.map(s => (
                  <div key={s.id} className="flex items-center gap-2 bg-secondary rounded-lg px-2.5 py-1.5 border border-border mb-1.5">
                    <span className="font-mono text-[10px] font-bold text-[#0b2238] shrink-0">{s.icao}</span>
                    <span className="flex-1 text-[11px] text-foreground/70 truncate">{s.nom}</span>
                    {s.taxe > 0 && <span className="text-[10px] font-bold text-[#0b2238] shrink-0">+{s.taxe}€</span>}
                    <button type="button" onClick={() => removeStop(s.id)}
                      className="text-muted-foreground/40 hover:text-destructive transition-colors cursor-pointer shrink-0">
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {stopsOpen && (
                  <div className="rounded-lg overflow-hidden border border-border mt-1">
                    {availableStops
                      .filter(s => !selectedStops.find(ss => ss.id === s.id))
                      .map((s, i, arr) => (
                        <button key={s.id} type="button" onClick={() => addStop(s)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-primary/5 text-left transition-colors cursor-pointer ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                          <span className="font-mono text-[10px] font-bold text-[#0b2238] shrink-0 w-11">{s.icao}</span>
                          <span className="flex-1 text-[11px] text-foreground/80 truncate">{s.nom}</span>
                          {s.taxe > 0 && <span className="text-[10px] text-muted-foreground shrink-0">+{s.taxe}€</span>}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Séparateur visuel ── */}
            <div className="px-4 py-3 bg-muted/30 border-b border-border">
              <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[2px]">Informations réservation</p>
            </div>

            {/* Client */}
            <div className="px-4 py-4 border-b border-border space-y-3">
              <p className="text-xs font-bold text-foreground">Client</p>
              <div className="flex gap-1.5">
                {(["existing", "new"] as const).map(mode => (
                  <button key={mode} type="button" onClick={() => setClientMode(mode)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      clientMode === mode ? "bg-navy text-white border-navy" : "border-border text-muted-foreground hover:bg-secondary"
                    }`}>
                    {mode === "existing" ? <><Users size={12} /> Existant</> : <><UserPlus size={12} /> Nouveau</>}
                  </button>
                ))}
              </div>

              {clientMode === "existing" && (
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={clientSearch}
                      onChange={e => { setClientSearch(e.target.value); setSelectedClientId(""); }}
                      placeholder="Rechercher…"
                      className="w-full h-8 pl-8 pr-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {clientSearch && (
                    <div className="border border-border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                      {filteredClients.length === 0
                        ? <p className="p-2 text-xs text-muted-foreground text-center">Aucun résultat</p>
                        : filteredClients.slice(0, 6).map(c => (
                          <button key={c.id} type="button"
                            onClick={() => { setSelectedClientId(c.id); setClientSearch(`${c.prenom} ${c.nom}`); }}
                            className="w-full text-left px-3 py-2 hover:bg-secondary transition-colors border-b border-border last:border-0">
                            <p className="text-xs font-medium text-foreground">{c.prenom} {c.nom}</p>
                            <p className="text-[10px] text-muted-foreground">{c.email}</p>
                          </button>
                        ))}
                    </div>
                  )}
                  {selectedClient && (
                    <div className="flex items-center gap-2 px-2.5 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <Check size={12} className="text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-emerald-700 truncate">{selectedClient.prenom} {selectedClient.nom}</p>
                        <p className="text-[10px] text-emerald-600 truncate">{selectedClient.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {clientMode === "new" && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Prénom *", value: newPrenom, set: setNewPrenom },
                    { label: "Nom *",    value: newNom,    set: setNewNom },
                  ].map(({ label, value, set }) => (
                    <div key={label}>
                      <label className="block text-[10px] font-medium text-muted-foreground mb-1">{label}</label>
                      <input value={value} onChange={e => set(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="block text-[10px] font-medium text-muted-foreground mb-1">Email *</label>
                    <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-medium text-muted-foreground mb-1">Téléphone</label>
                    <input type="tel" value={newTelephone} onChange={e => setNewTelephone(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
              )}
            </div>

            {/* Date + heure */}
            <div className="px-4 py-4 border-b border-border">
              <p className="text-xs font-bold text-foreground mb-3">Date & heure</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">Date *</label>
                  <input type="date" value={dateVol} onChange={e => setDateVol(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">Heure *</label>
                  <input type="time" value={heureVol} onChange={e => setHeureVol(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
            </div>

            {/* Passagers + poids */}
            <div className="px-4 py-4 border-b border-border">
              <p className="text-xs font-bold text-foreground mb-3">Participants</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">Passagers</label>
                  <select value={passagers} onChange={e => setPassagers(parseInt(e.target.value))}
                    className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring">
                    {[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">Poids total (kg)</label>
                  <input type="number" min="0" value={poidsTotal} onChange={e => setPoidsTotal(e.target.value)}
                    placeholder="Ex : 180"
                    className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
            </div>

            {/* Commentaire */}
            <div className="px-4 py-4 border-b border-border">
              <label className="block text-xs font-bold text-foreground mb-2">
                Commentaire <span className="font-normal text-muted-foreground">(optionnel)</span>
              </label>
              <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)}
                rows={2} placeholder="Notes sur l'itinéraire, souhaits du client…"
                className="w-full px-2.5 py-2 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>

            {/* Provision / paiement hors ligne */}
            <div className="px-4 py-4 border-b border-border space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground">Provision</p>
                {totalAcompte > 0 && montantOverride === "" && (
                  <span className="text-[10px] font-semibold text-muted-foreground">{totalAcompte} € calculé</span>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                  Montant à facturer (€)
                  <span className="ml-1 text-muted-foreground/50">· vide = auto</span>
                </label>
                <input
                  type="number" min="0" step="1" value={montantOverride}
                  onChange={e => setMontantOverride(e.target.value)}
                  placeholder={totalAcompte > 0 ? String(totalAcompte) : "0"}
                  className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {montantOverride !== "" && (
                  <p className="text-[10px] font-medium mt-1.5 text-emerald-600">
                    {parseInt(montantOverride) > 0
                      ? `${parseInt(montantOverride)} € — paiement hors ligne (cash / virement)`
                      : "Aucune provision — vol gratuit ou déjà réglé"}
                  </p>
                )}
              </div>
              {route.totalMin > 0 && (
                <div className="space-y-1 text-[11px] text-muted-foreground border-t border-border pt-2.5">
                  <div className="flex justify-between">
                    <span>Base vol ({route.totalMin} min)</span>
                    <span>{acompteBase} €</span>
                  </div>
                  {taxesEscalesTotal > 0 && (
                    <div className="flex justify-between">
                      <span>Taxes escales</span>
                      <span>+{taxesEscalesTotal} €</span>
                    </div>
                  )}
                  {prixEstime > 0 && (
                    <p className="text-[10px] mt-1">Prix vol estimé : ~{prixEstime} €</p>
                  )}
                </div>
              )}
            </div>

            {/* Mode paiement */}
            <div className="px-4 py-4 border-b border-border space-y-2.5">
              <p className="text-xs font-bold text-foreground mb-1">Mode de paiement</p>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio" name="payMode" className="mt-0.5 shrink-0 accent-[#F2B705]"
                  checked={envoyerPaiement} onChange={() => setEnvoyerPaiement(true)}
                />
                <div>
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Link2 size={11} className="text-primary shrink-0" />
                    Envoyer un lien de paiement par email
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Le client reçoit un lien Stripe sécurisé pour payer la provision ({montantEffectif > 0 ? `${montantEffectif} €` : "montant calculé"}).
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio" name="payMode" className="mt-0.5 shrink-0 accent-[#F2B705]"
                  checked={!envoyerPaiement} onChange={() => setEnvoyerPaiement(false)}
                />
                <div>
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <BanknoteIcon size={11} className="text-muted-foreground shrink-0" />
                    Marquer comme confirmé (pas de paiement en ligne)
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Email de confirmation envoyé. À utiliser si le client paie en cash ou par virement.
                  </p>
                </div>
              </label>
            </div>

            {error && (
              <div className="mx-4 my-3 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                {error}
              </div>
            )}
          </div>

          {/* CTA épinglé */}
          <div className="shrink-0 px-4 py-4 border-t border-border bg-card">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleCreateClick}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-primary text-primary-foreground text-sm font-black disabled:opacity-30 hover:brightness-105 transition-all cursor-pointer shadow-gold">
              {envoyerPaiement
                ? <><Link2 size={14} /> Créer et envoyer le lien de paiement</>
                : <>Créer la réservation <ArrowRight size={14} /></>
              }
            </button>
            {!canSubmit && route.pois.length === 0 && (
              <p className="text-center text-[10px] text-muted-foreground/50 mt-2">
                Ajoutez au moins un lieu sur la carte
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ══ MODAL : envoyer email ? ══ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mail size={20} className="text-primary" />
            </div>
            <h3 className="text-lg font-black text-foreground text-center mb-1">
              Envoyer un email au client ?
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-1">
              {envoyerPaiement
                ? "Un lien de paiement Stripe sera envoyé à"
                : "Un email de confirmation sera envoyé à"}
            </p>
            <p className="text-sm font-semibold text-foreground text-center mb-5">
              {clientEmail}
            </p>

            <div className="space-y-2.5">
              <button
                disabled={submitting}
                onClick={() => handleSubmit(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-black hover:brightness-105 disabled:opacity-50 transition-all cursor-pointer shadow-gold">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                Oui, envoyer l&apos;email
              </button>

              <button
                disabled={submitting}
                onClick={() => handleSubmit(false)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-50 transition-colors cursor-pointer">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <BanknoteIcon size={14} />}
                Non, créer sans email
              </button>

              <button
                disabled={submitting}
                onClick={() => setShowModal(false)}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
