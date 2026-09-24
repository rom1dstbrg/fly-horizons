"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

// Tableau Studio : une carte, une barre d'outils optionnelle (onglets à gauche,
// recherche et filtres à droite), l'en-tête en bande grise arrondie, des lignes
// séparées par des traits fins.
//
// Au téléphone, chaque ligne devient une carte (styles .st-table dans
// globals.css) : la 1re colonne titrée sert de titre, les autres s'empilent en
// « libellé — valeur ». Les libellés sont recopiés ici depuis l'en-tête, les
// pages écrivent donc des tableaux normaux.
function labelCells(root: HTMLElement) {
  const headers: string[] = [];
  root.querySelectorAll("thead tr:first-child th").forEach((th) => {
    const span = (th as HTMLTableCellElement).colSpan || 1;
    const text = th.textContent?.trim() ?? "";
    for (let i = 0; i < span; i++) headers.push(text);
  });
  root.querySelectorAll("tbody tr").forEach((tr) => {
    let col = 0;
    let titled = false;
    tr.querySelectorAll(":scope > td").forEach((cell) => {
      const label = headers[col] ?? "";
      cell.setAttribute("data-label", label);
      if (!titled && label) {
        cell.setAttribute("data-role", "title");
        titled = true;
      } else {
        cell.removeAttribute("data-role");
      }
      col += (cell as HTMLTableCellElement).colSpan || 1;
    });
  });
}

export function Table({ children, toolbar, className }: {
  children: React.ReactNode;
  toolbar?: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Les lignes changent (onglets, recherche) : on relabellise à chaque rendu.
  useEffect(() => {
    if (ref.current) labelCells(ref.current);
  });

  return (
    <div ref={ref} className={cn("st-table rounded-[20px] border border-st-line bg-white p-3 pb-1.5 shadow-st-sm", className)}>
      {toolbar && (
        <div className="st-table-toolbar flex flex-wrap items-center justify-between gap-2 px-1 pb-3 pt-0.5">{toolbar}</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-[13.5px]">{children}</table>
      </div>
    </div>
  );
}

export function TableSearch({ value, onChange, placeholder = "Rechercher", className }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex h-[34px] min-w-0 items-center gap-2 rounded-[10px] border border-st-line bg-white px-2.5 text-st-muted transition-colors focus-within:border-st-ink focus-within:ring-4 focus-within:ring-st-ink-soft sm:w-56",
        className,
      )}
    >
      <Search size={15} className="shrink-0" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[16px] text-st-text outline-none placeholder:text-st-muted sm:text-[12.5px] [&::-webkit-search-cancel-button]:hidden"
      />
    </label>
  );
}

export function TableHeaderCell({ children, align = "left", className }: {
  children?: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <th
      className={cn(
        "h-9 whitespace-nowrap bg-st-surface px-3 py-0 text-xs font-medium text-st-muted first:rounded-l-[9px] first:pl-4 last:rounded-r-[9px] last:pr-4",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

// `onClick` rend toute la ligne cliquable (ouvre le tiroir) ; Entrée l'active
// aussi au clavier. `selected` teinte la ligne dont le tiroir est ouvert.
export function TableRow({ children, onClick, selected, className }: {
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(); } : undefined}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      aria-selected={selected || undefined}
      className={cn(
        "[&>td]:transition-colors [&>td]:duration-200",
        onClick && "cursor-pointer outline-none hover:[&>td]:bg-st-surface/70 focus-visible:[&>td]:bg-st-surface/70",
        selected && "[&>td]:!bg-st-ink-soft",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, align = "left", className }: {
  children?: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <td
      className={cn(
        "border-t border-st-line-soft px-3 py-3 text-st-text first:pl-4 last:pr-4 [tr:first-child>&]:border-t-0",
        align === "right" ? "st-num text-right" : align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {children}
    </td>
  );
}
