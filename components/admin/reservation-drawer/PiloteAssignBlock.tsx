"use client";

import { useEffect, useState, useTransition } from "react";
import { User, Loader2, X, Check, Send, Megaphone } from "lucide-react";
import {
  listAssignablePilotes,
  assignPilote,
  reassignPilote,
  unassignPilote,
  type AssignablePilote,
} from "@/lib/actions/pilote-assign";
import { createOffer, cancelOffer, getOpenOffer, type OpenOfferInfo } from "@/lib/actions/flight-offers";
import { ConfirmActionDialog, type PendingAction } from "./ConfirmActionDialog";

// Bloc B/C · attribution d'un vol standard à un pilote, depuis le drawer admin.
// - « Assigner » : attribution directe, email auto au client (§5.2).
// - « Réassigner » : panneau email de changement de pilote éditable (§5.4).
// - « Proposer à tous les pilotes » : mise en jeu premier arrivé, 48h (bloc C).

function changePiloteEmailBody(clientPrenom: string, dateStr: string, nouveauPilote: string) {
  return (
    `Bonjour ${clientPrenom || ""},\n\n` +
    `Petit changement d'organisation pour votre vol du ${dateStr} : votre pilote est désormais ${nouveauPilote}. ` +
    `Il vous contactera directement pour convenir des derniers détails.\n\n` +
    `Rien d'autre ne change, votre créneau et votre réservation restent les mêmes.\n\n` +
    `À très bientôt,\nL'équipe Fly Horizons`
  );
}

export function PiloteAssignBlock({
  reservationId,
  currentPiloteId,
  clientPrenom,
  dateVol,
  onChanged,
}: {
  reservationId: string;
  currentPiloteId: string | null | undefined;
  clientPrenom: string;
  dateVol: string;
  onChanged: (piloteId: string | null, piloteNom: string | null) => void;
}) {
  const [pilotes, setPilotes] = useState<AssignablePilote[]>([]);
  const [selected, setSelected] = useState(currentPiloteId ?? "");
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const [offer, setOffer] = useState<OpenOfferInfo>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  useEffect(() => {
    let cancel = false;
    listAssignablePilotes().then((list) => {
      if (!cancel) setPilotes(list);
    });
    getOpenOffer(reservationId).then((o) => {
      if (!cancel) setOffer(o);
    });
    return () => {
      cancel = true;
    };
  }, [reservationId]);

  function show(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 5000);
  }

  const dateStr = new Date(dateVol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const selectedNom = pilotes.find((p) => p.id === selected)?.nom ?? "un autre pilote de l'équipe";
  const canApply = !!selected && selected !== currentPiloteId && !isPending;

  function runAssign() {
    startTransition(async () => {
      const res = await assignPilote(reservationId, selected);
      if (res.error) return show(res.error, false);
      setOffer(null);
      onChanged(selected, res.piloteNom ?? null);
      show(res.emailError ? "Pilote assigné · un email n'est pas parti" : "Pilote assigné, emails envoyés", !res.emailError);
    });
  }

  function primaryAction() {
    if (!canApply) return;
    if (currentPiloteId) {
      setEmailSubject(`Fly Horizons · Votre vol du ${dateStr}`);
      setEmailBody(changePiloteEmailBody(clientPrenom, dateStr, selectedNom));
      setEmailOpen(true);
      return;
    }
    setPendingAction({
      title: `Attribuer ce vol à ${selectedNom} ?`,
      description: "Le client et le pilote recevront chacun un email tout de suite.",
      confirmLabel: "Attribuer et envoyer",
      run: runAssign,
    });
  }

  function confirmReassign() {
    startTransition(async () => {
      const res = await reassignPilote(reservationId, selected, { subject: emailSubject, body: emailBody });
      if (res.error) return show(res.error, false);
      setEmailOpen(false);
      onChanged(selected, res.piloteNom ?? null);
      show(res.emailError ? "Pilote changé · un email n'est pas parti" : "Pilote changé, client et nouveau pilote prévenus", !res.emailError);
    });
  }

  function runUnassign() {
    startTransition(async () => {
      const res = await unassignPilote(reservationId);
      if (res.error) return show(res.error, false);
      setEmailOpen(false);
      setSelected("");
      onChanged(null, null);
      show("Pilote retiré, le vol redevient à assigner", true);
    });
  }

  function askUnassign() {
    setPendingAction({
      title: "Retirer le pilote de ce vol ?",
      description: "Le vol redeviendra une demande à réassigner. Aucun email n'est envoyé au client ni au pilote.",
      confirmLabel: "Retirer le pilote",
      danger: true,
      run: runUnassign,
    });
  }

  function runCreateOffer() {
    startTransition(async () => {
      const res = await createOffer(reservationId);
      if (res.error) return show(res.error, false);
      setOffer({ sentTo: res.sentTo ?? 0, expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString() });
      show(
        res.emailError
          ? `Offre créée · un email n'est pas parti`
          : `Offre envoyée à ${res.sentTo} pilote${(res.sentTo ?? 0) > 1 ? "s" : ""}`,
        !res.emailError,
      );
    });
  }

  function askCreateOffer() {
    setPendingAction({
      title: "Proposer ce vol à tous les pilotes ?",
      description: "Tous les pilotes en règle et libres sur ce créneau recevront un email. Le premier qui le prend devient le pilote du vol. Sans preneur, l'offre expire au bout de 48 h.",
      confirmLabel: "Proposer à tous",
      run: runCreateOffer,
    });
  }

  function runCancelOffer() {
    startTransition(async () => {
      const res = await cancelOffer(reservationId);
      if (res.error) return show(res.error, false);
      setOffer(null);
      show("Offre retirée", true);
    });
  }

  function askCancelOffer() {
    setPendingAction({
      title: "Retirer l'offre en cours ?",
      description: "Les pilotes ne pourront plus prendre ce vol depuis leur espace. Vous reprenez la main sur l'attribution.",
      confirmLabel: "Retirer l'offre",
      danger: true,
      run: runCancelOffer,
    });
  }

  const offerExpiresStr = offer
    ? new Date(offer.expiresAt).toLocaleString("fr-BE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="rounded-xl border border-navy/15 bg-navy/5 p-3.5 space-y-2.5">
      <p className="text-[10px] font-bold text-navy uppercase tracking-[1.5px] flex items-center gap-1.5">
        <User size={11} />
        Pilote
      </p>

      {offer ? (
        <div className="rounded-lg border border-navy/20 bg-white p-2.5 space-y-2">
          <p className="text-xs text-foreground flex items-center gap-1.5">
            <Megaphone size={12} className="text-navy shrink-0" />
            Mise en jeu en cours · <strong>{offer.sentTo}</strong> pilote{offer.sentTo > 1 ? "s" : ""} contacté{offer.sentTo > 1 ? "s" : ""}
          </p>
          <p className="text-[11px] text-muted-foreground">Expire le {offerExpiresStr}</p>
          <button
            type="button"
            onClick={askCancelOffer}
            disabled={isPending}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isPending ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
            Retirer l&apos;offre
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={emailOpen}
              className="flex-1 h-8 px-2 rounded-md border border-border bg-white text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-navy/30 cursor-pointer disabled:opacity-60"
            >
              <option value="">Choisir un pilote…</option>
              {pilotes.map((p) => (
                <option key={p.id} value={p.id} disabled={!p.legalOk && p.id !== currentPiloteId}>
                  {p.nom}
                  {p.legalOk ? "" : " — profil incomplet"}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={primaryAction}
              disabled={!canApply || emailOpen}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-navy text-white text-xs font-semibold hover:brightness-90 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {isPending && !emailOpen ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              {currentPiloteId ? "Réassigner" : "Assigner"}
            </button>
          </div>

          {emailOpen && (
            <div className="rounded-lg border border-navy/20 bg-white p-2.5 space-y-2">
              <p className="text-[10px] font-semibold text-navy uppercase tracking-wider">
                Email au client · changement de pilote
              </p>
              <input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full h-8 px-2 rounded-md border border-border bg-white text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-navy/30"
              />
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={7}
                className="w-full px-2 py-1.5 rounded-md border border-border bg-white text-xs text-foreground leading-relaxed focus:outline-none focus:ring-1 focus:ring-navy/30 resize-y"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={confirmReassign}
                  disabled={isPending || !emailSubject.trim() || !emailBody.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-navy text-white text-xs font-semibold hover:brightness-90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                  Envoyer et réassigner
                </button>
                <button
                  type="button"
                  onClick={() => setEmailOpen(false)}
                  disabled={isPending}
                  className="px-2.5 py-1.5 rounded-md border border-border text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {currentPiloteId && !emailOpen && (
            <button
              type="button"
              onClick={askUnassign}
              disabled={isPending}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
              Retirer, sans réassigner
            </button>
          )}

          {!currentPiloteId && !emailOpen && (
            <button
              type="button"
              onClick={askCreateOffer}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? <Loader2 size={11} className="animate-spin" /> : <Megaphone size={11} />}
              Proposer à tous les pilotes
            </button>
          )}
        </>
      )}

      {feedback && (
        <p className={`text-[11px] font-medium ${feedback.ok ? "text-emerald-600" : "text-red-600"}`}>{feedback.msg}</p>
      )}

      <ConfirmActionDialog
        action={pendingAction}
        isPending={isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          pendingAction?.run();
          setPendingAction(null);
        }}
      />
    </div>
  );
}
