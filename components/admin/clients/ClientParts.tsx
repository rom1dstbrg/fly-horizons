"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { sendEmailToClient, updateClient } from "@/lib/actions/clients";
import { Button, FormField, Input, Textarea } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/reservation-signals";
import { initialesClient, type ClientMessage, type ClientResa } from "@/lib/admin-clients";

// Pièces communes au tiroir et à la fiche d'un client : une source par composant.

export function ClientAvatar({ prenom, nom, size = "md" }: { prenom: string; nom: string; size?: "md" | "lg" }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-st-ink-soft font-bold text-st-ink",
        size === "lg" ? "h-[52px] w-[52px] text-[17px]" : "h-9 w-9 text-[12.5px]",
      )}
    >
      {initialesClient(prenom, nom)}
    </span>
  );
}

export function SignalText({ signal }: { signal: Signal | null }) {
  if (!signal) return <span className="text-xs text-st-muted">Rien à signaler</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", signal.level === "bad" ? "text-st-bad" : "text-st-warn")}>
      <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-current" />
      {signal.label}
    </span>
  );
}

export const TYPE_LABEL: Record<string, string> = {
  perso: "Sur mesure",
  annonce_pilote: "Vol partagé",
};
export const typeLabel = (r: ClientResa) => TYPE_LABEL[r.type_resa] ?? "Vol";

// ── Écrire au client (email libre, une fois) ───────────────────
export function ClientEmailForm({ clientId, prenom, nom, email, onSent }: {
  clientId: string; prenom: string; nom: string; email: string; onSent?: () => void;
}) {
  const [subject, setSubject] = useState(`Fly Horizons : message pour ${prenom} ${nom}`);
  const [body, setBody] = useState(`Bonjour ${prenom},\n\n\n\nCordialement,\nFly Horizons`);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function send() {
    start(async () => {
      const r = await sendEmailToClient(clientId, subject, body);
      if (r.error) { setFeedback({ ok: false, text: r.error }); return; }
      setFeedback({ ok: true, text: "Email envoyé" });
      onSent?.();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-st-muted">À : <span className="font-[550] text-st-text">{email}</span></p>
      <FormField id="cl-subject" label="Sujet">
        <Input id="cl-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </FormField>
      <FormField id="cl-body" label="Message">
        <Textarea id="cl-body" rows={7} value={body} onChange={(e) => setBody(e.target.value)} />
      </FormField>
      {feedback && <p className={cn("text-xs font-semibold", feedback.ok ? "text-st-ok" : "text-st-bad")}>{feedback.text}</p>}
      <Button onClick={send} loading={pending} disabled={!subject.trim() || !body.trim()} fullWidth>
        <Send /> Envoyer
      </Button>
    </div>
  );
}

// ── Modifier les coordonnées ───────────────────────────────────
export function ClientEditForm({ clientId, prenom, nom, telephone, onSaved, onCancel }: {
  clientId: string; prenom: string; nom: string; telephone: string | null;
  onSaved: (f: { prenom: string; nom: string; telephone: string | null }) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState({ prenom, nom, telephone: telephone ?? "" });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function save() {
    const fields = {
      prenom: d.prenom.trim() || prenom,
      nom: d.nom.trim() || nom,
      telephone: d.telephone.trim() || null,
    };
    start(async () => {
      const r = await updateClient(clientId, fields);
      if (r.error) { setError(r.error); return; }
      onSaved(fields);
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField id="ce-prenom" label="Prénom"><Input id="ce-prenom" value={d.prenom} onChange={(e) => setD({ ...d, prenom: e.target.value })} /></FormField>
        <FormField id="ce-nom" label="Nom"><Input id="ce-nom" value={d.nom} onChange={(e) => setD({ ...d, nom: e.target.value })} /></FormField>
      </div>
      <FormField id="ce-tel" label="Téléphone">
        <Input id="ce-tel" type="tel" value={d.telephone} onChange={(e) => setD({ ...d, telephone: e.target.value })} />
      </FormField>
      {error && <p className="text-xs font-semibold text-st-bad">{error}</p>}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>Annuler</Button>
        <Button onClick={save} loading={pending} className="flex-1">Enregistrer</Button>
      </div>
    </div>
  );
}

// ── Fil des messages des réservations du client (lecture) ──────
export function ClientThread({ messages, reservations }: { messages: ClientMessage[]; reservations: ClientResa[] }) {
  if (messages.length === 0) {
    return <p className="py-6 text-center text-sm text-st-muted">Aucun message échangé pour l&apos;instant.</p>;
  }
  const dateVol = new Map(reservations.map((r) => [r.id, r.date_vol]));
  const sorted = [...messages].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return (
    <div className="space-y-2.5">
      {sorted.map((m, i) => {
        const moi = m.author !== "client";
        const prev = sorted[i - 1];
        const vol = dateVol.get(m.reservation_id);
        return (
          <div key={m.id} className="space-y-1.5">
            {(!prev || prev.reservation_id !== m.reservation_id) && vol && (
              <p className="pt-1 text-center text-[11.5px] font-semibold uppercase tracking-wide text-st-muted">
                Vol du {new Date(vol + "T12:00:00Z").toLocaleDateString("fr-BE", { day: "numeric", month: "long", timeZone: "Europe/Brussels" })}
              </p>
            )}
            <div className={cn("flex flex-col", moi ? "items-end" : "items-start")}>
              <div className={cn("max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px]", moi ? "bg-st-ink text-white" : "bg-st-surface text-st-text")}>
                {m.content}
              </div>
              <span className="mt-0.5 px-1 text-[11px] text-st-muted">
                {m.author === "client" ? "Client" : m.author_nom || (m.author === "admin" ? "Admin" : "Pilote")}
                {" · "}
                {new Date(m.created_at).toLocaleString("fr-BE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
