import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { reservationAutoAnnuleeEmail } from "@/lib/email-templates";

/**
 * POST /api/cron/demande-deadline
 *
 * Appelé une fois par jour. Une demande publique (statut "demande_recue") bloque
 * le créneau pendant 72h en attendant la décision de Romain (lien de paiement ou
 * refus). Passé ce délai sans action, elle est annulée automatiquement pour
 * libérer le créneau — Romain n'a alors rien envoyé au client, aucun paiement
 * n'a eu lieu.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const deadline = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("id, date_vol, heure_vol, duree, voucher_code, clients(prenom, nom, email)")
    .eq("statut", "demande_recue")
    .is("slot_proposal_token", null) // Romain a déjà proposé un créneau : la balle est dans le camp du client, ne pas annuler sous lui
    .lt("created_at", deadline);

  if (error) {
    console.error("[cron/demande-deadline] Supabase error:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  if (!reservations?.length) {
    return NextResponse.json({ cancelled: 0 });
  }

  let cancelled = 0;

  for (const resa of reservations) {
    const { data: cancelledRow } = await supabase
      .from("reservations")
      .update({ statut: "annulee" })
      .eq("id", resa.id)
      .eq("statut", "demande_recue")
      .select("id")
      .maybeSingle();

    if (!cancelledRow) continue; // déjà traitée entre-temps par Romain
    cancelled++;

    if (resa.voucher_code) {
      await supabase.from("voucher_codes")
        .update({ status: "unused" })
        .eq("code", resa.voucher_code)
        .eq("status", "reserved");
    }

    const raw = resa.clients;
    const c = Array.isArray(raw)
      ? (raw[0] as { prenom: string; nom: string; email: string } | undefined) ?? null
      : (raw as { prenom: string; nom: string; email: string } | null);

    if (c) {
      const heure = (resa.heure_vol ?? "00:00").slice(0, 5);
      const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });
      try {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: [c.email],
          replyTo: EMAIL_REPLY_TO,
          subject: `Fly Horizons · Votre demande du ${dateStr} n'a pas pu être confirmée`,
          html: reservationAutoAnnuleeEmail({
            prenom: c.prenom,
            nom: c.nom,
            dateStr,
            heure,
            duree: resa.duree,
            bookingUrl: "https://fly-horizons.com/reservation",
            source: "auto",
          }),
        });
      } catch (e) {
        console.error(`[cron/demande-deadline] Erreur email annulation ${resa.id}:`, e);
      }
    }

    console.log(`[cron/demande-deadline] Demande auto-annulée: ${resa.id}`);
  }

  return NextResponse.json({ cancelled });
}
