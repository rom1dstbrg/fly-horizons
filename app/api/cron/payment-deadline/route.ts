import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { reservationPaymentReminderEmail, reservationAutoAnnuleeEmail } from "@/lib/email-templates";
import { brusselsTimestamp } from "@/lib/utils";

/**
 * POST /api/cron/payment-deadline
 *
 * Appelé toutes les heures par un service externe (cron-job.org, GitHub Actions…).
 * Auth : header "Authorization: Bearer <CRON_SECRET>"
 *
 * Actions :
 *  - Réservations dont le vol est dans < 48h  → annulee  (créneau libéré)
 *  - Réservations dont le vol est dans 71-72h → email de rappel "il vous reste 24h"
 */
export async function POST(request: NextRequest) {
  // ── Authentification ─────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const now = Date.now();

  // ── Récupération des réservations en attente de paiement ─────────────────
  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("id, date_vol, heure_vol, duree, acompte, payment_token, voucher_code, coupon_code, clients(prenom, nom, email)")
    .eq("statut", "payment_pending")
    .in("type_resa", ["standard", "perso"])
    .not("payment_token", "is", null);

  if (error) {
    console.error("[cron/payment-deadline] Supabase error:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  if (!reservations?.length) {
    return NextResponse.json({ cancelled: 0, reminded: 0 });
  }

  let cancelled = 0;
  let reminded = 0;
  const errors: string[] = [];

  for (const resa of reservations) {
    const flight = brusselsTimestamp(resa.date_vol, resa.heure_vol);
    const hoursUntil = (flight - now) / (1000 * 60 * 60);

    // ── Annulation : vol dans moins de 48h ───────────────────────────────
    if (hoursUntil < 48) {
      // .select("id").maybeSingle() permet de savoir si une ligne a réellement été mise à jour.
      // Supabase ne renvoie pas d'erreur pour 0 lignes — seul `cancelledRow` null indique qu'on n'a
      // rien touché (paiement reçu entre la lecture et ici).
      const { data: cancelledRow, error: cancelErr } = await supabase
        .from("reservations")
        .update({ statut: "annulee", payment_token: null })
        .eq("id", resa.id)
        .eq("statut", "payment_pending")
        .select("id")
        .maybeSingle();

      if (!cancelErr && cancelledRow) {
        cancelled++;
        console.log(`[cron/payment-deadline] Annulée: ${resa.id} (vol dans ${hoursUntil.toFixed(1)}h)`);

        // Restituer le voucher s'il y en avait un (il est resté "reserved" jusqu'ici)
        if (resa.voucher_code) {
          await supabase.from("voucher_codes")
            .update({ status: "unused" })
            .eq("code", resa.voucher_code)
            .eq("status", "reserved");
        }

        // Pas de release_coupon : l'incrément coupon n'a lieu qu'au webhook (après paiement).
        // Si la réservation est annulée avant paiement, usage_count n'a jamais été incrémenté.

        // Email d'annulation au client
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
              subject: `Réservation annulée — vol du ${dateStr}`,
              html: reservationAutoAnnuleeEmail({
                prenom: c.prenom,
                nom: c.nom,
                dateStr,
                heure,
                duree: resa.duree,
                bookingUrl: `${siteUrl}/reservation`,
                source: "auto",
              }),
            });
          } catch (e) {
            console.error(`[cron/payment-deadline] Erreur email annulation ${resa.id}:`, e);
          }
        }
      }
      continue;
    }

    // ── Rappel : vol dans 71-72h (fenêtre 1h pour cron horaire) ─────────
    // Le rappel est envoyé une seule fois car le cron ne repassera dans cette
    // fenêtre qu'une fois (71h ≤ hoursUntil < 72h).
    if (hoursUntil >= 71 && hoursUntil < 72) {
      const raw = resa.clients;
      const c = Array.isArray(raw) ? (raw[0] as { prenom: string; nom: string; email: string } | undefined) ?? null : (raw as { prenom: string; nom: string; email: string } | null);
      if (!c || !resa.payment_token) continue;

      try {
        const heure = (resa.heure_vol ?? "00:00").slice(0, 5);
        const paymentUrl = `${siteUrl}/api/reservation/pay/${resa.payment_token}`;

        const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
          weekday: "long", day: "numeric", month: "long", year: "numeric",
        });

        // Deadline = vol - 48h
        const deadlineMs = flight - 48 * 60 * 60 * 1000;
        const deadlineStr = new Date(deadlineMs).toLocaleString("fr-BE", {
          timeZone: "Europe/Brussels",
          weekday: "long", day: "numeric", month: "long", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        });

        await resend.emails.send({
          from: EMAIL_FROM,
          to: [c.email],
          replyTo: EMAIL_REPLY_TO,
          subject: `Rappel — Confirmez votre vol du ${dateStr}`,
          html: reservationPaymentReminderEmail({
            prenom: c.prenom,
            nom: c.nom,
            dateStr,
            heure,
            duree: resa.duree,
            montant: resa.acompte ?? 0,
            paymentUrl,
            deadlineStr,
          }),
        });

        // Notification admin
        await resend.emails.send({
          from: EMAIL_FROM,
          to: [EMAIL_REPLY_TO],
          subject: `[Rappel paiement envoyé] ${c.prenom} ${c.nom} — ${resa.date_vol}`,
          html: `<p>Un rappel de paiement a été envoyé à <strong>${c.prenom} ${c.nom}</strong> (${c.email}) pour la réservation du <strong>${resa.date_vol} à ${heure}</strong>.</p><p>Montant : ${resa.acompte} €. Deadline : ${deadlineStr}.</p>`,
        });

        reminded++;
        console.log(`[cron/payment-deadline] Rappel envoyé: ${resa.id} (vol dans ${hoursUntil.toFixed(1)}h)`);
      } catch (e) {
        errors.push(`Reminder failed for ${resa.id}: ${(e as Error).message}`);
        console.error(`[cron/payment-deadline] Erreur rappel ${resa.id}:`, e);
      }
    }
  }

  return NextResponse.json({ cancelled, reminded, errors: errors.length ? errors : undefined });
}
