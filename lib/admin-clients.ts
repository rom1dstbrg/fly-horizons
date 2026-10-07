// Page Clients de l'admin (01/10, maquette validée) : types partagés par la liste,
// le tiroir et la fiche, et le résumé d'un client (prochain vol, total payé, signal).
// Fonctions pures : la page serveur les appelle, les composants client aussi.

import { getSignals, type Signal } from "@/lib/reservation-signals";

export interface ClientResa {
  id: string;
  date_vol: string;
  heure_vol: string | null;
  duree: number;
  statut: string;
  type_resa: string;
  payment_status: string | null;
  passagers: number | null;
  acompte: number | null;
  paye: number | null;
  created_at: string;
  pilote_id: string | null;
  pilote_assigned_at: string | null;
  pilote_paye: boolean | null;
  paiement_demande_at: string | null;
  client_paiement_declare_at: string | null;
  reschedule_token: string | null;
  reschedule_invite_at: string | null;
  reschedule_reminder_at: string | null;
  satisfaction_invite_at: string | null;
  satisfaction_reminder_at: string | null;
  slot_proposal_token: string | null;
  final_waypoints: { nom?: string }[] | null;
  pilotes: { nom: string } | null;
  products: { route_waypoints: { nom?: string }[] | null } | null;
}

export interface ClientMessage {
  id: string;
  reservation_id: string;
  author: "client" | "pilote" | "admin";
  author_nom: string | null;
  content: string;
  created_at: string;
}

export interface AdminClient {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
  created_at: string;
  role: string;
  reservations: ClientResa[];
  messages: ClientMessage[];
}

/** Colonnes lues sur `reservations` pour résumer un client (liste et fiche). */
export const RESA_COLUMNS =
  "id, date_vol, heure_vol, duree, statut, type_resa, payment_status, passagers, acompte, paye, created_at, pilote_id, pilote_assigned_at, pilote_paye, paiement_demande_at, client_paiement_declare_at, reschedule_token, reschedule_invite_at, reschedule_reminder_at, satisfaction_invite_at, satisfaction_reminder_at, slot_proposal_token, final_waypoints, pilotes(nom), products(route_waypoints)";

const TERMINE = ["annulee", "vol_effectue"];

export function routeCities(r: ClientResa): string | null {
  const wps = r.final_waypoints?.length ? r.final_waypoints : r.products?.route_waypoints;
  if (!wps || wps.length === 0) return null;
  return wps.map((w) => w.nom?.trim() || "?").join(" → ");
}

export interface ClientSummary {
  /** Vols non annulés. */
  vols: number;
  effectues: number;
  /** Total réellement encaissé (colonne `paye`). */
  paye: number;
  prochain: ClientResa | null;
  dernier: ClientResa | null;
  signal: Signal | null;
  /** Pilote qui a fait voler le client le plus souvent. */
  piloteHabituel: string | null;
  /** Dernière chose qui s'est passée (réservation ou message), pour le tri. */
  activite: string;
}

export function summarizeClient(c: AdminClient, today: string): ClientSummary {
  const actives = c.reservations.filter((r) => r.statut !== "annulee");
  const effectues = actives.filter((r) => r.statut === "vol_effectue");
  const aVenir = actives
    .filter((r) => !TERMINE.includes(r.statut) && r.date_vol >= today)
    .sort((a, b) => a.date_vol.localeCompare(b.date_vol));
  const passes = actives
    .filter((r) => r.statut === "vol_effectue" || r.date_vol < today)
    .sort((a, b) => b.date_vol.localeCompare(a.date_vol));

  const signals = actives.flatMap((r) => getSignals(r));
  const signal = signals.find((s) => s.level === "bad") ?? signals[0] ?? null;

  const parPilote = new Map<string, number>();
  for (const r of effectues) {
    const nom = r.pilotes?.nom;
    if (nom) parPilote.set(nom, (parPilote.get(nom) ?? 0) + 1);
  }
  const piloteHabituel = [...parPilote.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const dates = [
    c.created_at,
    ...c.reservations.map((r) => r.created_at),
    ...c.messages.map((m) => m.created_at),
  ];

  return {
    vols: actives.length,
    effectues: effectues.length,
    paye: actives.reduce((s, r) => s + (r.paye ?? 0), 0),
    prochain: aVenir[0] ?? null,
    dernier: passes[0] ?? null,
    signal,
    piloteHabituel,
    activite: dates.reduce((a, b) => (a > b ? a : b)),
  };
}

export const initialesClient = (prenom: string, nom: string) =>
  `${prenom[0] ?? ""}${nom[0] ?? ""}`.toUpperCase() || "?";

export const fmtEuro = (n: number) => `${Math.round(n * 100) / 100} €`.replace(".", ",");

export const fmtJour = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Brussels" });

export const fmtDateLongue = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Brussels" });
