// Données d'espace aérien belge — approximations éducatives
// Source : basé sur l'AIP Belgique (skeyes.aero) — toujours vérifier avant usage opérationnel

export interface AirspaceZone {
  id: string;
  name: string;
  shortName: string;
  type: "restricted" | "ctr" | "danger";
  fillColor: string;
  strokeColor: string;
  polygon: [number, number][]; // [lat, lng]
  message: string;
}

export const AIRSPACE_ZONES: AirspaceZone[] = [
  {
    id: "R01",
    name: "Zone Réglementée R01 — Bruxelles",
    shortName: "R01",
    type: "restricted",
    fillColor: "#ef4444",
    strokeColor: "#b91c1c",
    message:
      "Zone Réglementée R01 (Bruxelles) — Survol interdit sans autorisation. Cette zone protège l'espace aérien au-dessus de la capitale belge.",
    polygon: [
      [50.9136, 4.3150],
      [50.9200, 4.3800],
      [50.9136, 4.4500],
      [50.8750, 4.4950],
      [50.8200, 4.4850],
      [50.7850, 4.4300],
      [50.7800, 4.3550],
      [50.7900, 4.2900],
      [50.8300, 4.2600],
      [50.8700, 4.2750],
    ],
  },
  {
    id: "CTR-EBBR",
    name: "CTR Brussels National (EBBR)",
    shortName: "CTR EBBR",
    type: "ctr",
    fillColor: "#f97316",
    strokeColor: "#ea580c",
    message:
      "CTR Brussels National (EBBR) — Espace aérien contrôlé. Coordination obligatoire avec le contrôle ATC de Bruxelles.",
    polygon: [
      [51.0400, 4.3600],
      [51.0400, 4.6400],
      [50.9700, 4.7100],
      [50.9100, 4.6900],
      [50.8800, 4.6000],
      [50.9000, 4.4800],
      [50.9500, 4.3900],
      [51.0100, 4.3500],
    ],
  },
];

// ── Destinations populaires depuis EBCI (Charleroi) ────────────────────────
// Tous les waypoints sont positionnés pour éviter R01 et CTR EBBR
export interface Destination {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  durationMin: number;
  distKm: number;
  tag?: "Populaire" | "Nature" | "Historique";
  accentColor: string;
  waypoints: { lat: number; lng: number; nom: string }[];
}

export const DESTINATIONS: Destination[] = [
  {
    id: "eau-dheure",
    name: "Lacs de l'Eau d'Heure",
    subtitle: "Les plus grands lacs de Belgique",
    icon: "🏞️",
    durationMin: 20,
    distKm: 30,
    tag: "Nature",
    accentColor: "#0ea5e9",
    waypoints: [{ lat: 50.210, lng: 4.400, nom: "Lac de l'Eau d'Heure" }],
  },
  {
    id: "namur",
    name: "Namur & Citadelle",
    subtitle: "La confluence Sambre-Meuse",
    icon: "🏰",
    durationMin: 32,
    distKm: 52,
    tag: "Populaire",
    accentColor: "#8b5cf6",
    waypoints: [{ lat: 50.462, lng: 4.862, nom: "Namur — Citadelle" }],
  },
  {
    id: "dinant",
    name: "Dinant & la Meuse",
    subtitle: "Les rochers et la citadelle",
    icon: "⛪",
    durationMin: 42,
    distKm: 68,
    tag: "Populaire",
    accentColor: "#ec4899",
    waypoints: [
      { lat: 50.350, lng: 4.780, nom: "Vallée de la Meuse" },
      { lat: 50.261, lng: 4.912, nom: "Dinant — Citadelle" },
    ],
  },
  {
    id: "mons",
    name: "Mons & Borinage",
    subtitle: "Patrimoine UNESCO & Grand-Place",
    icon: "🏛️",
    durationMin: 25,
    distKm: 40,
    tag: "Historique",
    accentColor: "#f59e0b",
    waypoints: [{ lat: 50.454, lng: 3.952, nom: "Mons — Grand-Place" }],
  },
  {
    id: "ardennes",
    name: "Ardennes belges",
    subtitle: "Forêts et vallées de La Roche",
    icon: "🌲",
    durationMin: 55,
    distKm: 88,
    tag: "Nature",
    accentColor: "#10b981",
    waypoints: [
      { lat: 50.430, lng: 5.200, nom: "Marche-en-Famenne" },
      { lat: 50.183, lng: 5.577, nom: "La Roche-en-Ardenne" },
    ],
  },
  {
    id: "liege",
    name: "Liège — Cité Ardente",
    subtitle: "Huy et les bords de Meuse",
    icon: "🏙️",
    durationMin: 48,
    distKm: 78,
    accentColor: "#6366f1",
    waypoints: [
      { lat: 50.519, lng: 5.237, nom: "Huy — Collégiale" },
      { lat: 50.633, lng: 5.567, nom: "Liège — Centre" },
    ],
  },
  {
    id: "tournai",
    name: "Tournai & Cathédrale",
    subtitle: "La plus vieille cathédrale belge",
    icon: "⛩️",
    durationMin: 35,
    distKm: 56,
    tag: "Historique",
    accentColor: "#f97316",
    waypoints: [{ lat: 50.607, lng: 3.388, nom: "Tournai — Cathédrale" }],
  },
  {
    id: "han",
    name: "Grottes de Han",
    subtitle: "La Lesse et ses grottes célèbres",
    icon: "🦇",
    durationMin: 38,
    distKm: 60,
    tag: "Nature",
    accentColor: "#64748b",
    waypoints: [{ lat: 50.126, lng: 5.183, nom: "Han-sur-Lesse" }],
  },
];

// ── Vols packagés (itinéraires prêts-à-partir) ────────────────────────────
export interface VolPackage {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  durationMin: number;
  distKm: number;
  tag?: "Populaire" | "Nature" | "Historique" | "Découverte";
  accentColor: string;
  waypoints: { lat: number; lng: number; nom: string }[];
  stops: string[]; // noms lisibles des étapes
}

export const VOL_PACKAGES: VolPackage[] = [
  {
    id: "pkg-decouverte",
    name: "Vol découverte",
    subtitle: "Survolez les grands lacs belges",
    icon: "🏞️",
    durationMin: 30,
    distKm: 50,
    tag: "Découverte",
    accentColor: "#0ea5e9",
    stops: ["Lacs de l'Eau d'Heure"],
    waypoints: [{ lat: 50.210, lng: 4.400, nom: "Lac de l'Eau d'Heure" }],
  },
  {
    id: "pkg-mons",
    name: "Mons & Borinage",
    subtitle: "Grand-Place & patrimoine UNESCO",
    icon: "🏛️",
    durationMin: 26,
    distKm: 42,
    tag: "Historique",
    accentColor: "#f59e0b",
    stops: ["Mons — Grand-Place"],
    waypoints: [{ lat: 50.454, lng: 3.952, nom: "Mons — Grand-Place" }],
  },
  {
    id: "pkg-namur",
    name: "Namur & Citadelle",
    subtitle: "La confluence Sambre-Meuse",
    icon: "🏰",
    durationMin: 34,
    distKm: 56,
    tag: "Populaire",
    accentColor: "#8b5cf6",
    stops: ["Namur — Citadelle"],
    waypoints: [{ lat: 50.462, lng: 4.862, nom: "Namur — Citadelle" }],
  },
  {
    id: "pkg-dinant",
    name: "Dinant & la Meuse",
    subtitle: "Les rochers, la citadelle et le fleuve",
    icon: "⛪",
    durationMin: 46,
    distKm: 74,
    tag: "Populaire",
    accentColor: "#ec4899",
    stops: ["Vallée de la Meuse", "Dinant — Citadelle"],
    waypoints: [
      { lat: 50.350, lng: 4.780, nom: "Vallée de la Meuse" },
      { lat: 50.261, lng: 4.912, nom: "Dinant — Citadelle" },
    ],
  },
  {
    id: "pkg-ardennes",
    name: "Grand Tour Ardennes",
    subtitle: "Forêts, vallées et La Roche-en-Ardenne",
    icon: "🌲",
    durationMin: 80,
    distKm: 130,
    tag: "Nature",
    accentColor: "#10b981",
    stops: ["Marche-en-Famenne", "La Roche-en-Ardenne"],
    waypoints: [
      { lat: 50.430, lng: 5.200, nom: "Marche-en-Famenne" },
      { lat: 50.183, lng: 5.577, nom: "La Roche-en-Ardenne" },
    ],
  },
  {
    id: "pkg-liege",
    name: "Liège & la Meuse",
    subtitle: "Huy, la Collégiale et la Cité Ardente",
    icon: "🏙️",
    durationMin: 62,
    distKm: 100,
    accentColor: "#6366f1",
    stops: ["Huy — Collégiale", "Liège — Centre"],
    waypoints: [
      { lat: 50.519, lng: 5.237, nom: "Huy — Collégiale" },
      { lat: 50.633, lng: 5.567, nom: "Liège — Centre" },
    ],
  },
];
