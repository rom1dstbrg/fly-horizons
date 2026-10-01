import { STATUT_RESA, STATUT_PERSO, type BadgeVariant } from "./statuts";

// Le webhook Stripe remet volontairement les résas standard en `en_attente` après paiement
// en ligne (au lieu de `acompte_recu`) pour rester dans le même flux "en attente de
// confirmation date/heure". Ce statut brut affiche donc "À encaisser" même quand
// payment_status vaut déjà "paid" — cette fonction corrige l'affichage sans toucher au flux.
//
// Fichier séparé (sans "use client") car AdminBadge.tsx est un composant client : une fonction
// exportée depuis un module client ne peut pas être appelée depuis un composant serveur.
export function getResaBadge(r: {
  statut: string;
  type_resa: string;
  payment_status?: string | null;
  /** Lien de report envoyé : le client doit choisir une nouvelle date. */
  reschedule_token?: string | null;
  /** Nouveau créneau proposé par le pilote, en attente de la réponse du client. */
  slot_proposal_token?: string | null;
}): { label: string; variant: BadgeVariant } {
  // Un report ou un créneau proposé prime sur « Confirmé » : c'est ce qu'il reste à faire.
  if (!["annulee", "vol_effectue"].includes(r.statut)) {
    if (r.reschedule_token) return { label: "Report en cours", variant: "warning" };
    if (r.slot_proposal_token) return { label: "Créneau proposé", variant: "warning" };
  }
  if (r.type_resa !== "perso" && r.statut === "en_attente" && r.payment_status === "paid") {
    return { label: "Payé", variant: "emerald" };
  }
  const map = r.type_resa === "perso" ? STATUT_PERSO : STATUT_RESA;
  return map[r.statut] ?? { label: r.statut, variant: "secondary" };
}
