// Types et calculs partagés de la page Transactions (admin) et de son export PDF.

export type LigneVol = {
  id: string;
  date: string;
  client: string;
  type_resa: "standard" | "perso";
  acompte: number | null;
  paye: number;
  remboursement: number;
  net_client: number;
  duree: number | null;
  duree_reelle: number | null;
  passagers: number | null;
  cout_avion: number | null;
  part_pilote: number | null;
  part_pilote_pct: number | null;
  part_attendue_pct: number | null;
  resultat: number | null;
  voucher_code: string | null;
  voucher_montant: number | null;
  stripe_fee: number | null;
  stripe_net: number | null;
  stripe_fee_estimated: boolean;
  // Vol réglé à Fly Horizons puis confié à un pilote : pas de coût avion, la
  // sortie est le virement au pilote (`reversement`), le reste est le bénéfice.
  confie: boolean;
  pilote: string | null;
  iban: string | null;
  effectue: boolean;
  reversement: number | null;
  reversement_at: string | null;
};

export type LigneVoucher = {
  id: string;
  date: string;
  destinataire: string;
  type: "boutique" | "cash" | "offered";
  minutes: number;
  montant: number | null;
  code: string;
};

// Vol confié à un pilote tiers (modèle A) — informatif, 0 € dans la caisse.
export type LignePiloteVol = {
  id: string;
  date: string;
  client: string;
  pilote: string;
  montant: number | null;
  paye: boolean;
};

// Vol réglé à Fly Horizons puis confié à un pilote (décision 18) : Romain vire
// le pilote après le vol, hors de l'app ; on trace le montant et la date.
export type LigneReversement = {
  id: string;
  date: string;
  client: string;
  pilote: string;
  iban: string | null;
  encaisse: number;
  effectue: boolean;
  montant: number | null;
  faitLe: string | null;
};

export type Depense = {
  id: string;
  montant: number;
  description: string;
  date: string;
};

export type SoldeStats = {
  encaisse: number;
  rembourse: number;
  cout_avion: number;
  depenses: number;
  solde_net: number;
  stripe_fees: number;
  part_pilote_moyenne_pct: number | null;
  vols_avec_cout: number;
  reversements: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Net encaissé d'un vol : payé moins remboursé, moins la commission Stripe. */
export function netVol(v: Pick<LigneVol, "paye" | "remboursement" | "stripe_net" | "stripe_fee">): number {
  return round2(v.paye - v.remboursement - (v.stripe_net != null ? v.stripe_fee ?? 0 : 0));
}

/**
 * Résultat d'un vol, recalculé côté client quand le virement ou le remboursement
 * change. Vol confié : net − virement (null tant que rien n'est viré). Autre vol :
 * net − coût avion (null tant que la durée réelle manque).
 */
export function resultatVol(v: LigneVol): number | null {
  const net = netVol(v);
  if (v.confie) return v.reversement != null ? round2(net - v.reversement) : null;
  return v.cout_avion != null ? round2(net - v.cout_avion) : null;
}
