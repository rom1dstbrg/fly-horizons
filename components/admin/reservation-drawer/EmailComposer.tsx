"use client";

import { Loader2, Send, RotateCcw } from "lucide-react";
import type { DrawerReservation } from "./types";

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
    <div className="flex-1 flex flex-col min-h-0 px-5 py-4 gap-3">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] shrink-0">Email libre</p>
      <div className="shrink-0">
        <p className="text-[10px] text-muted-foreground mb-1">À</p>
        <p className="text-xs text-foreground font-medium">{reservation.clients?.email}</p>
      </div>
      <div className="shrink-0">
        <p className="text-[10px] text-muted-foreground mb-1">Sujet</p>
        <input
          autoFocus
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-navy/30"
        />
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <p className="text-[10px] text-muted-foreground mb-1">Message</p>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          className="flex-1 min-h-0 w-full px-2.5 py-2 rounded-lg border border-input bg-background text-xs resize-none focus:outline-none focus:ring-1 focus:ring-navy/30"
        />
      </div>
      <div className="shrink-0">
        <button
          type="button"
          onClick={() => setIncludeReschedule(!includeReschedule)}
          className={[
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors w-full cursor-pointer",
            includeReschedule
              ? "border-amber-300 bg-amber-50 text-amber-700"
              : "border-border text-muted-foreground hover:bg-secondary",
          ].join(" ")}
        >
          <RotateCcw size={11} className={includeReschedule ? "text-amber-600" : ""} />
          {includeReschedule ? "Lien de report inclus dans l'email ✓" : "Ajouter un lien de report"}
        </button>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onSend}
          disabled={isPending || !subject.trim() || !body.trim()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-semibold hover:brightness-90 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          Envoyer
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
