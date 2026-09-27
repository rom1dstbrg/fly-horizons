// Qualifications déclarées par le pilote. La SEP y figure aussi (2 ans), mais
// l'éligibilité se base sur la date relevée par Romain sur la licence
// (pilotes.licence_expiration). Module neutre : profil (client) et action serveur.
// Durées de validité usuelles EASA ; la date calculée reste modifiable.

export interface Qualification {
  type: string;          // clé de QUALIF_TYPES
  label?: string | null; // nom libre pour « Autre »
  obtenue: string | null; // 'YYYY-MM-DD' : obtention ou dernière prorogation
  expire: string | null;  // 'YYYY-MM-DD', null = sans expiration
}

export const QUALIF_TYPES: { key: string; label: string; months: number | null }[] = [
  { key: "SEP", label: "SEP (monomoteur à pistons)", months: 24 },
  { key: "MEP", label: "MEP (multimoteur à pistons)", months: 12 },
  { key: "IR_SE", label: "IR monomoteur", months: 12 },
  { key: "IR_ME", label: "IR multimoteur", months: 12 },
  { key: "TMG", label: "TMG (motoplaneur)", months: 24 },
  { key: "NIGHT", label: "Vol de nuit", months: null },
  { key: "FI", label: "Instructeur (FI)", months: 36 },
  { key: "AUTRE", label: "Autre", months: null },
];

export function qualifLabel(q: Qualification): string {
  if (q.type === "AUTRE") return q.label?.trim() || "Autre";
  return QUALIF_TYPES.find((t) => t.key === q.type)?.label ?? q.type;
}

/** Expiration par défaut : date d'obtention + durée du type (null si sans expiration). */
export function defaultExpiry(type: string, obtenue: string | null): string | null {
  const months = QUALIF_TYPES.find((t) => t.key === type)?.months ?? null;
  if (!months || !obtenue) return null;
  const [y, m, d] = obtenue.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  return dt.toISOString().slice(0, 10);
}
