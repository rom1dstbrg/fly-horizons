"use client";

import { useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  updateStatutReservationPerso,
  sendCustomEmail,
  sendRescheduleInvite,
  setAvionReserve,
  recordCashPayment,
} from "@/lib/actions/reservations";
import {
  updateReservationAllFields,
  saveFinalWaypoints,
  sendRouteProposalToClient,
  getReservationHistory,
  getRouteProposals,
} from "@/lib/actions/reservation-edit";
import { toForeFlight } from "@/lib/foreflight";
import { optimizeWaypoints } from "@/lib/route-optimize";
import { deleteReservationPerso } from "@/lib/actions/delete";
import { AdminBadge, STATUT_PERSO } from "@/components/admin/ui/AdminBadge";
import { AdminRowActions } from "@/components/admin/ui/AdminRowActions";
import {
  X, User, Phone, Mail, Calendar, Clock, Users, Weight,
  CreditCard, Loader2, Send, Check, MapPin,
  Sparkles, RotateCcw, Zap, Wind, AlertTriangle,
  CheckCircle2, XCircle, ChevronRight, Copy, Plus, Trash2,
  List, Map as MapIcon, ArrowUpDown, ExternalLink, Banknote,
  Calculator, ChevronDown, Ticket,
} from "lucide-react";
import dynamic from "next/dynamic";

const AdminRouteEditor = dynamic(
  () => import("@/components/admin/AdminRouteEditor").then(m => m.AdminRouteEditor),
  { ssr: false, loading: () => <div className="w-full rounded-lg border border-border bg-secondary animate-pulse" style={{ height: "280px" }} /> }
);

type Waypoint = { lat: number; lng: number; nom?: string };
type Stopover = { icao: string; nom: string; taxe: number; lat?: number; lng?: number };
export type Reservation = {
  id: string;
  date_vol: string;
  heure_vol: string | null;
  duree: number;
  passagers: number;
  poids_total: number | null;
  statut: string;
  acompte: number | null;
  paye: number | null;
  payment_status: string | null;
  voucher_code: string | null;
  coupon_code: string | null;
  duree_reelle?: number | null;
  remboursement?: number | null;
  distance_km: number | null;
  style_vol: "rapide" | "vues" | null;
  waypoints: Waypoint[] | null;
  final_waypoints: Waypoint[] | null;
  stopovers: Stopover[] | null;
  taxes_escales: number | null;
  commentaire: string | null;
  created_at: string;
  date_confirmee_at: string | null;
  heure_confirmee_at: string | null;
  avion_reserve?: boolean;
  clients: { id: string; prenom: string; nom: string; email: string; telephone: string | null } | null;
  route_proposals: Array<{ status: string; created_at: string }> | null;
};

type Tab = "infos" | "modifier" | "route" | "historique";

// ── Templates email ────────────────────────────────────────────────────────────
type EmailTemplate = { label: string; subject: (dateStr: string) => string; body: (prenom: string, dateStr: string) => string; includeReschedule?: boolean };
const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    label: "Report météo",
    subject: (dateStr) => `Fly Horizons — Votre vol du ${dateStr}`,
    includeReschedule: true,
    body: (prenom, dateStr) =>
`Bonjour ${prenom},

J'ai suivi les prévisions pour le ${dateStr} et les conditions ne permettent malheureusement pas de voler en sécurité. Je préfère reporter plutôt que de vous faire prendre des risques ou de vous faire passer une mauvaise expérience.

Votre provision est bien conservée, aucun frais ne vous est facturé.

Vous pouvez choisir votre nouvelle date directement depuis votre espace client en cliquant sur le bouton de report ci-dessous.

À très vite,
Romain`,
  },
  {
    label: "Vol maintenu",
    subject: (dateStr) => `Fly Horizons — Vol confirmé pour le ${dateStr}`,
    body: (prenom, dateStr) =>
`Bonjour ${prenom},

Bonne nouvelle, j'ai vérifié la météo pour le ${dateStr} et tout est au vert. Le vol est bien maintenu comme prévu.

Rendez-vous à l'aéroport de Charleroi (EBCI) 15 minutes avant l'heure convenue. N'hésitez pas si vous avez une question avant votre arrivée.

À très bientôt,
Romain`,
  },
];

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  paid:     { label: "Payé",      color: "bg-green-50 text-green-700 border border-green-200" },
  unpaid:   { label: "Non payé",  color: "bg-amber-50 text-amber-700 border border-amber-200" },
  partial:  { label: "Partiel",   color: "bg-blue-50 text-blue-700 border border-blue-200" },
  refunded: { label: "Remboursé", color: "bg-gray-50 text-gray-600 border border-gray-200" },
};

const PROPOSAL_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:               { label: "En attente",          color: "bg-amber-50 text-amber-700 border-amber-200" },
  accepted:              { label: "Acceptée ✓",          color: "bg-green-50 text-green-700 border-green-200" },
  modification_requested:{ label: "Modif. demandée",     color: "bg-red-50 text-red-700 border-red-200" },
};

const ACTION_LABELS: Record<string, string> = {
  field_changed:        "Modification",
  route_proposal_sent:  "Proposition envoyée",
  client_response:      "Réponse client",
  status_changed:       "Changement de statut",
};

const FIELD_LABELS: Record<string, string> = {
  "client.prenom":    "Prénom",
  "client.nom":       "Nom",
  "client.email":     "Email",
  "client.telephone": "Téléphone",
  date_vol:           "Date",
  heure_vol:          "Heure",
  duree:              "Durée",
  passagers:          "Passagers",
  poids_total:        "Poids total",
  acompte:            "Provision",
  paye:               "Montant payé",
  payment_status:     "Statut paiement",
  voucher_code:       "Code voucher",
  coupon_code:        "Code promo",
  commentaire:        "Remarques",
  final_waypoints:    "Route finale",
  route_proposal:     "Proposition de route",
};

type HistoryItem = {
  id: string; action: string; field: string | null; old_value: string | null;
  new_value: string | null; author: string; note: string | null; created_at: string;
};

type ProposalItem = {
  id: string; created_at: string; status: string; admin_comment: string | null;
  client_comment: string | null; waypoints: Waypoint[]; token: string;
};

type WaypointDraft = { lat: string; lng: string; nom: string };

// Calcule la durée estimée d'une route (même formule que la page vol-sur-mesure)
const EBCI_GEO = { lat: 50.4592, lng: 4.4538 };
const VSM_SPEED_KMH = 185.2;
const VSM_OBS_MIN_PP = 4;

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function InputField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      {children}
    </div>
  );
}

const inputCls = "w-full h-8 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-navy/30";

// ── Drawer principal ───────────────────────────────────────────────────────────
export function VolsPersoDrawer({
  reservation,
  onClose,
  onStatusChange,
  onFieldsChange,
}: {
  reservation: Reservation | null;
  onClose: () => void;
  onStatusChange: (id: string, statut: string) => void;
  onFieldsChange: (id: string, fields: Partial<Reservation>) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [emailPending, startEmailTransition] = useTransition();
  const [isReservePending, startReserveTransition] = useTransition();
  const [avionReserve, setAvionReserveLocal] = useState(reservation?.avion_reserve ?? false);
  const [isCashPending, startCashTransition] = useTransition();
  const [cashMontant, setCashMontant] = useState("");

  // Bilan vol
  const [bilanOpen, setBilanOpen] = useState(false);
  const [bilanDureeReelle, setBilanDureeReelle] = useState("");
  const [bilanTarifEcole, setBilanTarifEcole] = useState<number | null>(null);
  const [bilanPending, startBilanTransition] = useTransition();

  // Tab
  const [activeTab, setActiveTab] = useState<Tab>("infos");

  // Email
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [includeReschedule, setIncludeReschedule] = useState(false);

  // UI
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  // Modifier drafts
  const [draftPrenom, setDraftPrenom] = useState("");
  const [draftNom, setDraftNom] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftTelephone, setDraftTelephone] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [draftHeure, setDraftHeure] = useState("");
  const [draftDuree, setDraftDuree] = useState("");
  const [draftPassagers, setDraftPassagers] = useState("");
  const [draftPoids, setDraftPoids] = useState("");
  const [draftAcompte, setDraftAcompte] = useState("");
  const [draftPaye, setDraftPaye] = useState("");
  const [draftPaymentStatus, setDraftPaymentStatus] = useState<"paid" | "unpaid" | "partial" | "refunded">("unpaid");
  const [draftVoucherCode, setDraftVoucherCode] = useState("");
  const [draftCouponCode, setDraftCouponCode] = useState("");
  const [draftCommentaire, setDraftCommentaire] = useState("");
  const [draftStyleVol, setDraftStyleVol] = useState<"rapide" | "vues" | "">("");
  const [draftRemboursement, setDraftRemboursement] = useState("");

  // Route tab
  const [finalWpDrafts, setFinalWpDrafts] = useState<WaypointDraft[]>([]);
  const [proposalComment, setProposalComment] = useState("");
  const [routeCopied, setRouteCopied] = useState(false);
  const [routeViewMode, setRouteViewMode] = useState<"list" | "map">("map");
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [proposalsLoaded, setProposalsLoaded] = useState(false);

  // Historique
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Stats calculées depuis la route finale en cours d'édition
  const routeStats = calcRouteStats(finalWpDrafts);
  const estimatedAcompte = (routeStats && reservation?.acompte && reservation?.duree)
    ? Math.round((reservation.acompte / reservation.duree) * routeStats.totalMin)
    : null;

  // Reset on reservation change
  useEffect(() => {
    if (!reservation) return;
    setDraftPrenom(reservation.clients?.prenom ?? "");
    setDraftNom(reservation.clients?.nom ?? "");
    setDraftEmail(reservation.clients?.email ?? "");
    setDraftTelephone(reservation.clients?.telephone ?? "");
    setDraftDate(reservation.date_vol);
    setDraftHeure(reservation.heure_vol?.slice(0, 5) ?? "");
    setDraftDuree(String(reservation.duree));
    setDraftPassagers(String(reservation.passagers));
    setDraftPoids(reservation.poids_total != null ? String(reservation.poids_total) : "");
    setDraftAcompte(reservation.acompte != null ? String(reservation.acompte) : "");
    setDraftPaye(reservation.paye != null ? String(reservation.paye) : "");
    setDraftPaymentStatus((reservation.payment_status ?? "unpaid") as "paid" | "unpaid" | "partial" | "refunded");
    setDraftVoucherCode(reservation.voucher_code ?? "");
    setDraftCouponCode(reservation.coupon_code ?? "");
    setDraftCommentaire(reservation.commentaire ?? "");
    setDraftStyleVol(reservation.style_vol ?? "");
    setDraftRemboursement(reservation.remboursement != null ? String(reservation.remboursement) : "");
    setAvionReserveLocal(reservation.avion_reserve ?? false);
    setCashMontant(reservation.acompte != null ? String(reservation.acompte) : "");
    // Final waypoints: load from saved state, or fall back to client route — always optimized
    const fw = reservation.final_waypoints ?? [];
    const rawDrafts = fw.length > 0
      ? fw.map(wp => ({ lat: String(wp.lat), lng: String(wp.lng), nom: wp.nom ?? "" }))
      : [
          ...(reservation.waypoints ?? []).map(wp => ({ lat: String(wp.lat), lng: String(wp.lng), nom: wp.nom ?? "" })),
          ...(reservation.stopovers ?? [])
            .filter(so => so.lat != null && so.lng != null)
            .map(so => ({ lat: String(so.lat!), lng: String(so.lng!), nom: so.icao })),
        ];
    if (rawDrafts.length >= 2) {
      const parsed = rawDrafts
        .map(wp => ({ lat: parseFloat(wp.lat), lng: parseFloat(wp.lng), nom: wp.nom, _orig: wp }))
        .filter(wp => !isNaN(wp.lat) && !isNaN(wp.lng));
      const optimizedDrafts = parsed.length >= 2 ? optimizeWaypoints(parsed) : parsed;
      setFinalWpDrafts(optimizedDrafts.map(wp => wp._orig));
    } else {
      setFinalWpDrafts(rawDrafts);
    }
    setProposalComment("");
    setEmailOpen(false);
    setIncludeReschedule(false);
    setActiveTab("infos");
    setHistoryLoaded(false);
    setHistoryItems([]);
    setProposalsLoaded(false);
    setProposals([]);
    setBilanOpen(false);
    setBilanDureeReelle(reservation.duree_reelle != null ? String(reservation.duree_reelle) : "");
    setBilanTarifEcole(null);
  }, [reservation?.id]);

  // Lazy-load when tabs open
  useEffect(() => {
    if (activeTab !== "historique" || historyLoaded || !reservation) return;
    setHistoryLoading(true);
    getReservationHistory(reservation.id).then(res => {
      if (res.data) setHistoryItems(res.data as HistoryItem[]);
      setHistoryLoading(false);
      setHistoryLoaded(true);
    });
  }, [activeTab, historyLoaded, reservation?.id]);

  useEffect(() => {
    if (activeTab !== "route" || proposalsLoaded || !reservation) return;
    getRouteProposals(reservation.id).then(res => {
      if (res.data) setProposals(res.data as ProposalItem[]);
      setProposalsLoaded(true);
    });
  }, [activeTab, proposalsLoaded, reservation?.id]);

  // Voucher auto-fill: when paye=0 and voucher_code set, prefill prix from voucher
  useEffect(() => {
    if (!reservation?.voucher_code) return;
    if ((reservation.paye ?? 0) > 0 && reservation.acompte != null) return;
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient()
        .from("voucher_codes")
        .select("prix, orders(total, status)")
        .eq("code", reservation.voucher_code!)
        .single()
        .then(({ data }) => {
          if (!data) return;
          const orderRaw = data.orders as unknown;
          const order = Array.isArray(orderRaw)
            ? (orderRaw[0] as { total: number; status: string } | undefined) ?? null
            : orderRaw as { total: number; status: string } | null;
          const price = order?.status === "paid" ? order.total : (data.prix ?? null);
          if (price != null) {
            setDraftPaye(p => (p === "" || p === "0") ? String(price) : p);
            setDraftAcompte(a => (a === "" || a === "0" || a === "") ? String(price) : a);
          }
        });
    });
  }, [reservation?.id, reservation?.voucher_code]);

  function showFeedback(msg: string, ok = true) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3500);
  }

  function doChangeStatut(statut: string) {
    if (!reservation) return;
    startTransition(async () => {
      const result = await updateStatutReservationPerso(reservation.id, statut);
      if (result.error) { showFeedback("Erreur : " + result.error, false); return; }
      onStatusChange(reservation.id, statut);
      const emailStatuts = ["date_confirmee", "heure_confirmee", "vol_effectue"];
      showFeedback(emailStatuts.includes(statut) ? "Statut mis à jour, email envoyé ✓" : "Statut mis à jour");
    });
  }

  function doSendRescheduleInvite() {
    if (!reservation) return;
    startTransition(async () => {
      const result = await sendRescheduleInvite(reservation.id);
      if (result.error) { showFeedback("Erreur : " + result.error, false); return; }
      showFeedback("Email de report envoyé au client ✓");
    });
  }

  function openBilan() {
    if (!reservation) return;
    setBilanOpen(v => !v);
    if (bilanTarifEcole !== null) return;
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient()
        .from("avion_tarifs")
        .select("prix_heure, actif_depuis")
        .then(({ data }) => {
          if (!data || data.length === 0) return;
          const sorted = [...data].sort(
            (a, b) => new Date(b.actif_depuis).getTime() - new Date(a.actif_depuis).getTime()
          );
          const applicable = sorted.find(t => t.actif_depuis <= reservation.date_vol);
          const tarif = (applicable ?? sorted[sorted.length - 1])?.prix_heure ?? null;
          setBilanTarifEcole(tarif);
        });
    });
  }

  function saveBilanVol() {
    if (!reservation) return;
    const dureeR = parseInt(bilanDureeReelle);
    if (isNaN(dureeR) || dureeR <= 0) return;
    startBilanTransition(async () => {
      await updateReservationAllFields(reservation.id, {}, { duree_reelle: dureeR });
      showFeedback("Bilan vol enregistré ✓");
    });
  }

  function saveAllFields() {
    if (!reservation) return;
    startTransition(async () => {
      const r = await updateReservationAllFields(
        reservation.id,
        {
          prenom: draftPrenom.trim() || reservation.clients?.prenom || "",
          nom: draftNom.trim() || reservation.clients?.nom || "",
          email: draftEmail.trim() || reservation.clients?.email || "",
          telephone: draftTelephone.trim() || null,
        },
        {
          date_vol: draftDate || reservation.date_vol,
          heure_vol: draftHeure || null,
          duree: parseInt(draftDuree) || reservation.duree,
          passagers: parseInt(draftPassagers) || reservation.passagers,
          poids_total: draftPoids ? parseFloat(draftPoids) : null,
          acompte: draftAcompte ? parseFloat(draftAcompte) : null,
          paye: draftPaye ? parseFloat(draftPaye) : null,
          payment_status: draftPaymentStatus,
          voucher_code: draftVoucherCode.trim() || null,
          coupon_code: draftCouponCode.trim() || null,
          commentaire: draftCommentaire.trim() || null,
          style_vol: draftStyleVol || null,
          remboursement: draftRemboursement ? parseFloat(draftRemboursement) : null,
          duree_reelle: bilanDureeReelle ? parseInt(bilanDureeReelle) : null,
        }
      );
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      showFeedback("Modifications sauvegardées ✓");
    });
  }

  function applyRouteDuration() {
    if (!routeStats || !reservation) return;
    setDraftDuree(String(routeStats.totalMin));
    if (estimatedAcompte !== null) setDraftAcompte(String(estimatedAcompte));
    startTransition(async () => {
      const res = await updateReservationAllFields(
        reservation.id, {},
        { duree: routeStats.totalMin, ...(estimatedAcompte !== null ? { acompte: estimatedAcompte } : {}) }
      );
      if (res.error) { showFeedback("Erreur lors de la mise à jour", false); return; }
      onFieldsChange(reservation.id, { duree: routeStats.totalMin, ...(estimatedAcompte !== null ? { acompte: estimatedAcompte } : {}) });
      showFeedback("Durée et provision enregistrées ✓");
    });
  }

  function saveFinalRoute() {
    if (!reservation) return;
    const parsed = finalWpDrafts
      .filter(wp => wp.lat.trim() && wp.lng.trim())
      .map(wp => ({
        lat: parseFloat(wp.lat),
        lng: parseFloat(wp.lng),
        ...(wp.nom.trim() ? { nom: wp.nom.trim() } : {}),
      }));
    startTransition(async () => {
      const r = await saveFinalWaypoints(reservation.id, parsed);
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      showFeedback("Route finale sauvegardée ✓");
    });
  }

  function copyForeFlightRoute() {
    if (!reservation) return;
    const wps = finalWpDrafts.filter(wp => wp.lat.trim() && wp.lng.trim());
    const clientWps = reservation.waypoints ?? [];
    const source = wps.length > 0
      ? wps.map(wp => toForeFlight(parseFloat(wp.lat), parseFloat(wp.lng)))
      : clientWps.map(wp => toForeFlight(wp.lat, wp.lng));
    if (source.length === 0) return;
    const parts = ["EBCI", ...source, "EBCI"];
    navigator.clipboard.writeText(parts.join(" ")).then(() => {
      setRouteCopied(true);
      setTimeout(() => setRouteCopied(false), 2000);
    });
  }

  function sendProposal() {
    if (!reservation) return;
    const wps = finalWpDrafts.filter(wp => wp.lat.trim() && wp.lng.trim());
    const clientWps = reservation.waypoints ?? [];
    const toSend = wps.length > 0
      ? wps.map(wp => ({ lat: parseFloat(wp.lat), lng: parseFloat(wp.lng), nom: wp.nom.trim() || undefined }))
      : clientWps;
    if (toSend.length === 0) { showFeedback("Aucun waypoint à envoyer", false); return; }
    startTransition(async () => {
      // Recalculer durée + acompte depuis la route finale et enregistrer AVANT le snapshot
      if (routeStats && wps.length > 0) {
        const newDuree = routeStats.totalMin;
        const newAcompte = (reservation.acompte && reservation.duree)
          ? Math.round((reservation.acompte / reservation.duree) * newDuree)
          : null;
        setDraftDuree(String(newDuree));
        if (newAcompte !== null) setDraftAcompte(String(newAcompte));
        await updateReservationAllFields(
          reservation.id, {},
          { duree: newDuree, ...(newAcompte !== null ? { acompte: newAcompte } : {}) }
        );
        onFieldsChange(reservation.id, { duree: newDuree, ...(newAcompte !== null ? { acompte: newAcompte } : {}) });
      }
      const r = await sendRouteProposalToClient(reservation.id, toSend, proposalComment);
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      showFeedback("Proposition envoyée au client ✓");
      setProposalComment("");
      setProposalsLoaded(false);
    });
  }

  function applyTemplate(tpl: EmailTemplate, withReschedule = false) {
    if (!reservation) return;
    const prenom = reservation.clients?.prenom ?? "";
    setEmailSubject(tpl.subject(dateLabel));
    setEmailBody(tpl.body(prenom, dateLabel));
    setIncludeReschedule(withReschedule);
    setEmailOpen(true);
  }

  function openEmailComposer() {
    if (!reservation) return;
    setEmailSubject(`Fly Horizons — Votre vol sur mesure du ${dateLabel}`);
    setEmailBody(`Bonjour ${reservation.clients?.prenom ?? ""},\n\n\n\nCordialement,\nRomain`);
    setEmailOpen(true);
  }

  function sendEmail() {
    if (!reservation) return;
    startEmailTransition(async () => {
      const result = await sendCustomEmail(reservation.id, emailSubject, emailBody, includeReschedule);
      if (result.error) { showFeedback("Erreur : " + result.error, false); return; }
      setEmailOpen(false);
      setIncludeReschedule(false);
      showFeedback("Email envoyé ✓");
    });
  }

  if (!reservation) return null;

  const r = reservation;

  // Bilan vol calc
  const bilanDureeR = parseInt(bilanDureeReelle) || 0;
  const bilanPrixDemande = r.acompte ?? 0;
  const bilanCoutEcole = bilanTarifEcole !== null && bilanDureeR > 0
    ? Math.round((bilanTarifEcole / 60) * bilanDureeR * 100) / 100 : null;
  const bilanResultat = bilanCoutEcole !== null && bilanPrixDemande > 0
    ? Math.round((bilanPrixDemande - bilanCoutEcole) * 100) / 100 : null;

  const statusCfg = STATUT_PERSO[r.statut] ?? { label: r.statut, variant: "secondary" as const };
  const dateLabel = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <AnimatePresence>
      {r && (
        <>
          <motion.div
            className="fixed inset-0 bg-foreground/20 backdrop-blur-[1px] z-50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            className={`fixed right-0 top-0 bottom-0 w-full bg-card border-l border-border shadow-[−8px_0_40px_rgba(17,51,86,.12)] z-50 flex flex-col transition-[max-width] duration-200 ease-in-out ${emailOpen ? "max-w-2xl" : "max-w-lg"}`}
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <AdminBadge variant={statusCfg.variant} label={statusCfg.label} />
                  <span className="text-xs text-muted-foreground font-mono">
                    #{r.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground truncate">
                  {r.clients?.prenom} {r.clients?.nom}
                </p>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {/* Feedback toast */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  className={`mx-4 mt-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 shrink-0 border ${
                    feedback.ok
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                >
                  <Check size={13} /> {feedback.msg}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tab bar */}
            {!emailOpen && (
              <div className="flex border-b border-border shrink-0">
                {(["infos", "modifier", "route", "historique"] as Tab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                      activeTab === tab
                        ? "text-navy border-b-2 border-navy -mb-px"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === "infos" ? "Infos" : tab === "modifier" ? "Modifier" : tab === "route" ? "Route" : "Historique"}
                  </button>
                ))}
              </div>
            )}

            {/* ── Onglet Infos ─────────────────────────────────────────────────── */}
            {!emailOpen && activeTab === "infos" && (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                {/* Client */}
                <div className="bg-secondary rounded-lg p-4 space-y-2.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-3">Client</p>
                  <div className="flex items-center gap-2.5">
                    <User size={13} className="text-muted-foreground shrink-0" />
                    <span className="text-sm font-semibold text-foreground">{r.clients?.prenom} {r.clients?.nom}</span>
                  </div>
                  {r.clients?.email && (
                    <a href={`mailto:${r.clients.email}`} className="flex items-center gap-2.5 hover:text-navy transition-colors">
                      <Mail size={13} className="text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground">{r.clients.email}</span>
                    </a>
                  )}
                  {r.clients?.telephone && (
                    <a href={`tel:${r.clients.telephone}`} className="flex items-center gap-2.5 hover:text-navy transition-colors">
                      <Phone size={13} className="text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground">{r.clients.telephone}</span>
                    </a>
                  )}
                </div>

                {/* Encart NewCAG */}
                {r.statut !== "annulee" && (() => {
                  const dureeNewCAG = Math.ceil(r.duree / 15) * 15 + 45;
                  const h = Math.floor(dureeNewCAG / 60);
                  const m = dureeNewCAG % 60;
                  const dureeLabel = h > 0
                    ? (m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`)
                    : `${m} min`;
                  const dateLabelNewCAG = r.date_vol
                    ? new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })
                    : null;
                  const toggle = (val: boolean) => {
                    startReserveTransition(async () => {
                      await setAvionReserve(r.id, val);
                      setAvionReserveLocal(val);
                    });
                  };
                  return avionReserve ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 flex items-start gap-3">
                      <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-green-800 mb-1">Avion réservé sur NewCAG</p>
                        {dateLabelNewCAG && (
                          <p className="text-[11px] text-green-700">{dateLabelNewCAG}{r.heure_vol ? ` à ${r.heure_vol}` : ""} — {dureeLabel}</p>
                        )}
                        <button
                          onClick={() => toggle(false)}
                          disabled={isReservePending}
                          className="mt-2 text-[10px] text-green-600 hover:text-green-900 underline underline-offset-2 cursor-pointer transition-colors"
                        >
                          Annuler la réservation avion
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                      <p className="text-xs font-semibold text-amber-800">Réserve l&apos;avion sur NewCAG avant de confirmer.</p>
                      <div className="text-[11px] text-amber-700 space-y-0.5">
                        {dateLabelNewCAG && (
                          <p><span className="font-semibold">Date :</span> {dateLabelNewCAG}{r.heure_vol ? ` à ${r.heure_vol}` : ""}</p>
                        )}
                        <p><span className="font-semibold">Durée :</span> {dureeLabel} (arrondi ¼h + 45 min)</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href="https://newcag.flymate.app/bookings"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2 transition-colors"
                        >
                          Ouvrir NewCAG
                          <ExternalLink size={10} />
                        </a>
                        <button
                          onClick={() => toggle(true)}
                          disabled={isReservePending}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-600 text-white text-[11px] font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isReservePending ? <Loader2 size={10} className="animate-spin" /> : null}
                          Marquer comme réservé
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Vol */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2">Vol</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Date du vol">
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Calendar size={13} className="text-muted-foreground shrink-0" />
                          <span className="capitalize text-sm">{dateLabel}</span>
                        </div>
                      </Field>
                      <Field label="Heure">
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock size={13} className="text-muted-foreground shrink-0" />
                          {r.heure_vol
                            ? <span>{r.heure_vol.slice(0, 5)}</span>
                            : <span className="text-orange-400 text-xs">À définir</span>
                          }
                        </div>
                      </Field>
                      <Field label="Passagers">
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Users size={13} className="text-muted-foreground" />
                          {r.passagers}
                        </div>
                      </Field>
                      {r.poids_total != null && (
                        <Field label="Poids total">
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Weight size={13} className="text-muted-foreground" />
                            {r.poids_total} kg
                          </div>
                        </Field>
                      )}
                      {r.acompte != null && (
                        <Field label="Paiement">
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <CreditCard size={13} className="text-muted-foreground" />
                            <span className="text-muted-foreground text-xs">Prévu :</span>
                            <span>{r.acompte} €</span>
                          </div>
                          {r.paye != null && r.paye > 0 ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <CheckCircle2 size={13} className="text-emerald-500" />
                              <span className="text-emerald-600 font-semibold">{r.paye} € encaissé</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <XCircle size={13} className="text-amber-400" />
                              <span className="text-amber-600 text-xs">Pas encore encaissé</span>
                            </div>
                          )}
                        </Field>
                      )}
                      {r.payment_status && PAYMENT_STATUS_CONFIG[r.payment_status] && (
                        <Field label="Statut paiement">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold mt-0.5 ${PAYMENT_STATUS_CONFIG[r.payment_status].color}`}>
                            {PAYMENT_STATUS_CONFIG[r.payment_status].label}
                          </span>
                        </Field>
                      )}
                      {r.distance_km != null && (
                        <Field label="Distance">
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <MapPin size={13} className="text-muted-foreground" />
                            {r.distance_km} km
                          </div>
                        </Field>
                      )}
                      {r.taxes_escales != null && r.taxes_escales > 0 && (
                        <Field label="Taxes escales">
                          <span className="text-sm">{r.taxes_escales} €</span>
                        </Field>
                      )}
                      {r.voucher_code && (
                        <Field label="Voucher">
                          <span className="font-mono text-xs tracking-wider">{r.voucher_code}</span>
                        </Field>
                      )}
                      {r.coupon_code && (
                        <Field label="Code promo">
                          <span className="font-mono text-xs tracking-wider">{r.coupon_code}</span>
                        </Field>
                      )}
                    </div>

                    {/* Remarques client */}
                    {r.commentaire && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Remarques client</p>
                        <p className="text-xs text-muted-foreground bg-secondary rounded-lg p-3 whitespace-pre-wrap">{r.commentaire}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bilan vol */}
                <div>
                  <button
                    onClick={openBilan}
                    className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2 cursor-pointer hover:text-foreground transition-colors"
                  >
                    <Calculator size={11} />
                    Bilan vol
                    <ChevronDown size={11} className={`transition-transform ${bilanOpen ? "rotate-180" : ""}`} />
                  </button>
                  {bilanOpen && (
                    <div className="bg-secondary/60 rounded-xl border border-border p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground mb-0.5">Pack demandé</p>
                          <p className="font-semibold">{r.duree} min</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">Prix demandé</p>
                          <p className="font-semibold">{bilanPrixDemande > 0 ? `${bilanPrixDemande} €` : "—"}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Durée réelle (min)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={bilanDureeReelle}
                            onChange={e => setBilanDureeReelle(e.target.value)}
                            min={1}
                            placeholder="ex. 52"
                            className="flex-1 h-8 px-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-navy/30 placeholder:text-muted-foreground/40"
                          />
                          <button
                            onClick={saveBilanVol}
                            disabled={bilanPending || !bilanDureeReelle}
                            className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-navy text-white text-xs font-semibold hover:brightness-90 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {bilanPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                            Enregistrer
                          </button>
                        </div>
                      </div>
                      {bilanCoutEcole !== null && (
                        <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-border">
                          <div>
                            <p className="text-muted-foreground mb-0.5">Coût école</p>
                            <p className="font-semibold text-red-500">−{bilanCoutEcole} €</p>
                          </div>
                          {bilanResultat !== null && (
                            <div>
                              <p className="text-muted-foreground mb-0.5">Résultat Romain</p>
                              <p className={`font-bold ${bilanResultat >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                {bilanResultat >= 0 ? "+" : ""}{bilanResultat} €
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      {bilanTarifEcole === null && bilanDureeR > 0 && (
                        <p className="text-xs text-amber-600">Tarif avion école introuvable</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Résumé waypoints client (lecture seule) */}
                {r.waypoints && r.waypoints.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] flex items-center gap-1.5 mb-2">
                      <MapPin size={11} />
                      Route demandée ({r.waypoints.length} points)
                    </p>
                    <div className="bg-secondary rounded-lg p-3 space-y-1 text-xs font-mono overflow-x-auto">
                      <p className="text-muted-foreground">✈ EBCI (départ)</p>
                      {r.waypoints.map((wp, i) => (
                        <p key={i} className="text-foreground pl-3">
                          → {wp.nom ?? `${wp.lat.toFixed(5)}, ${wp.lng.toFixed(5)}`}
                          {wp.nom && (
                            <span className="text-muted-foreground ml-2">
                              ({toForeFlight(wp.lat, wp.lng)})
                            </span>
                          )}
                        </p>
                      ))}
                      {(r.stopovers ?? []).map(so => (
                        <p key={so.icao} className="text-primary pl-3">
                          ⊕ {so.icao}, {so.nom} (+{so.taxe}€)
                        </p>
                      ))}
                      <p className="text-muted-foreground">✈ EBCI (retour)</p>
                    </div>
                  </div>
                )}

                {/* Actions de statut */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2">Actions</p>
                  <div className="space-y-2">

                    {r.statut === "en_attente" && (
                      <button
                        onClick={() => doChangeStatut("heure_confirmee")}
                        disabled={isPending}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Confirmer date + heure, envoyer l&apos;email
                      </button>
                    )}

                    {r.statut === "en_attente" && r.acompte != null && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2.5">
                        <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Banknote size={11} />
                          Paiement cash
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={cashMontant}
                            onChange={e => setCashMontant(e.target.value)}
                            placeholder={String(r.acompte)}
                            className="flex-1 h-8 px-2.5 rounded-lg border border-emerald-200 bg-white text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          />
                          <span className="text-sm text-emerald-700 font-semibold shrink-0">€</span>
                        </div>
                        <button
                          onClick={() => {
                            const amount = parseFloat(cashMontant);
                            if (!amount || amount <= 0) return;
                            startCashTransition(async () => {
                              const res = await recordCashPayment(r.id, amount);
                              if (res.error) { showFeedback("Erreur : " + res.error, false); return; }
                              onStatusChange(r.id, "acompte_recu");
                              showFeedback("Paiement cash enregistré ✓");
                            });
                          }}
                          disabled={isCashPending || !cashMontant || parseFloat(cashMontant) <= 0}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isCashPending ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} />}
                          Encaisser en cash
                        </button>
                      </div>
                    )}

                    {r.statut === "acompte_recu" && (
                      <button
                        onClick={() => doChangeStatut("heure_confirmee")}
                        disabled={isPending}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Confirmer date + heure, envoyer l&apos;email
                      </button>
                    )}

                    {r.statut === "date_confirmee" && (
                      <>
                        <button
                          onClick={() => doChangeStatut("heure_confirmee")}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          Confirmer l&apos;heure, envoyer l&apos;email
                        </button>
                        <button
                          onClick={() => doChangeStatut("en_attente")}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <ChevronRight size={14} className="rotate-180" />
                          Revenir en attente
                        </button>
                      </>
                    )}

                    {r.statut === "heure_confirmee" && (
                      <>
                        <button
                          onClick={() => doChangeStatut("vol_effectue")}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-purple-500 text-white text-sm font-semibold hover:bg-purple-600 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          Marquer vol effectué
                        </button>
                        <button
                          onClick={() => doChangeStatut("en_attente")}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <ChevronRight size={14} className="rotate-180" />
                          Revenir en attente
                        </button>
                      </>
                    )}

                    {r.statut === "vol_effectue" && (
                      <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-purple-50 border border-purple-200">
                        <CheckCircle2 size={14} className="text-purple-600" />
                        <span className="text-sm text-purple-700 font-medium">Vol effectué, dossier clôturé</span>
                      </div>
                    )}

                    {!["annulee", "vol_effectue"].includes(r.statut) && (
                      <>
                        <button
                          onClick={doSendRescheduleInvite}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-amber-200 text-sm text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                          Proposer un report
                        </button>
                        <button
                          onClick={() => doChangeStatut("annulee")}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-red-200 text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <XCircle size={14} />
                          Annuler la réservation
                        </button>
                      </>
                    )}

                    {r.statut === "annulee" && (
                      <button
                        onClick={() => doChangeStatut("en_attente")}
                        disabled={isPending}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-navy text-white text-sm font-semibold hover:brightness-90 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <AlertTriangle size={14} />
                        Réactiver la réservation
                      </button>
                    )}
                  </div>
                </div>

                {/* Email libre */}
                {r.clients && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2">Email libre</p>
                    <div className="mb-2">
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1.5">
                        <Sparkles size={9} />
                        Templates rapides
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {EMAIL_TEMPLATES.map((tpl) => (
                          <button
                            key={tpl.label}
                            disabled={isPending}
                            onClick={() => applyTemplate(tpl, tpl.includeReschedule ?? false)}
                            className="text-[11px] px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {tpl.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={openEmailComposer}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                    >
                      <Send size={14} />
                      Composer un email…
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Onglet Modifier ──────────────────────────────────────────────── */}
            {!emailOpen && activeTab === "modifier" && (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                {/* Client */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-3">Client</p>
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2.5">
                      <InputField label="Prénom">
                        <input type="text" value={draftPrenom} onChange={e => setDraftPrenom(e.target.value)} className={inputCls} />
                      </InputField>
                      <InputField label="Nom">
                        <input type="text" value={draftNom} onChange={e => setDraftNom(e.target.value)} className={inputCls} />
                      </InputField>
                    </div>
                    <InputField label="Email">
                      <input type="email" value={draftEmail} onChange={e => setDraftEmail(e.target.value)} className={inputCls} />
                    </InputField>
                    <InputField label="Téléphone">
                      <input type="tel" value={draftTelephone} onChange={e => setDraftTelephone(e.target.value)} placeholder="Optionnel" className={inputCls} />
                    </InputField>
                  </div>
                </div>

                {/* Vol */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-3">Vol</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <InputField label="Date">
                      <input type="date" value={draftDate} onChange={e => setDraftDate(e.target.value)} className={inputCls} />
                    </InputField>
                    <InputField label="Heure">
                      <input type="time" value={draftHeure} onChange={e => setDraftHeure(e.target.value)} className={inputCls} />
                    </InputField>
                    <InputField label="Durée pack (min)">
                      <input type="number" value={draftDuree} onChange={e => setDraftDuree(e.target.value)} min={1} className={inputCls} />
                    </InputField>
                    <InputField label="Durée réelle (min)">
                      <input type="number" value={bilanDureeReelle} onChange={e => setBilanDureeReelle(e.target.value)} min={1} placeholder="—" className={inputCls} />
                    </InputField>
                    <InputField label="Passagers">
                      <input type="number" value={draftPassagers} onChange={e => setDraftPassagers(e.target.value)} min={1} className={inputCls} />
                    </InputField>
                    <InputField label="Poids total (kg)">
                      <input type="number" value={draftPoids} onChange={e => setDraftPoids(e.target.value)} min={0} placeholder="—" className={inputCls} />
                    </InputField>
                    <InputField label="Prix demandé au client (€)">
                      <input type="number" value={draftAcompte} onChange={e => setDraftAcompte(e.target.value)} min={0} placeholder="—" className={inputCls} />
                    </InputField>
                    <InputField label="Montant payé (€)">
                      <input type="number" value={draftPaye} onChange={e => setDraftPaye(e.target.value)} min={0} placeholder="—" className={inputCls} />
                    </InputField>
                    <InputField label="Statut paiement">
                      <select value={draftPaymentStatus} onChange={e => setDraftPaymentStatus(e.target.value as "paid" | "unpaid" | "partial" | "refunded")} className={inputCls}>
                        <option value="unpaid">Non payé</option>
                        <option value="paid">Payé</option>
                        <option value="partial">Partiel</option>
                        <option value="refunded">Remboursé</option>
                      </select>
                    </InputField>
                    <InputField label="Remboursement (€)">
                      <div className="flex gap-1.5">
                        <input type="number" value={draftRemboursement} onChange={e => setDraftRemboursement(e.target.value)} min={0} placeholder="—" className={inputCls} />
                        <button
                          type="button"
                          title="Calculer : payé − coût école (durée réelle)"
                          onClick={() => {
                            const paye = parseFloat(draftPaye);
                            const dureeR = parseInt(bilanDureeReelle);
                            if (isNaN(paye) || dureeR <= 0) return;
                            const compute = (tarifEcole: number) => {
                              const coutEcole = Math.round((tarifEcole / 60) * dureeR * 100) / 100;
                              const remb = Math.max(0, Math.round((paye - coutEcole) * 100) / 100);
                              setDraftRemboursement(String(remb));
                            };
                            if (bilanTarifEcole !== null) {
                              compute(bilanTarifEcole);
                            } else {
                              import("@/lib/supabase/client").then(({ createClient }) => {
                                createClient()
                                  .from("avion_tarifs")
                                  .select("prix_heure, actif_depuis")
                                  .then(({ data }) => {
                                    if (!data || data.length === 0) return;
                                    const sorted = [...data].sort(
                                      (a, b) => new Date(b.actif_depuis).getTime() - new Date(a.actif_depuis).getTime()
                                    );
                                    const applicable = sorted.find(t => t.actif_depuis <= reservation!.date_vol);
                                    const tarif = (applicable ?? sorted[sorted.length - 1])?.prix_heure ?? null;
                                    if (tarif !== null) { setBilanTarifEcole(tarif); compute(tarif); }
                                  });
                              });
                            }
                          }}
                          disabled={!bilanDureeReelle || !draftPaye}
                          className="shrink-0 h-8 px-2 rounded-lg border border-input bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Calculator size={13} />
                        </button>
                      </div>
                    </InputField>
                  </div>
                </div>

                {r.voucher_code && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    <Ticket size={13} className="shrink-0 mt-0.5" />
                    <span>Prix et montant payé pré-remplis depuis le voucher <span className="font-mono font-bold">{r.voucher_code}</span></span>
                  </div>
                )}

                {/* Codes */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-3">Codes</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <InputField label="Code voucher">
                      <input type="text" value={draftVoucherCode} onChange={e => setDraftVoucherCode(e.target.value)} placeholder="—" className={`${inputCls} font-mono`} />
                    </InputField>
                    <InputField label="Code promo">
                      <input type="text" value={draftCouponCode} onChange={e => setDraftCouponCode(e.target.value)} placeholder="—" className={`${inputCls} font-mono`} />
                    </InputField>
                  </div>
                </div>

                {/* Remarques */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2">Remarques client</p>
                  <textarea
                    value={draftCommentaire}
                    onChange={e => setDraftCommentaire(e.target.value)}
                    rows={4}
                    placeholder="Texte libre…"
                    className="w-full px-2.5 py-2 rounded-lg border border-input bg-background text-xs resize-none focus:outline-none focus:ring-1 focus:ring-navy/30 placeholder:text-muted-foreground/40"
                  />
                </div>

                <button
                  onClick={saveAllFields}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-navy text-white text-sm font-semibold hover:brightness-90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Sauvegarder les modifications
                </button>
              </div>
            )}

            {/* ── Onglet Route ─────────────────────────────────────────────────── */}
            {!emailOpen && activeTab === "route" && (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                {/* Route client (lecture seule) */}
                {r.waypoints && r.waypoints.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2">Itinéraire demandé par le client</p>
                    <div className="bg-secondary rounded-lg p-3 space-y-1 text-xs font-mono">
                      <p className="text-muted-foreground">EBCI</p>
                      {r.waypoints.map((wp, i) => (
                        <p key={i} className="pl-2 text-foreground">
                          {wp.nom && <span className="font-semibold">{wp.nom} </span>}
                          <span className="text-muted-foreground">{toForeFlight(wp.lat, wp.lng)}</span>
                        </p>
                      ))}
                      {(r.stopovers ?? []).map(so => (
                        <p key={so.icao} className="pl-2 text-primary">{so.icao} (+{so.taxe}€)</p>
                      ))}
                      <p className="text-muted-foreground">EBCI</p>
                    </div>
                  </div>
                )}

                {/* Éditeur de route finale */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px]">Route finale (pilote)</p>
                    <div className="flex items-center gap-1.5">
                      {/* Copy from client route */}
                      {((r.waypoints ?? []).length > 0 || (r.stopovers ?? []).length > 0) && (
                        <button
                          onClick={() => {
                            const allDrafts = [
                              ...(r.waypoints ?? []).map(wp => ({
                                lat: String(wp.lat), lng: String(wp.lng), nom: wp.nom ?? "",
                              })),
                              ...(r.stopovers ?? [])
                                .filter(so => so.lat != null && so.lng != null)
                                .map(so => ({ lat: String(so.lat!), lng: String(so.lng!), nom: so.icao })),
                            ];
                            const parsed = allDrafts
                              .map(wp => ({ lat: parseFloat(wp.lat), lng: parseFloat(wp.lng), nom: wp.nom, _orig: wp }))
                              .filter(wp => !isNaN(wp.lat) && !isNaN(wp.lng));
                            const optimized = parsed.length >= 2 ? optimizeWaypoints(parsed) : parsed;
                            setFinalWpDrafts(optimized.map(wp => wp._orig));
                          }}
                          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                          title="Copier la route client (waypoints + escales) dans la route finale, ordre optimisé"
                        >
                          <Copy size={9} />
                          Route client
                        </button>
                      )}
                      {/* Inverser button */}
                      {finalWpDrafts.length > 1 && (
                        <button
                          onClick={() => setFinalWpDrafts([...finalWpDrafts].reverse())}
                          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                          title="Inverser l'ordre des waypoints"
                        >
                          <ArrowUpDown size={9} />
                          Inverser
                        </button>
                      )}
                      {/* List / Map toggle */}
                      <div className="flex items-center border border-border rounded-lg overflow-hidden">
                        <button
                          onClick={() => setRouteViewMode("list")}
                          className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${routeViewMode === "list" ? "bg-navy text-white" : "text-muted-foreground hover:bg-secondary"}`}
                        >
                          <List size={10} />
                          Liste
                        </button>
                        <button
                          onClick={() => setRouteViewMode("map")}
                          className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${routeViewMode === "map" ? "bg-navy text-white" : "text-muted-foreground hover:bg-secondary"}`}
                        >
                          <MapIcon size={10} />
                          Carte
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* List view */}
                  {routeViewMode === "list" && (
                    <div className="space-y-2">
                      <div className="text-xs font-mono text-muted-foreground px-1 mb-1">EBCI (départ)</div>
                      {finalWpDrafts.map((wp, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground/50 w-5 shrink-0 text-right">{i + 1}</span>
                          <input
                            type="text"
                            value={wp.nom}
                            onChange={e => setFinalWpDrafts(prev => prev.map((w, j) => j === i ? { ...w, nom: e.target.value } : w))}
                            placeholder="Nom (optionnel)"
                            className="flex-1 h-7 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-navy/30 placeholder:text-muted-foreground/40"
                          />
                          <input
                            type="text"
                            value={wp.lat}
                            onChange={e => setFinalWpDrafts(prev => prev.map((w, j) => j === i ? { ...w, lat: e.target.value } : w))}
                            placeholder="Lat"
                            className="w-[72px] h-7 px-2 rounded-md border border-input bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-navy/30"
                          />
                          <input
                            type="text"
                            value={wp.lng}
                            onChange={e => setFinalWpDrafts(prev => prev.map((w, j) => j === i ? { ...w, lng: e.target.value } : w))}
                            placeholder="Lng"
                            className="w-[72px] h-7 px-2 rounded-md border border-input bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-navy/30"
                          />
                          <button
                            onClick={() => setFinalWpDrafts(prev => prev.filter((_, j) => j !== i))}
                            className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      <div className="text-xs font-mono text-muted-foreground px-1">EBCI (retour)</div>
                      <button
                        onClick={() => setFinalWpDrafts(prev => [...prev, { lat: "", lng: "", nom: "" }])}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer"
                      >
                        <Plus size={11} />
                        Ajouter un point
                      </button>
                    </div>
                  )}

                  {/* Map view */}
                  {routeViewMode === "map" && (
                    <AdminRouteEditor
                      waypoints={finalWpDrafts}
                      onChange={setFinalWpDrafts}
                      clientWaypoints={r.waypoints ?? []}
                      stopovers={r.stopovers ?? []}
                      height="320px"
                    />
                  )}

                  {/* Route stats + apply */}
                  {routeStats && (
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="text-muted-foreground">{routeStats.distKm} km</span>
                      <span className="font-semibold text-foreground">~{routeStats.totalMin} min</span>
                      {estimatedAcompte !== null && (
                        <span className="text-muted-foreground">· ~{estimatedAcompte} €</span>
                      )}
                      {(routeStats.totalMin !== parseInt(draftDuree) || (estimatedAcompte !== null && estimatedAcompte !== parseInt(draftAcompte))) && (
                        <button
                          onClick={applyRouteDuration}
                          disabled={isPending}
                          className="ml-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          Appliquer
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={saveFinalRoute}
                      disabled={isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-semibold hover:brightness-90 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      Sauvegarder
                    </button>
                    <button
                      onClick={copyForeFlightRoute}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                    >
                      {routeCopied ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
                      {routeCopied ? "Copié !" : "Copier ForeFlight"}
                    </button>
                  </div>
                </div>

                {/* Envoi de proposition */}
                <div className="bg-secondary rounded-xl p-4 space-y-3">
                  <p className="text-[10px] font-bold text-foreground uppercase tracking-[1.5px]">Envoyer une proposition au client</p>
                  <p className="text-[10px] text-muted-foreground -mt-1">
                    Utilise la route finale si définie, sinon la route du client.
                  </p>
                  <textarea
                    value={proposalComment}
                    onChange={e => setProposalComment(e.target.value)}
                    rows={3}
                    placeholder="Message d'accompagnement (optionnel)…"
                    className="w-full px-2.5 py-2 rounded-lg border border-input bg-background text-xs resize-none focus:outline-none focus:ring-1 focus:ring-navy/30 placeholder:text-muted-foreground/40"
                  />
                  <button
                    onClick={sendProposal}
                    disabled={isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:brightness-105 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    Envoyer la proposition
                  </button>
                </div>

                {/* Propositions précédentes */}
                {proposalsLoaded && proposals.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2">Propositions précédentes</p>
                    <div className="space-y-2">
                      {proposals.map(p => {
                        const cfg = PROPOSAL_STATUS_CONFIG[p.status] ?? { label: p.status, color: "bg-secondary text-foreground border-border" };
                        return (
                          <div key={p.id} className="bg-card border border-border rounded-xl p-3 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-muted-foreground">
                                {new Date(p.created_at).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                                {cfg.label}
                              </span>
                            </div>
                            {p.admin_comment && (
                              <p className="text-xs text-muted-foreground italic">&ldquo;{p.admin_comment}&rdquo;</p>
                            )}
                            {p.client_comment && (
                              <p className="text-xs text-foreground bg-amber-50 border border-amber-200 rounded-lg p-2">
                                <span className="font-semibold text-amber-800">Client : </span>{p.client_comment}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground">{p.waypoints?.length ?? 0} points</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {proposalsLoaded && proposals.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Aucune proposition envoyée pour l&apos;instant.</p>
                )}
              </div>
            )}

            {/* ── Onglet Historique ────────────────────────────────────────────── */}
            {!emailOpen && activeTab === "historique" && (
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {historyLoading && (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 size={20} className="animate-spin text-muted-foreground" />
                  </div>
                )}
                {historyLoaded && historyItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-10">Aucune modification enregistrée.</p>
                )}
                {historyLoaded && historyItems.length > 0 && (
                  <div className="space-y-0">
                    {historyItems.map(item => (
                      <div key={item.id} className="flex gap-3 py-3 border-b border-border/50 last:border-b-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-navy/40 mt-2 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-foreground">
                              {ACTION_LABELS[item.action] ?? item.action}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {new Date(item.created_at).toLocaleString("fr-BE", {
                                day: "numeric", month: "short",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {item.field && (
                            <p className="text-[11px] text-muted-foreground">
                              <span className="font-medium text-foreground/70">{FIELD_LABELS[item.field] ?? item.field}</span>
                              {item.old_value != null && item.new_value != null && (
                                <> · <span className="line-through opacity-50">{item.old_value}</span>{" → "}<span className="text-foreground font-medium">{item.new_value}</span></>
                              )}
                              {item.old_value == null && item.new_value != null && (
                                <> · <span className="text-foreground font-medium">{item.new_value}</span></>
                              )}
                            </p>
                          )}
                          {item.note && (
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5 italic">{item.note}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                            {item.author === "client" ? "Client" : "Admin"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Compositeur email */}
            {emailOpen && (
              <div className="flex-1 flex flex-col min-h-0 px-5 py-4 gap-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] shrink-0">Email libre</p>
                <div className="shrink-0">
                  <p className="text-[10px] text-muted-foreground mb-1">À</p>
                  <p className="text-xs text-foreground font-medium">{r.clients?.email}</p>
                </div>
                <div className="shrink-0">
                  <p className="text-[10px] text-muted-foreground mb-1">Sujet</p>
                  <input
                    autoFocus
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-navy/30"
                  />
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                  <p className="text-[10px] text-muted-foreground mb-1">Message</p>
                  <textarea
                    value={emailBody}
                    onChange={e => setEmailBody(e.target.value)}
                    className="flex-1 min-h-0 w-full px-2.5 py-2 rounded-lg border border-input bg-background text-xs resize-none focus:outline-none focus:ring-1 focus:ring-navy/30"
                  />
                </div>
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setIncludeReschedule(v => !v)}
                    className={[
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors w-full",
                      includeReschedule
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "border-border text-muted-foreground hover:bg-secondary",
                      "cursor-pointer",
                    ].join(" ")}
                  >
                    <RotateCcw size={11} className={includeReschedule ? "text-amber-600" : ""} />
                    {includeReschedule ? "Lien de report inclus dans l'email ✓" : "Ajouter un lien de report"}
                  </button>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={sendEmail}
                    disabled={emailPending || !emailSubject.trim() || !emailBody.trim()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-semibold hover:brightness-90 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {emailPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    Envoyer
                  </button>
                  <button
                    onClick={() => { setEmailOpen(false); setIncludeReschedule(false); }}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border shrink-0">
              <p className="text-xs text-muted-foreground">
                Créée le {new Date(r.created_at).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Carte ──────────────────────────────────────────────────────────────────────
function ReservationCard({
  reservation: r,
  onOpen,
  onDelete,
}: {
  reservation: Reservation;
  onOpen: () => void;
  onDelete: () => Promise<{ error?: string } | void>;
}) {
  const statusCfg = STATUT_PERSO[r.statut] ?? { label: r.statut, variant: "secondary" as const };
  const client = r.clients;
  const dateStr = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
  const latestProposal = r.route_proposals
    ?.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const proposalBadge: Record<string, { label: string; variant: import("@/components/admin/ui/AdminBadge").BadgeVariant }> = {
    pending:                { label: "Proposition envoyée", variant: "info"    },
    accepted:               { label: "Route acceptée ✓",   variant: "emerald" },
    modification_requested: { label: "Modif. demandée",     variant: "warning" },
  };

  return (
    <div className="card-premium p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground text-sm">
              {client ? `${client.prenom} ${client.nom}` : "Client inconnu"}
            </p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-navy/8 text-navy border border-navy/20">
              {r.duree} min
            </span>
            <AdminBadge variant={statusCfg.variant} label={statusCfg.label} />
            {latestProposal && proposalBadge[latestProposal.status] && (
              <AdminBadge
                variant={proposalBadge[latestProposal.status].variant}
                label={proposalBadge[latestProposal.status].label}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
            <p className="text-xs text-muted-foreground">
              {dateStr}{r.heure_vol ? ` · ${r.heure_vol.slice(0, 5)}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {r.passagers} pax{r.distance_km ? ` · ${r.distance_km} km` : ""}{r.poids_total ? ` · ${r.poids_total} kg` : ""}
            </p>
            {r.acompte != null && (
              <p className="text-xs text-primary font-semibold">Provision : {r.acompte} €</p>
            )}
          </div>
          {client && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {client.email}{client.telephone ? ` · ${client.telephone}` : ""}
            </p>
          )}
        </div>

        <div onClick={e => e.stopPropagation()} className="shrink-0">
          <AdminRowActions onView={onOpen} onDelete={onDelete} />
        </div>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────
export function VolsPersoClient({ reservations: initial }: { reservations: Reservation[] }) {
  const [reservations, setReservations] = useState<Reservation[]>(initial);
  const [drawer, setDrawer] = useState<Reservation | null>(null);

  function handleStatusChange(id: string, statut: string) {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, statut } : r));
    setDrawer(prev => prev?.id === id ? { ...prev, statut } : prev);
  }

  function handleFieldsChange(id: string, fields: Partial<Reservation>) {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, ...fields } : r));
    setDrawer(prev => prev?.id === id ? { ...prev, ...fields } : prev);
  }

  async function handleDelete(id: string) {
    const result = await deleteReservationPerso(id);
    if (!result?.error) {
      setReservations(prev => prev.filter(r => r.id !== id));
      if (drawer?.id === id) setDrawer(null);
    }
    return result;
  }

  if (!reservations.length) {
    return (
      <div className="text-center py-20 text-muted-foreground text-sm">
        Aucune demande de vol sur mesure pour le moment.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {reservations.map(r => (
          <ReservationCard
            key={r.id}
            reservation={r}
            onOpen={() => setDrawer(r)}
            onDelete={() => handleDelete(r.id)}
          />
        ))}
      </div>

      <VolsPersoDrawer
        reservation={drawer}
        onClose={() => setDrawer(null)}
        onStatusChange={handleStatusChange}
        onFieldsChange={handleFieldsChange}
      />
    </>
  );
}
