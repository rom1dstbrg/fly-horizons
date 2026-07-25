"use client";

import { X, Loader2, Navigation, Clock } from "lucide-react";
import type { Itineraire } from "@/lib/actions/itineraires";

const DUREE_LABELS: Record<number, string> = { 30: "30'", 60: "1h", 90: "1h30", 120: "2h" };
const DUREE_COLORS: Record<number, { badge: string; bar: string }> = {
  30:  { badge: "bg-sky-100 text-sky-700",         bar: "bg-sky-400"     },
  60:  { badge: "bg-primary/10 text-primary",      bar: "bg-primary"     },
  90:  { badge: "bg-violet-100 text-violet-700",   bar: "bg-violet-400"  },
  120: { badge: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-400" },
};

export function ItinerairesModal({
  open, onClose, duree, items, loading, showAll, setShowAll, onApply,
}: {
  open: boolean;
  onClose: () => void;
  duree?: number;
  items: Itineraire[];
  loading: boolean;
  showAll: boolean;
  setShowAll: (v: boolean) => void;
  onApply: (itin: Itineraire) => void;
}) {
  if (!open) return null;

  const filtered = showAll || !duree ? items : items.filter(it => it.duree_estimee === duree);

  return (
    <div className="fixed inset-0 bg-black/50 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl border border-border flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Navigation size={15} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground">Itinéraires enregistrés</h3>
              <p className="text-[10px] text-muted-foreground">Cliquez pour charger sur la carte</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {duree != null && (
          <div className="px-5 py-2.5 border-b border-border shrink-0 flex items-center justify-between bg-muted/30">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Clock size={10} />
              {showAll
                ? `Tous les itinéraires (${items.length})`
                : `Vol ${duree} min — ${items.filter(it => it.duree_estimee === duree).length} itinéraire${items.filter(it => it.duree_estimee === duree).length !== 1 ? "s" : ""}`
              }
            </p>
            <button
              onClick={() => setShowAll(!showAll)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${showAll ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
            >
              {showAll ? "Filtrer" : "Afficher tout"}
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center px-5">
              <p className="text-sm text-muted-foreground">Aucun itinéraire enregistré</p>
              <a href="/admin/itineraires" className="mt-2 text-xs font-bold text-primary hover:underline block">
                Créer des itinéraires →
              </a>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center px-5">
              <p className="text-sm text-muted-foreground">Aucun itinéraire pour {duree} min</p>
              <button onClick={() => setShowAll(true)} className="mt-2 text-xs font-bold text-primary hover:underline cursor-pointer">
                Afficher tous les itinéraires
              </button>
            </div>
          ) : (
            filtered.map((itin, i) => {
              const col = itin.duree_estimee ? DUREE_COLORS[itin.duree_estimee] : null;
              return (
                <button
                  key={itin.id}
                  type="button"
                  onClick={() => onApply(itin)}
                  className={`w-full text-left flex items-stretch hover:bg-primary/5 transition-colors cursor-pointer ${i < filtered.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className={`w-1 shrink-0 ${col ? col.bar : "bg-muted-foreground/20"}`} />
                  <div className="flex-1 min-w-0 px-4 py-3">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <p className="text-sm font-bold text-foreground leading-snug">{itin.nom}</p>
                      {itin.duree_estimee && col && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${col.badge}`}>
                          {DUREE_LABELS[itin.duree_estimee]}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-1 gap-y-0.5">
                      {itin.waypoints.slice(0, 5).map((wp, wi) => (
                        <span key={wi} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          {wi > 0 && <span className="text-muted-foreground/40">›</span>}
                          {wp.nom}
                        </span>
                      ))}
                      {itin.waypoints.length > 5 && (
                        <span className="text-[10px] text-muted-foreground/60">+{itin.waypoints.length - 5}</span>
                      )}
                    </div>
                    {itin.notes && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1 line-clamp-1 italic">{itin.notes}</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
