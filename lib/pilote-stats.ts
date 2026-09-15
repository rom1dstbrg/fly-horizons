import { createAdminClient } from "@/lib/supabase/admin";

// Stats de fiabilité par pilote pour /admin/pilotes — repose entièrement sur
// des données déjà existantes (reservation_history, slot_change_count,
// page_views, reservation_messages), aucune nouvelle colonne/migration.
//
// Signaux couverts (demande Romain) :
//  - vols effectués
//  - vols rendus / retirés (release_pilote, unassign_pilote), dont ceux à
//    moins de J-3 du vol — le cas « accepte puis se rétracte tard »
//  - demandes d'annonce annulées par le pilote (remise en vente)
//  - créneaux renégociés par le pilote (slot_change_count)
//  - annonces publiées + vues cumulées
//  - fils de messages où le client attend une réponse depuis >48h
// + un taux (%) pour chaque signal qui a un dénominateur qui fait sens, et
// une alerte « pilote pas fiable / pas investi » quand les seuils sont dépassés.

const PROCHE_DU_VOL_JOURS = 3;
const MESSAGE_EN_ATTENTE_HEURES = 48;

// Seuils d'alerte. Les taux n'alertent qu'au-delà d'un échantillon minimum
// (MIN_ECHANTILLON) pour ne pas flaguer un pilote tout juste arrivé sur un
// seul vol rendu (1/1 = 100 % mais pas significatif).
const MIN_ECHANTILLON = 3;
const TAUX_RENDUS_ALERTE = 0.20;
const TAUX_ANNONCES_ANNULEES_ALERTE = 0.20;
const RENDUS_PROCHES_ALERTE = 2;
const ANNONCES_ANNULEES_PROCHES_ALERTE = 2;
const MESSAGES_EN_ATTENTE_ALERTE = 2;
const MESSAGE_AGE_ALERTE_JOURS = 3;

export interface PiloteReliabilityStats {
  volsEffectues: number;
  volsRendus: number;
  volsRendusProchesDuVol: number;
  tauxVolsRendus: number | null;

  demandesAnnonceHonorees: number;
  demandesAnnonceAnnulees: number;
  demandesAnnonceAnnuleesProchesDuVol: number;
  tauxAnnonceAnnulees: number | null;

  creneauxRenegocies: number;
  annoncesPubliees: number;
  vuesAnnonces: number;

  volsActifs: number;
  messagesEnAttente: number;
  tauxMessagesEnAttente: number | null;
  plusVieuxMessageEnAttenteJours: number | null;

  alertes: string[];
  isAtRisk: boolean;
}

export function emptyReliabilityStats(): PiloteReliabilityStats {
  return {
    volsEffectues: 0,
    volsRendus: 0,
    volsRendusProchesDuVol: 0,
    tauxVolsRendus: null,
    demandesAnnonceHonorees: 0,
    demandesAnnonceAnnulees: 0,
    demandesAnnonceAnnuleesProchesDuVol: 0,
    tauxAnnonceAnnulees: null,
    creneauxRenegocies: 0,
    annoncesPubliees: 0,
    vuesAnnonces: 0,
    volsActifs: 0,
    messagesEnAttente: 0,
    tauxMessagesEnAttente: null,
    plusVieuxMessageEnAttenteJours: null,
    alertes: [],
    isAtRisk: false,
  };
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

function rate(part: number, total: number): number | null {
  return total > 0 ? part / total : null;
}

function computeAlerts(s: PiloteReliabilityStats): string[] {
  const alertes: string[] = [];

  if (s.volsRendusProchesDuVol >= RENDUS_PROCHES_ALERTE) {
    alertes.push(`${s.volsRendusProchesDuVol} vols rendus à moins de 3 jours du départ`);
  }
  const totalVols = s.volsEffectues + s.volsRendus;
  if (totalVols >= MIN_ECHANTILLON && s.tauxVolsRendus != null && s.tauxVolsRendus >= TAUX_RENDUS_ALERTE) {
    alertes.push(`${Math.round(s.tauxVolsRendus * 100)}% des vols attribués sont rendus`);
  }

  if (s.demandesAnnonceAnnuleesProchesDuVol >= ANNONCES_ANNULEES_PROCHES_ALERTE) {
    alertes.push(`${s.demandesAnnonceAnnuleesProchesDuVol} demandes d'annonce annulées à moins de 3 jours du départ`);
  }
  const totalAnnonces = s.demandesAnnonceHonorees + s.demandesAnnonceAnnulees;
  if (totalAnnonces >= MIN_ECHANTILLON && s.tauxAnnonceAnnulees != null && s.tauxAnnonceAnnulees >= TAUX_ANNONCES_ANNULEES_ALERTE) {
    alertes.push(`${Math.round(s.tauxAnnonceAnnulees * 100)}% des demandes sur ses annonces sont annulées`);
  }

  if (
    s.messagesEnAttente >= MESSAGES_EN_ATTENTE_ALERTE ||
    (s.plusVieuxMessageEnAttenteJours != null && s.plusVieuxMessageEnAttenteJours >= MESSAGE_AGE_ALERTE_JOURS)
  ) {
    alertes.push(
      s.messagesEnAttente > 1
        ? `${s.messagesEnAttente} clients sans réponse depuis plus de 48h`
        : `Un client sans réponse depuis ${Math.floor(s.plusVieuxMessageEnAttenteJours ?? 0)} j`,
    );
  }

  return alertes;
}

export async function getPilotesReliabilityStats(
  pilotes: { id: string; nom: string }[],
): Promise<Record<string, PiloteReliabilityStats>> {
  const byId: Record<string, PiloteReliabilityStats> = {};
  for (const p of pilotes) byId[p.id] = emptyReliabilityStats();
  if (pilotes.length === 0) return byId;

  const db = createAdminClient();
  const nomToId = new Map(pilotes.map((p) => [p.nom, p.id]));

  const [resasRes, historyRes, annoncesRes, messagesRes] = await Promise.all([
    db.from("reservations")
      .select("id, pilote_id, statut, date_vol, type_resa, slot_change_count"),
    db.from("reservation_history")
      .select("reservation_id, action, field, old_value, new_value, note, created_at")
      .in("action", ["release_pilote", "unassign_pilote", "field_changed"]),
    db.from("annonces_pilote").select("id, pilote_id"),
    db.from("reservation_messages")
      .select("reservation_id, author, created_at")
      .order("created_at", { ascending: true }),
  ]);

  const resas = resasRes.data ?? [];
  const resaById = new Map(resas.map((r) => [r.id as string, r]));

  // ── Vols effectués, demandes d'annonce honorées, créneaux renégociés ────
  for (const r of resas) {
    if (!r.pilote_id || !byId[r.pilote_id]) continue;
    if (r.statut === "vol_effectue") {
      byId[r.pilote_id].volsEffectues += 1;
      if (r.type_resa === "annonce_pilote") byId[r.pilote_id].demandesAnnonceHonorees += 1;
    }
    byId[r.pilote_id].creneauxRenegocies += r.slot_change_count ?? 0;
    if (r.type_resa === "annonce_pilote" && r.statut === "annulee") {
      byId[r.pilote_id].demandesAnnonceAnnulees += 1;
    }
    if (r.pilote_id && !["annulee", "vol_effectue"].includes(r.statut as string)) {
      byId[r.pilote_id].volsActifs += 1;
    }
  }

  // ── Vols rendus / retirés (attribués via old_value = nom du pilote) ─────
  // ── Demandes d'annonce annulées « proches du vol » (via le log statut) ──
  for (const h of historyRes.data ?? []) {
    const resa = resaById.get(h.reservation_id as string);

    if (h.action === "release_pilote" || h.action === "unassign_pilote") {
      const piloteId = h.old_value ? nomToId.get(h.old_value) : undefined;
      if (!piloteId || !byId[piloteId]) continue;
      byId[piloteId].volsRendus += 1;
      if (resa?.date_vol && h.created_at) {
        const d = daysBetween(h.created_at, `${resa.date_vol}T00:00:00Z`);
        if (d <= PROCHE_DU_VOL_JOURS) byId[piloteId].volsRendusProchesDuVol += 1;
      }
      continue;
    }

    if (
      h.action === "field_changed" &&
      h.field === "statut" &&
      h.new_value === "annulee" &&
      resa?.type_resa === "annonce_pilote" &&
      resa.pilote_id &&
      byId[resa.pilote_id]
    ) {
      if (resa.date_vol && h.created_at) {
        const d = daysBetween(h.created_at, `${resa.date_vol}T00:00:00Z`);
        if (d <= PROCHE_DU_VOL_JOURS) byId[resa.pilote_id].demandesAnnonceAnnuleesProchesDuVol += 1;
      }
    }
  }

  // ── Annonces publiées + vues cumulées ───────────────────────────────────
  const annonces = annoncesRes.data ?? [];
  for (const a of annonces) {
    if (a.pilote_id && byId[a.pilote_id]) byId[a.pilote_id].annoncesPubliees += 1;
  }
  const annonceToPilote = new Map(annonces.map((a) => [a.id as string, a.pilote_id as string | null]));
  if (annonces.length > 0) {
    const paths = annonces.map((a) => `/vol/annonce/${a.id}`);
    const { data: views } = await db.from("page_views").select("pathname").in("pathname", paths);
    for (const v of views ?? []) {
      const annonceId = (v.pathname as string).split("/").pop();
      const piloteId = annonceId ? annonceToPilote.get(annonceId) : null;
      if (piloteId && byId[piloteId]) byId[piloteId].vuesAnnonces += 1;
    }
  }

  // ── Messages clients en attente de réponse (>48h) ───────────────────────
  const lastByResa = new Map<string, { author: string; created_at: string }>();
  for (const m of messagesRes.data ?? []) {
    lastByResa.set(m.reservation_id as string, { author: m.author as string, created_at: m.created_at as string });
  }
  const now = new Date().toISOString();
  for (const [reservationId, last] of lastByResa) {
    if (last.author !== "client") continue;
    const resa = resaById.get(reservationId);
    if (!resa || !resa.pilote_id || !byId[resa.pilote_id]) continue;
    if (["annulee", "vol_effectue"].includes(resa.statut as string)) continue;
    const hoursSince = daysBetween(last.created_at, now) * 24;
    if (hoursSince < MESSAGE_EN_ATTENTE_HEURES) continue;
    byId[resa.pilote_id].messagesEnAttente += 1;
    const joursSince = hoursSince / 24;
    const cur = byId[resa.pilote_id].plusVieuxMessageEnAttenteJours;
    byId[resa.pilote_id].plusVieuxMessageEnAttenteJours = cur == null ? joursSince : Math.max(cur, joursSince);
  }

  // ── Taux + alertes ───────────────────────────────────────────────────────
  for (const id of Object.keys(byId)) {
    const s = byId[id];
    s.tauxVolsRendus = rate(s.volsRendus, s.volsEffectues + s.volsRendus);
    s.tauxAnnonceAnnulees = rate(s.demandesAnnonceAnnulees, s.demandesAnnonceHonorees + s.demandesAnnonceAnnulees);
    s.tauxMessagesEnAttente = rate(s.messagesEnAttente, s.volsActifs);
    s.alertes = computeAlerts(s);
    s.isAtRisk = s.alertes.length > 0;
  }

  return byId;
}
