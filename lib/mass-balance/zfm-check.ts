import type { MassBalanceComputed } from "./da40-calc";
import { ARM, CG_AFT, FUEL_MAX_GAL, MASS_MAX, MASS_MIN, cgFwd, galToKg } from "./da40-data";

// Lecture du point ZFM (masse sans carburant), ajoutée le 24/09 à la demande de
// Romain, SANS toucher au calcul : si seul le ZFM sort de l'enveloppe alors que
// le décollage et l'atterrissage sont dans les limites, le vol reste possible —
// on affiche une alerte orange et la quantité de carburant sous laquelle le
// centrage sortirait des limites (le ZFM, c'est l'avion réservoirs vides).

const inside = (m: number, cg: number) =>
  m >= MASS_MIN && m <= MASS_MAX && cg >= cgFwd(m) - 1e-9 && cg <= CG_AFT + 1e-9;

/** Vrai si les seuls dépassements concernent le point ZFM. */
export function onlyZfmOut(c: MassBalanceComputed): boolean {
  if (c.withinLimits || c.issues.length === 0) return false;
  const others = c.points.filter((p) => p.k !== "ZFM");
  return c.issues.every((i) => i.startsWith("ZFM")) && others.every((p) => p.inside);
}

/**
 * Carburant minimum (gal, au 0,5 près) à garder dans les réservoirs pour que
 * le centrage reste dans les limites, charge actuelle inchangée. `null` si
 * aucune quantité jusqu'au plein ne suffit.
 */
export function minFuelGalInLimits(c: MassBalanceComputed): number | null {
  for (let g = 0; g <= FUEL_MAX_GAL + 1e-9; g += 0.5) {
    const kg = galToKg(g);
    const m = c.zfm + kg;
    const cg = (c.moZfm + kg * ARM.fuel) / m;
    if (inside(m, cg)) return g;
  }
  return null;
}
