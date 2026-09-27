// Types et calculs de l'onglet Transactions du pilote, sans accès à la base :
// importables côté client (la lecture est dans ./transactions.ts).

export type PaiementEtat = "recu" | "attente" | "relance";

export type PiloteTransaction = {
  id: string;
  date: string; // YYYY-MM-DD
  heure: string | null; // HH:MM
  client: string;
  titre: string;
  annonceId: string | null;
  duree: number | null;
  dureeReelle: number | null;
  passagers: number | null;
  /** Montant dû par ce passager (reservations.acompte). */
  montant: number | null;
  /** Coût total du vol (annonces_pilote.prix_total), null hors annonce. */
  cout: number | null;
  /** Part payée par le pilote sur ce vol (annonces_pilote.part_pilote). */
  part: number | null;
  modeVente: "avion" | "place" | null;
  effectue: boolean;
  etat: PaiementEtat;
  payeLe: string | null; // ISO
  communication: string;
};

export function todayBrussels(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Brussels" });
}

// « À relancer » : le vol est passé (ou marqué effectué) et le virement n'est
// toujours pas là. Avant le vol, le paiement est simplement « en attente » ;
// sans montant (groupe pas encore clôturé), il n'y a rien à réclamer.
// Même règle que la pastille de la navigation (app/pilote/layout.tsx).
export function etatPaiement(
  r: { pilote_paye: boolean | null; statut: string; date_vol: string; acompte: number | null },
  today: string,
): PaiementEtat {
  if (r.pilote_paye) return "recu";
  if (r.acompte != null && (r.statut === "vol_effectue" || r.date_vol < today)) return "relance";
  return "attente";
}

export type TransactionsBilan = {
  recu: number;
  nRecus: number;
  aRecevoir: number;
  nARecevoir: number;
  nRelance: number;
  /** Vols effectués (un vol = une annonce, même avec plusieurs passagers). */
  vols: number;
  minutes: number;
  coutTotal: number;
  partTotal: number;
  paxTotal: number;
  /** Reçu par mois (index 0 = janvier), selon la date du vol. */
  parMois: number[];
};

// Un vol d'annonce peut avoir plusieurs passagers (vente à la place) : le coût
// et la part du pilote se comptent une seule fois par vol.
function volKey(t: PiloteTransaction) {
  return t.annonceId ? `${t.annonceId}|${t.date}` : t.id;
}

export function bilanTransactions(rows: PiloteTransaction[]): TransactionsBilan {
  const b: TransactionsBilan = {
    recu: 0, nRecus: 0, aRecevoir: 0, nARecevoir: 0, nRelance: 0,
    vols: 0, minutes: 0, coutTotal: 0, partTotal: 0, paxTotal: 0, parMois: Array(12).fill(0),
  };
  const vols = new Map<string, PiloteTransaction>();
  for (const t of rows) {
    const m = t.montant ?? 0;
    if (t.etat === "recu") {
      b.recu += m;
      b.nRecus++;
      b.parMois[Number(t.date.slice(5, 7)) - 1] += m;
    } else {
      b.aRecevoir += m;
      b.nARecevoir++;
      if (t.etat === "relance") b.nRelance++;
    }
    if (t.effectue && !vols.has(volKey(t))) vols.set(volKey(t), t);
  }
  for (const t of vols.values()) {
    b.vols++;
    b.minutes += t.dureeReelle ?? t.duree ?? 0;
    if (t.cout != null && t.part != null) {
      b.coutTotal += t.cout;
      b.partTotal += t.part;
      b.paxTotal += Math.max(0, t.cout - t.part);
    }
  }
  return b;
}

// Même ordre que Mes vols : les vols à venir du plus proche au plus lointain,
// puis les vols passés (ou effectués) du plus récent au plus ancien.
export function ordreVols(rows: PiloteTransaction[], today: string): PiloteTransaction[] {
  const passe = (t: PiloteTransaction) => t.effectue || t.date < today;
  const aVenir = rows.filter((t) => !passe(t)).sort((a, b) => a.date.localeCompare(b.date) || (a.heure ?? "").localeCompare(b.heure ?? ""));
  const passes = rows.filter(passe).sort((a, b) => b.date.localeCompare(a.date) || (b.heure ?? "").localeCompare(a.heure ?? ""));
  return [...aVenir, ...passes];
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}
