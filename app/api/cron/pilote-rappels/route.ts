import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyPiloteReservation, type PiloteEvent } from "@/lib/push";

/**
 * Rappels push aux pilotes (27/09), une fois par jour :
 * - vol dans 48 h (vol pas annulé, pas déjà fait) ;
 * - vol d'annonce dans 0 à 2 jours dont le paiement n'est pas noté ;
 * - vol d'annonce fait depuis 3 jours, paiement toujours pas noté.
 * Chaque rappel part une seule fois par réservation (table push_rappels_envoyes).
 * Auth : "Authorization: Bearer <CRON_SECRET>" (Vercel Cron l'ajoute, en GET).
 */
async function run(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const day = (offset: number) => {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Brussels" }));
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const today = day(0), in2 = day(2), ago3 = day(-3);

  const [vols48, payBefore, payAfter] = await Promise.all([
    db.from("reservations").select("id").not("pilote_id", "is", null).eq("date_vol", in2)
      .not("statut", "in", "(annulee,vol_effectue,demande_recue,payment_pending)"),
    db.from("reservations").select("id").eq("type_resa", "annonce_pilote").not("pilote_paye", "is", true)
      .gte("date_vol", today).lte("date_vol", in2).not("statut", "in", "(annulee,demande_recue)"),
    db.from("reservations").select("id").eq("type_resa", "annonce_pilote").not("pilote_paye", "is", true)
      .lte("date_vol", ago3).neq("statut", "annulee"),
  ]);

  const jobs: { id: string; event: PiloteEvent }[] = [
    ...(vols48.data ?? []).map((r) => ({ id: r.id as string, event: "vol_48h" as const })),
    ...(payBefore.data ?? []).map((r) => ({ id: r.id as string, event: "paiement_avant_vol" as const })),
    ...(payAfter.data ?? []).map((r) => ({ id: r.id as string, event: "paiement_apres_vol" as const })),
  ];

  let sent = 0;
  for (const { id, event } of jobs) {
    // Réserve la clé d'abord : si elle existe déjà, le rappel est déjà parti.
    const { error } = await db.from("push_rappels_envoyes").insert({ cle: `${event}:${id}` });
    if (error) continue;
    await notifyPiloteReservation(id, event);
    sent++;
  }
  return NextResponse.json({ sent, candidates: jobs.length });
}

export const GET = run;
export const POST = run;
