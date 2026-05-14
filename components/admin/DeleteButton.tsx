"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

interface DeleteButtonProps {
  onDelete: () => Promise<{ error?: string } | void>;
  label?: string;
  confirmMessage?: string;
}

export function DeleteButton({
  onDelete,
  label = "Supprimer",
  confirmMessage = "Confirmer la suppression ?",
}: DeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      // Auto-annule apres 3 secondes
      setTimeout(() => setConfirming(false), 3000);
      return;
    }

    startTransition(async () => {
      const result = await onDelete();
      if (result && "error" in result && result.error) {
        setError(result.error);
        setConfirming(false);
      }
    });
  }

  if (error) {
    return <span className="text-xs text-destructive">{error}</span>;
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded transition-colors ${
        confirming
          ? "bg-destructive text-white hover:bg-destructive/80"
          : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      } ${isPending ? "opacity-50" : ""}`}
    >
      <Trash2 size={12} />
      {isPending ? "..." : confirming ? confirmMessage : label}
    </button>
  );
}