// Bloc D · modèle A — le pilote encaisse en direct.
// Helpers partagés : détection d'un vol « pilote », construction du QR SEPA (EPC).

export function isPiloteVol(r: { pilote_id?: string | null; type_resa?: string | null }): boolean {
  // Vol géré par un pilote en direct : soit une annonce du pilote (type
  // `annonce_pilote`), soit un vol standard qui lui a été assigné (assignation
  // Bloc B, gelée depuis le pivot 08/09 — en pratique seul `annonce_pilote`
  // matche aujourd'hui).
  return !!r.pilote_id && (r.type_resa === "annonce_pilote" || r.type_resa === "standard");
}

/** Communication de virement (max ~140 car., on reste court). */
export function piloteVirementCommunication(dateVol: string, clientNom: string): string {
  const d = new Date(dateVol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `Vol Fly Horizons ${d} ${clientNom}`.trim().slice(0, 140);
}

/**
 * Payload EPC / SEPA Credit Transfer QR ("GiroCode"), version 002.
 * Scanné par la plupart des applis bancaires européennes → virement pré-rempli.
 * https://www.europeanpaymentscouncil.eu/document-library/guidance-documents/quick-response-code-guidelines-enable-data-capture-initiation
 */
export function buildEpcPayload(o: {
  name: string;
  iban: string;
  amount: number;
  remittance: string;
}): string {
  const iban = o.iban.replace(/\s+/g, "").toUpperCase();
  const name = o.name.trim().slice(0, 70);
  const amount = `EUR${o.amount.toFixed(2)}`;
  const remittance = o.remittance.trim().slice(0, 140);
  return [
    "BCD", // Service Tag
    "002", // Version
    "1", // Character set : UTF-8
    "SCT", // Identification : SEPA Credit Transfer
    "", // BIC (optionnel en v2)
    name, // Nom du bénéficiaire
    iban, // IBAN
    amount, // Montant
    "", // Purpose
    "", // Référence structurée
    remittance, // Communication libre
  ].join("\n");
}
