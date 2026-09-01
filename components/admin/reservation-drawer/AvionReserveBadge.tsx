"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";

export function AvionReserveBadge({
  onCancel,
  isPending,
}: {
  onCancel: () => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 hover:bg-emerald-100 transition-colors cursor-pointer"
      >
        <Check size={10} />
        Avion réservé
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-20 w-60 bg-card border border-border rounded-lg shadow-lg p-3 space-y-2.5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Vol annulé ou changement de date ? Si vous avez supprimé la réservation sur NewCAG, annulez-la ici aussi.
          </p>
          <button
            onClick={() => { onCancel(); setOpen(false); }}
            disabled={isPending}
            className="w-full h-8 rounded-md bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isPending && <Loader2 size={12} className="animate-spin" />}
            Annuler la réservation avion
          </button>
        </div>
      )}
    </div>
  );
}
