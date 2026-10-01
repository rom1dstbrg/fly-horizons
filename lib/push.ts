import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

// Envoi des notifications push (27/09). Un échec d'envoi ne casse jamais
// l'action qui le déclenche : tout est attrapé et journalisé. Les abonnements
// morts (404/410 : app supprimée, permission retirée) sont effacés.

export type PushPayload = { title: string; body: string; url: string; tag?: string };

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:info@fly-horizons.com", pub, priv);
  configured = true;
  return true;
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!configure()) return 0;
  const db = createAdminClient();
  const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 24, urgency: "high" },
      );
      sent++;
      await db.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).eq("id", s.id);
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
      else console.error("[push] envoi échoué", code, e instanceof Error ? e.message : e);
    }
  }
  return sent;
}

export async function sendPushToPilote(piloteId: string | null | undefined, payload: PushPayload): Promise<number> {
  if (!piloteId) return 0;
  try {
    const { data } = await createAdminClient().from("pilotes").select("user_id").eq("id", piloteId).maybeSingle();
    return data?.user_id ? await sendPushToUser(data.user_id, payload) : 0;
  } catch (e) {
    console.error("[push] pilote", e);
    return 0;
  }
}

// ── Notifications d'une réservation pour son pilote ─────────────────────────

export type PiloteEvent =
  | "nouvelle_demande" | "vol_assigne" | "message_client" | "route_validee" | "route_modif"
  | "annulation" | "report" | "vol_48h" | "paiement_avant_vol" | "paiement_apres_vol"
  | "bilan_vol" | "bilan_vol_relance" | "client_dit_paye";

function dateCourte(d: string): string {
  return new Date(d + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" });
}

/**
 * Notifie le pilote d'une réservation. `detail` : texte libre ajouté au corps
 * (extrait du message du client, nouvelle date…). Ne lève jamais.
 */
export async function notifyPiloteReservation(reservationId: string, event: PiloteEvent, detail?: string): Promise<void> {
  try {
    const { data: r } = await createAdminClient()
      .from("reservations")
      .select("id, pilote_id, date_vol, heure_vol, passagers, clients(prenom, nom)")
      .eq("id", reservationId)
      .maybeSingle();
    if (!r?.pilote_id) return;
    const c = (Array.isArray(r.clients) ? r.clients[0] : r.clients) as { prenom: string | null; nom: string | null } | null;
    const client = [c?.prenom, c?.nom ? `${c.nom[0]}.` : ""].filter(Boolean).join(" ") || "Un client";
    const quand = `${dateCourte(r.date_vol)}${r.heure_vol ? ` à ${String(r.heure_vol).slice(0, 5)}` : ""}`;
    const url = `/pilote/vols?ouvrir=${r.id}`;
    const court = (s?: string) => (s && s.length > 110 ? `${s.slice(0, 107)}…` : s ?? "");

    const p: Record<PiloteEvent, Omit<PushPayload, "url">> = {
      nouvelle_demande: { title: "Nouvelle demande de vol", body: `${client} · ${quand}${r.passagers ? ` · ${r.passagers} pers.` : ""}` },
      vol_assigne: { title: "Un vol vous est confié", body: `${client} · ${quand}` },
      message_client: { title: `Message de ${client}`, body: court(detail) || `Vol du ${quand}` },
      route_validee: { title: "Route validée", body: `${client} a validé la route du vol du ${quand}.` },
      route_modif: { title: "Modification de route demandée", body: court(detail) || `${client} · vol du ${quand}` },
      annulation: { title: "Vol annulé", body: `${client} · ${quand}` },
      report: { title: "Vol reporté", body: `${client} a choisi une nouvelle date : ${detail ?? quand}.` },
      vol_48h: { title: "Vol dans 48 h", body: `${client} · ${quand}. Pensez à la météo et au M&B.` },
      paiement_avant_vol: { title: "Paiement pas encore noté", body: `Vol de ${client} le ${quand} : marquez le paiement quand vous l'avez reçu.` },
      paiement_apres_vol: { title: "Paiement à vérifier", body: `Vol de ${client} du ${quand} fait, paiement toujours pas noté.` },
      bilan_vol: { title: "Bilan de vol à faire", body: `Vol de ${client} du ${quand} : notez les minutes volées et passez-le en vol effectué.` },
      client_dit_paye: { title: "Le client dit avoir payé", body: `${client} a déclaré son virement pour le vol du ${quand}. Confirmez la réception.` },
      bilan_vol_relance: { title: "Bilan de vol toujours en attente", body: `Vol de ${client} du ${quand} : il manque les minutes volées pour le clôturer.` },
    };
    const tag = `${event}:${r.id}`;
    await sendPushToPilote(r.pilote_id, { ...p[event], url: event.startsWith("paiement") || event === "client_dit_paye" ? "/pilote/transactions" : url, tag });
  } catch (e) {
    console.error("[push] notifyPiloteReservation", event, e);
  }
}
