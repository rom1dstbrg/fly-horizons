"use client";

import { useState } from "react";
import {
  Send, Check, ChevronRight, XCircle, CheckCircle2, RotateCcw,
  Loader2, AlertTriangle, Banknote, X, CalendarClock, Ticket,
} from "lucide-react";
import type { DrawerReservation, Tab } from "./types";
import { ConfirmActionDialog, type PendingAction } from "./ConfirmActionDialog";

const TERMINAL_STATUTS = ["vol_effectue", "annulee"];

// Palette du footer, volontairement réduite à 3 usages :
// navy = action principale (une seule à la fois) · neutre = tout le reste · rouge = destructif uniquement.
const primaryBtn = "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-navy text-white text-sm font-semibold hover:brightness-90 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap";
const chipBtn = "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground text-xs font-semibold hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap";
const chipDanger = "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap";

function CashChip({ acompte, isCashPending, onRecordCash }: {
  acompte: number;
  isCashPending: boolean;
  onRecordCash: (amount: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(acompte));

  if (!open) {
    return (
      <button onClick={() => { setAmount(String(acompte)); setOpen(true); }} className={chipBtn}>
        <Banknote size={13} />
        Encaisser
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-secondary">
      <input
        type="number" min={0} step={0.01} autoFocus
        value={amount}
        onChange={e => setAmount(e.target.value)}
        className="w-20 h-7 px-2 rounded-md border border-border bg-white text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-navy/30"
      />
      <span className="text-xs text-muted-foreground font-semibold">€</span>
      <button
        onClick={() => { const a = parseFloat(amount); if (a > 0) { onRecordCash(a); setOpen(false); } }}
        disabled={isCashPending || !amount || parseFloat(amount) <= 0}
        title="Confirmer l'encaissement"
        className="flex items-center justify-center w-7 h-7 rounded-md bg-navy text-white hover:brightness-90 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {isCashPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
      </button>
      <button
        onClick={() => setOpen(false)}
        title="Annuler"
        className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
      >
        <X size={12} />
      </button>
    </div>
  );
}

function ProposeSlotChip({ currentDate, currentHeure, isPending, onProposeSlot }: {
  currentDate: string;
  currentHeure: string | null;
  isPending: boolean;
  onProposeSlot: (date: string, heure: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(currentDate);
  const [heure, setHeure] = useState(currentHeure ?? "");

  if (!open) {
    return (
      <button onClick={() => { setDate(currentDate); setHeure(currentHeure ?? ""); setOpen(true); }} className={chipBtn}>
        <CalendarClock size={13} />
        Proposer un créneau
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-secondary">
      <input
        type="date" autoFocus
        value={date}
        onChange={e => setDate(e.target.value)}
        className="h-7 px-2 rounded-md border border-border bg-white text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-navy/30"
      />
      <input
        type="time"
        value={heure}
        onChange={e => setHeure(e.target.value)}
        className="h-7 px-2 rounded-md border border-border bg-white text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-navy/30"
      />
      <button
        onClick={() => { if (date && heure) { onProposeSlot(date, heure); setOpen(false); } }}
        disabled={isPending || !date || !heure}
        title="Envoyer la proposition"
        className="flex items-center justify-center w-7 h-7 rounded-md bg-navy text-white hover:brightness-90 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
      </button>
      <button
        onClick={() => setOpen(false)}
        title="Annuler"
        className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
      >
        <X size={12} />
      </button>
    </div>
  );
}

export function ActionFooter({
  reservation: r,
  activeTab,
  isPending,
  isCashPending,
  isProposePending,
  hasRoute,
  onChangeStatut,
  onConfirmHeureConfirmee,
  onSendReschedule,
  onSendBoardingPass,
  onSendPaymentLink,
  onResendPaymentLink,
  onRecordCash,
  onProposeSlot,
  modifier,
}: {
  reservation: DrawerReservation;
  activeTab: Tab;
  isPending: boolean;
  isCashPending: boolean;
  isProposePending: boolean;
  hasRoute: boolean;
  onChangeStatut: (statut: string) => void;
  onConfirmHeureConfirmee: () => void;
  onSendReschedule: () => void;
  onSendBoardingPass: () => void;
  onSendPaymentLink: () => void;
  onResendPaymentLink: () => void;
  onRecordCash: (amount: number) => void;
  onProposeSlot: (date: string, heure: string) => void;
  modifier: { isPending: boolean; save: () => void };
}) {
  const isStandard = r.type_resa !== "perso";
  const isTerminal = TERMINAL_STATUTS.includes(r.statut);
  const showCash = !isTerminal && r.acompte != null && (r.paye ?? 0) < r.acompte;

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  function confirm(action: PendingAction) { setPendingAction(action); }
  function runConfirmed() {
    if (!pendingAction) return;
    pendingAction.run();
    setPendingAction(null);
  }

  const dialog = (
    <ConfirmActionDialog
      action={pendingAction}
      isPending={isPending}
      onCancel={() => setPendingAction(null)}
      onConfirm={runConfirmed}
    />
  );

  if (activeTab === "modifier") {
    return (
      <div className="px-5 pt-3 border-t border-border shrink-0 flex justify-end pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <button onClick={modifier.save} disabled={modifier.isPending} className={primaryBtn}>
          {modifier.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Sauvegarder les modifications
        </button>
      </div>
    );
  }

  if (activeTab === "historique") return null;

  return (
    <div className="border-t border-border shrink-0 bg-card">
      {isStandard && !hasRoute && !isTerminal && (
        <p className="text-xs text-amber-600 flex items-center gap-1.5 px-5 pt-2.5">
          <AlertTriangle size={12} className="shrink-0" />
          Tracez une route sur la carte avant de confirmer — elle sera envoyée avec la confirmation
        </p>
      )}

      {/* Actions principales — spécifiques au statut */}
      <div className={`flex items-center gap-2 px-5 pt-2.5 flex-wrap ${isTerminal ? "pb-[calc(0.625rem+env(safe-area-inset-bottom))]" : "pb-2.5"}`}>
        {r.statut === "payment_pending" && (
          <>
            <button
              onClick={() => confirm({
                title: "Marquer le paiement reçu ?",
                description: "Le client recevra un email confirmant que son paiement a bien été enregistré.",
                confirmLabel: "Marquer reçu et envoyer",
                run: () => onChangeStatut("acompte_recu"),
              })}
              disabled={isPending}
              className={primaryBtn}
            >
              <Check size={14} />
              Marquer paiement reçu
            </button>
            <button
              onClick={() => confirm({
                title: "Renvoyer le lien de paiement ?",
                description: "Le client recevra à nouveau l'email avec son lien de paiement Stripe.",
                confirmLabel: "Renvoyer",
                run: onResendPaymentLink,
              })}
              disabled={isPending}
              className={chipBtn}
            >
              {isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Renvoyer le lien
            </button>
          </>
        )}

        {(r.statut === "en_attente" || r.statut === "acompte_recu" || r.statut === "demande_recue") && (
          <>
            <button
              onClick={() => confirm({
                title: "Confirmer date et heure ?",
                description: "Le client recevra un email confirmant son créneau (avec la route et le boarding pass si le vol est prêt).",
                confirmLabel: "Confirmer et envoyer",
                run: onConfirmHeureConfirmee,
              })}
              disabled={isPending}
              className={primaryBtn}
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Confirmer date + heure
            </button>
            {isStandard && (r.statut === "en_attente" || r.statut === "demande_recue") && (
              <button
                onClick={() => confirm({
                  title: "Envoyer le lien de paiement ?",
                  description: "Le client recevra un email avec son lien de paiement Stripe.",
                  confirmLabel: "Envoyer",
                  run: onSendPaymentLink,
                })}
                disabled={isPending}
                className={chipBtn}
              >
                {isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Lien de paiement
              </button>
            )}
            {r.statut === "demande_recue" && (
              r.slot_proposal_token
                ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-secondary text-xs font-semibold text-muted-foreground">
                    <CalendarClock size={13} />
                    Créneau proposé, en attente de réponse
                  </span>
                )
                : (
                  <ProposeSlotChip
                    currentDate={r.date_vol}
                    currentHeure={r.heure_vol}
                    isPending={isProposePending}
                    onProposeSlot={onProposeSlot}
                  />
                )
            )}
          </>
        )}

        {r.statut === "date_confirmee" && (
          <>
            <button
              onClick={() => confirm({
                title: "Confirmer l'heure ?",
                description: "Le client recevra un email confirmant l'heure de son vol (avec la route et le boarding pass si le vol est prêt).",
                confirmLabel: "Confirmer et envoyer",
                run: onConfirmHeureConfirmee,
              })}
              disabled={isPending}
              className={primaryBtn}
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Confirmer l&apos;heure
            </button>
            <button onClick={() => onChangeStatut("en_attente")} disabled={isPending} className={chipBtn}>
              <ChevronRight size={13} className="rotate-180" />
              Revenir en attente
            </button>
          </>
        )}

        {r.statut === "heure_confirmee" && (
          <>
            <button
              onClick={() => confirm({
                title: "Marquer le vol comme effectué ?",
                description: "Le client recevra un email de remerciement avec une demande d'avis de satisfaction.",
                confirmLabel: "Marquer effectué et envoyer",
                run: () => onChangeStatut("vol_effectue"),
              })}
              disabled={isPending}
              className={primaryBtn}
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Marquer vol effectué
            </button>
            {hasRoute && (
              <button
                onClick={() => confirm({
                  title: "Envoyer le boarding pass ?",
                  description: "Le client recevra son boarding pass par email, en pièce jointe PDF.",
                  confirmLabel: "Envoyer",
                  run: onSendBoardingPass,
                })}
                disabled={isPending}
                className={chipBtn}
              >
                {isPending ? <Loader2 size={13} className="animate-spin" /> : <Ticket size={13} />}
                Envoyer le boarding pass
              </button>
            )}
            <button onClick={() => onChangeStatut("en_attente")} disabled={isPending} className={chipBtn}>
              <ChevronRight size={13} className="rotate-180" />
              Revenir en attente
            </button>
          </>
        )}

        {r.statut === "vol_effectue" && (
          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium">
            <CheckCircle2 size={14} className="text-emerald-600" />
            Vol effectué, dossier clôturé
          </span>
        )}

        {r.statut === "annulee" && (
          <button onClick={() => onChangeStatut("en_attente")} disabled={isPending} className={primaryBtn}>
            <ChevronRight size={14} />
            Réactiver la réservation
          </button>
        )}

        {showCash && r.acompte != null && (
          <CashChip acompte={r.acompte} isCashPending={isCashPending} onRecordCash={onRecordCash} />
        )}
      </div>

      {/* Actions toujours disponibles — séparées visuellement des actions du statut */}
      {!isTerminal && (
        <div className="flex items-center justify-between gap-2 px-5 py-2 border-t border-border/60 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          <button
            onClick={() => confirm({
              title: "Proposer un report ?",
              description: "Le client recevra un email l'invitant à choisir lui-même une nouvelle date pour son vol.",
              confirmLabel: "Envoyer",
              run: onSendReschedule,
            })}
            disabled={isPending}
            className={chipBtn}
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
            Reporter
          </button>
          <button
            onClick={() => confirm({
              title: "Annuler cette réservation ?",
              description: "Le client recevra un email l'informant de l'annulation de son vol. Cette action est irréversible côté communication client.",
              confirmLabel: "Annuler la réservation",
              danger: true,
              run: () => onChangeStatut("annulee"),
            })}
            disabled={isPending}
            className={chipDanger}
          >
            <XCircle size={13} />
            Annuler
          </button>
        </div>
      )}

      {dialog}
    </div>
  );
}
