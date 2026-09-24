"use client";

import { useState, useTransition, useEffect, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertTriangle, Info, Route as RouteIcon, MessageSquare, FolderOpen } from "lucide-react";
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
  setReservationHeure,
} from "@/lib/actions/reservations";
import { DateTile, PillTabs, SheetCloseButton } from "@/components/pilote/studio";
import { ResaBadge } from "@/components/pilote/ResaBadge";
import type { DrawerReservation, EmailTemplate, Tab } from "./types";
import { OverviewTab } from "./OverviewTab";
import { RouteTab, RouteEditorFullscreen } from "./RouteTab";
import { MessagesTab } from "./MessagesTab";
import { DossierTab } from "./DossierTab";
import { EmailComposer } from "./EmailComposer";
import { ItinerairesModal } from "./ItinerairesModal";
import { ConfirmActionDialog, type PendingAction } from "./ConfirmActionDialog";
// Bloc C (mise en jeu premier-arrivé, flight_offers) reste GELÉ — pivot 08/09,
// cf. mémoire project_marketplace_legal_risk. Bloc B (assignation manuelle
// d'un vol standard) réactivé le 19/09, sans la mise en jeu. Bloc D réactivé
// pour les annonces pilote (règlement par virement direct) via
// AnnoncePiloteActions — voir décision 08/09 soir.
import { AnnoncePiloteActions } from "./AnnoncePiloteActions";
import { PiloteAssignBlock } from "./PiloteAssignBlock";
import { useReservationDraft } from "./hooks/useReservationDraft";
import { useBilanVol } from "./hooks/useBilanVol";
import { useRouteProposal } from "./hooks/useRouteProposal";
import { useReservationHistory } from "./hooks/useReservationHistory";
import { useReservationMessages } from "./hooks/useReservationMessages";
import { useItineraires } from "./hooks/useItineraires";

// ── Tiroir d'un vol (admin + pilote) — maquette v2 validée le 24/09 ────────
// En-tête d'une ligne, 4 onglets à pastille glissante (Aperçu, Route,
// Messages, Dossier ; libellé sur l'onglet actif seulement). La frise et la
// « prochaine étape » vivent dans Aperçu ; les autres onglets ont toute la
// hauteur. Toute action qui écrit au client passe par une fenêtre de
// confirmation qui dit ce qu'elle déclenche. La route se trace en plein écran.
// Téléphone : feuille qui monte du bas ; bureau : panneau flottant.
const SM_QUERY = "(min-width: 640px)";
function useIsSmUp() {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(SM_QUERY); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(SM_QUERY).matches,
    () => true,
  );
}

const TABS: { key: Tab; label: string; icon: typeof Info }[] = [
  { key: "apercu", label: "Aperçu", icon: Info },
  { key: "route", label: "Route", icon: RouteIcon },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "dossier", label: "Dossier", icon: FolderOpen },
];

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
  // Un pilote gère ses propres vols avec ce même tiroir, sans les outils
  // internes à l'admin (bilan financier, NewCAG, email libre, Stripe).
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
  const [activeTab, setActiveTab] = useState<Tab>("apercu");
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
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
  // L'historique se charge à l'ouverture de Dossier (il y vit depuis la refonte).
  const history = useReservationHistory(reservation, activeTab === "dossier" ? "historique" : activeTab);
  const messages = useReservationMessages(reservation, activeTab);
  const itineraires = useItineraires(route.setRouteDraft);

  useEffect(() => {
    if (!reservation) return;
    setAvionReserveLocal(reservation.avion_reserve ?? false);
    setCashPaymentLocal(reservation.cash_payment ?? false);
    setActiveTab("apercu");
    setEmailOpen(false);
    setIncludeReschedule(false);
    setEditorOpen(false);
    setPendingAction(null);
    bilan.reset(reservation);
    route.reset(reservation);
    history.reset();
    messages.reset();
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

  // « Confirmer le créneau » : pour le standard, envoie la route dans le même
  // geste si elle n'a jamais été envoyée ou a changé depuis (§1bis du plan).
  // `time` : heure choisie dans la fenêtre de confirmation (elle est d'abord
  // enregistrée, puis la confirmation part avec).
  function doConfirmHeureConfirmee(time?: string) {
    if (!reservation) return;
    startTransition(async () => {
      if (time && time !== reservation.heure_vol?.slice(0, 5)) {
        const h = await setReservationHeure(reservation.id, time);
        if (h.error) { showFeedback("Erreur : " + h.error, false); return; }
        onFieldsChange?.(reservation.id, { heure_vol: time });
      }
      if (isPerso) {
        const r = await updateStatutReservationPerso(reservation.id, "heure_confirmee");
        if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
        onStatusChange?.(reservation.id, "heure_confirmee");
        showFeedback(r.emailError ? "Statut mis à jour · email non envoyé, réessayez" : "Statut mis à jour, email envoyé ✓", !r.emailError);
        return;
      }
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
  const isSmUp = useIsSmUp();
  const isAdmin = viewerRole === "admin";
  const hasRoute = !!route.localRouteStatus || route.routeDraft.length > 0 || !!r?.products?.route_waypoints?.length;

  function runConfirmed(time?: string) {
    if (!pendingAction) return;
    pendingAction.run(time);
    setPendingAction(null);
  }

  const subtitle = r
    ? [
        r.type_resa === "annonce_pilote" ? "Annonce" : r.type_resa === "perso" ? "Vol perso" : "Standard",
        new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" }),
        `${r.duree} min`,
        `#${r.id.slice(0, 8).toUpperCase()}`,
      ].join(" · ")
    : "";

  return (
    <>
      <AnimatePresence>
        {r && (
          <>
            <motion.div
              className="fixed inset-0 z-[70] bg-st-ink/20 backdrop-blur-[1.5px]"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
            />

            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={`Vol de ${r.clients?.prenom ?? ""} ${r.clients?.nom ?? ""}`}
              className={`pilote-studio fixed inset-x-0 bottom-0 top-[max(3.5rem,env(safe-area-inset-top))] z-[70] flex flex-col overflow-hidden rounded-t-[26px] bg-white font-sans text-st-text shadow-[0_-16px_40px_-16px_rgba(15,17,23,0.3)] sm:inset-x-auto sm:bottom-3 sm:right-3 sm:top-3 sm:w-[calc(100%-1.5rem)] sm:rounded-[22px] sm:shadow-st-panel ${emailOpen ? "sm:max-w-[560px]" : "sm:max-w-[460px]"}`}
              initial={isSmUp ? { x: "calc(100% + 24px)" } : { y: "100%" }}
              animate={isSmUp ? { x: 0 } : { y: 0 }}
              exit={isSmUp ? { x: "calc(100% + 24px)" } : { y: "100%" }}
              transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
            >
              <div className="mx-auto mt-2.5 h-1 w-[38px] shrink-0 rounded-full bg-st-line-strong sm:hidden" />

              {/* En-tête d'une ligne */}
              <div className="flex shrink-0 items-center gap-3 px-[18px] pb-3 pt-3 sm:pt-4">
                <DateTile date={r.date_vol} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15.5px] font-semibold text-st-text">{r.clients?.prenom} {r.clients?.nom}</p>
                  <p className="truncate text-[12px] text-st-muted">{subtitle}</p>
                </div>
                <span className="max-[380px]:hidden"><ResaBadge reservation={r} /></span>
                <SheetCloseButton onClick={emailOpen ? () => { setEmailOpen(false); setIncludeReschedule(false); } : onClose} />
              </div>

              {emailOpen ? (
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
              ) : (
                <>
                  <PillTabs
                    className="mx-[18px] shrink-0"
                    value={activeTab}
                    onChange={setActiveTab}
                    items={TABS.map((t) => ({ ...t, count: t.key === "messages" ? messages.messages.length : undefined }))}
                  />

                  {activeTab === "messages" ? (
                    <MessagesTab
                      key="messages"
                      reservation={r}
                      messages={messages.messages}
                      loading={messages.loading}
                      onOptimisticAdd={messages.append}
                      onOptimisticRemove={messages.removeById}
                      onSent={messages.reset}
                    />
                  ) : (
                    <div key={activeTab} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[18px] pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200">
                      {activeTab === "apercu" && (
                        <OverviewTab
                          reservation={r}
                          viewerRole={viewerRole}
                          routeStatus={route.localRouteStatus}
                          hasRoute={hasRoute}
                          isPending={isPending}
                          isCashPending={isCashPending}
                          isProposePending={isProposePending}
                          avionReserve={avionReserve}
                          isReservePending={isReservePending}
                          onToggleAvion={doToggleAvion}
                          cashPayment={cashPayment}
                          isCashPaymentPending={isCashPaymentPending}
                          onToggleCashPayment={doToggleCashPayment}
                          linkCopied={linkCopied}
                          onCopyPaymentLink={copyPaymentLink}
                          ask={setPendingAction}
                          onConfirmSlot={doConfirmHeureConfirmee}
                          onChangeStatut={doChangeStatut}
                          onSendPaymentLink={doSendPaymentLink}
                          onResendPaymentLink={doResendPaymentLink}
                          onSendBoardingPass={doSendBoardingPass}
                          onSendReschedule={doSendRescheduleInvite}
                          onRecordCash={doRecordCash}
                          onProposeSlot={doProposeSlot}
                          onGoTo={setActiveTab}
                          annonceSlot={
                            r.type_resa === "annonce_pilote" ? (
                              <AnnoncePiloteActions
                                reservationId={r.id}
                                statut={r.statut}
                                piloteePaye={r.pilote_paye === true}
                                montant={r.acompte ?? null}
                                dateVol={r.date_vol}
                                heureVol={r.heure_vol}
                                viewerRole={viewerRole}
                                onStatusChange={onStatusChange}
                                onFieldsChange={onFieldsChange}
                                ask={setPendingAction}
                              />
                            ) : undefined
                          }
                          assignSlot={
                            isAdmin && r.type_resa === "standard" && r.statut !== "annulee" ? (
                              <PiloteAssignBlock
                                reservationId={r.id}
                                currentPiloteId={r.pilote_id}
                                clientPrenom={r.clients?.prenom ?? ""}
                                dateVol={r.date_vol}
                                onChanged={(piloteId, piloteNom) =>
                                  onFieldsChange?.(r.id, { pilote_id: piloteId, pilotes: piloteNom ? { nom: piloteNom } : null })
                                }
                              />
                            ) : undefined
                          }
                        />
                      )}

                      {activeTab === "route" && (
                        <RouteTab reservation={r} route={route} onOpenEditor={() => setEditorOpen(true)} onOpenItineraires={itineraires.open} />
                      )}

                      {activeTab === "dossier" && (
                        <DossierTab
                          reservation={r}
                          viewerRole={viewerRole}
                          fields={draft.fields}
                          setters={draft.setters}
                          isSaving={draft.isPending}
                          onSave={draft.save}
                          onSavePassagersPoids={draft.savePassagersPoids}
                          history={{ loading: history.loading, loaded: history.loaded, items: history.items }}
                          bilan={bilan}
                          isPending={isPending}
                          onApplyTemplate={applyTemplate}
                          onOpenEmailComposer={openEmailComposer}
                          ask={setPendingAction}
                        />
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Retour d'une action : petite pastille en bas du tiroir */}
              <AnimatePresence>
                {feedback && (
                  <motion.div
                    className="pointer-events-none absolute inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-10 flex justify-center px-4"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  >
                    <p className={`flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold shadow-st-lg ${feedback.ok ? "bg-st-ink text-white" : "bg-st-bad text-white"}`}>
                      {feedback.ok ? <Check size={14} /> : <AlertTriangle size={14} />}
                      {feedback.msg}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {r && (
        <RouteEditorFullscreen
          open={editorOpen}
          reservation={r}
          route={route}
          onClose={() => setEditorOpen(false)}
          onOpenItineraires={itineraires.open}
          ask={setPendingAction}
        />
      )}

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

      <ConfirmActionDialog
        action={pendingAction}
        isPending={isPending || route.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={runConfirmed}
      />
    </>
  );
}

export type { DrawerReservation };
