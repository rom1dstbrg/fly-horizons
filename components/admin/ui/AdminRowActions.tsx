"use client";

import { Eye, Pen, Trash2, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

// ── Styles ─────────────────────────────────────────────────────
const BASE = [
  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
  "text-xs font-medium transition-all cursor-pointer disabled:opacity-50",
].join(" ");

const GHOST  = `${BASE} text-muted-foreground hover:text-foreground hover:bg-secondary`;
const DANGER = `${BASE} text-muted-foreground hover:text-red-500 hover:bg-red-50`;
const CONFIRM = `${BASE} bg-red-500 text-white hover:bg-red-600`;

// ── Extra action ───────────────────────────────────────────────
export interface RowExtraAction {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
  title?: string;
}

// ── Props ──────────────────────────────────────────────────────
interface AdminRowActionsProps {
  /** Ouvre le drawer / panneau de détail */
  onView?: () => void;
  /** Ouvre le formulaire d'édition (ou navigation) */
  onEdit?: () => void;
  /** Suppression avec double-clic de confirmation */
  onDelete?: () => Promise<{ error?: string } | void>;
  /** Actions supplémentaires insérées entre Modifier et Supprimer */
  extra?: RowExtraAction[];
}

export function AdminRowActions({
  onView,
  onEdit,
  onDelete,
  extra,
}: AdminRowActionsProps) {
  const [confirming,    setConfirming]    = useState(false);
  const [deleteError,   setDeleteError]   = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    if (!onDelete) return;
    startTransition(async () => {
      const result = await onDelete();
      if (result && "error" in result && result.error) {
        setDeleteError(result.error);
        setTimeout(() => setDeleteError(null), 4000);
      }
      setConfirming(false);
    });
  }

  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {onView && (
        <button type="button" onClick={onView} className={GHOST}>
          <Eye size={12} />
          Voir
        </button>
      )}

      {onEdit && (
        <button type="button" onClick={onEdit} className={GHOST}>
          <Pen size={12} />
          Modifier
        </button>
      )}

      {extra?.map(a => {
        const Icon = a.icon;
        return (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            disabled={a.disabled}
            title={a.title}
            className={a.variant === "danger" ? DANGER : GHOST}
          >
            <Icon size={12} />
            {a.label}
          </button>
        );
      })}

      {onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className={confirming ? CONFIRM : DANGER}
        >
          {isPending
            ? <Loader2 size={12} className="animate-spin" />
            : <Trash2 size={12} />}
          {isPending ? "..." : confirming ? "Confirmer ?" : "Supprimer"}
        </button>
      )}

      {deleteError && (
        <span className="text-xs text-red-500 px-1">{deleteError}</span>
      )}
    </div>
  );
}
