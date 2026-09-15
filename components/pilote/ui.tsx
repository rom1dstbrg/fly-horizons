import type { ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, X } from "lucide-react";

// ── Chrome partagé de l'espace pilote ────────────────────────────────────────
// Un seul vocabulaire visuel, aligné sur l'identité Fly Horizons (STYLE-STATUS) :
// carte blanche + ombre premium + rayon --r-sm, titres, libellés de section,
// encarts d'alerte. Toutes les pages pilote passent par ici.

/** Carte standard : .card-premium (card blanche, bordure --border, ombre --sh-sm, rayon --r-sm). */
export const piloteCard = "card-premium p-5";

/** En-tête de page : titre + sous-titre + filet de séparation. */
export function PiloteHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
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
      ? "border-l-red-500 bg-red-50/60 text-red-900"
      : tone === "info"
      ? "border-l-navy bg-secondary/60 text-foreground"
      : "border-l-amber-400 bg-amber-50/70 text-amber-900";
  const iconCls =
    tone === "danger" ? "text-red-600" : tone === "info" ? "text-navy" : "text-amber-600";

  const inner = (
    <div className={`card-premium border-l-4 ${toneCls} p-4 flex items-start gap-3`}>
      <AlertCircle size={17} className={`shrink-0 mt-0.5 ${iconCls}`} />
      <div className="min-w-0 flex-1 text-sm leading-relaxed">{children}</div>
    </div>
  );

  return href ? (
    <Link href={href} className="block [&>div]:hover:shadow-[0_8px_32px_rgba(11,34,56,0.11)]">
      {inner}
    </Link>
  ) : (
    inner
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
