"use client";

import { useState, useTransition, useEffect } from "react";
import { createStopover, updateStopover, deleteStopover } from "@/lib/actions/stopovers";
import { createClient } from "@/lib/supabase/client";
import { Plane, Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight, Loader2, Search, MapPin, AlertCircle, ChevronDown } from "lucide-react";

interface Stopover {
  id: string;
  icao: string;
  nom: string;
  taxe: number;
  actif: boolean;
  lat: number | null;
  lng: number | null;
}

interface Props {
  initialData?: Stopover[];
}

// ── Airport lookup (NOAA → OSM fallback, via server proxy) ────
interface AirportResult {
  nom: string;
  lat: number;
  lng: number;
  source: "noaa" | "osm";
}

async function lookupIcao(icao: string): Promise<AirportResult | null> {
  try {
    const r = await fetch(`/api/airport-lookup?icao=${encodeURIComponent(icao.toUpperCase().trim())}`);
    if (!r.ok) return null;
    return await r.json() as AirportResult;
  } catch {
    return null;
  }
}

// ── Inline editable row ────────────────────────────────────────
function StopoverRow({
  stop, onSave, onDelete, onToggle,
}: {
  stop: Stopover;
  onSave: (id: string, data: { icao: string; nom: string; taxe: number; lat?: number | null; lng?: number | null }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string, actif: boolean) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [icao, setIcao] = useState(stop.icao);
  const [nom,  setNom]  = useState(stop.nom);
  const [taxe, setTaxe] = useState(String(stop.taxe));
  const [lat,  setLat]  = useState<string>(stop.lat != null ? String(stop.lat) : "");
  const [lng,  setLng]  = useState<string>(stop.lng != null ? String(stop.lng) : "");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError,   setLookupError]   = useState("");
  const [lookupDone,    setLookupDone]    = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleLookup() {
    if (icao.trim().length !== 4) { setLookupError("Code ICAO invalide (4 caractères requis)"); return; }
    setLookupLoading(true); setLookupError(""); setLookupDone(false);
    const airport = await lookupIcao(icao);
    setLookupLoading(false);
    if (!airport) {
      setLookupError("Introuvable (NOAA + OSM) — entrez le nom et les coordonnées manuellement.");
      return;
    }
    setNom(airport.nom);
    setLat(String(airport.lat));
    setLng(String(airport.lng));
    setLookupDone(true);
  }

  function handleSave() {
    startTransition(async () => {
      await onSave(stop.id, {
        icao, nom,
        taxe: parseInt(taxe) || 0,
        lat:  lat.trim() !== "" ? parseFloat(lat) : null,
        lng:  lng.trim() !== "" ? parseFloat(lng) : null,
      });
      setEditing(false);
    });
  }
  function handleCancel() {
    setIcao(stop.icao); setNom(stop.nom); setTaxe(String(stop.taxe));
    setLat(stop.lat != null ? String(stop.lat) : "");
    setLng(stop.lng != null ? String(stop.lng) : "");
    setLookupError(""); setLookupDone(false); setEditing(false);
  }

  if (editing) {
    const hasCoords = lat.trim() !== "" && lng.trim() !== "";
    return (
      <tr className="bg-amber-50/40">
        <td className="px-3 py-3" colSpan={4}>
          <div className="space-y-2.5">
            <div className="flex flex-wrap gap-2 items-end">
              {/* ICAO + lookup */}
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">ICAO</label>
                <div className="flex gap-1">
                  <input value={icao} onChange={e => { setIcao(e.target.value.toUpperCase()); setLookupError(""); setLookupDone(false); }}
                    maxLength={4}
                    className="w-16 h-8 px-2 rounded-lg border border-amber-300 bg-white text-xs font-mono font-bold uppercase focus:outline-none focus:ring-1 focus:ring-amber-400" />
                  <button type="button" onClick={handleLookup} disabled={lookupLoading}
                    title="Rechercher dans la base NOAA"
                    className="h-8 px-2 bg-[#113356] text-white rounded-lg text-xs hover:bg-[#0b2238] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1">
                    {lookupLoading ? <Loader2 size={10} className="animate-spin" /> : <Search size={10} />}
                  </button>
                </div>
              </div>
              {/* Nom */}
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Nom {lookupDone && <span className="text-green-500 normal-case font-normal">• NOAA ✓</span>}
                </label>
                <input value={nom} onChange={e => setNom(e.target.value)}
                  className={`w-full h-8 px-2 rounded-lg border bg-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 ${lookupDone ? "border-green-300" : "border-amber-300"}`} />
              </div>
              {/* Taxe */}
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Taxe (€)</label>
                <div className="flex items-center gap-1">
                  <input type="number" value={taxe} onChange={e => setTaxe(e.target.value)} min={0} max={999}
                    className="w-16 h-8 px-2 rounded-lg border border-amber-300 bg-white text-xs text-right focus:outline-none focus:ring-1 focus:ring-amber-400" />
                  <span className="text-xs text-muted-foreground">€</span>
                </div>
              </div>
            </div>
            {/* Lat / Lng manual */}
            <div className="flex gap-2 items-center">
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Latitude</label>
                <input value={lat} onChange={e => setLat(e.target.value)} placeholder="50.4835"
                  className="w-24 h-8 px-2 rounded-lg border border-amber-300 bg-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Longitude</label>
                <input value={lng} onChange={e => setLng(e.target.value)} placeholder="4.9138"
                  className="w-24 h-8 px-2 rounded-lg border border-amber-300 bg-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-400" />
              </div>
              {hasCoords && (
                <p className="text-[10px] text-green-600 font-medium mt-4 flex items-center gap-1">
                  <MapPin size={9} /> Coordonnées ✓
                </p>
              )}
            </div>
            {lookupError && (
              <p className="flex items-start gap-1.5 text-[11px] text-amber-600">
                <AlertCircle size={11} className="shrink-0 mt-0.5" />{lookupError}
              </p>
            )}
            <div className="flex gap-1.5">
              <button onClick={handleSave} disabled={pending}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 transition-colors cursor-pointer disabled:opacity-50">
                {pending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                Sauvegarder
              </button>
              <button onClick={handleCancel} disabled={pending}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer">
                <X size={11} />
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-b border-border last:border-0 transition-colors ${!stop.actif ? "opacity-40" : ""}`}>
      <td className="px-3 py-2.5">
        <span className="font-mono text-xs font-bold text-[#113356]">{stop.icao}</span>
      </td>
      <td className="px-3 py-2.5">
        <div>
          <span className="text-sm text-foreground">{stop.nom}</span>
          {stop.lat != null && stop.lng != null ? (
            <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-0.5">
              <MapPin size={8} />{stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
            </p>
          ) : (
            <p className="text-[10px] text-amber-500 mt-0.5">⚠️ Sans coordonnées GPS</p>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-right">
        <span className="text-sm font-semibold">{stop.taxe > 0 ? `${stop.taxe} €` : "—"}</span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 justify-end">
          <button onClick={() => startTransition(() => onToggle(stop.id, !stop.actif))}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title={stop.actif ? "Désactiver" : "Activer"}>
            {stop.actif
              ? <ToggleRight size={18} className="text-green-500" />
              : <ToggleLeft  size={18} />}
          </button>
          <button onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-[#113356] hover:border-[#113356] transition-colors cursor-pointer">
            <Pencil size={12} />
          </button>
          <button onClick={() => startTransition(() => onDelete(stop.id))}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-red-500 hover:border-red-300 transition-colors cursor-pointer">
            <Trash2 size={12} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main component ─────────────────────────────────────────────
export function StopoversAdmin({ initialData }: Props) {
  const [open, setOpen] = useState(false);   // replié par défaut
  const [stops, setStops] = useState<Stopover[]>(initialData ?? []);
  const [loadingInit, setLoadingInit] = useState(!initialData);

  useEffect(() => {
    if (initialData) return;
    const sb = createClient();
    sb.from("stopovers").select("id, icao, nom, taxe, actif, lat, lng").order("nom")
      .then(({ data }) => { setStops((data ?? []) as Stopover[]); setLoadingInit(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [showForm,  setShowForm]  = useState(false);
  const [newIcao,   setNewIcao]   = useState("");
  const [newNom,    setNewNom]    = useState("");
  const [newTaxe,   setNewTaxe]   = useState("");
  const [newLat,    setNewLat]    = useState("");
  const [newLng,    setNewLng]    = useState("");
  const [icaoLoading,  setIcaoLoading]  = useState(false);
  const [icaoFound,    setIcaoFound]    = useState(false);
  const [icaoNotFound, setIcaoNotFound] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // Auto-lookup when ICAO reaches exactly 4 chars
  useEffect(() => {
    if (newIcao.length !== 4) {
      if (!icaoNotFound) { // keep manual values if already in manual mode
        setNewNom(""); setNewLat(""); setNewLng("");
      }
      setIcaoFound(false); setIcaoNotFound(false); setError("");
      return;
    }
    let cancelled = false;
    setIcaoLoading(true); setError(""); setIcaoFound(false); setIcaoNotFound(false);
    setNewNom(""); setNewLat(""); setNewLng("");
    lookupIcao(newIcao).then(airport => {
      if (cancelled) return;
      setIcaoLoading(false);
      if (!airport) {
        setIcaoNotFound(true);
        setError("Introuvable (NOAA + OSM) — entrez le nom et les coordonnées ci-dessous.");
        return;
      }
      setNewNom(airport.nom);
      setNewLat(String(airport.lat));
      setNewLng(String(airport.lng));
      setIcaoFound(true);
    });
    return () => { cancelled = true; };
  }, [newIcao]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAdd() {
    if (!newIcao.trim() || !newNom.trim()) {
      setError("Le code ICAO et le nom sont obligatoires.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        const lat = newLat.trim() !== "" ? parseFloat(newLat) : null;
        const lng = newLng.trim() !== "" ? parseFloat(newLng) : null;
        await createStopover({
          icao: newIcao, nom: newNom,
          taxe: parseInt(newTaxe) || 0,
          lat, lng,
        });
        setStops(prev => [...prev, {
          id: crypto.randomUUID(),
          icao: newIcao.toUpperCase().trim(),
          nom:  newNom.trim(),
          taxe: parseInt(newTaxe) || 0,
          actif: true, lat, lng,
        }]);
        setNewIcao(""); setNewNom(""); setNewTaxe(""); setNewLat(""); setNewLng("");
        setIcaoFound(false); setIcaoNotFound(false);
        setShowForm(false);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function resetForm() {
    setShowForm(false); setError("");
    setNewIcao(""); setNewNom(""); setNewTaxe(""); setNewLat(""); setNewLng("");
    setIcaoFound(false); setIcaoNotFound(false);
  }

  async function handleSave(id: string, data: { icao: string; nom: string; taxe: number; lat?: number | null; lng?: number | null }) {
    await updateStopover(id, data);
    setStops(prev => prev.map(s => s.id === id ? { ...s, ...data, icao: data.icao.toUpperCase() } : s));
  }
  async function handleDelete(id: string) {
    await deleteStopover(id);
    setStops(prev => prev.filter(s => s.id !== id));
  }
  async function handleToggle(id: string, actif: boolean) {
    await updateStopover(id, { actif });
    setStops(prev => prev.map(s => s.id === id ? { ...s, actif } : s));
  }

  const activeCount = stops.filter(s => s.actif).length;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden mb-4">
      {/* Header — cliquable pour déplier */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#113356]/8 flex items-center justify-center">
            <Plane size={15} className="text-[#113356]" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Escales disponibles</p>
            <p className="text-xs text-muted-foreground">
              {activeCount} active{activeCount > 1 ? "s" : ""}
              {stops.length > activeCount ? ` · ${stops.length - activeCount} inactive${stops.length - activeCount > 1 ? "s" : ""}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {open && (
            <button
              onClick={e => { e.stopPropagation(); setShowForm(v => !v); if (showForm) resetForm(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#113356] text-white rounded-xl text-xs font-bold hover:bg-[#0b2238] transition-colors cursor-pointer"
            >
              <Plus size={12} />
              Ajouter
            </button>
          )}
          <ChevronDown
            size={16}
            className={`text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* Contenu déplié */}
      {open && <>

      {/* Add form */}
      {showForm && (
        <div className="px-5 py-4 bg-secondary/30 border-b border-border">
          <div className="flex flex-wrap gap-3 items-end">
            {/* ICAO */}
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Code ICAO</label>
              <div className="relative">
                <input
                  value={newIcao}
                  onChange={e => setNewIcao(e.target.value.toUpperCase())}
                  maxLength={4} placeholder="EBBT"
                  className="w-20 h-9 px-2.5 pr-8 rounded-xl border border-border bg-white text-sm font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#113356]/20 focus:border-[#113356] transition-all"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  {icaoLoading   && <Loader2     size={12} className="animate-spin text-muted-foreground" />}
                  {icaoFound     && <Check       size={12} className="text-green-500" />}
                  {icaoNotFound  && <AlertCircle size={12} className="text-amber-500" />}
                </div>
              </div>
            </div>

            {/* Nom */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Nom complet
                {icaoFound    && <span className="ml-1 text-green-500 normal-case font-normal">• auto-rempli ✓</span>}
                {icaoNotFound && <span className="ml-1 text-amber-500 normal-case font-normal">• saisie manuelle</span>}
              </label>
              <input
                value={newNom}
                onChange={e => setNewNom(e.target.value)}
                placeholder={newIcao.length < 4 ? "Tapez 4 lettres ICAO pour auto-remplir…" : "Nom de l'aérodrome"}
                className={`w-full h-9 px-2.5 rounded-xl border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#113356]/20 focus:border-[#113356] transition-all ${
                  icaoFound ? "border-green-300" : icaoNotFound ? "border-amber-300" : "border-border"
                }`}
              />
            </div>

            {/* Taxe */}
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Taxe (€)</label>
              <input
                type="number" value={newTaxe}
                onChange={e => setNewTaxe(e.target.value)}
                min={0} max={999} placeholder="0"
                className="w-20 h-9 px-2.5 rounded-xl border border-border bg-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#113356]/20 focus:border-[#113356] transition-all"
              />
            </div>

            <button onClick={handleAdd} disabled={pending || icaoLoading}
              className="flex items-center gap-1.5 h-9 px-4 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition-colors cursor-pointer disabled:opacity-50">
              {pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Créer
            </button>
            <button onClick={resetForm}
              className="h-9 px-3 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              <X size={14} />
            </button>
          </div>

          {/* Manual lat/lng — always shown once ICAO is 4 chars (auto-filled or manual) */}
          {newIcao.length === 4 && !icaoLoading && (
            <div className="mt-3 flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Latitude <span className="normal-case font-normal">(ex: 50.4835)</span>
                </label>
                <input
                  value={newLat} onChange={e => setNewLat(e.target.value)}
                  placeholder="50.4835"
                  className={`w-28 h-8 px-2.5 rounded-xl border bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#113356]/20 focus:border-[#113356] transition-all ${
                    icaoFound ? "border-green-300 bg-green-50/40" : "border-border"
                  }`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Longitude <span className="normal-case font-normal">(ex: 4.9138)</span>
                </label>
                <input
                  value={newLng} onChange={e => setNewLng(e.target.value)}
                  placeholder="4.9138"
                  className={`w-28 h-8 px-2.5 rounded-xl border bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#113356]/20 focus:border-[#113356] transition-all ${
                    icaoFound ? "border-green-300 bg-green-50/40" : "border-border"
                  }`}
                />
              </div>
              {newLat && newLng && (
                <p className="text-[10px] text-green-600 font-medium flex items-center gap-1 mt-4">
                  <MapPin size={9} /> Intégration carte automatique ✓
                </p>
              )}
            </div>
          )}

          {error && (
            <p className={`flex items-start gap-1.5 text-xs mt-2.5 ${icaoNotFound ? "text-amber-600" : "text-red-500"}`}>
              <AlertCircle size={12} className="shrink-0 mt-0.5" />{error}
            </p>
          )}
        </div>
      )}

      {/* Table */}
      {loadingInit ? (
        <div className="px-5 py-8 text-center">
          <Loader2 size={20} className="animate-spin text-muted-foreground mx-auto" />
        </div>
      ) : stops.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">Aucune escale configurée.</p>
          <p className="text-xs text-muted-foreground mt-1">Cliquez sur « Ajouter » pour en créer une.</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/20">
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">ICAO</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Aérodrome</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Taxe</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stops.map(s => (
              <StopoverRow key={s.id} stop={s} onSave={handleSave} onDelete={handleDelete} onToggle={handleToggle} />
            ))}
          </tbody>
        </table>
      )}

      </>}
    </div>
  );
}
