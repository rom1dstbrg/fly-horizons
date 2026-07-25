export type Waypoint = { lat: number; lng: number; nom?: string };
export type Stopover = { icao: string; nom: string; taxe: number; lat?: number; lng?: number };

// Superset des champs standard + perso — un seul type pour piloter le drawer unifié,
// peu importe type_resa. Les champs spécifiques à un type sont optionnels/null pour l'autre.
export interface DrawerReservation {
  id: string;
  date_vol: string;
  heure_vol: string | null;
  duree: number;
  duree_reelle?: number | null;
  passagers: number;
  poids_total: number | null;
  statut: string;
  type_resa: string;
  voucher_code: string | null;
  coupon_code: string | null;
  payment_status: string | null;
  commentaire: string | null;
  acompte: number | null;
  paye: number | null;
  remboursement?: number | null;
  payment_token: string | null;
  created_at: string;
  avion_reserve?: boolean;

  // Route — ancien système texte (standard uniquement)
  route?: string | null;
  route_token?: string | null;
  route_status?: string | null;
  route_feedback?: string | null;
  final_waypoints?: Waypoint[] | null;

  // Vol sur mesure (perso) uniquement
  distance_km?: number | null;
  style_vol?: "rapide" | "vues" | null;
  waypoints?: Waypoint[] | null;
  stopovers?: Stopover[] | null;
  taxes_escales?: number | null;
  date_confirmee_at?: string | null;
  heure_confirmee_at?: string | null;
  route_proposals?: Array<{ status: string; created_at: string }> | null;

  clients: {
    id: string;
    prenom: string;
    nom: string;
    email: string;
    telephone: string | null;
  } | null;
}

export type Tab = "infos" | "modifier" | "historique";

export type HistoryItem = {
  id: string;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  author: string;
  note: string | null;
  created_at: string;
};

export type RouteProposal = {
  id: string;
  created_at: string;
  status: string;
  admin_comment: string | null;
  client_comment: string | null;
  waypoints: Waypoint[];
  token: string;
};

export const FIELD_LABELS: Record<string, string> = {
  "client.prenom":    "Prénom",
  "client.nom":       "Nom",
  "client.email":     "Email",
  "client.telephone": "Téléphone",
  date_vol:           "Date",
  heure_vol:          "Heure",
  duree:              "Durée",
  passagers:          "Passagers",
  poids_total:        "Poids total",
  acompte:            "Provision",
  paye:               "Montant payé",
  payment_status:     "Statut paiement",
  voucher_code:       "Code voucher",
  coupon_code:        "Code promo",
  commentaire:        "Remarques",
  final_waypoints:    "Route finale",
  route_proposal:     "Proposition de route",
  style_vol:          "Style de vol",
  remboursement:      "Remboursement",
};

export type EmailTemplate = {
  label: string;
  subject: (dateStr: string) => string;
  body: (prenom: string, dateStr: string) => string;
  includeReschedule?: boolean;
};

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    label: "Report météo",
    subject: (dateStr) => `Fly Horizons · Votre vol du ${dateStr}`,
    includeReschedule: true,
    body: (prenom, dateStr) =>
`Bonjour ${prenom},

J'ai suivi les prévisions pour le ${dateStr} et les conditions ne permettent malheureusement pas de voler en sécurité. Je préfère reporter plutôt que de vous faire prendre des risques ou de vous faire passer une mauvaise expérience.

Votre provision est bien conservée, aucun frais ne vous est facturé.

Vous pouvez choisir votre nouvelle date directement depuis votre espace client en cliquant sur le bouton de report ci-dessous.

À très vite,
Romain, pilote et fondateur de Fly Horizons`,
  },
  {
    label: "Vol maintenu",
    subject: (dateStr) => `Fly Horizons · Vol confirmé pour le ${dateStr}`,
    body: (prenom, dateStr) =>
`Bonjour ${prenom},

Bonne nouvelle, j'ai vérifié la météo pour le ${dateStr} et tout est au vert. Le vol est bien maintenu comme prévu.

Rendez-vous à l'aéroport de Charleroi (EBCI) 15 minutes avant l'heure convenue. N'hésitez pas si vous avez une question avant votre arrivée.

À très bientôt,
Romain, pilote et fondateur de Fly Horizons`,
  },
];

export const ROUTE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:                 { label: "En attente de validation", color: "bg-amber-50 text-amber-700 border-amber-200" },
  sent:                    { label: "En attente de validation", color: "bg-amber-50 text-amber-700 border-amber-200" },
  accepted:                { label: "Validée ✓",               color: "bg-green-50 text-green-700 border-green-200" },
  validated:               { label: "Validée ✓",               color: "bg-green-50 text-green-700 border-green-200" },
  modification_requested:  { label: "Modification demandée",   color: "bg-red-50 text-red-700 border-red-200" },
};
