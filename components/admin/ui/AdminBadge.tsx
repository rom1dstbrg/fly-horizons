"use client";

// ── Variants ───────────────────────────────────────────────────
export type BadgeVariant =
  | "warning"    // yellow   — En attente
  | "info"       // blue     — Planifié / Lu
  | "success"    // green    — Confirmé / Disponible
  | "primary"    // purple   — Effectué
  | "danger"     // red      — Annulé / Expiré
  | "secondary"  // gray     — Archivé / Utilisé
  | "orange"     // orange   — Paiement en att.
  | "emerald";   // emerald  — Acompte reçu / Répondu

const CLASSES: Record<BadgeVariant, string> = {
  warning:   "bg-yellow-100  text-yellow-700  border-yellow-200",
  info:      "bg-blue-100    text-blue-700    border-blue-200",
  success:   "bg-green-100   text-green-700   border-green-200",
  primary:   "bg-purple-100  text-purple-700  border-purple-200",
  danger:    "bg-red-100     text-red-700     border-red-200",
  secondary: "bg-gray-100    text-gray-500    border-gray-200",
  orange:    "bg-orange-100  text-orange-700  border-orange-200",
  emerald:   "bg-emerald-100 text-emerald-700 border-emerald-200", // Provision reçue / Répondu
};

export function AdminBadge({
  variant,
  label,
  className,
}: {
  variant: BadgeVariant;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
        CLASSES[variant],
        className ?? "",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

// ── Status maps — source unique de vérité ──────────────────────

export const STATUT_RESA: Record<string, { label: string; variant: BadgeVariant }> = {
  payment_pending: { label: "Pmt. en att.",    variant: "orange"  },
  en_attente:      { label: "En attente",      variant: "warning" },
  date_confirmee:  { label: "Date confirmée",  variant: "info"    },
  heure_confirmee: { label: "Heure confirmée", variant: "success" },
  vol_effectue:    { label: "Vol effectué",    variant: "primary" },
  annulee:         { label: "Annulée",         variant: "danger"  },
};

export const STATUT_PERSO: Record<string, { label: string; variant: BadgeVariant }> = {
  en_attente:      { label: "En attente",   variant: "warning" },
  acompte_recu:    { label: "Provision reçue", variant: "emerald" },
  date_confirmee:  { label: "Date ✓",       variant: "info"    },
  heure_confirmee: { label: "Heure ✓",      variant: "success" },
  vol_effectue:    { label: "Vol effectué", variant: "primary" },
  annulee:         { label: "Annulée",      variant: "danger"  },
};

export const STATUT_ORDER: Record<string, { label: string; variant: BadgeVariant }> = {
  pending:    { label: "En attente",  variant: "warning"   },
  paid:       { label: "Payée",       variant: "info"      },
  processing: { label: "En cours",   variant: "info"      },
  shipped:    { label: "Expédiée",   variant: "primary"   },
  delivered:  { label: "Livrée",     variant: "success"   },
  cancelled:  { label: "Annulée",    variant: "danger"    },
  refunded:   { label: "Remboursée", variant: "secondary" },
};

export const STATUT_VOUCHER: Record<string, { label: string; variant: BadgeVariant }> = {
  unused:  { label: "Disponible", variant: "success"   },
  used:    { label: "Utilisé",    variant: "secondary" },
  expired: { label: "Expiré",     variant: "danger"    },
};

export const STATUT_CONTACT: Record<string, { label: string; variant: BadgeVariant }> = {
  nouveau:  { label: "Nouveau", variant: "warning"   },
  lu:       { label: "Lu",      variant: "info"      },
  repondu:  { label: "Répondu", variant: "emerald"   },
  archive:  { label: "Archivé", variant: "secondary" },
};
