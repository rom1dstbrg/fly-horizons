import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppSettings } from "@/lib/app-settings-server";
import { notifyPiloteReservation } from "@/lib/push";
import { isPiloteVol } from "@/lib/pilote/payment";
import { brusselsTimestamp } from "@/lib/utils";

const H = 60 * 60 * 1000;

/**
 * Rappels du bilan de vol (27/09) : le pilote doit passer son vol en « vol
 * effectué » avec les minutes réellement volées.
 * - 1er rappel dès que c'est possible sur le site : 8 h après le décollage prévu ;
 * - relance 24 h après ce 1er rappel si le vol n'est toujours pas clôturé.
 * Chaque rappel part une seule fois (table push_rappels_envoyes). Appelé toutes
 * les heures par pg_cron (migration 20260927f_cron_bilan_vol.sql), le calcul
 * se fait sur l'heure réelle : une fréquence plus lâche retarde, sans doubler.
 * Auth : "Authorization: Bearer <CRON_SECRET>".
 */
async function run(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const { bilanRappelH, bilanRelanceH } = await getAppSettings();
  const now = Date.now();
  const since = new Date(now - 14 * 24 * H).toISOString().slice(0, 10);
  const until = new Date(now).toISOString().slice(0, 10);

  const { data: vols } = await db
    .from("reservations")
    .select("id, pilote_id, type_resa, date_vol, heure_vol")
    .not("pilote_id", "is", null)
    .gte("date_vol", since)
    .lte("date_vol", until)
    .not("statut", "in", "(annulee,vol_effectue,demande_recue,en_attente,payment_pending)");

  const aClore = (vols ?? []).filter(
    (r) => isPiloteVol(r) && now >= brusselsTimestamp(r.date_vol, r.heure_vol) + bilanRappelH * H,
  );
  if (!aClore.length) return NextResponse.json({ sent: 0, candidates: 0 });

  const { data: deja } = await db
    .from("push_rappels_envoyes")
    .select("cle, envoye_at")
    .in("cle", aClore.flatMap((r) => [`bilan_vol:${r.id}`, `bilan_vol_relance:${r.id}`]));
  const envoye = new Map((deja ?? []).map((d) => [d.cle as string, new Date(d.envoye_at as string).getTime()]));

  let sent = 0;
  for (const r of aClore) {
    const premier = envoye.get(`bilan_vol:${r.id}`);
    const event =
      premier === undefined ? "bilan_vol"
      : !envoye.has(`bilan_vol_relance:${r.id}`) && now >= premier + bilanRelanceH * H ? "bilan_vol_relance"
      : null;
    if (!event) continue;
    // Réserve la clé d'abord : si elle existe déjà, le rappel est déjà parti.
    const { error } = await db.from("push_rappels_envoyes").insert({ cle: `${event}:${r.id}` });
    if (error) continue;
    await notifyPiloteReservation(r.id, event);
    sent++;
  }
  return NextResponse.json({ sent, candidates: aClore.length });
}

export const GET = run;
export const POST = run;
