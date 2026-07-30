"use client";

import { useState } from "react";

export interface EmailPreviewEntry {
  id: string;
  category: string;
  label: string;
  html: string;
}

export function EmailsPreviewClient({ entries }: { entries: EmailPreviewEntry[] }) {
  const [activeId, setActiveId] = useState(entries[0]?.id ?? "");
  const active = entries.find((e) => e.id === activeId) ?? entries[0];

  const categories = Array.from(new Set(entries.map((e) => e.category)));

  return (
    <div className="flex h-[calc(100vh-56px)] -m-6 lg:-m-8 bg-secondary">
      {/* Sidebar */}
      <nav className="w-64 shrink-0 bg-navy overflow-y-auto py-3">
        <div className="px-4 pb-3 mb-2 border-b border-white/10">
          <p className="text-[11px] font-bold text-primary uppercase tracking-wide">Emails Fly Horizons</p>
          <p className="text-[11px] text-white/40 mt-0.5">{entries.length} modèles · données d&apos;exemple</p>
        </div>
        {categories.map((cat) => (
          <div key={cat}>
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-white/35 uppercase tracking-[0.1em]">{cat}</p>
            {entries.filter((e) => e.category === cat).map((e) => (
              <button
                key={e.id}
                onClick={() => setActiveId(e.id)}
                className={`w-full text-left px-4 py-2 text-[12px] truncate transition-colors cursor-pointer border-l-[3px] ${
                  e.id === active?.id
                    ? "bg-white/10 text-primary border-primary font-semibold"
                    : "text-white/60 border-transparent hover:bg-white/5 hover:text-white"
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Preview */}
      <div className="flex-1 overflow-y-auto p-8">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">{active?.label}</p>
        {active && (
          <iframe
            title={active.label}
            srcDoc={active.html}
            className="w-full rounded-xl border border-border bg-white"
            style={{ minHeight: "80vh" }}
          />
        )}
      </div>
    </div>
  );
}
