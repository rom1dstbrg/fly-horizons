"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Navigation } from "lucide-react";
import type { Itineraire } from "@/lib/actions/itineraires";
import { Button, SheetCloseButton } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import { applyFilter, aroundFilter, dureeMax, FilterBar, fullFilter, ItinerairePreview, ItineraireRows, type DureeFilter } from "./ItineraireParts";
import { useScrollLock, useSwipeToClose } from "@/components/pilote/studio/sheet-gestures";

// « Charger un itinéraire » (maquette validée le 27/09) : depuis l'onglet Route
// d'une réservation, l'éditeur plein écran, le formulaire d'annonce. Tous les
// itinéraires du pilote ; depuis un vol de durée connue, le filtre démarre à
// ± 15 min autour de cette durée (vidable). Aperçu avant de charger.
// Bureau : fenêtre centrée à deux colonnes ; téléphone : feuille du bas.

function initialFilter(max: number, duree?: number | null): DureeFilter {
  return duree ? aroundFilter(duree, max) : fullFilter(max);
}

export function ItinerairePicker({ open, onClose, items, loading, onApply, duree, context }: {
  open: boolean;
  onClose: () => void;
  items: Itineraire[];
  loading: boolean;
  onApply: (itin: Itineraire) => void;
  /** Durée du vol (min) : pré-remplit le filtre. */
  duree?: number | null;
  /** Ligne sous le titre (ex. « Vol de Marie D. · sam. 4 oct. · 60 min »). */
  context?: string;
}) {
  const max = dureeMax(items);
  const [filter, setFilter] = useState<DureeFilter>(() => initialFilter(max, duree));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setFilter(initialFilter(max, duree)); setSelectedId(null); }
  }
  // La liste arrive après l'ouverture : on recale la plage sur la vraie durée max.
  const [prevMax, setPrevMax] = useState(max);
  if (max !== prevMax) {
    setPrevMax(max);
    setFilter(initialFilter(max, duree));
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const shown = useMemo(
    () => [...applyFilter(items, filter, max)].sort((a, b) => (a.duree_estimee ?? 9999) - (b.duree_estimee ?? 9999)),
    [items, filter, max],
  );
  const selected = shown.find((i) => i.id === selectedId) ?? shown[0] ?? null;

  useScrollLock(open);
  const swipeRef = useSwipeToClose(onClose, { enabled: open });

  if (!open) return null;

  return (
    <div className="pilote-studio fixed inset-0 z-[2000] flex items-end justify-center bg-st-ink/30 font-sans backdrop-blur-[1.5px] motion-safe:animate-in motion-safe:fade-in sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={swipeRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="itin-picker-title"
        onClick={(e) => e.stopPropagation()}
        className={cn("flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[26px] bg-white pb-[env(safe-area-inset-bottom)] text-st-text shadow-st-panel motion-safe:animate-in motion-safe:slide-in-from-bottom-4 sm:rounded-[20px] sm:pb-0", items.length > 0 ? "sm:h-[min(820px,92dvh)] sm:max-w-[1180px]" : "sm:max-w-[480px]")}
      >
        <div className="mx-auto mt-2.5 h-1 w-[38px] shrink-0 rounded-full bg-st-line-strong sm:hidden" />
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-3 sm:pt-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-st-surface text-st-ink">
              <Navigation size={17} />
            </span>
            <div className="min-w-0">
              <h2 id="itin-picker-title" className="text-base font-semibold">Charger un itinéraire</h2>
              {context && <p className="truncate text-[12px] text-st-muted">{context}</p>}
            </div>
          </div>
          <SheetCloseButton onClick={onClose} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center border-t border-st-line-soft py-16 text-st-muted">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="border-t border-st-line-soft px-5 py-12 text-center">
            <p className="text-sm text-st-text-2">Vous n&apos;avez encore aucun itinéraire enregistré.</p>
            <Link href="/pilote/itineraires" className="mt-2 inline-block text-[13px] font-semibold text-st-ink hover:underline">
              Créer un itinéraire
            </Link>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-st-line-soft sm:grid sm:grid-cols-[340px_minmax(0,1fr)] sm:grid-rows-[minmax(0,1fr)] sm:overflow-hidden">
              <div className="flex min-h-0 flex-col border-st-line-soft max-sm:border-b sm:border-r">
                <FilterBar filter={filter} onChange={setFilter} max={max} total={items.length} shown={shown.length} />
                {shown.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-st-text-2">Aucun itinéraire dans cette plage de durée.</p>
                    <button type="button" onClick={() => setFilter(fullFilter(max))} className="mt-2 cursor-pointer text-[13px] font-semibold text-st-ink hover:underline">
                      Voir tous les itinéraires
                    </button>
                  </div>
                ) : (
                  <div className="max-h-[260px] overflow-y-auto sm:max-h-none sm:min-h-0 sm:flex-1">
                    <ItineraireRows items={shown} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
                  </div>
                )}
              </div>
              {selected && (
                <ItinerairePreview itin={selected} showUses={false} className="max-sm:h-[420px]" />
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3 border-t border-st-line-soft px-5 py-3">
              <p className="min-w-0 flex-1 text-[12px] text-st-muted">Remplace la route en cours. Vous pourrez l&apos;ajuster ensuite.</p>
              <Button onClick={() => selected && onApply(selected)} disabled={!selected}>Charger</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
