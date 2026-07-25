"use client";

import dynamic from "next/dynamic";
import { MapPin, Maximize2, Navigation, ChevronDown, Zap, Save, Send, Copy, Loader2 } from "lucide-react";
import type { WaypointDraft } from "@/components/admin/AdminRouteEditor";
import { ROUTE_STATUS_CONFIG, type DrawerReservation } from "./types";

const AdminRouteEditorDynamic = dynamic(
  () => import("@/components/admin/AdminRouteEditor").then(m => ({ default: m.AdminRouteEditor })),
  { ssr: false, loading: () => <div className="h-[280px] rounded-lg bg-secondary animate-pulse" /> }
);

export function RouteSection({
  reservation,
  routeDraft, setRouteDraft,
  routeComment, setRouteComment,
  proposalLoaded,
  localRouteStatus,
  localRouteFeedback,
  routeStats,
  isPending,
  foreFlightCopied,
  onSave, onSend, onCopyForeFlight, onOpenItineraires, onFullscreen,
}: {
  reservation: DrawerReservation;
  routeDraft: WaypointDraft[];
  setRouteDraft: (wps: WaypointDraft[]) => void;
  routeComment: string;
  setRouteComment: (v: string) => void;
  proposalLoaded: boolean;
  localRouteStatus: string | null;
  localRouteFeedback: string | null;
  routeStats: { distKm: number; totalMin: number } | null;
  isPending: boolean;
  foreFlightCopied: boolean;
  onSave: () => void;
  onSend: () => void;
  onCopyForeFlight: () => void;
  onOpenItineraires: () => void;
  onFullscreen: () => void;
}) {
  const isPerso = reservation.type_resa === "perso";
  const routeStatusCfg = localRouteStatus ? ROUTE_STATUS_CONFIG[localRouteStatus] : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] flex items-center gap-1.5">
          <MapPin size={11} />
          Route
        </p>
        <div className="flex items-center gap-2">
          {routeStatusCfg && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${routeStatusCfg.color}`}>
              {routeStatusCfg.label}
            </span>
          )}
          <button
            onClick={onFullscreen}
            title="Agrandir la carte"
            className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      {isPerso && routeStats && (
        <div className="flex items-center gap-3 mb-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 text-[11px]">
          <span className="flex items-center gap-1 text-foreground font-semibold">
            <Zap size={11} className="text-primary" />
            ~{routeStats.totalMin} min · {routeStats.distKm} km
          </span>
          <span className="text-muted-foreground">estimé depuis la route tracée</span>
        </div>
      )}

      <button
        type="button"
        onClick={onOpenItineraires}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 mb-2 rounded-lg border border-border bg-secondary hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-2">
          <Navigation size={12} className="text-primary shrink-0" />
          <span className="text-xs font-semibold text-foreground">Itinéraire enregistré</span>
        </div>
        <ChevronDown size={11} className="text-muted-foreground group-hover:text-primary transition-colors" />
      </button>

      {!proposalLoaded ? (
        <div className="h-[280px] rounded-lg bg-secondary animate-pulse" />
      ) : (
        <AdminRouteEditorDynamic waypoints={routeDraft} onChange={setRouteDraft} height="280px" />
      )}

      <textarea
        value={routeComment}
        onChange={e => setRouteComment(e.target.value)}
        rows={2}
        placeholder="Message pour le client (optionnel)…"
        className="w-full mt-2 px-2.5 py-2 rounded-lg border border-input bg-background text-xs resize-none focus:outline-none focus:ring-1 focus:ring-navy/30 placeholder:text-muted-foreground"
      />

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <button
          onClick={onSave}
          disabled={isPending || routeDraft.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-semibold hover:brightness-90 transition-colors disabled:opacity-40 cursor-pointer"
        >
          {isPending ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
          Sauvegarder
        </button>
        <button
          onClick={onSend}
          disabled={isPending || routeDraft.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:brightness-90 transition-colors disabled:opacity-40 cursor-pointer"
        >
          {isPending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          {localRouteStatus ? "Renvoyer au client" : "Envoyer au client"}
        </button>
        <button
          onClick={onCopyForeFlight}
          disabled={routeDraft.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-40 cursor-pointer"
        >
          <Copy size={11} />
          {foreFlightCopied ? "Copié !" : "ForeFlight"}
        </button>
      </div>

      {localRouteStatus === "modification_requested" && localRouteFeedback && (
        <div className="mt-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">Message du client</p>
          <p className="text-xs text-amber-700 leading-relaxed">{localRouteFeedback}</p>
        </div>
      )}
    </div>
  );
}
