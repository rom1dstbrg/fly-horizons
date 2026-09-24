"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Clock, Banknote, Send, XCircle, PlaneLanding, Download } from "lucide-react";
import { Badge, Button, Input } from "@/components/pilote/studio";
import {
  setPilotePaye,
  renvoyerLienVirement,
  marquerVolEffectue,
  cancelAnnonceDemande,
} from "@/lib/actions/pilote-paiement";
import { brusselsTimestamp } from "@/lib/utils";
import type { PendingAction } from "./ConfirmActionDialog";

const VOL_EFFECTUE_DELAI_MS = 8 * 60 * 60 * 1000;

// Actions du pilote (ou de l'admin) sur une réservation issue d'une annonce
// pilote : le règlement se fait par virement direct, l'app ne fait que suivre
// « le client m'a payé » puis « vol effectué ».

interface Props {
  reservationId: string;
  statut: string;
  piloteePaye: boolean;
  montant: number | null;
  dateVol: string;
  heureVol: string | null;
  viewerRole?: "admin" | "pilote";
  onStatusChange?: (id: string, statut: string) => void;
  onFieldsChange?: (id: string, fields: { pilote_paye?: boolean }) => void;
  /** Fenêtre de confirmation du tiroir (annulation de la demande). */
  ask?: (a: PendingAction) => void;
}

export function AnnoncePiloteActions({
  reservationId,
  statut,
  piloteePaye,
  montant,
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
    fn: () => Promise<{ error?: string; success?: boolean; emailError?: boolean; statut?: string }>,
    okText: string,
    after?: (r: { statut?: string }) => void,
  ) {
    startTransition(async () => {
      const r = await fn();
      if (r?.error) { flash("Erreur : " + r.error, false); return; }
      flash(r?.emailError ? okText + " · email non envoyé" : okText, !r?.emailError);
      after?.(r ?? {});
    });
  }

  function marquerPaye(mode: "virement" | "especes") {
    run(
      () => setPilotePaye(reservationId, true, mode),
      mode === "especes" ? "Paiement en espèces confirmé ✓" : "Paiement confirmé ✓",
      (r) => {
        onFieldsChange?.(reservationId, { pilote_paye: true });
        if (r.statut) onStatusChange?.(reservationId, r.statut);
      },
    );
  }

  // Style Studio (24/09) : bloc « Règlement » de l'onglet Aperçu du tiroir.
  return (
    <div className="space-y-3 rounded-[16px] border border-st-line p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-st-text">Règlement</p>
        {piloteePaye ? <Badge tone="success" dot>Reçu</Badge> : <Badge tone="warning" dot>En attente</Badge>}
      </div>

      <p className="text-[12.5px] leading-snug text-st-text-2">
        {montant != null ? (
          <>
            <b className="font-semibold text-st-text">{montant} €</b> à régler par le client directement sur votre IBAN.
            Fly Horizons n&apos;encaisse rien.
          </>
        ) : (
          "Prix pas encore fixé : le groupe de cette annonce (vente à la place) n'est pas encore complet. Clôturez-le depuis « Mes annonces » pour figer le prix de chaque passager."
        )}
      </p>

      {msg && (
        <p className={`rounded-[10px] px-3 py-2 text-[12.5px] font-medium ${msg.ok ? "bg-st-ok-soft text-st-ok" : "bg-st-bad-soft text-st-bad"}`}>{msg.text}</p>
      )}

      {!cancelled && !done && (
        <div className="flex flex-wrap gap-2">
          {montant != null && (piloteePaye ? (
            <Button
              variant="secondary"
              size="sm"
              loading={isPending}
              onClick={() => run(() => setPilotePaye(reservationId, false), "Paiement remis en attente", () => onFieldsChange?.(reservationId, { pilote_paye: false }))}
            >
              Annuler « payé »
            </Button>
          ) : (
            <>
              <Button size="sm" loading={isPending} onClick={() => marquerPaye("virement")} className="flex-1">
                <CheckCircle2 /> Le client m&apos;a payé
              </Button>
              <Button variant="secondary" size="sm" disabled={isPending} onClick={() => marquerPaye("especes")}>
                <Banknote /> En espèces
              </Button>
            </>
          ))}
          {!piloteePaye && montant != null && (
            <Button variant="secondary" size="sm" disabled={isPending} onClick={() => run(() => renvoyerLienVirement(reservationId), "Lien de paiement renvoyé ✓")}>
              <Send /> Renvoyer le lien
            </Button>
          )}
          {!piloteePaye && (
            <Button
              variant="danger"
              size="sm"
              disabled={isPending}
              onClick={() => {
                const go = () => run(() => cancelAnnonceDemande(reservationId), "Demande annulée, annonce remise en vente", () => onStatusChange?.(reservationId, "annulee"));
                if (ask) ask({ title: "Annuler cette demande ?", consequences: ["La demande passe en « Annulée » et les places sont remises en vente sur votre annonce.", "Aucun email n'est envoyé : prévenez le client par message."], confirmLabel: "Annuler la demande", danger: true, run: go });
                else go();
              }}
            >
              <XCircle /> Annuler la demande
            </Button>
          )}
        </div>
      )}

      {piloteePaye && !done && !cancelled && (
        effectueBloque ? (
          <p className="flex items-center gap-1.5 text-[12.5px] text-st-muted"><Clock size={14} /> « Vol effectué » disponible 8 h après l&apos;heure du décollage.</p>
        ) : !showEffectue ? (
          <Button variant="secondary" size="sm" onClick={() => setShowEffectue(true)}><PlaneLanding /> Marquer le vol effectué</Button>
        ) : (
          <div className="space-y-2 rounded-[12px] bg-st-surface p-3">
            <label className="block">
              <span className="mb-1 block text-[12px] font-[550] text-st-text-2">Minutes réellement volées (optionnel)</span>
              <Input type="number" min={1} max={600} value={dureeReelle} onChange={(e) => setDureeReelle(e.target.value)} placeholder="ex. 55" />
            </label>
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowEffectue(false)}>Annuler</Button>
              <Button
                size="sm"
                loading={isPending}
                onClick={() => run(() => marquerVolEffectue(reservationId, dureeReelle ? Number(dureeReelle) : undefined), "Vol marqué effectué ✓", () => onStatusChange?.(reservationId, "vol_effectue"))}
              >
                <PlaneLanding /> Confirmer
              </Button>
            </div>
          </div>
        )
      )}

      {(piloteePaye || done) && (
        <a href={`/api/invoice/reservation/${reservationId}`} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-st-ink hover:underline">
          <Download size={14} /> Reçu client (PDF)
        </a>
      )}
    </div>
  );
}
