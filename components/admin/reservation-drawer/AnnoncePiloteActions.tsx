"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Clock, Send, PlaneLanding, XCircle, Loader2, Download } from "lucide-react";
import {
  setPilotePaye,
  renvoyerLienVirement,
  marquerVolEffectue,
  cancelAnnonceDemande,
} from "@/lib/actions/pilote-paiement";

// Actions du pilote (ou de l'admin) sur une réservation issue d'une annonce
// pilote : le règlement se fait par virement direct, l'app ne fait que suivre
// « le client m'a payé » puis « vol effectué ».

interface Props {
  reservationId: string;
  statut: string;
  piloteePaye: boolean;
  montant: number | null;
  onStatusChange?: (id: string, statut: string) => void;
  onFieldsChange?: (id: string, fields: { pilote_paye?: boolean }) => void;
}

export function AnnoncePiloteActions({
  reservationId,
  statut,
  piloteePaye,
  montant,
  onStatusChange,
  onFieldsChange,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [dureeReelle, setDureeReelle] = useState("");
  const [showEffectue, setShowEffectue] = useState(false);

  const done = statut === "vol_effectue";
  const cancelled = statut === "annulee";

  function flash(text: string, ok = true) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  }

  function run(fn: () => Promise<{ error?: string; success?: boolean; emailError?: boolean }>, okText: string, after?: () => void) {
    startTransition(async () => {
      const r = await fn();
      if (r?.error) { flash("Erreur : " + r.error, false); return; }
      flash(r?.emailError ? okText + " · email non envoyé" : okText, !r?.emailError);
      after?.();
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px]">
          Règlement par virement
        </p>
        {piloteePaye ? (
          <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 size={12} /> Reçu
          </span>
        ) : (
          <span className="text-[11px] font-medium text-amber-600 flex items-center gap-1">
            <Clock size={12} /> En attente
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {montant != null ? <strong className="text-foreground">{montant} €</strong> : "Montant"} à
        régler par le client directement sur votre IBAN. Fly Horizons n&apos;encaisse rien.
      </p>

      {msg && (
        <p className={`text-xs rounded-md px-2.5 py-1.5 border ${msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {msg.text}
        </p>
      )}

      {!cancelled && !done && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              run(
                () => setPilotePaye(reservationId, !piloteePaye),
                piloteePaye ? "Paiement remis en attente" : "Paiement confirmé ✓",
                () => {
                  onFieldsChange?.(reservationId, { pilote_paye: !piloteePaye });
                  if (!piloteePaye) onStatusChange?.(reservationId, "heure_confirmee");
                },
              )
            }
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-navy text-white text-xs font-semibold hover:brightness-90 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            {piloteePaye ? "Annuler « payé »" : "Le client m'a payé"}
          </button>

          {!piloteePaye && (
            <>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => renvoyerLienVirement(reservationId), "Lien de paiement renvoyé ✓")}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send size={12} /> Renvoyer le lien
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  run(
                    () => cancelAnnonceDemande(reservationId),
                    "Demande annulée, annonce remise en vente",
                    () => onStatusChange?.(reservationId, "annulee"),
                  )
                }
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <XCircle size={12} /> Annuler la demande
              </button>
            </>
          )}
        </div>
      )}

      {piloteePaye && !done && !cancelled && (
        <div className="space-y-2">
          {!showEffectue ? (
            <button
              type="button"
              onClick={() => setShowEffectue(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors cursor-pointer"
            >
              <PlaneLanding size={12} /> Marquer le vol effectué
            </button>
          ) : (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <label className="block text-[11px] font-semibold text-muted-foreground">
                Minutes réellement volées (optionnel)
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={dureeReelle}
                  onChange={(e) => setDureeReelle(e.target.value)}
                  placeholder="ex. 55"
                  className="mt-1 w-full h-8 rounded-md border border-border bg-input px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    run(
                      () => marquerVolEffectue(reservationId, dureeReelle ? Number(dureeReelle) : undefined),
                      "Vol marqué effectué ✓",
                      () => onStatusChange?.(reservationId, "vol_effectue"),
                    )
                  }
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-navy text-white text-xs font-semibold hover:brightness-90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? <Loader2 size={12} className="animate-spin" /> : <PlaneLanding size={12} />}
                  Confirmer
                </button>
                <button
                  type="button"
                  onClick={() => setShowEffectue(false)}
                  className="h-8 px-3 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(piloteePaye || done) && (
        <a
          href={`/api/invoice/reservation/${reservationId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy hover:underline"
        >
          <Download size={12} /> Reçu client (PDF)
        </a>
      )}
    </div>
  );
}
