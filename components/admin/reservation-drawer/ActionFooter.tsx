"use client";

import { useState } from "react";
import {
  Send, Check, ChevronRight, XCircle, CheckCircle2, RotateCcw,
  Loader2, AlertTriangle, Banknote, X,
} from "lucide-react";
import type { DrawerReservation, Tab } from "./types";

const TERMINAL_STATUTS = ["vol_effectue", "annulee"];

const primaryBtn = "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap";
const chipBtn = "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap";

function CashChip({ acompte, isCashPending, onRecordCash }: {
  acompte: number;
  isCashPending: boolean;
  onRecordCash: (amount: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(acompte));

  if (!open) {
    return (
      <button onClick={() => { setAmount(String(acompte)); setOpen(true); }} className={`${chipBtn} border-emerald-200 text-emerald-700 hover:bg-emerald-50`}>
        <Banknote size={13} />
        Encaisser
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-emerald-200 bg-emerald-50">
      <input
        type="number" min={0} step={0.01} autoFocus
        value={amount}
        onChange={e => setAmount(e.target.value)}
        className="w-20 h-7 px-2 rounded-md border border-emerald-200 bg-white text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-400"
      />
      <span className="text-xs text-emerald-700 font-semibold">€</span>
      <button
        onClick={() => { const a = parseFloat(amount); if (a > 0) { onRecordCash(a); setOpen(false); } }}
        disabled={isCashPending || !amount || parseFloat(amount) <= 0}
        title="Confirmer l'encaissement"
        className="flex items-center justify-center w-7 h-7 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {isCashPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
      </button>
      <button
        onClick={() => setOpen(false)}
        title="Annuler"
        className="flex items-center justify-center w-7 h-7 rounded-md text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
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
  hasRoute,
  onChangeStatut,
  onConfirmHeureConfirmee,
  onSendReschedule,
  onSendPaymentLink,
  onResendPaymentLink,
  onRecordCash,
  modifier,
}: {
  reservation: DrawerReservation;
  activeTab: Tab;
  isPending: boolean;
  isCashPending: boolean;
  hasRoute: boolean;
  onChangeStatut: (statut: string) => void;
  onConfirmHeureConfirmee: () => void;
  onSendReschedule: () => void;
  onSendPaymentLink: () => void;
  onResendPaymentLink: () => void;
  onRecordCash: (amount: number) => void;
  modifier: { isPending: boolean; save: () => void };
}) {
  const isStandard = r.type_resa !== "perso";
  const isTerminal = TERMINAL_STATUTS.includes(r.statut);
  const showCash = !isTerminal && r.acompte != null && (r.paye ?? 0) < r.acompte;

  if (activeTab === "modifier") {
    return (
      <div className="px-5 pt-3 border-t border-border shrink-0 flex justify-end pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <button onClick={modifier.save} disabled={modifier.isPending} className={`${primaryBtn} bg-navy hover:brightness-90`}>
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

      {/* Statut */}
      <div className="flex items-center gap-2 px-5 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] flex-wrap">
        {r.statut === "payment_pending" && (
          <>
            <button onClick={() => onChangeStatut("acompte_recu")} disabled={isPending} className={`${primaryBtn} bg-navy hover:brightness-90`}>
              <Check size={14} />
              Marquer paiement reçu
            </button>
            <button onClick={onResendPaymentLink} disabled={isPending} className={`${chipBtn} border-orange-200 text-orange-600 hover:bg-orange-50`}>
              {isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Renvoyer le lien
            </button>
          </>
        )}

        {(r.statut === "en_attente" || r.statut === "acompte_recu") && (
          <>
            <button onClick={onConfirmHeureConfirmee} disabled={isPending} className={`${primaryBtn} bg-green-500 hover:bg-green-600`}>
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Confirmer date + heure
            </button>
            {isStandard && r.statut === "en_attente" && (
              <button onClick={onSendPaymentLink} disabled={isPending} className={`${chipBtn} border-orange-200 text-orange-600 hover:bg-orange-50`}>
                {isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Lien de paiement
              </button>
            )}
          </>
        )}

        {r.statut === "date_confirmee" && (
          <>
            <button onClick={onConfirmHeureConfirmee} disabled={isPending} className={`${primaryBtn} bg-green-500 hover:bg-green-600`}>
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Confirmer l&apos;heure
            </button>
            <button onClick={() => onChangeStatut("en_attente")} disabled={isPending} className={`${chipBtn} border-border text-muted-foreground hover:bg-secondary`}>
              <ChevronRight size={13} className="rotate-180" />
              Revenir en attente
            </button>
          </>
        )}

        {r.statut === "heure_confirmee" && (
          <>
            <button onClick={() => onChangeStatut("vol_effectue")} disabled={isPending} className={`${primaryBtn} bg-purple-500 hover:bg-purple-600`}>
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Marquer vol effectué
            </button>
            <button onClick={() => onChangeStatut("en_attente")} disabled={isPending} className={`${chipBtn} border-border text-muted-foreground hover:bg-secondary`}>
              <ChevronRight size={13} className="rotate-180" />
              Revenir en attente
            </button>
          </>
        )}

        {r.statut === "vol_effectue" && (
          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-200 text-sm text-purple-700 font-medium">
            <CheckCircle2 size={14} className="text-purple-600" />
            Vol effectué, dossier clôturé
          </span>
        )}

        {r.statut === "annulee" && (
          <button onClick={() => onChangeStatut("en_attente")} disabled={isPending} className={`${primaryBtn} bg-navy hover:brightness-90`}>
            <ChevronRight size={14} />
            Réactiver la réservation
          </button>
        )}

        {showCash && r.acompte != null && (
          <CashChip acompte={r.acompte} isCashPending={isCashPending} onRecordCash={onRecordCash} />
        )}

        {!isTerminal && (
          <>
            <button onClick={onSendReschedule} disabled={isPending} className={`${chipBtn} border-amber-200 text-amber-600 hover:bg-amber-50 ml-auto`}>
              {isPending ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              Reporter
            </button>
            <button onClick={() => onChangeStatut("annulee")} disabled={isPending} className={`${chipBtn} border-red-200 text-red-500 hover:bg-red-50`}>
              <XCircle size={13} />
              Annuler
            </button>
          </>
        )}
      </div>
    </div>
  );
}
