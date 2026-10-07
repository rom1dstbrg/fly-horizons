import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { piloteAllowsPush, sendPushToUser } from "@/lib/push";
import { getSignals, signalConfigFrom, type SignalKind } from "@/lib/reservation-signals";
import { getAppSettings } from "@/lib/app-settings-server";

/**
 * Relances push des signaux de supervision (01/10), appelées toutes les heures par
 * pg_cron (migration 20261001_signaux_reservations.sql). Mêmes seuils que la page
 * Réservations de l'admin (lib/reservation-signals.ts) :
 *  - passage à l'orange : le pilote est prévenu ;
 *  - passage au rouge : le pilote est relancé et l'admin est prévenu aussi.
 * Chaque palier part une seule fois par réservation (table push_rappels_envoyes).
 * Auth : "Authorization: Bearer <CRON_SECRET>".
 */

const TITRE: Record<SignalKind, string> = {
  sans_reponse: "Demande sans réponse",
  client_dit_paye: "Paiement à confirmer",
  paiement_attente: "Paiement en attente",
  non_cloture: "Vol à clôturer",
  sans_heure: "Vol sans heure",
  report_sans_reponse: "Report sans réponse",
  satisfaction_sans_reponse: "Avis sans réponse",
};

function dateCourte(d: string): string {
  return new Date(d + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" });
}

async function run(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const settings = await getAppSettings();
  const cfg = signalConfigFrom(settings);
  // Quels signaux envoient une notification, et à partir de quel niveau (Paramètres › Notifications).
  const notifier: Record<SignalKind, boolean> = {
    sans_reponse: settings.notifSansReponse,
    client_dit_paye: settings.notifClientPaye,
    paiement_attente: settings.notifPaiement,
    non_cloture: settings.notifNonCloture,
    sans_heure: false,
    report_sans_reponse: settings.notifReport,
    satisfaction_sans_reponse: settings.notifSatisfaction,
  };
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);

  const { data: resas } = await db
    .from("reservations")
    .select(
      "id, statut, type_resa, date_vol, heure_vol, created_at, pilote_id, pilote_assigned_at, pilote_paye, paiement_demande_at, client_paiement_declare_at, reschedule_token, reschedule_invite_at, reschedule_reminder_at, satisfaction_invite_at, satisfaction_reminder_at, slot_proposal_token, clients(prenom, nom), pilotes(nom, user_id)",
    )
    .neq("statut", "annulee")
    // Un report en cours garde son ancienne date de vol : on le suit jusqu'à ce que le client choisisse.
    // Un vol effectué ne reste suivi que tant que son enquête de satisfaction attend une réponse.
    .or(`and(statut.neq.vol_effectue,date_vol.gte.${since}),and(statut.neq.vol_effectue,reschedule_token.not.is.null),satisfaction_invite_at.not.is.null`);

  const { data: admins } = await db.from("profiles").select("id").eq("role", "admin");
  const adminIds = (admins ?? []).map((a) => a.id as string);

  let sent = 0;
  for (const r of resas ?? []) {
    const signals = getSignals(r as never, Date.now(), cfg).filter(
      (s) => notifier[s.kind] && (settings.notifNiveau === "warn" || s.level === "bad"),
    );
    if (!signals.length) continue;

    const c = (Array.isArray(r.clients) ? r.clients[0] : r.clients) as { prenom: string | null; nom: string | null } | null;
    const p = (Array.isArray(r.pilotes) ? r.pilotes[0] : r.pilotes) as { nom: string; user_id: string | null } | null;
    const client = [c?.prenom, c?.nom ? `${c.nom[0]}.` : ""].filter(Boolean).join(" ") || "Un client";
    const quand = `${dateCourte(r.date_vol)}${r.heure_vol ? ` à ${String(r.heure_vol).slice(0, 5)}` : ""}`;

    for (const s of signals) {
      // Réserve la clé d'abord : si elle existe déjà, ce palier est déjà parti.
      const cle = `signal:${s.kind}:${s.level}:${r.id}`;
      const { error } = await db.from("push_rappels_envoyes").insert({ cle });
      if (error) continue;

      const body = `${client} · ${quand} · ${s.label}`;
      const tag = `${s.kind}:${r.id}`;
      const dejaPrevenus = new Set<string>();

      // Le pilote peut avoir désactivé ces relances (Profil > Notifications) ; l'admin garde les siennes.
      if (p?.user_id && (await piloteAllowsPush(p.user_id, "signaux"))) {
        dejaPrevenus.add(p.user_id);
        sent += await sendPushToUser(p.user_id, {
          title: TITRE[s.kind],
          body,
          url: `/pilote/vols?ouvrir=${r.id}`,
          tag,
        });
      }
      if (s.level === "bad") {
        for (const id of adminIds) {
          if (dejaPrevenus.has(id)) continue;
          sent += await sendPushToUser(id, {
            title: `${TITRE[s.kind]}${p?.nom ? ` · ${p.nom}` : ""}`,
            body,
            url: `/admin/vols?ouvrir=${r.id}`,
            tag,
          });
        }
      }
    }
  }
  return NextResponse.json({ sent });
}

export const GET = run;
export const POST = run;
