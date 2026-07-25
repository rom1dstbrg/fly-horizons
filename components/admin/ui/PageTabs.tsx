"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export interface TabDef {
  key: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface PageTabsProps {
  tabs: TabDef[];
  defaultTab: string;
  param?: string;
  basePath?: string;
}

export function PageTabs({ tabs, defaultTab, param = "tab", basePath }: PageTabsProps) {
  const router  = useRouter();
  const params  = useSearchParams();
  const current = params.get(param) ?? defaultTab;

  function changeTab(key: string) {
    const base = basePath ?? "";
    const url  = key === defaultTab ? base || window.location.pathname : `${base || window.location.pathname}?${param}=${key}`;
    router.replace(url, { scroll: false });
  }

  return (
    <div className="no-scrollbar flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border w-full overflow-x-auto sm:w-fit">
      {tabs.map(t => {
        const Icon     = t.icon;
        const isActive = current === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => changeTab(t.key)}
            className={[
              "flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap px-2.5 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer",
              isActive
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {Icon && <Icon size={14} className={isActive ? "text-navy" : ""} />}
            {t.label}
            {t.count != null && (
              <span className={[
                "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold",
                isActive ? "bg-secondary text-foreground" : "bg-muted text-muted-foreground",
              ].join(" ")}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
