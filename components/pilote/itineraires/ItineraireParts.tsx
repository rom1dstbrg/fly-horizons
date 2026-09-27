"use client";

import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import type { Itineraire } from "@/lib/actions/itineraires";
import type { WaypointDraft } from "@/components/admin/AdminRouteEditor";
import { RoutePath } from "@/components/pilote/RoutePath";
import { calcRouteStats } from "@/lib/route-stats";
import { cn } from "@/lib/utils";

// Morceaux partagés par la page Itinéraires et le sélecteur « Charger un
// itinéraire » (maquette validée le 27/09) : liste filtrable par durée
// (entre X et Y min) et aperçu (carte, temps de vol, distance, points).

const RouteMapReadOnlyDynamic = dynamic(() => import("@/components/maps/RouteMapReadOnly"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-st-surface" />,
});

export function fmtDuree(min: number | null): string {
  if (min == null) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export function toDraft(itin: Itineraire): WaypointDraft[] {
  return itin.waypoints.map((w) => ({ lat: String(w.lat), lng: String(w.lng), nom: w.nom ?? "" }));
}

export function distanceKm(itin: Itineraire): number | null {
  const s = calcRouteStats(itin.waypoints);
  return s ? Math.round(s.distKm) : null;
}

export type DureeFilter = { min: string; max: string; q: string };

export function applyFilter(items: Itineraire[], f: DureeFilter): Itineraire[] {
  const lo = parseInt(f.min, 10);
  const hi = parseInt(f.max, 10);
  const q = f.q.trim().toLowerCase();
  return items.filter((it) => {
    const d = it.duree_estimee;
    // Sans durée renseignée : visible seulement quand le filtre de durée est vide.
    if (Number.isFinite(lo) && (d == null || d < lo)) return false;
    if (Number.isFinite(hi) && (d == null || d > hi)) return false;
    if (q && !`${it.nom} ${it.waypoints.map((w) => w.nom).join(" ")} ${it.notes ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

const numInput =
  "h-9 w-[68px] rounded-[10px] border border-st-line bg-white px-2.5 text-right text-[16px] text-st-text outline-none transition-colors placeholder:text-st-muted hover:border-st-line-strong focus:border-st-ink focus:ring-4 focus:ring-st-ink-soft sm:text-[13px] st-num";

export function FilterBar({ filter, onChange, total, shown, withSearch = true }: {
  filter: DureeFilter;
  onChange: (f: DureeFilter) => void;
  total: number;
  shown: number;
  withSearch?: boolean;
}) {
  const active = filter.min !== "" || filter.max !== "" || filter.q !== "";
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-st-line-soft px-4 py-3">
      {withSearch && (
        <label className="relative min-w-[150px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-st-muted" />
          <input
            type="search"
            value={filter.q}
            onChange={(e) => onChange({ ...filter, q: e.target.value })}
            placeholder="Rechercher un lieu, un nom…"
            aria-label="Rechercher un itinéraire"
            className="h-9 w-full rounded-[10px] border border-st-line bg-white pl-9 pr-3 text-[16px] text-st-text outline-none transition-colors placeholder:text-st-muted hover:border-st-line-strong focus:border-st-ink focus:ring-4 focus:ring-st-ink-soft sm:text-[13px]"
          />
        </label>
      )}
      <div className="flex items-center gap-1.5 text-[12.5px] text-st-text-2">
        <span>Durée</span>
        <input type="number" inputMode="numeric" min={0} value={filter.min} onChange={(e) => onChange({ ...filter, min: e.target.value })} placeholder="min" aria-label="Durée minimum (minutes)" className={numInput} />
        <span>à</span>
        <input type="number" inputMode="numeric" min={0} value={filter.max} onChange={(e) => onChange({ ...filter, max: e.target.value })} placeholder="max" aria-label="Durée maximum (minutes)" className={numInput} />
        <span>min</span>
      </div>
      <span className="ml-auto flex items-center gap-2 text-[12px] text-st-muted st-num">
        {shown} sur {total}
        {active && (
          <button type="button" onClick={() => onChange({ min: "", max: "", q: "" })} className="cursor-pointer font-semibold text-st-ink hover:underline">
            Tout voir
          </button>
        )}
      </span>
    </div>
  );
}

export function ItineraireRows({ items, selectedId, onSelect, showUses = false }: {
  items: Itineraire[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  showUses?: boolean;
}) {
  return (
    <ul role="listbox" aria-label="Itinéraires" className="divide-y divide-st-line-soft">
      {items.map((it) => {
        const km = distanceKm(it);
        const selected = it.id === selectedId;
        return (
          <li key={it.id}>
            <button
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onSelect(it.id)}
              className={cn(
                "flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors",
                selected ? "bg-st-ink-soft" : "hover:bg-st-surface",
              )}
            >
              <span className={cn("flex h-11 w-[52px] shrink-0 flex-col items-center justify-center rounded-[10px] leading-none", selected ? "bg-white" : "bg-st-surface")}>
                <b className="text-[15px] font-semibold text-st-text st-num">{it.duree_estimee ?? "—"}</b>
                <small className="mt-0.5 text-[10px] text-st-muted">min</small>
              </span>
              <span className="min-w-0 flex-1 space-y-0.5">
                <span className="block truncate text-[13.5px] font-semibold text-st-text">{it.nom}</span>
                <span className="block truncate text-[12px] text-st-text-2">
                  EBCI › {it.waypoints.map((w) => w.nom || "Point").join(" › ")} › EBCI
                </span>
                <span className="block text-[11.5px] text-st-muted st-num">
                  {km != null ? `${km} km` : ""}
                  {showUses && it.utilisations > 0 ? ` · utilisé ${it.utilisations} fois` : ""}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ItinerairePreview({ itin, actions, showPoints = true, mapClassName }: {
  itin: Itineraire;
  actions?: React.ReactNode;
  showPoints?: boolean;
  mapClassName?: string;
}) {
  const km = distanceKm(itin);
  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-st-line-soft px-5 py-3.5">
        <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-st-text">{itin.nom}</h3>
        {actions}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-st-line-soft px-5 py-3">
        <Stat label="Temps de vol" value={fmtDuree(itin.duree_estimee)} />
        <Stat label="Distance" value={km != null ? `${km} km` : "—"} />
        <Stat label="Points" value={String(itin.waypoints.length)} />
        {showPoints && <Stat label="Utilisé" value={`${itin.utilisations} fois`} />}
      </div>
      <div className={cn("relative h-[340px]", mapClassName)}>
        {/* key : la carte se recrée quand on change d'itinéraire. */}
        <RouteMapReadOnlyDynamic key={itin.id} waypoints={itin.waypoints} aero height="100%" className="h-full w-full" />
      </div>
      {showPoints && (
        <div className="space-y-2 px-5 py-4">
          <RoutePath points={["EBCI", ...itin.waypoints.map((w) => w.nom || "Point"), "EBCI"]} className="text-[13px]" />
          {itin.notes && <p className="text-[12.5px] leading-snug text-st-muted">{itin.notes}</p>}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-st-muted">{label}</p>
      <p className="text-[14px] font-semibold text-st-text st-num">{value}</p>
    </div>
  );
}
