// Libellés des statuts de réservation — module neutre (pas "use client") pour
// pouvoir être lu aussi bien par les composants serveur que client. Importé
// depuis un module "use client", un objet devient une référence client vide
// côté serveur (bug du 24/09 : statuts affichés bruts sur l'accueil pilote).

export type BadgeVariant =
  | "warning"    // yellow   — En attente
  | "info"       // blue     — Planifié / Lu
  | "success"    // green    — Confirmé / Disponible
  | "primary"    // purple   — Effectué
  | "danger"     // red      — Annulé / Expiré
  | "secondary"  // gray     — Archivé / Utilisé
  | "orange"     // orange   — Paiement en att.
  | "emerald";   // emerald  — Acompte reçu / Répondu


export const STATUT_RESA: Record<string, { label: string; variant: BadgeVariant }> = {
  demande_recue:   { label: "Nouvelle demande",     variant: "warning" },
  payment_pending: { label: "Paiement en attente",  variant: "orange"  },
  en_attente:      { label: "À confirmer",          variant: "warning" },
  // Standard n'utilise pas ce statut dans son flux automatique (Stripe → en_attente directement),
  // mais il reste atteignable manuellement (cash, "Marquer paiement reçu") — label requis pour l'affichage.
  acompte_recu:    { label: "Payé",                 variant: "emerald" },
  date_confirmee:  { label: "Date confirmée",       variant: "info"    },
  heure_confirmee: { label: "Vol confirmé",         variant: "success" },
  vol_effectue:    { label: "Vol effectué",         variant: "primary" },
  annulee:         { label: "Annulée",              variant: "danger"  },
};

export const STATUT_PERSO: Record<string, { label: string; variant: BadgeVariant }> = {
  en_attente:      { label: "En attente",      variant: "warning" },
  acompte_recu:    { label: "Provision reçue", variant: "emerald" },
  date_confirmee:  { label: "Date confirmée",  variant: "info"    },
  heure_confirmee: { label: "Vol confirmé",    variant: "success" },
  vol_effectue:    { label: "Vol effectué",    variant: "primary" },
  annulee:         { label: "Annulée",         variant: "danger"  },
};
