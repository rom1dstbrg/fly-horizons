"use client";

import { Loader2 } from "lucide-react";

interface FormFooterProps {
  onCancel?: () => void;
  cancelLabel?: string;
  submitLabel?: string;
  pending?: boolean;
  destructive?: boolean;
}

export function FormFooter({
  onCancel,
  cancelLabel = "Annuler",
  submitLabel = "Enregistrer",
  pending = false,
  destructive = false,
}: FormFooterProps) {
  return (
    <div className="flex items-center justify-end gap-3">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg border border-border transition-colors cursor-pointer disabled:opacity-50"
        >
          {cancelLabel}
        </button>
      )}
      <button
        type="submit"
        disabled={pending}
        className={[
          "inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50",
          destructive
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
        ].join(" ")}
      >
        {pending && <Loader2 size={14} className="animate-spin" />}
        {submitLabel}
      </button>
    </div>
  );
}
