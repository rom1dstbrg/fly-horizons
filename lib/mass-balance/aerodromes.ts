/**
 * Base d'aérodromes locale (en dur) — élévation, pistes (cap magnétique) et,
 * quand elles sont connues, les distances déclarées TODA / LDA par seuil.
 * Sert à préremplir les champs perf quand l'exploitant saisit un code ICAO connu.
 *
 * `toda` / `lda` à `null` = distance non codée, à saisir à la main.
 * Toujours vérifier l'AIP / les consignes locales avant le vol.
 */

export interface AerodromeRunway {
  ident: string; // "24"
  heading: number; // cap magnétique en degrés
  toda: number | null; // m
  lda: number | null; // m
  note?: string;
}

export interface AerodromeRec {
  icao: string;
  name: string;
  elevation: number; // ft
  runways: AerodromeRunway[];
}

export const AERODROMES: Record<string, AerodromeRec> = {
  EBCI: {
    icao: "EBCI",
    name: "Charleroi — Brussels South",
    elevation: 606,
    runways: [
      { ident: "24", heading: 240, toda: 1820, lda: 2405, note: "TODA via S4" },
      { ident: "06", heading: 60, toda: 2905, lda: 2600 },
    ],
  },
  EBNM: {
    icao: "EBNM",
    name: "Namur — Suarlée",
    elevation: 581,
    runways: [
      { ident: "06", heading: 60, toda: null, lda: null },
      { ident: "24", heading: 240, toda: null, lda: null },
    ],
  },
  LFAT: {
    icao: "LFAT",
    name: "Le Touquet — Côte d'Opale",
    elevation: 36,
    runways: [
      { ident: "13", heading: 130, toda: null, lda: null },
      { ident: "31", heading: 310, toda: null, lda: null },
      { ident: "04", heading: 40, toda: null, lda: null },
      { ident: "22", heading: 220, toda: null, lda: null },
    ],
  },
  EHMZ: {
    icao: "EHMZ",
    name: "Midden-Zeeland",
    elevation: 1,
    runways: [
      { ident: "09", heading: 90, toda: null, lda: null },
      { ident: "27", heading: 270, toda: null, lda: null },
    ],
  },
};

export function findAerodrome(icao: string | null | undefined): AerodromeRec | null {
  if (!icao) return null;
  return AERODROMES[icao.trim().toUpperCase()] ?? null;
}
