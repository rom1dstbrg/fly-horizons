"use client";

import { Search, X } from "lucide-react";

interface PageToolbarProps {
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
  filters?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageToolbar({ search, filters, actions }: PageToolbarProps) {
  if (!search && !filters && !actions) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {search && (
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search.value}
            onChange={e => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? "Rechercher…"}
            className="w-full pl-8 pr-7 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/50 transition-all"
          />
          {search.value && (
            <button
              type="button"
              onClick={() => search.onChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {filters && (
        <div className="flex items-center gap-2 flex-wrap">
          {filters}
        </div>
      )}

      {actions && (
        <div className="flex items-center gap-2 ml-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
