"use client";

import { useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, User, Phone, Mail, Calendar, Clock, Users, Weight,
  Ticket, CreditCard, CheckCircle2, XCircle, ChevronRight,
  Loader2, Send, Pencil, Check, MapPin, RefreshCw, AlertTriangle,
  Copy, ExternalLink,
} from "lucide-react";
import {
  updateStatutReservation,
  updateStatutReservationPerso,
  updateReservationDateHeure,
  updateReservationRoute,
  updateReservationFields,
  resendRoute,
  sendCustomEmail,
  resendPaymentLinkAdmin,
} from "@/lib/actions/reservations";
import { AdminBadge, STATUT_RESA, STATUT_PERSO } from "@/components/admin/ui/AdminBadge";

// Map fusionné : couvre standard + perso
const STATUT_MAP = { ...STATUT_RESA, ...STATUT_PERSO };

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
  acompte: number | null;
  payment_token: string | null;
  created_at: string;
  route?: string | null;
  route_token?: string | null;
  route_status?: string | null;
  route_feedback?: string | null;
  clients: {
    id: string;
    prenom: string;
    nom: string;
    email: string;
    telephone: string | null;
  } | null;
}


const ROUTE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  sent:                   { label: "En attente de validation", color: "bg-amber-50 text-amber-700 border-amber-200" },
  validated:              { label: "Validée ✓",               color: "bg-green-50 text-green-700 border-green-200" },
  modification_requested: { label: "Modification demandée",   color: "bg-red-50 text-red-700 border-red-200" },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
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

  // All-fields edit mode
  const [editingDetails, setEditingDetails] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [draftHeure, setDraftHeure] = useState("");
  const [draftDuree, setDraftDuree] = useState("");
  const [draftPassagers, setDraftPassagers] = useState("");
  const [draftPoids, setDraftPoids] = useState("");
  const [draftAcompte, setDraftAcompte] = useState("");

  // Route
  const [localRoute, setLocalRoute] = useState(reservation?.route ?? "");
  const [savedRoute, setSavedRoute] = useState(reservation?.route ?? "");
  const [localRouteStatus, setLocalRouteStatus] = useState(reservation?.route_status ?? null);
  const [localRouteFeedback] = useState(reservation?.route_feedback ?? null);

  // UI state
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showDateAlert, setShowDateAlert] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  // Reset when drawer opens with new reservation
  useEffect(() => {
    setLocalRoute(reservation?.route ?? "");
    setSavedRoute(reservation?.route ?? "");
    setLocalRouteStatus(reservation?.route_status ?? null);
    setShowDateAlert(false);
    setEditingDetails(false);
  }, [reservation?.id]);

  function showFeedback(msg: string, ok = true) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3500);
  }

  // ── Status change ──────────────────────────────────────────────────────────

  function doChangeStatut(statut: string) {
    if (!reservation) return;
    startTransition(async () => {
      // Auto-save unsaved route before confirming
      if (localRoute !== savedRoute && localRoute.trim()) {
        const sr = await updateReservationRoute(reservation.id, localRoute);
        if (sr.error) { showFeedback("Erreur sauvegarde route : " + sr.error, false); return; }
        setSavedRoute(localRoute);
      }
      const action = reservation.type_resa === "perso"
        ? updateStatutReservationPerso
        : updateStatutReservation;
      const r = await action(reservation.id, statut);
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      onStatusChange?.(reservation.id, statut);
      const emailStatuts = ["date_confirmee", "heure_confirmee", "vol_effectue"];
      showFeedback(emailStatuts.includes(statut) ? "Statut mis à jour, email envoyé ✓" : "Statut mis à jour");
      setShowDateAlert(false);
      if ((statut === "date_confirmee" || statut === "heure_confirmee") && (savedRoute.trim() || localRoute.trim())) {
        setLocalRouteStatus("sent");
      }
    });
  }

  function changeStatut(statut: string) {
    if (!reservation) return;
    const isStandard = reservation.type_resa !== "perso";
    if (statut === "heure_confirmee" && isStandard && !savedRoute.trim()) {
      showFeedback("Entrez et sauvegardez la route avant de confirmer l'heure", false);
      return;
    }
    if (statut === "date_confirmee" && isStandard && !savedRoute.trim()) {
      setShowDateAlert(true);
      return;
    }
    doChangeStatut(statut);
  }

  // ── All-fields edit ────────────────────────────────────────────────────────

  function openEditDetails() {
    if (!reservation) return;
    setDraftDate(reservation.date_vol);
    setDraftHeure(reservation.heure_vol?.slice(0, 5) ?? "");
    setDraftDuree(String(reservation.duree));
    setDraftPassagers(String(reservation.passagers));
    setDraftPoids(reservation.poids_total != null ? String(reservation.poids_total) : "");
    setDraftAcompte(reservation.acompte != null ? String(reservation.acompte) : "");
    setEditingDetails(true);
  }

  function saveDetails() {
    if (!reservation) return;
    startTransition(async () => {
      // Save date/heure if changed
      const dateChanged = draftDate && draftDate !== reservation.date_vol;
      const heureChanged = draftHeure !== (reservation.heure_vol?.slice(0, 5) ?? "");
      if (dateChanged || heureChanged) {
        const updates: Record<string, string> = {};
        if (dateChanged) updates.date_vol = draftDate;
        if (heureChanged) updates.heure_vol = draftHeure;
        const dr = await updateReservationDateHeure(reservation.id, updates);
        if (dr.error) { showFeedback("Erreur : " + dr.error, false); return; }
      }
      const fields: Parameters<typeof updateReservationFields>[1] = {
        duree: parseInt(draftDuree) || reservation.duree,
        passagers: parseInt(draftPassagers) || reservation.passagers,
        poids_total: draftPoids ? parseFloat(draftPoids) : null,
        acompte: draftAcompte ? parseFloat(draftAcompte) : null,
      };
      const r = await updateReservationFields(reservation.id, fields);
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      setEditingDetails(false);
      showFeedback("Informations sauvegardées ✓");
    });
  }

  // ── Route save / resend ────────────────────────────────────────────────────

  function saveRoute() {
    if (!reservation) return;
    startTransition(async () => {
      const r = await updateReservationRoute(reservation.id, localRoute);
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      setSavedRoute(localRoute);
      showFeedback("Route sauvegardée ✓");
    });
  }

  function doResendRoute() {
    if (!reservation) return;
    startTransition(async () => {
      const r = await resendRoute(reservation.id);
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      setLocalRouteStatus("sent");
      showFeedback("Route renvoyée, email envoyé ✓");
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

  function sendEmail_custom() {
    if (!reservation) return;
    startTransition(async () => {
      const r = await sendCustomEmail(reservation.id, emailSubject, emailBody);
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      showFeedback("Email envoyé ✓");
      setEmailOpen(false);
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
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-card border-l border-border shadow-[−8px_0_40px_rgba(17,51,86,.12)] z-50 flex flex-col"
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
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0">
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

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Client */}
              <div className="bg-secondary/50 rounded-xl p-4 space-y-2.5">
                <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[1.5px] mb-3">Client</p>
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
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[1.5px]">Vol</p>
                  {!editingDetails && (
                    <button
                      onClick={openEditDetails}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-secondary"
                    >
                      <Pencil size={10} />
                      Modifier
                    </button>
                  )}
                </div>

                {editingDetails ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Date du vol</p>
                        <input type="date" value={draftDate} onChange={e => setDraftDate(e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-navy/30" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Heure</p>
                        <input type="time" value={draftHeure} onChange={e => setDraftHeure(e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-navy/30" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Durée (min)</p>
                        <input type="number" value={draftDuree} onChange={e => setDraftDuree(e.target.value)} min={1}
                          className="w-full h-8 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-navy/30" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Passagers</p>
                        <input type="number" value={draftPassagers} onChange={e => setDraftPassagers(e.target.value)} min={1}
                          className="w-full h-8 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-navy/30" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Poids total (kg)</p>
                        <input type="number" value={draftPoids} onChange={e => setDraftPoids(e.target.value)} min={0} placeholder="—"
                          className="w-full h-8 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-navy/30" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Acompte (€)</p>
                        <input type="number" value={draftAcompte} onChange={e => setDraftAcompte(e.target.value)} min={0} placeholder="—"
                          className="w-full h-8 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-navy/30" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveDetails} disabled={isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-semibold hover:bg-navy/90 transition-colors disabled:opacity-50">
                        {isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                        Sauvegarder
                      </button>
                      <button onClick={() => setEditingDetails(false)}
                        className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors">
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
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
                      <Field label="Acompte">
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <CreditCard size={13} className="text-muted-foreground" />
                          {r.acompte} €
                        </div>
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
                    <Field label="Type">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary border border-border mt-0.5">
                        {r.type_resa === "standard" ? "Standard" : "Sur mesure"}
                      </span>
                    </Field>
                  </div>
                )}
              </div>

              {/* Route — standard only */}
              {isStandard && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[1.5px] flex items-center gap-1.5">
                      <MapPin size={11} />
                      Route
                    </p>
                    {routeStatusCfg && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${routeStatusCfg.color}`}>
                        {routeStatusCfg.label}
                      </span>
                    )}
                  </div>

                  <textarea
                    value={localRoute}
                    onChange={e => setLocalRoute(e.target.value)}
                    rows={3}
                    placeholder="Villes, coordonnées, infos supplémentaires…"
                    className="w-full px-2.5 py-2 rounded-lg border border-input bg-background text-xs resize-none focus:outline-none focus:ring-1 focus:ring-navy/30 placeholder:text-muted-foreground/40"
                  />

                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      onClick={saveRoute}
                      disabled={isPending || localRoute === savedRoute}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-semibold hover:bg-navy/90 transition-colors disabled:opacity-40"
                    >
                      {isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      Sauvegarder
                    </button>
                    {localRouteStatus && savedRoute.trim() && (
                      <button
                        onClick={doResendRoute}
                        disabled={isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-40"
                      >
                        <RefreshCw size={11} />
                        Renvoyer la route
                      </button>
                    )}
                  </div>

                  {localRouteStatus === "modification_requested" && localRouteFeedback && (
                    <div className="mt-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">Message du client</p>
                      <p className="text-xs text-amber-700 leading-relaxed">{localRouteFeedback}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Date confirmation alert */}
              <AnimatePresence>
                {showDateAlert && (
                  <motion.div
                    className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3"
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={15} className="text-orange-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-orange-800">Confirmer sans route ?</p>
                        <p className="text-xs text-orange-700 mt-0.5">
                          Aucune route n&apos;est définie. L&apos;email sera envoyé sans détail d&apos;itinéraire.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => doChangeStatut("date_confirmee")}
                        disabled={isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
                      >
                        {isPending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                        Confirmer quand même
                      </button>
                      <button onClick={() => setShowDateAlert(false)}
                        className="px-3 py-1.5 rounded-lg border border-orange-200 text-xs text-orange-700 hover:bg-orange-100 transition-colors">
                        Annuler
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Status actions */}
              {!showDateAlert && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[1.5px] mb-2">Actions</p>
                  <div className="space-y-2">

                    {/* en_attente → both date and time available */}
                    {r.statut === "en_attente" && (
                      <>
                        <button
                          onClick={() => changeStatut("date_confirmee")}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          Confirmer la date, envoyer l&apos;email
                        </button>
                        <button
                          onClick={() => changeStatut("heure_confirmee")}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          Confirmer date + heure, envoyer l&apos;email
                        </button>
                        {isStandard && !savedRoute.trim() && (
                          <p className="text-xs text-amber-600 flex items-center gap-1.5 px-1">
                            <AlertTriangle size={12} />
                            Route requise pour confirmer la date + heure
                          </p>
                        )}
                      </>
                    )}

                    {/* date_confirmee → confirm time only */}
                    {r.statut === "date_confirmee" && (
                      <>
                        <button
                          onClick={() => changeStatut("heure_confirmee")}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          Confirmer l&apos;heure, envoyer l&apos;email
                        </button>
                        {isStandard && !savedRoute.trim() && (
                          <p className="text-xs text-amber-600 flex items-center gap-1.5 px-1">
                            <AlertTriangle size={12} />
                            Ajoutez la route pour débloquer la confirmation d&apos;heure
                          </p>
                        )}
                        <button
                          onClick={() => changeStatut("en_attente")}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
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
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-purple-500 text-white text-sm font-semibold hover:bg-purple-600 transition-colors disabled:opacity-50"
                        >
                          {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          Marquer vol effectué
                        </button>
                        <button
                          onClick={() => changeStatut("date_confirmee")}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                        >
                          <ChevronRight size={14} className="rotate-180" />
                          Revenir planification
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
                        onClick={() => changeStatut("annulee")}
                        disabled={isPending}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-red-200 text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <XCircle size={14} />
                        Annuler la réservation
                      </button>
                    )}

                    {r.statut === "annulee" && (
                      <button
                        onClick={() => changeStatut("en_attente")}
                        disabled={isPending}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-navy text-white text-sm font-semibold hover:bg-navy-dk transition-colors disabled:opacity-50"
                      >
                        <ChevronRight size={14} />
                        Réactiver la réservation
                      </button>
                    )}

                    {/* payment_pending — lien + actions */}
                    {r.statut === "payment_pending" && (
                      <div className="space-y-2">
                        {/* Bloc lien de paiement */}
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
                                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-orange-200 text-xs font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
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
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
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
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-navy text-white text-sm font-semibold hover:bg-navy-dk transition-colors disabled:opacity-50"
                        >
                          <Check size={14} />
                          Marquer paiement reçu
                        </button>
                      </div>
                    )}

                    {r.statut === "acompte_recu" && (
                      <button
                        onClick={() => changeStatut("date_confirmee")}
                        disabled={isPending}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
                      >
                        {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Confirmer la date, envoyer l&apos;email
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Free email */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[1.5px] mb-2">Email libre</p>
                {emailOpen ? (
                  <div className="space-y-2.5 bg-secondary/40 rounded-xl p-3.5 border border-border">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">À</p>
                      <p className="text-xs text-foreground font-medium">{r.clients?.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Sujet</p>
                      <input
                        autoFocus
                        value={emailSubject}
                        onChange={e => setEmailSubject(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-navy/30"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Message</p>
                      <textarea
                        value={emailBody}
                        onChange={e => setEmailBody(e.target.value)}
                        rows={6}
                        className="w-full px-2.5 py-2 rounded-lg border border-input bg-background text-xs resize-none focus:outline-none focus:ring-1 focus:ring-navy/30"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={sendEmail_custom}
                        disabled={isPending || !emailSubject.trim() || !emailBody.trim()}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-semibold hover:bg-navy/90 transition-colors disabled:opacity-50"
                      >
                        {isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        Envoyer
                      </button>
                      <button
                        onClick={() => setEmailOpen(false)}
                        className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={openEmailComposer}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <Send size={14} />
                    Composer un email…
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border shrink-0">
              <p className="text-xs text-muted-foreground/50">
                Créée le {new Date(r.created_at).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
