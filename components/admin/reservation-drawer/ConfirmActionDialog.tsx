"use client";

import { useEffect, useState } from "react";
import { Check, AlertTriangle } from "lucide-react";
import { Button, Input } from "@/components/pilote/studio";

// Fenêtre de confirmation avant toute action qui écrit au client (maquette v2
// validée le 24/09) : ce que l'action déclenche, en liste, et un avertissement
// éventuel. `askTime` : l'heure du vol n'est pas encore fixée, on la choisit ici
// (elle est passée à `run`). Bureau : carte centrée ; téléphone : feuille du bas.
export interface PendingAction {
  title: string;
  /** Ce que l'action déclenche, une ligne par conséquence. */
  consequences?: string[];
  /** Texte libre (écrans qui n'ont pas encore de liste de conséquences). */
  description?: string;
  warning?: string;
  confirmLabel?: string;
  danger?: boolean;
  /** Heure à choisir avant de confirmer (valeur de départ, "" si aucune). */
  askTime?: string;
  run: (time?: string) => void;
}

export function ConfirmActionDialog({
  action,
  isPending,
  onCancel,
  onConfirm,
}: {
  action: PendingAction | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: (time?: string) => void;
}) {
  const [time, setTime] = useState("");
  const [prev, setPrev] = useState<PendingAction | null>(null);
  if (action !== prev) {
    setPrev(action);
    setTime(action?.askTime ?? "");
  }

  useEffect(() => {
    if (!action) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [action, onCancel]);

  if (!action) return null;
  const needsTime = action.askTime !== undefined;

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-st-ink/30 backdrop-blur-[1.5px] motion-safe:animate-in motion-safe:fade-in sm:items-center sm:p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full space-y-4 rounded-t-[26px] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-st-panel motion-safe:animate-in motion-safe:slide-in-from-bottom-4 sm:max-w-[400px] sm:rounded-[20px] sm:pb-5"
      >
        <h2 id="confirm-title" className="text-base font-semibold text-st-text">{action.title}</h2>

        {needsTime && (
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-[550] text-st-text-2">Heure du vol</span>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} autoFocus />
          </label>
        )}

        {action.description && <p className="text-[13px] leading-snug text-st-text-2">{action.description}</p>}

        <ul className="space-y-2">
          {(action.consequences ?? []).map((c, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-snug text-st-text-2">
              <Check size={15} className="mt-px shrink-0 text-st-ok" />
              <span>{c}</span>
            </li>
          ))}
        </ul>

        {action.warning && (
          <p className="flex gap-2 rounded-[12px] bg-st-warn-soft px-3 py-2.5 text-[12.5px] font-[550] text-st-warn">
            <AlertTriangle size={15} className="mt-px shrink-0" />
            {action.warning}
          </p>
        )}

        <div className="grid grid-cols-[auto_1fr] gap-2 pt-1">
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>Annuler</Button>
          <Button
            variant={action.danger ? "danger" : "primary"}
            onClick={() => onConfirm(needsTime ? time : undefined)}
            loading={isPending}
            disabled={needsTime && !/^\d{2}:\d{2}$/.test(time)}
          >
            {action.confirmLabel ?? "Confirmer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
