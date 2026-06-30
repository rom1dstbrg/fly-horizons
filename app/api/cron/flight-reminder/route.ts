import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendFlightReminder } from "@/lib/email-service";
import { brusselsTimestamp } from "@/lib/utils";

/**
 * POST /api/cron/flight-reminder
 *
 * Appelé toutes les heures par un service externe (cron-job.org, GitHub Actions…).
 * Auth : header "Authorization: Bearer <CRON_SECRET>"
 *
 * Envoie l'email de rappel J-2 aux clients dont le vol a lieu dans 47-48h
 * et dont le statut est "heure_confirmee".
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http://localhost")
    ? process.env.NEXT_PUBLIC_SITE_URL
    : "https://fly-horizons.com";
  const now = Date.now();

  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("id, date_vol, heure_vol, duree, type_resa, clients(prenom, email)")
    .eq("statut", "heure_confirmee")
    .not("heure_vol", "is", null);

  if (error) {
    console.error("[cron/flight-reminder] Supabase error:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  if (!reservations?.length) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const resa of reservations) {
    const flight = brusselsTimestamp(resa.date_vol, resa.heure_vol);
    const hoursUntil = (flight - now) / (1000 * 60 * 60);

    // Fenêtre 47-48h : envoi unique pour un cron horaire
    if (hoursUntil < 47 || hoursUntil >= 48) continue;

    const raw = resa.clients;
    const c = Array.isArray(raw)
      ? (raw[0] as { prenom: string; email: string } | undefined) ?? null
      : (raw as { prenom: string; email: string } | null);

    if (!c?.email) continue;

    const heure = (resa.heure_vol ?? "00:00").slice(0, 5);
    const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    try {
      await sendFlightReminder({
        to: c.email,
        prenom: c.prenom,
        dateStr,
        heure,
        duree: resa.duree,
        type_resa: resa.type_resa === "perso" ? "perso" : "standard",
        accountUrl: `${siteUrl}/account/reservations/${resa.id}`,
        dateISO: resa.date_vol,
      });
      sent++;
      console.log(`[cron/flight-reminder] Rappel envoyé : ${resa.id} (vol dans ${hoursUntil.toFixed(1)}h)`);
    } catch (e) {
      errors.push(`${resa.id}: ${(e as Error).message}`);
      console.error(`[cron/flight-reminder] Erreur rappel ${resa.id}:`, e);
    }
  }

  return NextResponse.json({ sent, errors: errors.length ? errors : undefined });
}
