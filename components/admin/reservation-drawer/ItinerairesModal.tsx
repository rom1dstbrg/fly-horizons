"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Loader2, Navigation, ChevronRight } from "lucide-react";
import type { Itineraire } from "@/lib/actions/itineraires";
import { Badge, Segmented, SheetCloseButton } from "@/components/pilote/studio";
import { RoutePath } from "@/components/pilote/RoutePath";

// Itinéraires types (style « Studio », 24/09) : ouverts depuis l'onglet Route du
// tiroir ou l'éditeur plein écran. Un clic charge l'itinéraire sur la carte.
// Bureau : fenêtre centrée ; téléphone : feuille qui monte du bas.

const DUREE_LABELS: Record<number, string> = { 30: "30 min", 60: "1 h", 90: "1 h 30", 120: "2 h" };

export function ItinerairesModal({
  open, onClose, duree, items, loading, showAll, setShowAll, onApply, canManage = false,
}: {
  open: boolean;
  onClose: () => void;
  duree?: number;
  items: Itineraire[];
  loading: boolean;
  showAll: boolean;
  setShowAll: (v: boolean) => void;
  onApply: (itin: Itineraire) => void;
  /** Admin : lien vers la gestion des itinéraires. */
  canManage?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const forThis = duree != null ? items.filter((it) => it.duree_estimee === duree) : items;
  const filtered = showAll || duree == null ? items : forThis;

  return (
    <div className="pilote-studio fixed inset-0 z-[2000] flex items-end justify-center bg-st-ink/30 font-sans backdrop-blur-[1.5px] motion-safe:animate-in motion-safe:fade-in sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="itin-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-[26px] bg-white pb-[env(safe-area-inset-bottom)] text-st-text shadow-st-panel motion-safe:animate-in motion-safe:slide-in-from-bottom-4 sm:max-w-[480px] sm:rounded-[20px] sm:pb-0"
      >
        <div className="mx-auto mt-2.5 h-1 w-[38px] shrink-0 rounded-full bg-st-line-strong sm:hidden" />
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-3 sm:pt-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-st-surface text-st-ink">
              <Navigation size={17} />
            </span>
            <div className="min-w-0">
              <h2 id="itin-title" className="text-base font-semibold">Itinéraires types</h2>
              <p className="text-[12px] text-st-muted">Un clic charge l&apos;itinéraire sur la carte</p>
            </div>
          </div>
          <SheetCloseButton onClick={onClose} />
        </div>

        {duree != null && items.length > 0 && (
          <div className="shrink-0 px-5 pb-3">
            <Segmented
              fill
              value={showAll ? "all" : "this"}
              onChange={(k) => setShowAll(k === "all")}
              items={[
                { key: "this", label: `Vol de ${DUREE_LABELS[duree] ?? `${duree} min`}`, count: forThis.length },
                { key: "all", label: "Tous", count: items.length },
              ]}
            />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-st-line-soft">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-st-muted">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-st-text-2">Aucun itinéraire enregistré.</p>
              {canManage && (
                <Link href="/admin/itineraires" className="mt-2 inline-block text-[13px] font-semibold text-st-ink hover:underline">
                  Créer des itinéraires
                </Link>
              )}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-st-text-2">Aucun itinéraire pour un vol de {duree} min.</p>
              <button type="button" onClick={() => setShowAll(true)} className="mt-2 cursor-pointer text-[13px] font-semibold text-st-ink hover:underline">
                Voir tous les itinéraires
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-st-line-soft">
              {filtered.map((itin) => (
                <li key={itin.id}>
                  <button
                    type="button"
                    onClick={() => onApply(itin)}
                    className="flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-st-surface"
                  >
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-semibold text-st-text">{itin.nom}</span>
                        {itin.duree_estimee != null && (
                          <Badge size="sm" tone="neutral">{DUREE_LABELS[itin.duree_estimee] ?? `${itin.duree_estimee} min`}</Badge>
                        )}
                      </span>
                      {itin.waypoints.length > 0 && (
                        <RoutePath points={itin.waypoints.map((w) => w.nom || "?")} className="text-[12px] [&_b]:font-medium" />
                      )}
                      {itin.notes && <span className="block truncate text-[11.5px] text-st-muted">{itin.notes}</span>}
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-st-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {canManage && items.length > 0 && (
          <div className="shrink-0 border-t border-st-line-soft px-5 py-3 text-right">
            <Link href="/admin/itineraires" className="text-[12.5px] font-semibold text-st-ink hover:underline">Gérer les itinéraires</Link>
          </div>
        )}
      </div>
    </div>
  );
}
