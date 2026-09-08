import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { flightOfferExpiredAdminEmail } from "@/lib/email-templates";

const ADMIN_EMAIL = "info@fly-horizons.com";

/**
 * POST /api/cron/flight-offer-deadline
 *
 * Bloc C · une offre de vol « premier arrivé » vit 48h. Passé ce délai sans
 * preneur, elle est marquée expiree et Romain reçoit un récapitulatif pour
 * reprendre la main. La réservation, elle, reste telle quelle.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await db
    .from("flight_offers")
    .select("id, reservations(date_vol, heure_vol)")
    .eq("statut", "ouverte")
    .lt("expires_at", nowIso);

  if (error) {
    console.error("[cron/flight-offer-deadline] Supabase error:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
  if (!due?.length) return NextResponse.json({ expired: 0 });

  const expired: Array<{ dateStr: string; heure: string | null }> = [];
  for (const o of due) {
    const { data: row } = await db
      .from("flight_offers")
      .update({ statut: "expiree" })
      .eq("id", o.id)
      .eq("statut", "ouverte")
      .select("id")
      .maybeSingle();
    if (!row) continue; // prise ou annulée entre-temps

    const r = (Array.isArray(o.reservations) ? o.reservations[0] : o.reservations) as
      | { date_vol: string; heure_vol: string | null }
      | null;
    if (r) {
      expired.push({
        dateStr: new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        heure: r.heure_vol ? r.heure_vol.slice(0, 5) : null,
      });
    }
  }

  if (expired.length > 0) {
    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: [ADMIN_EMAIL],
        replyTo: EMAIL_REPLY_TO,
        subject: `Fly Horizons · ${expired.length > 1 ? `${expired.length} vols` : "Un vol"} sans preneur`,
        html: flightOfferExpiredAdminEmail({
          offers: expired,
          volsUrl: "https://fly-horizons.com/admin/vols",
        }),
      });
    } catch (e) {
      console.error("[cron/flight-offer-deadline] email admin:", e);
    }
  }

  return NextResponse.json({ expired: expired.length });
}
