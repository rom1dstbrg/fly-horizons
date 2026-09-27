"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Clock, Banknote, Send, PlaneLanding, Download, Receipt } from "lucide-react";
import { Button, Input } from "@/components/pilote/studio";
import {
  setPilotePaye,
  renvoyerLienVirement,
  marquerVolEffectue,
  cancelAnnonceDemande,
} from "@/lib/actions/pilote-paiement";
import { brusselsTimestamp } from "@/lib/utils";
import type { PendingAction } from "./ConfirmActionDialog";
import { PaiementRecuForm, type PaiementMode } from "@/components/pilote/PaiementRecuForm";
import { EtatBadge, PartageFrais, paiementDetail } from "@/components/pilote/PaiementUI";
import { etatPaiement, todayBrussels } from "@/lib/pilote/transactions-shared";

const VOL_EFFECTUE_DELAI_MS = 8 * 60 * 60 * 1000;

// Actions du pilote (ou de l'admin) sur une réservation issue d'une annonce
// pilote : le règlement se fait par virement direct, l'app ne fait que suivre
// « le client m'a payé » puis « vol effectué ».

interface Props {
  reservationId: string;
  statut: string;
  piloteePaye: boolean;
  montant: number | null;
  /** Date à laquelle le paiement a été marqué reçu (pilote_paye_at). */
  payeLe?: string | null;
  /** Coût total du vol et part du pilote (annonce), pour la barre du partage. */
  cout?: number | null;
  part?: number | null;
  dateVol: string;
  heureVol: string | null;
  viewerRole?: "admin" | "pilote";
  onStatusChange?: (id: string, statut: string) => void;
  onFieldsChange?: (id: string, fields: { pilote_paye?: boolean; acompte?: number | null }) => void;
  /** Fenêtre de confirmation du tiroir (annulation de la demande). */
  ask?: (a: PendingAction) => void;
}

export function AnnoncePiloteActions({
  reservationId,
  statut,
  piloteePaye,
  montant,
  payeLe = null,
  cout = null,
  part = null,
  dateVol,
  heureVol,
  viewerRole = "pilote",
  onStatusChange,
  onFieldsChange,
  ask,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [dureeReelle, setDureeReelle] = useState("");
  const [showEffectue, setShowEffectue] = useState(false);
  const dureeValide = /^\d+$/.test(dureeReelle) && Number(dureeReelle) >= 1 && Number(dureeReelle) <= 600;
  // Le paiement se confirme avec le montant reçu, modifiable (27/09).
  const [confirmMode, setConfirmMode] = useState<PaiementMode | null>(null);

  const done = statut === "vol_effectue";
  const cancelled = statut === "annulee";
  // Verrou 8 h : le pilote ne peut clôturer qu'après le vol (l'admin garde la main).
  const effectueBloque =
    viewerRole === "pilote" &&
    Date.now() < brusselsTimestamp(dateVol, heureVol) + VOL_EFFECTUE_DELAI_MS;

  function flash(text: string, ok = true) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  }

  function run(
    fn: () => Promise<{ error?: string; success?: boolean; emailError?: boolean; statut?: string; acompte?: number | null }>,
    okText: string,
    after?: (r: { statut?: string; acompte?: number | null }) => void,
  ) {
    startTransition(async () => {
      const r = await fn();
      if (r?.error) { flash("Erreur : " + r.error, false); return; }
      flash(r?.emailError ? okText + " · email non envoyé" : okText, !r?.emailError);
      after?.(r ?? {});
    });
  }

  function marquerPaye(mode: PaiementMode, montantRecu: number) {
    run(
      () => setPilotePaye(reservationId, true, mode, montantRecu),
      mode === "especes" ? "Paiement en espèces confirmé ✓" : "Paiement confirmé ✓",
      (r) => {
        setConfirmMode(null);
        onFieldsChange?.(reservationId, { pilote_paye: true, ...(r.acompte !== undefined ? { acompte: r.acompte } : {}) });
        if (r.statut) onStatusChange?.(reservationId, r.statut);
      },
    );
  }

  // Bloc « Règlement » de l'onglet Aperçu du tiroir, aligné sur la page
  // Transactions (27/09) : même pastille d'état, montant en bloc gris, barre du
  // partage des frais, mêmes boutons et même confirmation du montant.
  const today = todayBrussels();
  const etat = etatPaiement({ pilote_paye: piloteePaye, statut, date_vol: dateVol, acompte: montant }, today);
  const detail = paiementDetail({ etat, payeLe, montant, date: dateVol }, today);

  return (
    <div className="space-y-3.5 rounded-[16px] border border-st-line p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-st-text">Règlement</p>
        <EtatBadge etat={etat} />
      </div>

      <div className="rounded-[14px] bg-st-surface p-3.5">
        <p className="text-[12.5px] text-st-muted">Montant du passager</p>
        {montant != null ? (
          <>
            <p className="st-num mt-0.5 text-[26px] font-medium leading-tight tracking-[-0.03em] text-st-text">
              {montant.toLocaleString("fr-BE", { maximumFractionDigits: 2 })} €
            </p>
            <p className="mt-0.5 text-[12.5px] text-st-muted">
              {etat === "recu" ? detail : `${detail} · virement direct sur votre IBAN, Fly Horizons n'encaisse rien`}
            </p>
          </>
        ) : (
          <p className="mt-1 text-[12.5px] leading-snug text-st-text-2">
            Prix pas encore fixé : le groupe de cette annonce (vente à la place) n&apos;est pas complet. Clôturez-le depuis « Mes annonces » pour figer le prix de chaque passager.
          </p>
        )}
      </div>

      {cout != null && part != null && <PartageFrais cout={cout} part={part} />}

      {msg && (
        <p className={`rounded-[10px] px-3 py-2 text-[12.5px] font-medium ${msg.ok ? "bg-st-ok-soft text-st-ok" : "bg-st-bad-soft text-st-bad"}`}>{msg.text}</p>
      )}

      {!cancelled && !done && montant != null && !piloteePaye && (confirmMode ? (
        <PaiementRecuForm
          mode={confirmMode}
          montantPrevu={montant}
          loading={isPending}
          onCancel={() => setConfirmMode(null)}
          onConfirm={(m) => marquerPaye(confirmMode, m)}
        />
      ) : (
        <div className="space-y-2">
          <Button fullWidth disabled={isPending} onClick={() => { setMsg(null); setConfirmMode("virement"); }}>
            <Check />Marquer comme reçu
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" disabled={isPending} onClick={() => { setMsg(null); setConfirmMode("especes"); }}>
              <Banknote />En espèces
            </Button>
            <Button variant="secondary" disabled={isPending} onClick={() => run(() => renvoyerLienVirement(reservationId), "Lien de paiement renvoyé ✓")}>
              <Send />Renvoyer le lien
            </Button>
          </div>
        </div>
      ))}

      {!cancelled && !done && piloteePaye && montant != null && (
        <Button
          variant="secondary"
          fullWidth
          loading={isPending}
          onClick={() => run(() => setPilotePaye(reservationId, false), "Paiement remis en attente", () => onFieldsChange?.(reservationId, { pilote_paye: false }))}
        >
          Remettre en attente
        </Button>
      )}

      {/* Bilan de vol : possible dès la demande acceptée, payé ou non (un vol
          fait mais pas réglé passe « à relancer » dans Transactions). Les
          minutes réellement volées sont obligatoires (27/09). */}
      {!done && !cancelled && statut !== "demande_recue" && statut !== "en_attente" && (
        effectueBloque ? (
          <p className="flex items-center gap-1.5 text-[12.5px] text-st-muted"><Clock size={14} /> « Vol effectué » disponible 8 h après l&apos;heure du décollage.</p>
        ) : !showEffectue ? (
          <Button variant="secondary" size="sm" onClick={() => setShowEffectue(true)}><PlaneLanding /> Marquer le vol effectué</Button>
        ) : (
          <div className="space-y-2 rounded-[12px] bg-st-surface p-3">
            <label className="block">
              <span className="mb-1 block text-[12px] font-[550] text-st-text-2">Minutes réellement volées</span>
              <Input type="number" inputMode="numeric" min={1} max={600} required autoFocus value={dureeReelle} onChange={(e) => setDureeReelle(e.target.value)} placeholder="ex. 55" />
            </label>
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowEffectue(false)}>Annuler</Button>
              <Button
                size="sm"
                loading={isPending}
                disabled={!dureeValide}
                onClick={() => run(() => marquerVolEffectue(reservationId, Number(dureeReelle)), "Vol marqué effectué ✓", () => onStatusChange?.(reservationId, "vol_effectue"))}
              >
                <PlaneLanding /> Confirmer
              </Button>
            </div>
          </div>
        )
      )}

      {(piloteePaye || done || viewerRole === "pilote") && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {(piloteePaye || done) && (
            <a href={`/api/invoice/reservation/${reservationId}`} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-st-ink hover:underline">
              <Download size={14} /> Reçu client (PDF)
            </a>
          )}
          {viewerRole === "pilote" && (
            <Link href="/pilote/transactions" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-st-ink hover:underline">
              <Receipt size={14} /> Mes transactions
            </Link>
          )}
        </div>
      )}

      {/* Action destructrice : petit lien rouge centré, avec sa confirmation. */}
      {!cancelled && !done && !piloteePaye && !confirmMode && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            const go = () => run(() => cancelAnnonceDemande(reservationId), "Demande annulée, annonce remise en vente", () => onStatusChange?.(reservationId, "annulee"));
            if (ask) ask({ title: "Annuler cette demande ?", consequences: ["La demande passe en « Annulée » et les places sont remises en vente sur votre annonce.", "Aucun email n'est envoyé : prévenez le client par message."], confirmLabel: "Annuler la demande", danger: true, run: go });
            else go();
          }}
          className="block w-full cursor-pointer text-center text-[12.5px] font-[550] text-st-bad hover:underline disabled:opacity-50"
        >
          Annuler la demande
        </button>
      )}
    </div>
  );
}
