// Zone detection for the vol-sur-mesure wizard.
//
// A "zone" is a recognizable Belgian region that a client might describe
// in natural language (e.g. "les Ardennes", "la mer du nord") instead of
// a precise city or landmark. When the user's query matches a zone's
// keywords, a special "Zone" result appears at the top of the dropdown,
// above the regular Nominatim results.
//
// To add a zone: append an entry to ZONES with its keywords, a
// representative lat/lng (center or most scenic point), and a short
// description shown as subtitle in the dropdown.

export interface ZoneResult {
  id: string;
  nom: string;
  description: string;
  lat: number;
  lng: number;
}

interface ZoneEntry extends ZoneResult {
  keywords: string[];
}

const ZONES: ZoneEntry[] = [
  // Examples — uncomment and extend as needed:
  //
  // {
  //   id: "ardennes",
  //   nom: "Les Ardennes",
  //   description: "La Roche-en-Ardenne, Bastogne, Hautes Fagnes",
  //   lat: 50.1843,
  //   lng: 5.5706,
  //   keywords: ["ardenne", "ardennes"],
  // },
  // {
  //   id: "cote-belge",
  //   nom: "Côte belge",
  //   description: "Ostende, De Haan, Knokke-Heist",
  //   lat: 51.2310,
  //   lng: 2.9161,
  //   keywords: ["côte", "cote", "mer du nord", "littoral", "plage", "ostende"],
  // },
  // {
  //   id: "fagnes",
  //   nom: "Hautes Fagnes",
  //   description: "Signal de Botrange, tourbières, panoramas",
  //   lat: 50.4980,
  //   lng: 6.0833,
  //   keywords: ["fagnes", "hautes fagnes", "botrange"],
  // },
  // {
  //   id: "meuse",
  //   nom: "Vallée de la Meuse",
  //   description: "Dinant, Namur, Huy, citadelles et rochers",
  //   lat: 50.2604,
  //   lng: 4.9147,
  //   keywords: ["meuse", "vallée de la meuse"],
  // },
  // {
  //   id: "gaume",
  //   nom: "La Gaume",
  //   description: "Virton, Florenville, abbaye d'Orval",
  //   lat: 49.6780,
  //   lng: 5.5200,
  //   keywords: ["gaume", "lorraine belge"],
  // },
];

/**
 * Returns zone results matching the user's query.
 * Called on every keystroke in the wizard search bar.
 * Returns [] until zones are added to the ZONES array above.
 */
export function detectZones(query: string): ZoneResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return ZONES
    .filter(z => z.keywords.some(k => q.includes(k) || k.includes(q)))
    .map(({ keywords: _k, ...rest }) => rest);
}
