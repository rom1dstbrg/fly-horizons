"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Copy, Trash2, Download, PlaneTakeoff } from "lucide-react";
import { EmptyState } from "@/components/admin/ui";
import { deleteMassBalanceSheet } from "@/lib/actions/mass-balance";
import type { MassBalanceInputs } from "@/lib/mass-balance/da40-calc";

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
  return new Date(d + "T12:00:00Z").toLocaleDateString("fr-BE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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
    if (!confirm("Supprimer cette feuille de masse et centrage ?")) return;
    startTransition(async () => {
      await deleteMassBalanceSheet(id);
      router.refresh();
    });
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
      {sheets.map((s) => (
        <li
          key={s.id}
          className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 ${
            s.id === currentId ? "bg-[#f5f8ff]" : "bg-white"
          }`}
        >
          <span className="font-mono text-sm font-semibold text-navy">{s.aircraft_reg}</span>
          <span className="text-sm text-foreground">{dateLabel(s.flight_date)}</span>
          {(s.label || s.clientLabel) && (
            <span className="text-xs text-muted-foreground">· {s.label || s.clientLabel}</span>
          )}
          <span className="text-[11px] text-muted-foreground/70">
            maj {new Date(s.updated_at).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit" })}
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onOpen(s)}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors cursor-pointer"
            >
              <FileText size={13} /> Ouvrir
            </button>
            <a
              href={`/api/admin/mass-balance/${s.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors cursor-pointer"
            >
              <Download size={13} /> PDF
            </a>
            <button
              type="button"
              onClick={() => onDuplicate(s)}
              title="Dupliquer"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border hover:bg-secondary transition-colors cursor-pointer"
            >
              <Copy size={13} />
            </button>
            {viewerRole === "admin" && (
              <button
                type="button"
                onClick={() => remove(s.id)}
                disabled={isPending}
                title="Supprimer"
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
