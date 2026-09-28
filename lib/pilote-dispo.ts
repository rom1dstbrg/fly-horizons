import type { createAdminClient } from "@/lib/supabase/admin";
import { departsPossibles, type ResaHoraire } from "@/lib/pilote-creneaux";
import { parseRescheduleToken } from "@/lib/reschedule-token";

// Ce qu'un passager peut réserver chez un pilote : ses blocs ouverts
// (pilote_creneaux), moins les vols qu'il a déjà. Même calcul pour une
// réservation depuis une annonce (app/api/vol-annonce/*) et pour le report
// d'un vol attribué à ce pilote (app/api/reservation/reporter/*).

type Db = ReturnType<typeof createAdminClient>;

export const MIN_JOURS = 2; // J-2, comme le flow classique

export interface PiloteDispoScope {
  piloteId: string;
  /** Durée du vol en minutes. */
  duree: number;
  /** Mode « place » : les autres passagers de la même annonce partagent le vol. */
  excludeAnnonceId?: string | null;
  /** Report : le vol qu'on déplace ne bloque pas son propre créneau. */
  excludeResaId?: string | null;
}

function resasQuery(db: Db, s: PiloteDispoScope) {
  let q = db.from("reservations").select("date_vol, heure_vol, duree").eq("pilote_id", s.piloteId).neq("statut", "annulee");
  if (s.excludeAnnonceId) q = q.or(`annonce_id.is.null,annonce_id.neq.${s.excludeAnnonceId}`);
  if (s.excludeResaId) q = q.neq("id", s.excludeResaId);
  return q;
}

function minBookable() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + MIN_JOURS);
  return d;
}

/** Jours du mois avec au moins un départ possible. */
export async function piloteMonth(db: Db, s: PiloteDispoScope, y: number, m: number) {
  const debut = `${y}-${String(m).padStart(2, "0")}-01`;
  const fin = `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;

  const [{ data: creneaux }, { data: resas }] = await Promise.all([
    db.from("pilote_creneaux").select("date, heure").eq("pilote_id", s.piloteId).gte("date", debut).lte("date", fin),
    resasQuery(db, s).gte("date_vol", debut).lte("date_vol", fin),
  ]);

  const ouvertsByDate: Record<string, number[]> = {};
  (creneaux ?? []).forEach((c) => { (ouvertsByDate[c.date] ??= []).push(c.heure); });
  const resasByDate: Record<string, ResaHoraire[]> = {};
  (resas ?? []).forEach((r) => {
    const k = r.date_vol?.substring(0, 10);
    if (k) (resasByDate[k] ??= []).push(r);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const min = minBookable();
  const available: string[] = [];
  const unavailable: string[] = [];

  for (let d = 1; d <= new Date(y, m, 0).getDate(); d++) {
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const date = new Date(dateStr + "T12:00:00Z");
    if (date < today) continue;
    const ouverts = ouvertsByDate[dateStr];
    if (date >= min && ouverts && departsPossibles(ouverts, s.duree, resasByDate[dateStr] ?? []).length) {
      available.push(dateStr);
    } else {
      unavailable.push(dateStr);
    }
  }
  return { available, unavailable };
}

/** Heures de début de bloc réservables ce jour-là (9 pour 9 h – 11 h). */
export async function piloteDeparts(db: Db, s: PiloteDispoScope, date: string): Promise<number[]> {
  if (new Date(date + "T12:00:00Z") < minBookable()) return [];
  const [{ data: creneaux }, { data: resas }] = await Promise.all([
    db.from("pilote_creneaux").select("heure").eq("pilote_id", s.piloteId).eq("date", date),
    resasQuery(db, s).eq("date_vol", date),
  ]);
  return departsPossibles((creneaux ?? []).map((c) => c.heure), s.duree, resas ?? []);
}

/** Report d'un vol attribué à un pilote : le périmètre de dispos à proposer
 * (null si lien invalide, expiré, ou vol sans pilote → ancien calendrier du site). */
export async function rescheduleScope(db: Db, token: string): Promise<PiloteDispoScope | null> {
  const parsed = parseRescheduleToken(token);
  if (!parsed || Date.now() > parsed.exp) return null;
  const { data: resa } = await db
    .from("reservations")
    .select("id, pilote_id, duree, annonce_id, statut, annonces_pilote(mode_vente)")
    .eq("reschedule_token", parsed.t)
    .maybeSingle();
  if (!resa?.pilote_id || ["annulee", "vol_effectue"].includes(resa.statut)) return null;
  const annonce = (Array.isArray(resa.annonces_pilote) ? resa.annonces_pilote[0] : resa.annonces_pilote) as { mode_vente: string | null } | null;
  return {
    piloteId: resa.pilote_id,
    duree: resa.duree ?? 60,
    excludeResaId: resa.id,
    excludeAnnonceId: annonce?.mode_vente === "place" ? resa.annonce_id : null,
  };
}
