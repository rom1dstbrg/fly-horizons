"use client";

import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { useEffect } from "react";
import { Route as RouteIcon, Copy, Check, Save, Send, X, Navigation, Trash2, MessageSquareWarning } from "lucide-react";
import type { WaypointDraft } from "@/components/admin/AdminRouteEditor";
import { Badge, Button, Textarea } from "@/components/pilote/studio";
import { toForeFlight } from "@/lib/foreflight";
import type { DrawerReservation } from "./types";
import type { PendingAction } from "./ConfirmActionDialog";

// ── Onglet Route + éditeur plein écran (maquette v2 validée le 24/09) ──────
// Dans le tiroir : un aperçu (carte, puis la liste des points dessous) et un
// seul bouton « Tracer / modifier la route ». Le tracé se fait en plein écran,
// carte en grand et liste des points à gauche : trop à l'étroit dans le tiroir
// sur un petit écran de PC.

const AdminRouteEditorDynamic = dynamic(
  () => import("@/components/admin/AdminRouteEditor").then((m) => ({ default: m.AdminRouteEditor })),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-st-surface" /> },
);
const RouteMapReadOnlyDynamic = dynamic(() => import("@/components/maps/RouteMapReadOnly"), {
  ssr: false,
  loading: () => <div className="h-[340px] animate-pulse rounded-[14px] bg-st-surface" />,
});

const STATUS: Record<string, { label: string; tone: "warning" | "success" | "neutral" }> = {
  pending: { label: "Envoyée, en attente", tone: "warning" },
  sent: { label: "Envoyée, en attente", tone: "warning" },
  accepted: { label: "Validée par le client", tone: "success" },
  validated: { label: "Validée par le client", tone: "success" },
  modification_requested: { label: "Modification demandée", tone: "warning" },
};

type RouteApi = {
  routeDraft: WaypointDraft[];
  setRouteDraft: (w: WaypointDraft[]) => void;
  routeComment: string;
  setRouteComment: (v: string) => void;
  proposalLoaded: boolean;
  localRouteStatus: string | null;
  localRouteFeedback: string | null;
  routeStats: { distKm: number; totalMin: number } | null;
  isPending: boolean;
  foreFlightCopied: boolean;
  saveRoute: () => void;
  sendRoute: () => void;
  copyForeFlight: () => void;
};

const valid = (w: WaypointDraft[]) =>
  w.map((p) => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lng), nom: p.nom })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

function PointList({ points, onRemove }: { points: WaypointDraft[]; onRemove?: (i: number) => void }) {
  const rows = [{ nom: "EBCI", sub: "départ", i: -1 }, ...points.map((p, i) => ({ nom: p.nom?.trim() || `Point ${i + 1}`, sub: "", i, p })), { nom: "EBCI", sub: "retour", i: -2 }];
  return (
    <ol className="divide-y divide-st-line-soft">
      {rows.map((row, k) => {
        const p = "p" in row ? row.p : null;
        const lat = p ? parseFloat(p.lat) : NaN;
        const lng = p ? parseFloat(p.lng) : NaN;
        return (
          <li key={k} className="flex items-center gap-3 py-2 text-[13px]">
            <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-st-ink text-[10.5px] font-semibold text-white">{k + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-[550] text-st-text">{row.nom}</span>
              {(row.sub || Number.isFinite(lat)) && (
                <span className="block truncate font-mono text-[11px] text-st-muted">{row.sub || toForeFlight(lat, lng)}</span>
              )}
            </span>
            {onRemove && row.i >= 0 && (
              <button type="button" onClick={() => onRemove(row.i)} aria-label={`Retirer ${row.nom}`} className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-[9px] text-st-muted transition-colors hover:bg-st-bad-soft hover:text-st-bad">
                <Trash2 size={14} />
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ClientFeedback({ text }: { text: string }) {
  return (
    <div className="flex gap-2.5 rounded-[14px] bg-st-warn-soft px-3 py-2.5">
      <MessageSquareWarning size={16} className="mt-0.5 shrink-0 text-st-warn" />
      <div>
        <p className="text-[12px] font-semibold text-st-warn">Message du client</p>
        <p className="text-[12.5px] leading-snug text-st-text-2">{text}</p>
      </div>
    </div>
  );
}

export function RouteTab({ reservation: r, route, onOpenEditor, onOpenItineraires }: {
  reservation: DrawerReservation;
  route: RouteApi;
  onOpenEditor: () => void;
  onOpenItineraires: () => void;
}) {
  const productRoute = r.products?.route_waypoints;
  if (productRoute && productRoute.length > 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-st-text">Itinéraire de l&apos;offre</p>
          <Badge tone="neutral">Fixé</Badge>
        </div>
        <RouteMapReadOnlyDynamic waypoints={productRoute} height="340px" />
        <p className="text-[12px] text-st-muted">Itinéraire fixé par l&apos;offre achetée : connu du client avant la réservation, non modifiable ici.</p>
      </div>
    );
  }

  const status = route.localRouteStatus ? STATUS[route.localRouteStatus] : null;
  const pts = valid(route.routeDraft);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-st-text">Route</p>
        {status ? <Badge tone={status.tone}>{status.label}</Badge> : <Badge tone="neutral">Pas encore envoyée</Badge>}
      </div>
      {route.localRouteStatus === "modification_requested" && route.localRouteFeedback && <ClientFeedback text={route.localRouteFeedback} />}

      {!route.proposalLoaded ? (
        <div className="h-[340px] animate-pulse rounded-[14px] bg-st-surface" />
      ) : pts.length > 0 ? (
        <div className="overflow-hidden rounded-[14px]">
          <RouteMapReadOnlyDynamic waypoints={pts} height="340px" />
        </div>
      ) : (
        <div className="grid h-[120px] place-items-center rounded-[14px] border border-dashed border-st-line-strong text-[13px] text-st-muted">Aucune route tracée</div>
      )}

      {pts.length > 0 && <PointList points={route.routeDraft} />}
      {route.routeStats && (
        <p className="text-[12px] text-st-muted">≈ {route.routeStats.totalMin} min · {route.routeStats.distKm} km, estimé depuis la route tracée</p>
      )}

      <Button fullWidth onClick={onOpenEditor}>
        <RouteIcon /> {pts.length > 0 ? "Modifier la route" : "Tracer la route"}
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" onClick={onOpenItineraires}><Navigation /> Itinéraires types</Button>
        <Button variant="secondary" size="sm" onClick={route.copyForeFlight} disabled={pts.length === 0}>
          {route.foreFlightCopied ? <Check /> : <Copy />}
          {route.foreFlightCopied ? "Copié" : "Pour ForeFlight"}
        </Button>
      </div>
      <p className="text-[12px] text-st-muted">La route part au client avec la confirmation du créneau, ou depuis l&apos;éditeur.</p>

      {r.type_resa === "perso" && r.waypoints && r.waypoints.length > 0 && (
        <div className="rounded-[14px] bg-st-surface p-3">
          <p className="mb-1 text-[12px] font-semibold text-st-text">Route demandée par le client ({r.waypoints.length} points)</p>
          <ul className="space-y-0.5 font-mono text-[11.5px] text-st-text-2">
            {r.waypoints.map((wp, i) => <li key={i}>→ {wp.nom ?? `${wp.lat.toFixed(5)}, ${wp.lng.toFixed(5)}`}</li>)}
            {(r.stopovers ?? []).map((so) => <li key={so.icao} className="text-st-gold-text">⊕ {so.icao}, {so.nom} (+{so.taxe} €)</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

// Éditeur plein écran : liste des points à gauche (en bas au téléphone), carte en grand.
export function RouteEditorFullscreen({ open, reservation: r, route, onClose, onOpenItineraires, ask }: {
  open: boolean;
  reservation: DrawerReservation;
  route: RouteApi;
  onClose: () => void;
  onOpenItineraires: () => void;
  ask: (a: PendingAction) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  // Ouvert seulement après un clic : on est forcément côté navigateur.
  if (!open || typeof document === "undefined") return null;

  const pts = valid(route.routeDraft);
  const prenom = r.clients?.prenom?.trim() || "Le client";
  const dateLabel = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" });
  const sent = !!route.localRouteStatus;
  // Avant la confirmation du créneau, la route part avec la confirmation :
  // l'envoi séparé reste possible mais discret (retour de Romain, 24/09). Après,
  // il sert à renvoyer une route modifiée pour que le client la valide.
  const beforeConfirm = ["demande_recue", "en_attente", "acompte_recu", "date_confirmee", "payment_pending"].includes(r.statut);
  const askSend = () =>
    ask({
      title: sent ? "Renvoyer la route au client ?" : "Envoyer la route au client maintenant ?",
      consequences: [
        `${prenom} reçoit la route par email et peut la valider ou demander une modification.`,
        ...(beforeConfirm && !sent ? ["Sans cet envoi, elle partirait de toute façon avec la confirmation du créneau."] : []),
      ],
      confirmLabel: "Envoyer",
      run: route.sendRoute,
    });

  return createPortal(
    <div className="pilote-studio fixed inset-0 z-[200] flex flex-col bg-st-bg font-sans text-st-text" role="dialog" aria-modal="true" aria-label="Éditeur de route">
      <div className="flex h-[60px] shrink-0 items-center gap-2.5 border-b border-st-line bg-white px-4 pt-[env(safe-area-inset-top)] sm:px-5">
        <p className="min-w-0 truncate text-[15px] font-semibold">
          Route <span className="font-medium text-st-muted">· {r.clients?.prenom} {r.clients?.nom} · {dateLabel} · {r.duree} min</span>
        </p>
        <span className="flex-1" />
        <Button onClick={route.saveRoute} loading={route.isPending} disabled={pts.length === 0}>
          <Save /> Enregistrer
        </Button>
        <button type="button" onClick={onClose} aria-label="Fermer l'éditeur" className="grid h-[38px] w-[38px] shrink-0 cursor-pointer place-items-center rounded-[11px] border border-st-line bg-white text-st-text-2 transition-colors hover:bg-st-surface">
          <X size={17} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col-reverse lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
        <div className="min-h-0 space-y-3 overflow-y-auto border-st-line bg-white p-4 max-lg:max-h-[45dvh] max-lg:border-t lg:border-r">
          {route.localRouteStatus === "modification_requested" && route.localRouteFeedback && <ClientFeedback text={route.localRouteFeedback} />}
          <PointList points={route.routeDraft} onRemove={(i) => route.setRouteDraft(route.routeDraft.filter((_, k) => k !== i))} />
          {route.routeStats && (
            <p className="rounded-[12px] bg-st-surface px-3 py-2 text-[12.5px] text-st-text-2">≈ {route.routeStats.totalMin} min · {route.routeStats.distKm} km</p>
          )}
          {/* Envoi au client : discret avant la confirmation, bouton secondaire après. */}
          {beforeConfirm && !sent ? (
            <p className="text-[12px] leading-snug text-st-muted">
              La route partira au client avec la confirmation du créneau.{" "}
              <button type="button" onClick={askSend} disabled={pts.length === 0} className="cursor-pointer font-[550] text-st-ink hover:underline disabled:opacity-40">
                L&apos;envoyer maintenant
              </button>
            </p>
          ) : (
            <div className="space-y-1.5">
              <Button variant="secondary" size="sm" fullWidth onClick={askSend} disabled={pts.length === 0}>
                <Send /> {sent ? "Renvoyer au client" : "Envoyer au client"}
              </Button>
              <p className="text-[11.5px] text-st-muted">Après une modification, renvoyez-la pour que le client la valide.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" onClick={onOpenItineraires}><Navigation /> Itinéraires types</Button>
            <Button variant="secondary" size="sm" onClick={route.copyForeFlight} disabled={pts.length === 0}>
              {route.foreFlightCopied ? <Check /> : <Copy />}{route.foreFlightCopied ? "Copié" : "ForeFlight"}
            </Button>
          </div>
          <label className="block">
            <span className="mb-1 block text-[12px] font-[550] text-st-text-2">Message au client (optionnel)</span>
            <Textarea value={route.routeComment} onChange={(e) => route.setRouteComment(e.target.value)} rows={3} placeholder="Joint à l'email de la route…" />
          </label>
          <p className="text-[11.5px] text-st-muted">Clic sur la carte : ajouter un point. Glisser un point : le déplacer.</p>
        </div>
        <div className="relative min-h-[45dvh] flex-1 lg:h-full lg:min-h-0">
          {route.proposalLoaded ? (
            <AdminRouteEditorDynamic
              waypoints={route.routeDraft}
              onChange={route.setRouteDraft}
              clientWaypoints={r.type_resa === "perso" ? r.waypoints ?? [] : []}
              stopovers={r.type_resa === "perso" ? r.stopovers ?? [] : []}
              height="fill"
            />
          ) : (
            <div className="h-full w-full animate-pulse bg-st-surface" />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
