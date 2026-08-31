"use client";

import { Loader2, X, Mail } from "lucide-react";

export interface PendingAction {
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  run: () => void;
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
  onConfirm: () => void;
}) {
  if (!action) return null;

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold text-foreground pr-2">{action.title}</p>
          <button
            onClick={onCancel}
            className="p-1 rounded-full hover:bg-secondary transition-colors cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
          <Mail size={13} className="shrink-0 mt-0.5 text-muted-foreground/60" />
          <span>{action.description}</span>
        </p>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
              action.danger ? "bg-red-500 text-white hover:bg-red-600" : "bg-navy text-white hover:brightness-90"
            }`}
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {action.confirmLabel ?? "Confirmer"}
          </button>
          <button
            onClick={onCancel}
            disabled={isPending}
            className="h-10 px-4 rounded-lg border border-border text-muted-foreground text-sm font-semibold hover:bg-secondary transition-colors cursor-pointer"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
