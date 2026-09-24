"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Tiroir de détail, un seul comportement partout : au téléphone une feuille qui
// monte du bas (poignée, un tap à l'extérieur la ferme, bouton gris « Fermer »),
// sur le bureau un panneau flottant décollé de 12 px des bords, coins 22 px.
// L'appelant passe la valeur ouverte (ou null) et une fonction de rendu ; la
// feuille ne gère que l'ouverture et la fermeture.
export function Sheet<T>({ value, onClose, children, width = "md" }: {
  value: T | null;
  onClose: () => void;
  children: (value: T) => React.ReactNode;
  /** Largeur du panneau sur le bureau. */
  width?: "md" | "lg";
}) {
  // Garde la dernière valeur affichée pendant la fermeture (pas de panneau vide
  // qui glisse).
  const [shown, setShown] = useState<T | null>(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    if (value !== null) setShown(value);
  }
  const open = value !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className={cn("fixed inset-0 z-[70]", !open && "pointer-events-none")} aria-hidden={!open} inert={!open}>
      <div
        className={cn("absolute inset-0 bg-st-ink/20 backdrop-blur-[1.5px] transition-opacity duration-200", open ? "opacity-100" : "opacity-0")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-[26px] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-16px_40px_-16px_rgba(15,17,23,0.3)] transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
          "sm:inset-x-auto sm:bottom-3 sm:right-3 sm:top-3 sm:max-h-none sm:w-[calc(100%-1.5rem)] sm:rounded-[22px] sm:pb-0 sm:shadow-st-panel",
          width === "lg" ? "sm:max-w-[520px]" : "sm:max-w-[420px]",
          open ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-[calc(100%+1.5rem)]",
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-[38px] shrink-0 rounded-full bg-st-line-strong sm:hidden" />
        {shown !== null && children(shown)}
      </div>
    </div>
  );
}

// `leading` : tuile de date ou icône à gauche du titre.
export function SheetHeader({ title, subtitle, leading, onClose }: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  leading?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-[22px] pb-4 pt-3 sm:pt-5">
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-st-text">{title}</div>
          {subtitle && <div className="truncate text-[12.5px] text-st-muted">{subtitle}</div>}
        </div>
      </div>
      <SheetCloseButton onClick={onClose} />
    </div>
  );
}

export function SheetBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex-1 space-y-4 overflow-y-auto overscroll-contain px-[22px] pb-4", className)}>{children}</div>;
}

export function SheetFooter({ children }: { children: React.ReactNode }) {
  return <div className="shrink-0 border-t border-st-line-soft bg-white px-[22px] py-4">{children}</div>;
}

// L'info principale du tiroir, en grand, sur un bloc gris.
export function SheetHero({ label, children, hint, aside }: {
  label: React.ReactNode;
  children: React.ReactNode;
  hint?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-st-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12.5px] text-st-muted">{label}</p>
        {aside}
      </div>
      <div className="st-num mt-1 text-[32px] font-medium leading-[1.05] tracking-[-0.035em] text-st-text">{children}</div>
      {hint && <p className="mt-1 text-[12.5px] text-st-muted">{hint}</p>}
    </div>
  );
}

// Lignes clé / valeur séparées par des traits fins.
export function SheetRows({ children }: { children: React.ReactNode }) {
  return <dl className="divide-y divide-st-line-soft">{children}</dl>;
}

export function SheetRow({ label, children, className }: { label: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 text-sm first:pt-0 last:pb-0">
      <dt className="shrink-0 text-st-text-2">{label}</dt>
      <dd className={cn("min-w-0 text-right text-st-text", className)}>{children}</dd>
    </div>
  );
}

// Le seul bouton de fermeture des feuilles et panneaux : petite pastille grise.
export function SheetCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 cursor-pointer rounded-full bg-st-surface px-[11px] py-[5px] text-xs font-[550] text-st-text-2 transition-colors hover:bg-st-line hover:text-st-text"
    >
      Fermer
    </button>
  );
}

// Liste de choix dans une feuille (« Plus », « Nouveau vol ») : lignes bordées,
// icône + libellé (+ détail), lien ou bouton.
export function SheetList({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-st-line overflow-hidden rounded-[14px] border border-st-line">{children}</div>;
}

const rowCls = "flex w-full cursor-pointer items-center gap-3 bg-white px-3 py-2.5 text-left text-sm font-[550] text-st-text transition-colors hover:bg-st-surface";

type RowContent = {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: React.ReactNode;
  detail?: React.ReactNode;
  trailing?: React.ReactNode;
};

function RowInner({ icon: Icon, label, detail, trailing }: RowContent) {
  return (
    <>
      <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-st-surface text-st-text">
        <Icon size={16} strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{label}</span>
        {detail && <span className="block text-[12px] font-normal leading-snug text-st-muted">{detail}</span>}
      </span>
      {trailing}
    </>
  );
}

export function SheetListLink({ href, onClick, ...content }: RowContent & { href: string; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} className={rowCls}>
      <RowInner {...content} />
    </Link>
  );
}

export function SheetListButton({ onClick, ...content }: RowContent & { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={rowCls}>
      <RowInner {...content} />
    </button>
  );
}
