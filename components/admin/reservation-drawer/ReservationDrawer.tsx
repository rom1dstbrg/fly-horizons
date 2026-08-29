"use client";

import { useState, useTransition, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Minimize2, Save, Copy, Loader2 } from "lucide-react";
import {
  updateStatutReservation,
  updateStatutReservationPerso,
  sendCustomEmail,
  setAvionReserve,
  recordCashPayment,
  resendPaymentLinkAdmin,
  sendPaymentLinkAdmin,
  sendRescheduleInvite,
  sendBoardingPassEmail,
  proposeSlot,
  setCashPayment,
} from "@/lib/actions/reservations";
import { AdminBadge, type BadgeVariant } from "@/components/admin/ui/AdminBadge";
import { getResaBadge } from "@/components/admin/ui/resaBadge";
import type { DrawerReservation, EmailTemplate } from "./types";
import { InfosTab } from "./InfosTab";
import { ModifierTab } from "./ModifierTab";
import { HistoriqueTab } from "./HistoriqueTab";
import { EmailComposer } from "./EmailComposer";
import { ItinerairesModal } from "./ItinerairesModal";
import { ActionFooter } from "./ActionFooter";
import { useReservationDraft } from "./hooks/useReservationDraft";
import { useBilanVol } from "./hooks/useBilanVol";
import { useRouteProposal } from "./hooks/useRouteProposal";
import { useReservationHistory } from "./hooks/useReservationHistory";
import { useItineraires } from "./hooks/useItineraires";

const AdminRouteEditorDynamic = dynamic(
  () => import("@/components/admin/AdminRouteEditor").then(m => ({ default: m.AdminRouteEditor })),
  { ssr: false, loading: () => <div className="h-[280px] rounded-lg bg-secondary animate-pulse" /> }
);

export function ReservationDrawer({
  reservation,
  onClose,
  onStatusChange,
  onFieldsChange,
  viewerRole = "admin",
}: {
  reservation: DrawerReservation | null;
  onClose: () => void;
  onStatusChange?: (id: string, newStatut: string) => void;
  onFieldsChange?: (id: string, fields: Partial<DrawerReservation>) => void;
  // Un pilote gère ses propres demandes (marketplace) avec ce même drawer, mais
  // sans les sections internes à l'admin (bilan financier, réservation NewCAG).
  viewerRole?: "admin" | "pilote";
}) {
  const isPerso = reservation?.type_resa === "perso";

  const [isPending, startTransition] = useTransition();
  const [isReservePending, startReserveTransition] = useTransition();
  const [isCashPending, startCashTransition] = useTransition();
  const [isProposePending, startProposeTransition] = useTransition();
  const [isCashPaymentPending, startCashPaymentTransition] = useTransition();
  const [avionReserve, setAvionReserveLocal] = useState(reservation?.avion_reserve ?? false);
  const [cashPayment, setCashPaymentLocal] = useState(reservation?.cash_payment ?? false);
  const [activeTab, setActiveTab] = useState<"infos" | "modifier" | "historique">("infos");
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [includeReschedule, setIncludeReschedule] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  function showFeedback(msg: string, ok = true) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3500);
  }

  const draft = useReservationDraft(reservation, showFeedback, fields => {
    if (reservation) onFieldsChange?.(reservation.id, fields);
  });
  const bilan = useBilanVol(reservation, showFeedback);
  const route = useRouteProposal(reservation, showFeedback, onFieldsChange);
  const history = useReservationHistory(reservation, activeTab);
  const itineraires = useItineraires(route.setRouteDraft);

  useEffect(() => {
    if (!reservation) return;
    setAvionReserveLocal(reservation.avion_reserve ?? false);
    setCashPaymentLocal(reservation.cash_payment ?? false);
    setActiveTab("infos");
    setEmailOpen(false);
    setIncludeReschedule(false);
    setMapFullscreen(false);
    bilan.reset(reservation);
    route.reset(reservation);
    history.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservation?.id]);

  // ── Status change ────────────────────────────────────────────────────────

  function doChangeStatut(statut: string) {
    if (!reservation) return;
    startTransition(async () => {
      const r = isPerso
        ? await updateStatutReservationPerso(reservation.id, statut)
        : await updateStatutReservation(reservation.id, statut);
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      onStatusChange?.(reservation.id, statut);
      if (r.emailError) {
        showFeedback("Statut mis à jour · email non envoyé, réessayez", false);
      } else {
        const emailStatuts = ["acompte_recu", "date_confirmee", "heure_confirmee", "vol_effectue", "annulee"];
        showFeedback(emailStatuts.includes(statut) ? "Statut mis à jour, email envoyé ✓" : "Statut mis à jour");
      }
    });
  }

  // "Confirmer date + heure" / "Confirmer l'heure" — pour le standard, envoie la route
  // dans le même geste si elle n'a jamais été envoyée ou a changé depuis (§1bis du plan).
  function doConfirmHeureConfirmee() {
    if (!reservation) return;
    if (isPerso) { doChangeStatut("heure_confirmee"); return; }
    startTransition(async () => {
      const needsRoute = route.hasUnsentChanges();
      const routePayload = needsRoute
        ? { waypoints: route.parsedWaypoints(), comment: route.routeComment }
        : undefined;
      const r = await updateStatutReservation(reservation.id, "heure_confirmee", routePayload);
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      onStatusChange?.(reservation.id, "heure_confirmee");
      if (needsRoute) route.setLocalRouteStatus("sent");
      if (r.emailError) {
        showFeedback("Statut mis à jour · email non envoyé, réessayez", false);
      } else {
        showFeedback(needsRoute ? "Créneau confirmé, route envoyée dans le même email ✓" : "Statut mis à jour, email envoyé ✓");
      }
    });
  }

  function doSendPaymentLink() {
    if (!reservation) return;
    startTransition(async () => {
      const res = await sendPaymentLinkAdmin(reservation.id);
      if (res.error) { showFeedback("Erreur : " + res.error, false); return; }
      onStatusChange?.(reservation.id, "payment_pending");
      showFeedback(res.emailError ? "Statut mis à jour · email non envoyé, réessayez" : "Lien de paiement envoyé ✓", !res.emailError);
    });
  }

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

  function doSendRescheduleInvite() {
    if (!reservation) return;
    startTransition(async () => {
      const r = await sendRescheduleInvite(reservation.id);
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      showFeedback(r.emailError ? "Lien de report créé · email non envoyé, réessayez" : "Email de report envoyé au client ✓", !r.emailError);
    });
  }

  function doSendBoardingPass() {
    if (!reservation) return;
    startTransition(async () => {
      const r = await sendBoardingPassEmail(reservation.id);
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      showFeedback("Boarding pass envoyé au client ✓");
    });
  }

  function doRecordCash(amount: number) {
    if (!reservation) return;
    startCashTransition(async () => {
      const res = await recordCashPayment(reservation.id, amount);
      if (res.error) { showFeedback("Erreur : " + res.error, false); return; }
      onStatusChange?.(reservation.id, "acompte_recu");
      onFieldsChange?.(reservation.id, { paye: amount, payment_status: "paid" });
      showFeedback(res.emailError ? "Paiement cash enregistré · email non envoyé, réessayez" : "Paiement cash enregistré ✓", !res.emailError);
    });
  }

  function doToggleAvion(val: boolean) {
    if (!reservation) return;
    startReserveTransition(async () => {
      await setAvionReserve(reservation.id, val);
      setAvionReserveLocal(val);
    });
  }

  function doProposeSlot(date: string, heure: string) {
    if (!reservation) return;
    startProposeTransition(async () => {
      const r = await proposeSlot(reservation.id, date, heure);
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      onFieldsChange?.(reservation.id, { slot_proposal_token: r.token, slot_proposal_date: date, slot_proposal_heure: heure });
      showFeedback(r.emailError ? "Créneau proposé · email non envoyé, réessayez" : "Créneau proposé au client ✓", !r.emailError);
    });
  }

  function doToggleCashPayment(val: boolean) {
    if (!reservation) return;
    startCashPaymentTransition(async () => {
      const r = await setCashPayment(reservation.id, val);
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      setCashPaymentLocal(val);
      onFieldsChange?.(reservation.id, { cash_payment: val });
    });
  }

  // ── Email libre ──────────────────────────────────────────────────────────

  function openEmailComposer() {
    if (!reservation) return;
    const dateStr = new Date(reservation.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    setEmailSubject(`Fly Horizons · Votre vol du ${dateStr}`);
    setEmailBody(`Bonjour ${reservation.clients?.prenom ?? ""},\n\n\n\nCordialement,\nL'équipe Fly Horizons`);
    setEmailOpen(true);
  }

  function applyTemplate(tpl: EmailTemplate, includeReschedule: boolean) {
    if (!reservation) return;
    const dateStr = new Date(reservation.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const prenom = reservation.clients?.prenom ?? "";
    setEmailSubject(tpl.subject(dateStr));
    setEmailBody(tpl.body(prenom, dateStr));
    setIncludeReschedule(tpl.includeReschedule ?? includeReschedule);
    setEmailOpen(true);
  }

  function sendEmailCustom() {
    if (!reservation) return;
    startTransition(async () => {
      const r = await sendCustomEmail(reservation.id, emailSubject, emailBody, includeReschedule);
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      showFeedback("Email envoyé ✓");
      setEmailOpen(false);
      setIncludeReschedule(false);
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const r = reservation;
  const statut = r ? getResaBadge(r) : null;
  const hasRoute = !!route.localRouteStatus || route.routeDraft.length > 0;

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
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    {statut && <AdminBadge variant={statut.variant} label={statut.label} />}
                    <span className="text-xs text-muted-foreground font-mono">#{r.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{r.clients?.prenom} {r.clients?.nom}</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <AnimatePresence>
                {feedback && (
                  <motion.div
                    className={`mx-4 mt-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 shrink-0 border ${
                      feedback.ok ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
                    }`}
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  >
                    <Check size={13} /> {feedback.msg}
                  </motion.div>
                )}
              </AnimatePresence>

              {!emailOpen && (
                <div className="flex border-b border-border shrink-0">
                  {(["infos", "modifier", "historique"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                        activeTab === tab ? "text-navy border-b-2 border-navy -mb-px" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab === "infos" ? "Infos" : tab === "modifier" ? "Modifier" : "Historique"}
                    </button>
                  ))}
                </div>
              )}

              {!emailOpen && activeTab === "infos" && (
                <InfosTab
                  reservation={r}
                  viewerRole={viewerRole}
                  avionReserve={avionReserve}
                  isReservePending={isReservePending}
                  onToggleAvion={doToggleAvion}
                  bilan={bilan}
                  route={{
                    routeDraft: route.routeDraft,
                    setRouteDraft: route.setRouteDraft,
                    routeComment: route.routeComment,
                    setRouteComment: route.setRouteComment,
                    proposalLoaded: route.proposalLoaded,
                    localRouteStatus: route.localRouteStatus,
                    localRouteFeedback: route.localRouteFeedback,
                    routeStats: route.routeStats,
                    isPending: route.isPending,
                    foreFlightCopied: route.foreFlightCopied,
                    saveRoute: route.saveRoute,
                    sendRoute: route.sendRoute,
                    copyForeFlight: route.copyForeFlight,
                    openItineraires: itineraires.open,
                    openFullscreen: () => setMapFullscreen(true),
                  }}
                  linkCopied={linkCopied}
                  onCopyPaymentLink={copyPaymentLink}
                  onOpenEmailComposer={openEmailComposer}
                  onApplyTemplate={applyTemplate}
                  isPending={isPending}
                  cashPayment={cashPayment}
                  isCashPaymentPending={isCashPaymentPending}
                  onToggleCashPayment={doToggleCashPayment}
                />
              )}

              {!emailOpen && activeTab === "modifier" && (
                <ModifierTab
                  reservation={r}
                  fields={draft.fields}
                  setters={draft.setters}
                />
              )}

              {!emailOpen && activeTab === "historique" && (
                <HistoriqueTab loading={history.loading} loaded={history.loaded} items={history.items} />
              )}

              {emailOpen && (
                <EmailComposer
                  reservation={r}
                  subject={emailSubject}
                  setSubject={setEmailSubject}
                  body={emailBody}
                  setBody={setEmailBody}
                  includeReschedule={includeReschedule}
                  setIncludeReschedule={setIncludeReschedule}
                  isPending={isPending}
                  onSend={sendEmailCustom}
                  onCancel={() => { setEmailOpen(false); setIncludeReschedule(false); }}
                />
              )}

              {!emailOpen && (
                <ActionFooter
                  reservation={r}
                  activeTab={activeTab}
                  isPending={isPending}
                  isCashPending={isCashPending}
                  isProposePending={isProposePending}
                  hasRoute={hasRoute}
                  onChangeStatut={doChangeStatut}
                  onConfirmHeureConfirmee={doConfirmHeureConfirmee}
                  onSendReschedule={doSendRescheduleInvite}
                  onSendBoardingPass={doSendBoardingPass}
                  onSendPaymentLink={doSendPaymentLink}
                  onResendPaymentLink={doResendPaymentLink}
                  onRecordCash={doRecordCash}
                  onProposeSlot={doProposeSlot}
                  modifier={{ isPending: draft.isPending, save: draft.save }}
                />
              )}
            </motion.aside>

            {mapFullscreen && (
              <div className="fixed inset-0 z-[200] flex flex-col bg-[#0b1a28]">
                <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border shrink-0">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    Tracé de route
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={route.saveRoute}
                      disabled={route.isPending || route.routeDraft.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-semibold hover:brightness-90 transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      {route.isPending ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                      Sauvegarder
                    </button>
                    <button
                      onClick={route.copyForeFlight}
                      disabled={route.routeDraft.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <Copy size={11} />
                      {route.foreFlightCopied ? "Copié !" : "ForeFlight"}
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
                  <AdminRouteEditorDynamic waypoints={route.routeDraft} onChange={route.setRouteDraft} height="calc(100vh - 72px)" />
                </div>
              </div>
            )}
          </>
        )}
      </AnimatePresence>

      <ItinerairesModal
        open={itineraires.showModal}
        onClose={() => itineraires.setShowModal(false)}
        duree={r?.duree}
        items={itineraires.items}
        loading={itineraires.loading}
        showAll={itineraires.showAll}
        setShowAll={itineraires.setShowAll}
        onApply={itineraires.apply}
      />
    </>
  );
}

export type { DrawerReservation };
