"use client";

import { useState, useTransition, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, User, Phone, Mail, Calendar, Clock, Users, Weight,
  Ticket, CreditCard, CheckCircle2, XCircle, ChevronRight,
  Loader2, Send, Check, MapPin, AlertTriangle,
  Copy, ExternalLink, Sparkles, RotateCcw, Calculator, ChevronDown,
  Maximize2, Minimize2, Save, Navigation,
} from "lucide-react";
import {
  updateStatutReservation,
  updateStatutReservationPerso,
  sendCustomEmail,
  resendPaymentLinkAdmin,
  sendRescheduleInvite,
} from "@/lib/actions/reservations";
import {
  updateReservationAllFields,
  getReservationHistory,
  sendRouteProposalToClient,
  getRouteProposals,
  saveFinalWaypoints,
} from "@/lib/actions/reservation-edit";
import type { WaypointDraft } from "@/components/admin/AdminRouteEditor";
import { toForeFlight } from "@/lib/foreflight";
import { getItineraires } from "@/lib/actions/itineraires";
import type { Itineraire } from "@/lib/actions/itineraires";

const AdminRouteEditorDynamic = dynamic(
  () => import("@/components/admin/AdminRouteEditor").then(m => ({ default: m.AdminRouteEditor })),
  { ssr: false, loading: () => <div className="h-[280px] rounded-lg bg-secondary animate-pulse" /> }
);
import { AdminBadge, STATUT_RESA, STATUT_PERSO } from "@/components/admin/ui/AdminBadge";

// Map fusionné : couvre standard + perso
const STATUT_MAP = { ...STATUT_RESA, ...STATUT_PERSO };

// ── Templates email prêts à l'emploi ──────────────────────────────────────────
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

const ROUTE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  sent:                   { label: "En attente de validation", color: "bg-amber-50 text-amber-700 border-amber-200" },
  validated:              { label: "Validée ✓",               color: "bg-green-50 text-green-700 border-green-200" },
  modification_requested: { label: "Modification demandée",   color: "bg-red-50 text-red-700 border-red-200" },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  paid:     { label: "Payé",      color: "bg-green-50 text-green-700 border border-green-200" },
  unpaid:   { label: "Non payé",  color: "bg-amber-50 text-amber-700 border border-amber-200" },
  partial:  { label: "Partiel",   color: "bg-blue-50 text-blue-700 border border-blue-200" },
  refunded: { label: "Remboursé", color: "bg-gray-50 text-gray-600 border border-gray-200" },
};

const ACTION_LABELS: Record<string, string> = {
  field_changed:       "Modification",
  route_proposal_sent: "Proposition envoyée",
  client_response:     "Réponse client",
  status_changed:      "Changement de statut",
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
  id: string;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  author: string;
  note: string | null;
  created_at: string;
};

type Tab = "infos" | "modifier" | "historique";

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

export interface DrawerReservation {
  id: string;
  date_vol: string;
  heure_vol: string | null;
  duree: number;
  passagers: number;
  poids_total: number | null;
  statut: string;
  type_resa: string;
  voucher_code: string | null;
  coupon_code: string | null;
  payment_status: string | null;
  commentaire: string | null;
  acompte: number | null;
  paye: number | null;
  payment_token: string | null;
  created_at: string;
  route?: string | null;
  route_token?: string | null;
  route_status?: string | null;
  route_feedback?: string | null;
  final_waypoints?: Array<{ lat: number; lng: number; nom?: string }> | null;
  clients: {
    id: string;
    prenom: string;
    nom: string;
    email: string;
    telephone: string | null;
  } | null;
}

export function ReservationDrawer({
  reservation,
  onClose,
  onStatusChange,
}: {
  reservation: DrawerReservation | null;
  onClose: () => void;
  onStatusChange?: (id: string, newStatut: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  // Tab navigation
  const [activeTab, setActiveTab] = useState<Tab>("infos");

  // Modifier tab — draft states
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

  // Route (map-based for standard)
  const [routeDraft, setRouteDraft] = useState<WaypointDraft[]>([]);
  const [routeComment, setRouteComment] = useState("");
  const [proposalLoaded, setProposalLoaded] = useState(false);
  const [localRouteStatus, setLocalRouteStatus] = useState(reservation?.route_status ?? null);
  const [localRouteFeedback, setLocalRouteFeedback] = useState(reservation?.route_feedback ?? null);

  // UI state
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [foreFlightCopied, setForeFlightCopied] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [includeReschedule, setIncludeReschedule] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Calculateur de remboursement (vol sur mesure uniquement)
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcPrixHeure, setCalcPrixHeure] = useState("");
  const [calcDureeReelle, setCalcDureeReelle] = useState("");

  // Historique tab
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Itinéraires enregistrés
  const [showItinModal, setShowItinModal] = useState(false);
  const [itineraires, setItineraires] = useState<Itineraire[]>([]);
  const [itinLoaded, setItinLoaded] = useState(false);
  const [itinLoading, setItinLoading] = useState(false);
  const [itinShowAll, setItinShowAll] = useState(false);

  async function openItinModal() {
    setItinShowAll(false);
    setShowItinModal(true);
    if (!itinLoaded) {
      setItinLoading(true);
      const data = await getItineraires();
      setItineraires(data);
      setItinLoaded(true);
      setItinLoading(false);
    }
  }

  function applyItineraire(itin: Itineraire) {
    setRouteDraft(itin.waypoints.map(wp => ({
      lat: String(wp.lat),
      lng: String(wp.lng),
      nom: wp.nom,
    })));
    setShowItinModal(false);
  }

  // Reset + populate drafts when reservation changes
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
    setRouteDraft([]);
    setRouteComment("");
    setProposalLoaded(false);
    setLocalRouteStatus(reservation.route_status ?? null);
    setLocalRouteFeedback(reservation.route_feedback ?? null);
    setCalcOpen(false);
    setCalcDureeReelle("");
    setActiveTab("infos");
    setHistoryLoaded(false);
    setHistoryItems([]);
  }, [reservation?.id]);

  // Load latest route proposal for standard reservations
  useEffect(() => {
    if (!reservation || reservation.type_resa === "perso" || proposalLoaded) return;
    getRouteProposals(reservation.id).then(res => {
      const proposals = (res.data ?? []) as Array<{
        waypoints: Array<{ lat: number; lng: number; nom?: string }>;
        admin_comment: string | null;
        status: string;
        client_comment: string | null;
      }>;
      if (proposals.length > 0) {
        const latest = proposals[0];
        setRouteDraft(latest.waypoints.map(wp => ({
          lat: String(wp.lat),
          lng: String(wp.lng),
          nom: wp.nom ?? "",
        })));
        setRouteComment(latest.admin_comment ?? "");
        const statusMap: Record<string, string> = {
          pending: "sent",
          accepted: "validated",
          modification_requested: "modification_requested",
        };
        setLocalRouteStatus(statusMap[latest.status] ?? null);
        setLocalRouteFeedback(latest.status === "modification_requested" ? latest.client_comment : null);
      } else if (reservation.final_waypoints?.length) {
        setRouteDraft(reservation.final_waypoints.map(wp => ({
          lat: String(wp.lat),
          lng: String(wp.lng),
          nom: wp.nom ?? "",
        })));
      }
      setProposalLoaded(true);
    });
  }, [reservation?.id, proposalLoaded]);

  // Lazy-load historique when tab is opened
  useEffect(() => {
    if (activeTab !== "historique" || historyLoaded || !reservation) return;
    setHistoryLoading(true);
    getReservationHistory(reservation.id).then(res => {
      if (res.data) setHistoryItems(res.data as HistoryItem[]);
      setHistoryLoading(false);
      setHistoryLoaded(true);
    });
  }, [activeTab, historyLoaded, reservation?.id]);

  function openCalc() {
    if (!calcOpen && !calcPrixHeure) {
      import("@/lib/supabase/client").then(({ createClient }) => {
        createClient()
          .from("crm_settings").select("value").eq("key", "prix_heure").single()
          .then(({ data }) => { if (data) setCalcPrixHeure(data.value); });
      });
    }
    setCalcOpen(v => !v);
  }

  function showFeedback(msg: string, ok = true) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3500);
  }

  // ── Status change ──────────────────────────────────────────────────────────

  function doChangeStatut(statut: string) {
    if (!reservation) return;
    startTransition(async () => {
      const action = reservation.type_resa === "perso"
        ? updateStatutReservationPerso
        : updateStatutReservation;
      const r = await action(reservation.id, statut);
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      onStatusChange?.(reservation.id, statut);
      const emailStatuts = ["date_confirmee", "heure_confirmee", "vol_effectue"];
      showFeedback(emailStatuts.includes(statut) ? "Statut mis à jour, email envoyé ✓" : "Statut mis à jour");
    });
  }

  function changeStatut(statut: string) {
    if (!reservation) return;
    const isStandard = reservation.type_resa !== "perso";
    if (statut === "heure_confirmee" && isStandard && !localRouteStatus) {
      showFeedback("Envoyez la route au client avant de confirmer la date + heure", false);
      return;
    }
    doChangeStatut(statut);
  }

  // ── All-fields save ────────────────────────────────────────────────────────

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
        }
      );
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      showFeedback("Modifications sauvegardées ✓");
    });
  }

  // ── Route save / ForeFlight / send ────────────────────────────────────────

  function saveRoute() {
    if (!reservation) return;
    const parsed = routeDraft
      .map(wp => ({ lat: parseFloat(wp.lat), lng: parseFloat(wp.lng), nom: wp.nom || undefined }))
      .filter(wp => !isNaN(wp.lat) && !isNaN(wp.lng));
    if (parsed.length === 0) { showFeedback("Aucun point à sauvegarder", false); return; }
    startTransition(async () => {
      const result = await saveFinalWaypoints(reservation.id, parsed);
      if (result.error) { showFeedback("Erreur : " + result.error, false); return; }
      showFeedback("Route sauvegardée ✓");
    });
  }

  function copyForeFlight() {
    const valid = routeDraft
      .map(wp => ({ lat: parseFloat(wp.lat), lng: parseFloat(wp.lng) }))
      .filter(wp => !isNaN(wp.lat) && !isNaN(wp.lng));
    if (valid.length === 0) return;
    const text = ["EBCI", ...valid.map(wp => toForeFlight(wp.lat, wp.lng)), "EBCI"].join(" ");
    navigator.clipboard.writeText(text).then(() => {
      setForeFlightCopied(true);
      setTimeout(() => setForeFlightCopied(false), 2000);
    });
  }

  function sendRouteProposal() {
    if (!reservation) return;
    const parsed = routeDraft
      .map(wp => ({ lat: parseFloat(wp.lat), lng: parseFloat(wp.lng), nom: wp.nom || undefined }))
      .filter(wp => !isNaN(wp.lat) && !isNaN(wp.lng));
    if (parsed.length === 0) {
      showFeedback("Ajoutez au moins un point sur la carte", false);
      return;
    }
    startTransition(async () => {
      const result = await sendRouteProposalToClient(reservation.id, parsed, routeComment);
      if (result.error) { showFeedback("Erreur : " + result.error, false); return; }
      setLocalRouteStatus("sent");
      showFeedback("Route envoyée au client ✓");
    });
  }

  // ── Renvoyer lien de paiement ─────────────────────────────────────────────

  function doResendPaymentLink() {
    if (!reservation) return;
    startTransition(async () => {
      const r = await resendPaymentLinkAdmin(reservation.id);
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      showFeedback("Email de paiement renvoyé ✓");
    });
  }

  function copyPaymentLink() {
    if (!reservation?.payment_token) return;
    const rawUrl = typeof window !== "undefined" ? window.location.origin : "https://fly-horizons.com";
    const url = `${rawUrl}/api/reservation/pay/${reservation.payment_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  // ── Proposer un report ────────────────────────────────────────────────────

  function doSendRescheduleInvite() {
    if (!reservation) return;
    startTransition(async () => {
      const r = await sendRescheduleInvite(reservation.id);
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      showFeedback("Email de report envoyé au client ✓");
    });
  }

  // ── Custom email ───────────────────────────────────────────────────────────

  function openEmailComposer() {
    if (!reservation) return;
    const dateStr = new Date(reservation.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    setEmailSubject(`Fly Horizons — Votre vol du ${dateStr}`);
    setEmailBody(`Bonjour ${reservation.clients?.prenom ?? ""},\n\n\n\nCordialement,\nL'équipe Fly Horizons`);
    setEmailOpen(true);
  }

  function applyTemplate(tpl: typeof EMAIL_TEMPLATES[number]) {
    if (!reservation) return;
    const prenom = reservation.clients?.prenom ?? "";
    setEmailSubject(tpl.subject(dateLabel));
    setEmailBody(tpl.body(prenom, dateLabel));
    setIncludeReschedule(tpl.includeReschedule ?? false);
    setEmailOpen(true);
  }

  function sendEmail_custom() {
    if (!reservation) return;
    startTransition(async () => {
      const r = await sendCustomEmail(reservation.id, emailSubject, emailBody, includeReschedule);
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      showFeedback("Email envoyé ✓");
      setEmailOpen(false);
      setIncludeReschedule(false);
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const r = reservation;
  const statut = r ? (STATUT_MAP[r.statut] ?? { label: r.statut, variant: "secondary" as const }) : null;
  const dateLabel = r
    ? new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })
    : "";
  const isStandard = r?.type_resa !== "perso";
  const routeStatusCfg = localRouteStatus ? ROUTE_STATUS_CONFIG[localRouteStatus] : null;

  // Calculateur de remboursement
  const calcPrixH        = parseFloat(calcPrixHeure) || 0;
  const calcDureeR       = parseInt(calcDureeReelle) || 0;
  const calcPrixReel     = calcPrixH > 0 && calcDureeR > 0 ? (calcPrixH / 60) * calcDureeR : null;
  const calcMontantPaye  = r ? (r.paye ?? r.acompte ?? 0) : 0;
  const calcRemboursement = calcPrixReel !== null ? calcMontantPaye - calcPrixReel : null;

  return (
    <>
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
                  {statut && <AdminBadge variant={statut.variant} label={statut.label} />}
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

            {/* Tab bar — masqué quand le compositeur email est ouvert */}
            {!emailOpen && (
              <div className="flex border-b border-border shrink-0">
                {(["infos", "modifier", "historique"] as Tab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === tab
                        ? "text-navy border-b-2 border-navy -mb-px"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === "infos" ? "Infos" : tab === "modifier" ? "Modifier" : "Historique"}
                  </button>
                ))}
              </div>
            )}

            {/* ── Onglet Infos ─────────────────────────────────────────────────── */}
            {!emailOpen && activeTab === "infos" && (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                {/* Client */}
                <div className="bg-secondary rounded-xl p-4 space-y-2.5">
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

                {/* Vol details */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2">Vol</p>
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
                    <Field label="Durée">
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock size={13} className="text-muted-foreground" />
                        {r.duree} min
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
                    {r.voucher_code && (
                      <Field label="Voucher">
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Ticket size={13} className="text-muted-foreground" />
                          <span className="font-mono text-xs tracking-wider">{r.voucher_code}</span>
                        </div>
                      </Field>
                    )}
                    {r.coupon_code && (
                      <Field label="Code promo">
                        <span className="font-mono text-xs tracking-wider">{r.coupon_code}</span>
                      </Field>
                    )}
                    <Field label="Type">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary border border-border mt-0.5">
                        {r.type_resa === "standard" ? "Standard" : "Sur mesure"}
                      </span>
                    </Field>
                  </div>
                </div>

                {/* Calculateur de remboursement — vol sur mesure uniquement */}
                {!isStandard && (
                  <div>
                    <button
                      type="button"
                      onClick={openCalc}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2 text-[11px] font-bold text-foreground uppercase tracking-wider">
                        <Calculator size={12} className="text-muted-foreground" />
                        Calculateur de remboursement
                      </span>
                      <ChevronDown
                        size={13}
                        className={`text-muted-foreground transition-transform ${calcOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {calcOpen && (
                      <div className="mt-2 p-4 rounded-xl border border-border bg-background space-y-3.5">
                        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-border">
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Durée estimée</p>
                            <p className="text-sm font-black text-foreground">{r.duree} min</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Montant encaissé</p>
                            <p className="text-sm font-black text-foreground">
                              {calcMontantPaye > 0
                                ? `${calcMontantPaye} €`
                                : <span className="text-amber-500 text-xs font-semibold">Non encaissé</span>
                              }
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                              Prix / heure (€)
                            </label>
                            <input
                              type="number" min={0} step={0.01}
                              value={calcPrixHeure}
                              onChange={e => setCalcPrixHeure(e.target.value)}
                              placeholder="ex : 260"
                              className="w-full h-9 px-2.5 rounded-lg border border-input bg-secondary text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-navy/30 placeholder:text-muted-foreground/40"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                              Durée réelle (min)
                            </label>
                            <input
                              type="number" min={0}
                              value={calcDureeReelle}
                              onChange={e => setCalcDureeReelle(e.target.value)}
                              placeholder="ex : 55"
                              className="w-full h-9 px-2.5 rounded-lg border border-input bg-secondary text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-navy/30 placeholder:text-muted-foreground/40"
                            />
                          </div>
                        </div>
                        {calcPrixReel !== null ? (
                          <div className="pt-3 border-t border-border space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground font-mono">
                                {calcPrixHeure} ÷ 60 × {calcDureeReelle}
                              </span>
                              <span className="font-semibold text-foreground">{calcPrixReel.toFixed(2)} €</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Encaissé</span>
                              <span className="font-semibold text-foreground">{calcMontantPaye} €</span>
                            </div>
                            <div className={`flex items-center justify-between pt-2.5 border-t border-border ${calcRemboursement! >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                              <span className="text-sm font-bold">
                                {calcRemboursement! >= 0 ? "À rembourser" : "Supplément dû"}
                              </span>
                              <span className="text-xl font-black">
                                {Math.abs(calcRemboursement!).toFixed(2)} €
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground text-center py-1">
                            Entrez le prix/h et la durée réelle pour voir le résultat.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Route — standard only */}
                {isStandard && (
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
                          onClick={() => setMapFullscreen(true)}
                          title="Agrandir la carte"
                          className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Maximize2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Itinéraire enregistré */}
                    <button
                      type="button"
                      onClick={openItinModal}
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
                      <AdminRouteEditorDynamic
                        waypoints={routeDraft}
                        onChange={setRouteDraft}
                        height="280px"
                      />
                    )}

                    {/* Save + ForeFlight */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={saveRoute}
                        disabled={isPending || routeDraft.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-semibold hover:brightness-90 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        {isPending ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                        Sauvegarder
                      </button>
                      <button
                        onClick={copyForeFlight}
                        disabled={routeDraft.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        <Copy size={11} />
                        {foreFlightCopied ? "Copié !" : "ForeFlight"}
                      </button>
                    </div>

                    {/* Message + send to client */}
                    <textarea
                      value={routeComment}
                      onChange={e => setRouteComment(e.target.value)}
                      rows={2}
                      placeholder="Message pour le client (optionnel)…"
                      className="w-full mt-2 px-2.5 py-2 rounded-lg border border-input bg-background text-xs resize-none focus:outline-none focus:ring-1 focus:ring-navy/30 placeholder:text-muted-foreground"
                    />

                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        onClick={sendRouteProposal}
                        disabled={isPending || routeDraft.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:brightness-90 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        {isPending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                        {localRouteStatus ? "Renvoyer au client" : "Envoyer au client"}
                      </button>
                    </div>

                    {localRouteStatus === "modification_requested" && localRouteFeedback && (
                      <div className="mt-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">Message du client</p>
                        <p className="text-xs text-amber-700 leading-relaxed">{localRouteFeedback}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Status actions */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2">Actions</p>
                  <div className="space-y-2">

                      {r.statut === "en_attente" && (
                        <>
                          <button
                            onClick={() => changeStatut("heure_confirmee")}
                            disabled={isPending}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            Confirmer date + heure, envoyer l&apos;email
                          </button>
                          {isStandard && !localRouteStatus && (
                            <p className="text-xs text-amber-600 flex items-center gap-1.5 px-1">
                              <AlertTriangle size={12} />
                              Route requise pour confirmer la date + heure
                            </p>
                          )}
                        </>
                      )}

                      {r.statut === "date_confirmee" && (
                        <>
                          <button
                            onClick={() => changeStatut("heure_confirmee")}
                            disabled={isPending}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            Confirmer l&apos;heure, envoyer l&apos;email
                          </button>
                          {isStandard && !localRouteStatus && (
                            <p className="text-xs text-amber-600 flex items-center gap-1.5 px-1">
                              <AlertTriangle size={12} />
                              Route requise pour confirmer la date + heure
                            </p>
                          )}
                          <button
                            onClick={() => changeStatut("en_attente")}
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
                            onClick={() => changeStatut("vol_effectue")}
                            disabled={isPending}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-purple-500 text-white text-sm font-semibold hover:bg-purple-600 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            Marquer vol effectué
                          </button>
                          <button
                            onClick={() => changeStatut("en_attente")}
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

                      {r.statut !== "annulee" && r.statut !== "vol_effectue" && (
                        <button
                          onClick={doSendRescheduleInvite}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-amber-200 text-sm text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                          Proposer un report
                        </button>
                      )}

                      {r.statut !== "annulee" && r.statut !== "vol_effectue" && (
                        <button
                          onClick={() => changeStatut("annulee")}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-red-200 text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <XCircle size={14} />
                          Annuler la réservation
                        </button>
                      )}

                      {r.statut === "annulee" && (
                        <button
                          onClick={() => changeStatut("en_attente")}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-navy text-white text-sm font-semibold hover:brightness-90 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <ChevronRight size={14} />
                          Réactiver la réservation
                        </button>
                      )}

                      {r.statut === "payment_pending" && (
                        <div className="space-y-2">
                          {r.payment_token && (
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 space-y-2.5">
                              <p className="text-[10px] font-bold text-orange-800 uppercase tracking-wider">Lien de paiement</p>
                              <div className="flex items-center gap-2">
                                <code className="flex-1 min-w-0 text-[10px] font-mono text-orange-900 bg-white border border-orange-200 rounded-lg px-2.5 py-1.5 truncate">
                                  /api/reservation/pay/{r.payment_token.slice(0, 12)}…
                                </code>
                                <button
                                  type="button"
                                  onClick={copyPaymentLink}
                                  title="Copier le lien"
                                  className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-orange-200 text-xs font-semibold text-orange-700 hover:bg-orange-100 transition-colors cursor-pointer"
                                >
                                  {linkCopied ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
                                  {linkCopied ? "Copié" : "Copier"}
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={doResendPaymentLink}
                                  disabled={isPending}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                  {isPending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                                  Renvoyer l&apos;email de paiement
                                </button>
                                <a
                                  href={`/api/reservation/pay/${r.payment_token}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-white border border-orange-200 text-xs text-orange-700 hover:bg-orange-100 transition-colors"
                                  title="Ouvrir le lien"
                                >
                                  <ExternalLink size={11} />
                                </a>
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => changeStatut("en_attente")}
                            disabled={isPending}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-navy text-white text-sm font-semibold hover:brightness-90 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <Check size={14} />
                            Marquer paiement reçu
                          </button>
                        </div>
                      )}

                      {r.statut === "acompte_recu" && (
                        <button
                          onClick={() => changeStatut("heure_confirmee")}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          Confirmer date + heure, envoyer l&apos;email
                        </button>
                      )}
                    </div>
                  </div>

                {/* Free email */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2">Email libre</p>
                  <div className="mb-2">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1.5">
                      <Sparkles size={9} />
                      Templates rapides
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {EMAIL_TEMPLATES.map((tpl, idx) => (
                        <button
                          key={tpl.label}
                          disabled={isPending}
                          onClick={() => {
                            applyTemplate(tpl);
                            setIncludeReschedule(idx === 0);
                          }}
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
                    <InputField label="Durée (min)">
                      <input type="number" value={draftDuree} onChange={e => setDraftDuree(e.target.value)} min={1} className={inputCls} />
                    </InputField>
                    <InputField label="Passagers">
                      <input type="number" value={draftPassagers} onChange={e => setDraftPassagers(e.target.value)} min={1} className={inputCls} />
                    </InputField>
                    <InputField label="Poids total (kg)">
                      <input type="number" value={draftPoids} onChange={e => setDraftPoids(e.target.value)} min={0} placeholder="—" className={inputCls} />
                    </InputField>
                    <InputField label="Provision (€)">
                      <input type="number" value={draftAcompte} onChange={e => setDraftAcompte(e.target.value)} min={0} placeholder="—" className={inputCls} />
                    </InputField>
                    <InputField label="Montant encaissé (€)">
                      <input type="number" value={draftPaye} onChange={e => setDraftPaye(e.target.value)} min={0} placeholder="—" className={inputCls} />
                    </InputField>
                    <InputField label="Statut paiement">
                      <select
                        value={draftPaymentStatus}
                        onChange={e => setDraftPaymentStatus(e.target.value as "paid" | "unpaid" | "partial" | "refunded")}
                        className={inputCls}
                      >
                        <option value="unpaid">Non payé</option>
                        <option value="paid">Payé</option>
                        <option value="partial">Partiel</option>
                        <option value="refunded">Remboursé</option>
                      </select>
                    </InputField>
                  </div>
                </div>

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

                {/* Notes */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2">Remarques</p>
                  <textarea
                    value={draftCommentaire}
                    onChange={e => setDraftCommentaire(e.target.value)}
                    rows={3}
                    placeholder="Notes internes ou remarques client…"
                    className="w-full px-2.5 py-2 rounded-lg border border-input bg-background text-xs resize-none focus:outline-none focus:ring-1 focus:ring-navy/30 placeholder:text-muted-foreground/40"
                  />
                </div>

                {/* Save */}
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

            {/* Compositeur email plein-écran — occupe toute la hauteur du drawer */}
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
                    onClick={sendEmail_custom}
                    disabled={isPending || !emailSubject.trim() || !emailBody.trim()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-semibold hover:brightness-90 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
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

          {/* Full-screen map modal */}
          {mapFullscreen && (
            <div className="fixed inset-0 z-[200] flex flex-col bg-[#0b1a28]">
              <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border shrink-0">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MapPin size={14} className="text-primary" />
                  Tracé de route
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={saveRoute}
                    disabled={isPending || routeDraft.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-semibold hover:brightness-90 transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    {isPending ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                    Sauvegarder
                  </button>
                  <button
                    onClick={copyForeFlight}
                    disabled={routeDraft.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    <Copy size={11} />
                    {foreFlightCopied ? "Copié !" : "ForeFlight"}
                  </button>
                  <button
                    onClick={() => setMapFullscreen(false)}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Minimize2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 p-3 overflow-hidden">
                <AdminRouteEditorDynamic
                  waypoints={routeDraft}
                  onChange={setRouteDraft}
                  height="calc(100vh - 72px)"
                />
              </div>
            </div>
          )}
        </>
      )}

    </AnimatePresence>

      {/* ══ MODAL : itinéraires enregistrés ══ */}
      {showItinModal && (
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
              <button
                onClick={() => setShowItinModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Filtre durée */}
            {r?.duree && (
              <div className="px-5 py-2.5 border-b border-border shrink-0 flex items-center justify-between bg-muted/30">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Clock size={10} />
                  {itinShowAll
                    ? `Tous les itinéraires (${itineraires.length})`
                    : `Vol ${r.duree} min — ${itineraires.filter(it => it.duree_estimee === r.duree).length} itinéraire${itineraires.filter(it => it.duree_estimee === r.duree).length !== 1 ? "s" : ""}`
                  }
                </p>
                <button
                  onClick={() => setItinShowAll(v => !v)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    itinShowAll
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {itinShowAll ? "Filtrer" : "Afficher tout"}
                </button>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto">
              {itinLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                </div>
              ) : itineraires.length === 0 ? (
                <div className="py-10 text-center px-5">
                  <p className="text-sm text-muted-foreground">Aucun itinéraire enregistré</p>
                  <a href="/admin/itineraires" className="mt-2 text-xs font-bold text-primary hover:underline block">
                    Créer des itinéraires →
                  </a>
                </div>
              ) : (() => {
                const filtered = itinShowAll || !r?.duree
                  ? itineraires
                  : itineraires.filter(it => it.duree_estimee === r.duree);
                if (filtered.length === 0) return (
                  <div className="py-10 text-center px-5">
                    <p className="text-sm text-muted-foreground">Aucun itinéraire pour {r?.duree} min</p>
                    <button
                      onClick={() => setItinShowAll(true)}
                      className="mt-2 text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      Afficher tous les itinéraires
                    </button>
                  </div>
                );
                const DUREE_LABELS: Record<number, string> = { 30: "30'", 60: "1h", 90: "1h30", 120: "2h" };
                const DUREE_COLORS: Record<number, { badge: string; bar: string }> = {
                  30:  { badge: "bg-sky-100 text-sky-700",         bar: "bg-sky-400"     },
                  60:  { badge: "bg-primary/10 text-primary",      bar: "bg-primary"     },
                  90:  { badge: "bg-violet-100 text-violet-700",   bar: "bg-violet-400"  },
                  120: { badge: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-400" },
                };
                return filtered.map((itin, i) => {
                  const col = itin.duree_estimee ? DUREE_COLORS[itin.duree_estimee] : null;
                  return (
                    <button
                      key={itin.id}
                      type="button"
                      onClick={() => applyItineraire(itin)}
                      className={`w-full text-left flex items-stretch hover:bg-primary/5 transition-colors cursor-pointer ${
                        i < filtered.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      {/* Color bar */}
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
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
