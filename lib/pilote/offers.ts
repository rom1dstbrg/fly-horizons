import { createAdminClient } from "@/lib/supabase/admin";

// Bloc C · offres de vol « premier arrivé » visibles par un pilote.
// Partagé entre la page /pilote/offres et la pastille de nav (layout).

export type PiloteOffer = {
  token: string;
  reservationId: string;
  dateVol: string;
  heureVol: string | null;
  duree: number;
  passagers: number;
  expiresAt: string;
};

/**
 * Offres encore ouvertes et prenables par ce pilote : non expirées, qu'il n'a
 * pas déjà refusées, et sans conflit d'agenda sur le créneau (même règle que
 * l'envoi de l'email — il ne les voit pas s'il a déjà un vol sur ce créneau).
 */
export async function listOpenOffersForPilote(piloteId: string): Promise<PiloteOffer[]> {
  const db = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: offers } = await db
    .from("flight_offers")
    .select("id, claim_token, expires_at, reservation_id, reservations(id, date_vol, heure_vol, duree, passagers, statut)")
    .eq("statut", "ouverte")
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: true });

  if (!offers || offers.length === 0) return [];

  const { data: refusals } = await db
    .from("flight_offer_refusals")
    .select("offer_id")
    .eq("pilote_id", piloteId);
  const refused = new Set((refusals ?? []).map((r) => r.offer_id as string));

  // Créneaux déjà occupés par ce pilote (pour écarter les conflits d'agenda).
  const { data: mine } = await db
    .from("reservations")
    .select("date_vol, heure_vol")
    .eq("pilote_id", piloteId)
    .neq("statut", "annulee");
  const busy = new Set((mine ?? []).map((r) => `${r.date_vol}|${r.heure_vol ?? ""}`));

  const out: PiloteOffer[] = [];
  for (const o of offers) {
    if (refused.has(o.id as string)) continue;
    const r = (Array.isArray(o.reservations) ? o.reservations[0] : o.reservations) as
      | { id: string; date_vol: string; heure_vol: string | null; duree: number; passagers: number; statut: string }
      | null;
    if (!r) continue;
    if (["annulee", "vol_effectue"].includes(r.statut)) continue;
    if (r.heure_vol && busy.has(`${r.date_vol}|${r.heure_vol}`)) continue;
    out.push({
      token: o.claim_token as string,
      reservationId: r.id,
      dateVol: r.date_vol,
      heureVol: r.heure_vol,
      duree: r.duree,
      passagers: r.passagers,
      expiresAt: o.expires_at as string,
    });
  }
  return out;
}
