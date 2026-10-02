"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Clock, Banknote, Send, PlaneLanding, Download, Receipt, Mail, Timer, Wallet } from "lucide-react";
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
import { useScrollLock, useSwipeToClose } from "@/components/pilote/studio/sheet-gestures";

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
  /** Le client a indiqué avoir viré (bouton « J'ai payé » de sa page de paiement). */
  clientDeclareLe?: string | null;
  /** Coût total du vol et part du pilote (annonce), pour la barre du partage. */
  cout?: number | null;
  part?: number | null;
  dateVol: string;
  heureVol: string | null;
  /** Durée prévue du vol (minutes), proposée comme repère dans le bilan. */
  dureePrevue?: number | null;
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
  clientDeclareLe = null,
  cout = null,
  part = null,
  dateVol,
  heureVol,
  dureePrevue = null,
  viewerRole = "pilote",
  onStatusChange,
  onFieldsChange,
  ask,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [dureeReelle, setDureeReelle] = useState("");
  const [showEffectue, setShowEffectue] = useState(false);
  // Le raccourci « Faire le bilan » de l'aperçu ouvre ce formulaire.
  useEffect(() => {
    const open = () => {
      setShowEffectue(true);
    };
    window.addEventListener("fh:ouvrir-bilan", open);
    return () => window.removeEventListener("fh:ouvrir-bilan", open);
  }, []);
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
    <div id="reglement-bloc" className="space-y-3.5 rounded-[16px] border border-st-line p-3.5">
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

      {clientDeclareLe && !piloteePaye && !done && !cancelled && (
        <p className="flex items-start gap-2 rounded-[12px] bg-st-warn-soft px-3 py-2.5 text-[12.5px] font-semibold text-st-warn">
          <Banknote size={15} className="mt-px shrink-0" />
          <span>
            Le client indique avoir payé ({new Date(clientDeclareLe).toLocaleString("fr-BE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" })}).
            Vérifiez votre compte, puis « Marquer comme reçu ».
          </span>
        </p>
      )}

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
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setShowEffectue(true)}><PlaneLanding /> Marquer le vol effectué</Button>
        )
      )}

      <BilanVolDialog
        open={showEffectue}
        dureePrevue={dureePrevue}
        dureeReelle={dureeReelle}
        setDureeReelle={setDureeReelle}
        valide={dureeValide}
        loading={isPending}
        onCancel={() => setShowEffectue(false)}
        onConfirm={() =>
          run(
            () => marquerVolEffectue(reservationId, Number(dureeReelle)),
            "Vol marqué effectué ✓",
            () => { setShowEffectue(false); onStatusChange?.(reservationId, "vol_effectue"); },
          )
        }
      />

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

// Fenêtre « Bilan du vol » : explique ce que la clôture déclenche avant de demander
// les minutes réellement volées (obligatoires). Bureau : carte centrée ; téléphone : feuille du bas.
function BilanVolDialog({ open, dureePrevue, dureeReelle, setDureeReelle, valide, loading, onCancel, onConfirm }: {
  open: boolean;
  dureePrevue: number | null;
  dureeReelle: string;
  setDureeReelle: (v: string) => void;
  valide: boolean;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  useScrollLock(open);
  const swipeRef = useSwipeToClose(onCancel, { enabled: open });
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-st-ink/30 backdrop-blur-[1.5px] motion-safe:animate-in motion-safe:fade-in sm:items-center sm:p-4" onClick={onCancel}>
      <div
        ref={swipeRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bilan-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full space-y-4 rounded-t-[26px] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-st-panel motion-safe:animate-in motion-safe:slide-in-from-bottom-4 sm:max-w-[420px] sm:rounded-[20px] sm:pb-5"
      >
        <div>
          <h2 id="bilan-title" className="text-base font-semibold text-st-text">Bilan du vol</h2>
          <p className="mt-1 text-[13px] leading-snug text-st-text-2">
            Une dernière étape pour clôturer ce vol : indiquez le temps réellement passé en l&apos;air.
          </p>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-[550] text-st-text-2">Minutes réellement volées</span>
          <Input type="number" inputMode="numeric" min={1} max={600} required autoFocus value={dureeReelle} onChange={(e) => setDureeReelle(e.target.value)} placeholder={dureePrevue ? `ex. ${dureePrevue}` : "ex. 55"} />
          <span className="mt-1.5 block text-[12px] leading-snug text-st-muted">
            Du décollage à l&apos;atterrissage{dureePrevue ? `, pas la durée prévue (${dureePrevue} min)` : ""}. Obligatoire.
          </span>
        </label>

        <div>
          <p className="mb-2 text-[12.5px] font-semibold text-st-text">En validant :</p>
          <ul className="space-y-2">
            {[
              [PlaneLanding, "Le vol passe en « Effectué » et le dossier est clôturé."],
              [Mail, "Le client reçoit un email de remerciement avec l'enquête de satisfaction."],
              [Timer, "Les minutes servent au bilan du vol dans vos Transactions."],
              [Wallet, "Si le paiement n'est pas encore reçu, il reste à suivre dans Transactions."],
            ].map(([Icon, text], i) => {
              const I = Icon as typeof Check;
              return (
                <li key={i} className="flex gap-2 text-[13px] leading-snug text-st-text-2">
                  <I size={15} className="mt-px shrink-0 text-st-ok" />
                  <span>{text as string}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-2 pt-1">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>Annuler</Button>
          <Button onClick={onConfirm} loading={loading} disabled={!valide}>
            <PlaneLanding /> Clôturer le vol
          </Button>
        </div>
      </div>
    </div>
  );
}
