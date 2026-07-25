"use client";

import { useState, useTransition, useEffect } from "react";
import {
  getRouteProposals,
  saveFinalWaypoints,
  sendRouteProposalToClient,
  updateReservationAllFields,
} from "@/lib/actions/reservation-edit";
import { optimizeWaypoints } from "@/lib/route-optimize";
import { toForeFlight } from "@/lib/foreflight";
import type { WaypointDraft } from "@/components/admin/AdminRouteEditor";
import type { DrawerReservation } from "../types";

const EBCI_GEO = { lat: 50.4592, lng: 4.4538 };
const VSM_SPEED_KMH = 185.2;
const VSM_OBS_MIN_PP = 4;

// Estimation distance/durée d'une route (vol sur mesure) — même formule que /vol-sur-mesure
function calcRouteStats(wps: WaypointDraft[]): { distKm: number; totalMin: number } | null {
  const valid = wps
    .map(wp => ({ lat: parseFloat(wp.lat), lng: parseFloat(wp.lng) }))
    .filter(wp => !isNaN(wp.lat) && !isNaN(wp.lng));
  if (!valid.length) return null;
  const pts = [EBCI_GEO, ...valid, EBCI_GEO];
  let dist = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    dist += 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
  const distKm = Math.round(dist * 10) / 10;
  const transitMin = Math.round((distKm / VSM_SPEED_KMH) * 60);
  return { distKm, totalMin: transitMin + valid.length * VSM_OBS_MIN_PP };
}

export function useRouteProposal(
  reservation: DrawerReservation | null,
  showFeedback: (msg: string, ok?: boolean) => void,
  onFieldsChange?: (id: string, fields: Partial<DrawerReservation>) => void
) {
  const isPerso = reservation?.type_resa === "perso";
  const [routeDraft, setRouteDraft] = useState<WaypointDraft[]>([]);
  const [routeComment, setRouteComment] = useState("");
  const [proposalLoaded, setProposalLoaded] = useState(false);
  const [localRouteStatus, setLocalRouteStatus] = useState<string | null>(null);
  const [localRouteFeedback, setLocalRouteFeedback] = useState<string | null>(null);
  const [lastSentWaypoints, setLastSentWaypoints] = useState<WaypointDraft[] | null>(null);
  const [foreFlightCopied, setForeFlightCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function reset(res: DrawerReservation | null) {
    setRouteDraft([]);
    setRouteComment("");
    setProposalLoaded(false);
    setLocalRouteStatus(res?.route_status ?? null);
    setLocalRouteFeedback(res?.route_feedback ?? null);
    setLastSentWaypoints(null);
  }

  // Charge la dernière proposition envoyée (standard ET perso partagent route_proposals),
  // avec fallback sur final_waypoints, puis (perso) sur les waypoints/escales demandés par le client.
  useEffect(() => {
    if (!reservation || proposalLoaded) return;
    getRouteProposals(reservation.id).then(res => {
      const proposals = (res.data ?? []) as Array<{
        waypoints: Array<{ lat: number; lng: number; nom?: string }>;
        admin_comment: string | null;
        status: string;
        client_comment: string | null;
      }>;
      if (proposals.length > 0) {
        const latest = proposals[0];
        const drafts = latest.waypoints.map(wp => ({ lat: String(wp.lat), lng: String(wp.lng), nom: wp.nom ?? "" }));
        setRouteDraft(drafts);
        setLastSentWaypoints(drafts);
        setRouteComment(latest.admin_comment ?? "");
        const statusMap: Record<string, string> = { pending: "sent", accepted: "validated", modification_requested: "modification_requested" };
        setLocalRouteStatus(statusMap[latest.status] ?? null);
        setLocalRouteFeedback(latest.status === "modification_requested" ? latest.client_comment : null);
      } else if (reservation.final_waypoints?.length) {
        setRouteDraft(reservation.final_waypoints.map(wp => ({ lat: String(wp.lat), lng: String(wp.lng), nom: wp.nom ?? "" })));
      } else if (isPerso) {
        const raw = [
          ...(reservation.waypoints ?? []).map(wp => ({ lat: String(wp.lat), lng: String(wp.lng), nom: wp.nom ?? "" })),
          ...(reservation.stopovers ?? [])
            .filter(so => so.lat != null && so.lng != null)
            .map(so => ({ lat: String(so.lat!), lng: String(so.lng!), nom: so.icao })),
        ];
        if (raw.length >= 2) {
          const parsed = raw
            .map(wp => ({ lat: parseFloat(wp.lat), lng: parseFloat(wp.lng), nom: wp.nom, _orig: wp }))
            .filter(wp => !isNaN(wp.lat) && !isNaN(wp.lng));
          setRouteDraft(optimizeWaypoints(parsed).map(wp => wp._orig));
        } else {
          setRouteDraft(raw);
        }
      }
      setProposalLoaded(true);
    });
  }, [reservation?.id, proposalLoaded, isPerso, reservation?.final_waypoints, reservation?.waypoints, reservation?.stopovers]);

  function parsedWaypoints() {
    return routeDraft
      .map(wp => ({ lat: parseFloat(wp.lat), lng: parseFloat(wp.lng), nom: wp.nom || undefined }))
      .filter(wp => !isNaN(wp.lat) && !isNaN(wp.lng));
  }

  // La route actuelle a-t-elle déjà été envoyée telle quelle ? (sert à décider si
  // "Confirmer date + heure" doit l'envoyer automatiquement — voir §1bis du plan)
  function hasUnsentChanges(): boolean {
    const current = parsedWaypoints();
    if (current.length === 0) return false;
    if (!lastSentWaypoints) return true;
    const sentParsed = lastSentWaypoints
      .map(wp => ({ lat: parseFloat(wp.lat), lng: parseFloat(wp.lng), nom: wp.nom || undefined }))
      .filter(wp => !isNaN(wp.lat) && !isNaN(wp.lng));
    return JSON.stringify(current) !== JSON.stringify(sentParsed);
  }

  function saveRoute() {
    if (!reservation) return;
    const parsed = parsedWaypoints();
    if (parsed.length === 0) { showFeedback("Aucun point à sauvegarder", false); return; }
    startTransition(async () => {
      const result = await saveFinalWaypoints(reservation.id, parsed);
      if (result.error) { showFeedback("Erreur : " + result.error, false); return; }
      showFeedback("Route sauvegardée ✓");
    });
  }

  function sendRoute() {
    if (!reservation) return;
    const parsed = parsedWaypoints();
    if (parsed.length === 0) { showFeedback("Ajoutez au moins un point sur la carte", false); return; }
    startTransition(async () => {
      // Vol sur mesure : la route détermine la durée/provision — on les recalcule avant l'envoi
      // pour que le lien de paiement envoyé ensuite reflète le bon montant.
      if (isPerso && reservation.acompte != null) {
        const stats = calcRouteStats(routeDraft);
        if (stats) {
          const newAcompte = Math.round((reservation.acompte / reservation.duree) * stats.totalMin);
          await updateReservationAllFields(reservation.id, {}, { duree: stats.totalMin, acompte: newAcompte });
          onFieldsChange?.(reservation.id, { duree: stats.totalMin, acompte: newAcompte });
        }
      }
      const result = await sendRouteProposalToClient(reservation.id, parsed, routeComment);
      if (result.error) { showFeedback("Erreur : " + result.error, false); return; }
      setLocalRouteStatus("sent");
      setLastSentWaypoints(routeDraft);
      showFeedback(result.emailError ? "Route enregistrée · email non envoyé, réessayez" : "Route envoyée au client ✓", !result.emailError);
    });
  }

  function copyForeFlight() {
    const valid = parsedWaypoints();
    if (valid.length === 0) return;
    const text = ["EBCI", ...valid.map(wp => toForeFlight(wp.lat, wp.lng)), "EBCI"].join(" ");
    navigator.clipboard.writeText(text).then(() => {
      setForeFlightCopied(true);
      setTimeout(() => setForeFlightCopied(false), 2000);
    });
  }

  const routeStats = isPerso ? calcRouteStats(routeDraft) : null;

  return {
    routeDraft, setRouteDraft,
    routeComment, setRouteComment,
    proposalLoaded,
    localRouteStatus, setLocalRouteStatus,
    localRouteFeedback,
    foreFlightCopied,
    isPending,
    reset,
    parsedWaypoints,
    hasUnsentChanges,
    saveRoute,
    sendRoute,
    copyForeFlight,
    routeStats,
  };
}
