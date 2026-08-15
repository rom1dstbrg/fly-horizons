// Vérification légale de la part de frais déclarée par le pilote sur ses propres
// annonces (vols cost-shared NCO.GEN.104). Seuil fixe à 25% = part égale pour un
// avion 4 places (pilote + 3 passagers max) — voir docs/espace-pilote-systeme.html.
export type PartPiloteLevel = "block" | "warn" | "ok";

export interface PartPiloteCheck {
  pct: number;
  level: PartPiloteLevel;
  message: string | null;
}

export function evaluerPartPilote(prixTotal: number, partPilote: number): PartPiloteCheck {
  if (!(prixTotal > 0) || !(partPilote >= 0)) {
    return { pct: 0, level: "block", message: "Indiquez un prix total et votre part." };
  }

  const pct = Math.round((partPilote / prixTotal) * 1000) / 10;

  if (partPilote <= 0) {
    return {
      pct,
      level: "block",
      message: "Vous devez indiquer une part réelle à votre charge pour publier ce vol légalement.",
    };
  }

  if (pct < 25) {
    return {
      pct,
      level: "warn",
      message: `Votre part (${pct}%) est en dessous de 25% du prix total. Vérifiez que ça reste conforme aux règles de partage de frais.`,
    };
  }

  return { pct, level: "ok", message: null };
}
