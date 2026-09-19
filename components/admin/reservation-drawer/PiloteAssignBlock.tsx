"use client";

import { useEffect, useState, useTransition } from "react";
import { User, Loader2, X, Check, Send } from "lucide-react";
import {
  listAssignablePilotes,
  assignPilote,
  reassignPilote,
  unassignPilote,
  type AssignablePilote,
} from "@/lib/actions/pilote-assign";
import { ConfirmActionDialog, type PendingAction } from "./ConfirmActionDialog";

// Bloc B · attribution d'un vol standard à un pilote, depuis le drawer admin.
// Réactivé le 19/09 (était câblé mais jamais branché dans le drawer, cf.
// nettoyage git 08/09) — Romain n'avait aucun moyen d'attribuer un pilote à
// une réservation admin déjà en cours. La mise en jeu « premier arrivé »
// (bloc C, flight_offers) n'est PAS reprise ici : hors périmètre tant qu'il
// n'y a qu'un seul pilote réel, cf. mémoire project_marketplace_legal_risk.
// - « Assigner » : attribution directe, email auto au client.
// - « Réassigner » : panneau email de changement de pilote éditable.

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

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  useEffect(() => {
    let cancel = false;
    listAssignablePilotes().then((list) => {
      if (!cancel) setPilotes(list);
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

  return (
    <div className="rounded-xl border border-navy/15 bg-navy/5 p-3.5 space-y-2.5">
      <p className="text-[10px] font-bold text-navy uppercase tracking-[1.5px] flex items-center gap-1.5">
        <User size={11} />
        Pilote
      </p>

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
