// Vérification légale de la part de frais déclarée par le pilote sur ses propres
// annonces (vols en partage de frais, NCO.GEN.104). Règle : le coût du vol peut
// être partagé, mais le pilote doit porter *au moins* sa part égale — une part
// pour chaque personne à bord, lui compris. Le minimum dépend donc du nombre de
// passagers : 1 pax → 50 %, 2 → 33 %, 3 → 25 %, 4 → 20 %, 5 → 16,7 %, 6 → 14,3 %.
// En dessous de ce minimum, ce n'est plus du partage de frais → publication bloquée.
export type PartPiloteLevel = "block" | "warn" | "ok";

export interface PartPiloteCheck {
  /** Part du pilote en % du prix total, arrondie au dixième. */
  pct: number;
  /** Minimum légal en % pour ce nombre de places (part égale, pilote compris). */
  minPct: number;
  level: PartPiloteLevel;
  message: string | null;
}

/** Minimum légal de la part pilote, en % du prix total, pour `places` passagers. */
export function partMinPourcent(places: number): number {
  const n = Math.min(Math.max(Math.round(places) || 0, 1), 6); // passagers, borné 1..6
  return Math.round((100 / (n + 1)) * 10) / 10; // part égale : 1 / (pax + pilote)
}

export function evaluerPartPilote(
  prixTotal: number,
  partPilote: number,
  places = 3,
): PartPiloteCheck {
  const minPct = partMinPourcent(places);

  if (!(prixTotal > 0) || !(partPilote >= 0)) {
    return { pct: 0, minPct, level: "block", message: "Indiquez un prix total et votre part." };
  }

  const pct = Math.round((partPilote / prixTotal) * 1000) / 10;

  if (partPilote <= 0) {
    return {
      pct,
      minPct,
      level: "block",
      message: "Vous devez indiquer une part réelle à votre charge pour publier ce vol légalement.",
    };
  }

  // Petite tolérance (0,1 pt) pour absorber les arrondis de saisie.
  if (pct + 0.1 < minPct) {
    const n = Math.min(Math.max(Math.round(places) || 0, 1), 6);
    return {
      pct,
      minPct,
      level: "block",
      message:
        `Votre part (${pct} %) est sous le minimum légal de ${minPct} % pour ${n} passager` +
        `${n > 1 ? "s" : ""} : les frais se partagent à parts égales, vous compris. ` +
        `Augmentez votre part pour pouvoir publier.`,
    };
  }

  return { pct, minPct, level: "ok", message: null };
}
