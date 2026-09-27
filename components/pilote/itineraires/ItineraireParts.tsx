"use client";

import dynamic from "next/dynamic";
import { Clock, Search } from "lucide-react";
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

// Filtre : texte + plage de durée [lo, hi] sur un curseur de 0 à `max`. Plage
// complète = pas de filtre de durée (les itinéraires sans durée restent visibles).
export type DureeFilter = { lo: number; hi: number; q: string };
const STEP = 5;

export function dureeMax(items: Itineraire[]): number {
  const longest = Math.max(0, ...items.map((i) => i.duree_estimee ?? 0));
  return Math.max(120, Math.ceil(longest / 15) * 15);
}

export function fullFilter(max: number): DureeFilter {
  return { lo: 0, hi: max, q: "" };
}

/** Plage de ± 15 min autour d'une durée de vol (sélecteur ouvert depuis un vol). */
export function aroundFilter(duree: number, max: number): DureeFilter {
  return { lo: Math.max(0, duree - 15), hi: Math.min(max, duree + 15), q: "" };
}

export function applyFilter(items: Itineraire[], f: DureeFilter, max: number): Itineraire[] {
  const dureeActive = f.lo > 0 || f.hi < max;
  const q = f.q.trim().toLowerCase();
  return items.filter((it) => {
    const d = it.duree_estimee;
    if (dureeActive && (d == null || d < f.lo || d > f.hi)) return false;
    if (q && !`${it.nom} ${it.waypoints.map((w) => w.nom).join(" ")} ${it.notes ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

function DureeRange({ lo, hi, max, onChange }: { lo: number; hi: number; max: number; onChange: (lo: number, hi: number) => void }) {
  const pct = (v: number) => (v / max) * 100;
  return (
    <div className="st-range relative h-[22px]">
      <div className="absolute inset-x-[11px] top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-st-line-strong">
        <div className="absolute inset-y-0 rounded-full bg-st-ink" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
      </div>
      <input
        type="range" min={0} max={max} step={STEP} value={lo} aria-label="Durée minimum (minutes)"
        onChange={(e) => onChange(Math.min(Number(e.target.value), hi - STEP), hi)}
        // Poignées superposées au maximum : celle du minimum passe devant.
        style={{ zIndex: lo > max - 2 * STEP ? 3 : 2 }}
      />
      <input
        type="range" min={0} max={max} step={STEP} value={hi} aria-label="Durée maximum (minutes)"
        onChange={(e) => onChange(lo, Math.max(Number(e.target.value), lo + STEP))}
        style={{ zIndex: 2 }}
      />
    </div>
  );
}

export function FilterBar({ filter, onChange, max, total, shown, withSearch = true }: {
  filter: DureeFilter;
  onChange: (f: DureeFilter) => void;
  max: number;
  total: number;
  shown: number;
  withSearch?: boolean;
}) {
  const dureeActive = filter.lo > 0 || filter.hi < max;
  const active = dureeActive || filter.q !== "";
  return (
    <div className="space-y-3 border-b border-st-line-soft px-4 pb-4 pt-3.5">
      {withSearch && (
        <label className="relative block">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-st-muted" />
          <input
            type="search"
            value={filter.q}
            onChange={(e) => onChange({ ...filter, q: e.target.value })}
            placeholder="Rechercher un lieu, un nom…"
            aria-label="Rechercher un itinéraire"
            className="h-10 w-full rounded-[11px] border border-st-line bg-white pl-9 pr-3 text-[16px] text-st-text outline-none transition-colors placeholder:text-st-muted hover:border-st-line-strong focus:border-st-ink focus:ring-4 focus:ring-st-ink-soft sm:text-[13px]"
          />
        </label>
      )}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[12.5px] font-[550] text-st-text-2">Temps de vol</span>
          <span className="text-[13px] font-semibold text-st-text st-num">
            {dureeActive ? `${filter.lo} – ${filter.hi} min` : "Toutes les durées"}
          </span>
        </div>
        <DureeRange lo={filter.lo} hi={filter.hi} max={max} onChange={(lo, hi) => onChange({ ...filter, lo, hi })} />
      </div>
      <div className="flex items-center justify-between text-[12px] text-st-muted st-num">
        <span>{shown} itinéraire{shown > 1 ? "s" : ""} sur {total}</span>
        {active && (
          <button type="button" onClick={() => onChange(fullFilter(max))} className="cursor-pointer font-semibold text-st-ink hover:underline">
            Tout voir
          </button>
        )}
      </div>
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

export function ItinerairePreview({ itin, actions, showUses = true, className }: {
  itin: Itineraire;
  actions?: React.ReactNode;
  showUses?: boolean;
  className?: string;
}) {
  const km = distanceKm(itin);
  const meta = [
    fmtDuree(itin.duree_estimee),
    km != null ? `${km} km` : null,
    `${itin.waypoints.length} point${itin.waypoints.length > 1 ? "s" : ""}`,
    showUses ? `utilisé ${itin.utilisations} fois` : null,
  ].filter(Boolean);
  return (
    <div className={cn("flex min-h-0 min-w-0 flex-col", className)}>
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-st-line-soft px-5 py-3.5">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[16px] font-semibold tracking-[-0.01em] text-st-text">{itin.nom}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-st-text-2 st-num">
            <Clock size={13} className="text-st-muted" />
            {meta.map((m, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                {i > 0 && <span className="text-st-line-strong">·</span>}
                <span className={i === 0 ? "font-semibold text-st-text" : ""}>{m}</span>
              </span>
            ))}
          </p>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <div className="relative min-h-[300px] flex-1">
        {/* key : la carte se recrée quand on change d'itinéraire. */}
        <RouteMapReadOnlyDynamic key={itin.id} waypoints={itin.waypoints} aero height="100%" className="absolute inset-0 h-full w-full" />
      </div>
      <div className="shrink-0 space-y-1 border-t border-st-line-soft px-5 py-3">
        <RoutePath points={["EBCI", ...itin.waypoints.map((w) => w.nom || "Point"), "EBCI"]} className="text-[13px]" />
        {itin.notes && <p className="text-[12.5px] leading-snug text-st-muted">{itin.notes}</p>}
      </div>
    </div>
  );
}
