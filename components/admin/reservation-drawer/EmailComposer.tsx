"use client";

import { Send, RotateCcw } from "lucide-react";
import { Button, Input, Textarea } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import type { DrawerReservation } from "./types";

// Email libre (admin), ouvert depuis Dossier › « Email libre et modèles ».
// Prend toute la hauteur du tiroir à la place des onglets.
export function EmailComposer({
  reservation, subject, setSubject, body, setBody,
  includeReschedule, setIncludeReschedule,
  isPending, onSend, onCancel,
}: {
  reservation: DrawerReservation;
  subject: string;
  setSubject: (v: string) => void;
  body: string;
  setBody: (v: string) => void;
  includeReschedule: boolean;
  setIncludeReschedule: (v: boolean) => void;
  isPending: boolean;
  onSend: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-[18px] pb-[calc(1rem+env(safe-area-inset-bottom))] pt-1">
      <p className="text-[12.5px] text-st-muted">
        À <b className="font-semibold text-st-text">{reservation.clients?.email ?? "client sans email"}</b>
      </p>
      <label className="block shrink-0">
        <span className="mb-1 block text-[12px] font-[550] text-st-text-2">Sujet</span>
        <Input autoFocus value={subject} onChange={(e) => setSubject(e.target.value)} />
      </label>
      <label className="flex min-h-0 flex-1 flex-col">
        <span className="mb-1 block text-[12px] font-[550] text-st-text-2">Message</span>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-40 flex-1 resize-none" />
      </label>
      <button
        type="button"
        onClick={() => setIncludeReschedule(!includeReschedule)}
        className={cn(
          "flex w-full shrink-0 cursor-pointer items-center gap-2 rounded-[11px] border px-3 py-2 text-[12.5px] font-[550] transition-colors",
          includeReschedule ? "border-transparent bg-st-warn-soft text-st-warn" : "border-st-line text-st-text-2 hover:bg-st-surface",
        )}
      >
        <RotateCcw size={14} />
        {includeReschedule ? "Lien de report inclus dans l'email" : "Ajouter un lien de report"}
      </button>
      <div className="grid shrink-0 grid-cols-[auto_1fr] gap-2">
        <Button variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button onClick={onSend} loading={isPending} disabled={!subject.trim() || !body.trim()}>
          <Send /> Envoyer
        </Button>
      </div>
    </div>
  );
}
