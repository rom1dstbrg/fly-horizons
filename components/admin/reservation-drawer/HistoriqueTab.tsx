"use client";

import { Loader2 } from "lucide-react";
import { ACTION_LABELS } from "@/components/admin/ui/AdminBadge";
import { FIELD_LABELS, type HistoryItem } from "./types";

export function HistoriqueTab({ loading, loaded, items }: { loading: boolean; loaded: boolean; items: HistoryItem[] }) {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      )}
      {loaded && items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-10">Aucune modification enregistrée.</p>
      )}
      {loaded && items.length > 0 && (
        <div className="space-y-0">
          {items.map(item => (
            <div key={item.id} className="flex gap-3 py-3 border-b border-border/50 last:border-b-0">
              <div className="w-1.5 h-1.5 rounded-full bg-navy/40 mt-2 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-foreground">
                    {ACTION_LABELS[item.action] ?? item.action}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(item.created_at).toLocaleString("fr-BE", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
                {item.field && (
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground/70">{FIELD_LABELS[item.field] ?? item.field}</span>
                    {item.old_value != null && item.new_value != null && (
                      <> · <span className="line-through opacity-50">{item.old_value}</span>{" → "}<span className="text-foreground font-medium">{item.new_value}</span></>
                    )}
                    {item.old_value == null && item.new_value != null && (
                      <> · <span className="text-foreground font-medium">{item.new_value}</span></>
                    )}
                  </p>
                )}
                {item.note && (
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 italic">{item.note}</p>
                )}
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                  {item.author === "client" ? "Client" : "Admin"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
