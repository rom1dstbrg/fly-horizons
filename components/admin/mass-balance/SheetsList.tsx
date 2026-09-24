"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Trash2, Download, PlaneTakeoff } from "lucide-react";
import { EmptyState, Badge } from "@/components/pilote/studio";
import { deleteMassBalanceSheet } from "@/lib/actions/mass-balance";
import type { MassBalanceInputs } from "@/lib/mass-balance/da40-calc";
import { cn } from "@/lib/utils";

export interface MbSheetRow {
  id: string;
  aircraft_reg: string;
  flight_date: string | null;
  label: string | null;
  updated_at: string;
  created_at: string;
  reservation_id: string | null;
  clientLabel: string | null;
  inputs: MassBalanceInputs;
}

function dateLabel(d: string | null): string {
  if (!d) return "sans date";
  return new Date(d + "T12:00:00Z").toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });
}

const iconBtn =
  "grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-st-line bg-white text-st-text-2 transition-colors hover:bg-st-surface hover:text-st-text disabled:opacity-50";

// Feuilles enregistrées (dans le tiroir « Feuilles ») : un tap sur la ligne
// l'ouvre ; PDF, dupliquer et (admin) supprimer à droite. La suppression se
// confirme dans la ligne, jamais par window.confirm.
export function SheetsList({
  sheets,
  currentId,
  onOpen,
  onDuplicate,
  viewerRole = "admin",
}: {
  sheets: MbSheetRow[];
  currentId: string | null;
  onOpen: (s: MbSheetRow) => void;
  onDuplicate: (s: MbSheetRow) => void;
  viewerRole?: "admin" | "pilote";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (sheets.length === 0) {
    return (
      <EmptyState
        icon={PlaneTakeoff}
        title="Aucune feuille enregistrée"
        description="Renseignez le chargement puis « Enregistrer » pour retrouver la feuille ici et l'imprimer."
      />
    );
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteMassBalanceSheet(id);
      setConfirmId(null);
      router.refresh();
    });
  }

  return (
    <ul className="divide-y divide-st-line overflow-hidden rounded-[16px] border border-st-line">
      {sheets.map((s) => {
        const current = s.id === currentId;
        return (
          <li key={s.id} className={cn("flex items-center gap-3 px-3.5 py-3", current ? "bg-st-ink-soft" : "bg-white")}>
            <button type="button" onClick={() => onOpen(s)} className="min-w-0 flex-1 cursor-pointer text-left">
              <span className="flex items-center gap-2">
                <span className="font-mono text-[13px] font-semibold text-st-ink">{s.aircraft_reg}</span>
                <span className="text-[13.5px] font-[550] text-st-text">{dateLabel(s.flight_date)}</span>
                {current && <Badge size="sm" tone="ink">Ouverte</Badge>}
              </span>
              <span className="block truncate text-[12px] text-st-muted">
                {s.label || s.clientLabel || "Calcul libre"} · modifiée le{" "}
                {new Date(s.updated_at).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit" })}
              </span>
            </button>

            {confirmId === s.id ? (
              <span className="flex shrink-0 items-center gap-1.5">
                <button type="button" onClick={() => setConfirmId(null)} className="h-9 cursor-pointer rounded-[10px] px-2.5 text-[12.5px] font-[550] text-st-text-2 hover:bg-st-surface">
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  disabled={isPending}
                  className="h-9 cursor-pointer rounded-[10px] border border-st-line bg-white px-2.5 text-[12.5px] font-[550] text-st-bad hover:bg-st-bad-soft disabled:opacity-50"
                >
                  Supprimer
                </button>
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-1.5">
                <a href={`/api/admin/mass-balance/${s.id}/pdf`} target="_blank" rel="noopener noreferrer" title="PDF" aria-label="PDF" className={iconBtn}>
                  <Download size={15} />
                </a>
                <button type="button" onClick={() => onDuplicate(s)} title="Dupliquer" aria-label="Dupliquer" className={iconBtn}>
                  <Copy size={15} />
                </button>
                {viewerRole === "admin" && (
                  <button type="button" onClick={() => setConfirmId(s.id)} title="Supprimer" aria-label="Supprimer" className={cn(iconBtn, "text-st-bad hover:bg-st-bad-soft hover:text-st-bad")}>
                    <Trash2 size={15} />
                  </button>
                )}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
