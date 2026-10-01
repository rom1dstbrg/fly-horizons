// Signaux de supervision d'une réservation (01/10) : ce qui traîne, pour l'admin.
// Fonction pure, partagée par la page Réservations de l'admin et par le cron de
// relances push (/api/cron/signaux) : mêmes seuils partout.
//
// Seuils fixés par Romain :
//  - demande sans réponse du pilote : orange à 36 h, rouge à 48 h ;
//  - paiement en attente depuis l'envoi du lien : orange à 3 jours, rouge à 5 jours ;
//  - le client dit avoir payé, le pilote n'a pas confirmé : même délai que la demande
//    (36 h / 48 h), choix par défaut à confirmer avec Romain.
// Seuils posés par défaut (à valider) : vol passé non clôturé, vol proche sans heure.

import { brusselsTimestamp } from "@/lib/utils";

export type SignalLevel = "warn" | "bad";
export type SignalKind = "sans_reponse" | "client_dit_paye" | "paiement_attente" | "non_cloture" | "sans_heure";

export interface Signal {
  kind: SignalKind;
  level: SignalLevel;
  label: string;
}

export interface SignalInput {
  statut: string;
  type_resa?: string | null;
  date_vol: string;
  heure_vol: string | null;
  created_at: string;
  pilote_id?: string | null;
  pilote_assigned_at?: string | null;
  pilote_paye?: boolean | null;
  paiement_demande_at?: string | null;
  client_paiement_declare_at?: string | null;
  reschedule_token?: string | null;
  slot_proposal_token?: string | null;
}

const H = 3600_000;
const D = 24 * H;

const DEMANDE = ["demande_recue", "en_attente"];
const TERMINE = ["annulee", "vol_effectue"];

/** « 3 j » ou « 41 h » : durée écoulée, lisible d'un coup d'œil. */
export function depuis(ms: number): string {
  return ms >= 2 * D ? `${Math.floor(ms / D)} j` : `${Math.max(1, Math.floor(ms / H))} h`;
}

function niveau(ms: number, orange: number, rouge: number): SignalLevel | null {
  return ms >= rouge ? "bad" : ms >= orange ? "warn" : null;
}

/** Tous les signaux actifs, le plus grave d'abord. */
export function getSignals(r: SignalInput, now: number = Date.now()): Signal[] {
  const out: Signal[] = [];
  if (r.statut === "annulee") return out;

  // 1. Demande restée sans réponse
  if (DEMANDE.includes(r.statut)) {
    const depart = Math.max(
      new Date(r.created_at).getTime(),
      r.pilote_assigned_at ? new Date(r.pilote_assigned_at).getTime() : 0,
    );
    const ms = now - depart;
    const l = niveau(ms, 36 * H, 48 * H);
    if (l) out.push({ kind: "sans_reponse", level: l, label: `Sans réponse depuis ${depuis(ms)}` });
  }

  // 2. Le client dit avoir payé : le pilote doit confirmer la réception
  if (r.client_paiement_declare_at && r.pilote_paye !== true) {
    const ms = now - new Date(r.client_paiement_declare_at).getTime();
    const l = niveau(ms, 36 * H, 48 * H);
    if (l) out.push({ kind: "client_dit_paye", level: l, label: `Paiement à confirmer depuis ${depuis(ms)}` });
  } else if (
    // 3. Lien de paiement envoyé, rien reçu ni déclaré
    r.paiement_demande_at &&
    r.pilote_paye !== true &&
    !TERMINE.includes(r.statut) &&
    (r.type_resa === "annonce_pilote" || r.statut === "payment_pending")
  ) {
    const ms = now - new Date(r.paiement_demande_at).getTime();
    const l = niveau(ms, 3 * D, 5 * D);
    if (l) out.push({ kind: "paiement_attente", level: l, label: `Paiement attendu depuis ${depuis(ms)}` });
  }

  // Report ou créneau proposé en cours : la date en base est périmée, le client
  // doit encore en choisir une. Ni « non clôturé » ni « sans heure » n'ont de sens.
  const dateAReprendre = !!(r.reschedule_token || r.slot_proposal_token);

  // 4. Vol passé jamais clôturé (valeurs par défaut : orange à 24 h, rouge à 72 h)
  if (!dateAReprendre && !TERMINE.includes(r.statut) && !DEMANDE.includes(r.statut) && r.statut !== "payment_pending") {
    const ms = now - brusselsTimestamp(r.date_vol, r.heure_vol);
    const l = niveau(ms, 24 * H, 72 * H);
    if (l) out.push({ kind: "non_cloture", level: l, label: `Non marqué effectué depuis ${depuis(ms)}` });
  }

  // 5. Vol dans moins de 48 h sans heure (rouge le jour même)
  if (!dateAReprendre && !r.heure_vol && !TERMINE.includes(r.statut)) {
    const jours = (brusselsTimestamp(r.date_vol, "00:00") - now) / D;
    if (jours < 2 && jours > -1) {
      out.push({ kind: "sans_heure", level: jours < 1 ? "bad" : "warn", label: jours < 1 ? "Vol aujourd'hui sans heure" : "Vol demain sans heure" });
    }
  }

  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === "bad" ? -1 : 1));
}

/** Le plus grave des signaux, ou null. */
export function topSignal(r: SignalInput, now?: number): Signal | null {
  return getSignals(r, now)[0] ?? null;
}
