"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, X, HelpCircle } from "lucide-react";

// ── Chrome partagé de l'espace pilote ────────────────────────────────────────
// Un seul vocabulaire visuel, aligné sur l'identité Fly Horizons (STYLE-STATUS) :
// carte blanche + ombre premium + rayon --r-sm, titres, libellés de section,
// encarts d'alerte. Toutes les pages pilote passent par ici.

/** Carte standard — plate, sans ombre : bordure fine, pas de card-premium (réservé au site public). */
export const piloteCard = "bg-card border border-navy/15 rounded-[10px] p-5";

/** En-tête de page : titre + sous-titre + filet de séparation. */
export function PiloteHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap pb-4 border-b border-border mb-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground text-sm mt-1 max-w-prose">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0 max-w-full">{action}</div>}
    </div>
  );
}

/** Libellé de section (identité FH : petit, gras, capitales espacées). */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3">
      {children}
    </p>
  );
}

/** Encart d'alerte cohérent (info / attention / bloquant), optionnellement cliquable. */
export function PiloteAlert({
  tone = "warn",
  href,
  children,
}: {
  tone?: "warn" | "danger" | "info";
  href?: string;
  children: ReactNode;
}) {
  const toneCls =
    tone === "danger"
      ? "border-border bg-red-50/60 text-red-900"
      : tone === "info"
      ? "border-border bg-secondary/60 text-foreground"
      : "border-border bg-amber-50/70 text-amber-900";
  const iconCls =
    tone === "danger" ? "text-red-600" : tone === "info" ? "text-navy" : "text-amber-600";

  const inner = (
    <div className={`rounded-[10px] border ${toneCls} p-4 flex items-start gap-3 transition-colors`}>
      <AlertCircle size={17} className={`shrink-0 mt-0.5 ${iconCls}`} />
      <div className="min-w-0 flex-1 text-sm leading-relaxed">{children}</div>
    </div>
  );

  return href ? (
    <Link href={href} className="block [&>div]:hover:border-navy/30">
      {inner}
    </Link>
  ) : (
    inner
  );
}

/**
 * Aide contextuelle inline — pour le jargon technique (M&C, part légale...)
 * sans empiler encore du texte de paragraphe partout. Au clic (pas au survol
 * seul : fonctionne aussi au doigt sur mobile), pas de tooltip natif `title`
 * (trop petit, pas de retour à la ligne, invisible au tactile).
 */
export function HelpTip({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-secondary text-muted-foreground hover:bg-navy/10 hover:text-navy transition-colors cursor-pointer"
        aria-label="Aide"
      >
        <HelpCircle size={11} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[150]" onClick={() => setOpen(false)} />
          <div className="absolute z-[160] left-1/2 -translate-x-1/2 top-[calc(100%+6px)] w-60 bg-navy text-white text-xs leading-relaxed rounded-lg px-3 py-2 shadow-lg">
            {children}
          </div>
        </>
      )}
    </span>
  );
}

/**
 * Popup modale, pensée mobile-first (feuille qui monte du bas en plein écran
 * sur téléphone, carte centrée au-delà) — même logique visuelle que l'espace
 * pilote, à réutiliser pour toute future action modale de l'app pilote.
 */
export function PiloteModal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Popup plus large — formulaires avec plusieurs colonnes / carte embarquée. */
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center justify-center"
    >
      <div
        className={`w-full ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"} sm:mx-4 bg-card rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] sm:max-h-[85vh] flex flex-col`}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <p className="text-sm font-bold text-foreground">{title}</p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
