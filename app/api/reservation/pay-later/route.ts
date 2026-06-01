import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reservationPaymentInvitationEmail } from "@/lib/email-templates";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { rateLimit, getIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const { allowed } = rateLimit(`reservation-pay-later:${getIp(request)}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes, veuillez patienter." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { prenom, nom, email, telephone, duree, date, heure, voucher_code, poids_total, passengers, coupon_code, commentaire } = body;

    if (!prenom || !nom || !email || !duree || !date || !heure) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const dureeMins = parseInt(duree);
    if (isNaN(dureeMins) || dureeMins <= 0) {
      return NextResponse.json({ error: "Durée invalide" }, { status: 400 });
    }

    // Règle J-2 : minimum 48h d'avance
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const minBookable = new Date(todayMidnight);
    minBookable.setDate(minBookable.getDate() + 2);
    if (new Date(date + "T12:00:00Z") < minBookable) {
      return NextResponse.json(
        { error: "Les réservations sont possibles uniquement 48h à l'avance minimum (J-2)." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // ── Prix calculé serveur-side (jamais depuis le client) ──────────
    const { data: packProduct } = await supabase
      .from("products")
      .select("price, voucher_duration_minutes")
      .eq("active", true)
      .eq("product_type", "voucher")
      .eq("voucher_duration_minutes", dureeMins)
      .maybeSingle();

    if (!packProduct) {
      return NextResponse.json({ error: "Produit introuvable pour cette durée" }, { status: 400 });
    }

    let finalPrice = packProduct.price;

    // ── Voucher : claim atomique ─────────────────────────────────────
    let voucherId: string | null = null;
    let resolvedVoucherCode: string | null = null;
    if (voucher_code) {
      const { data: claimed } = await supabase
        .from("voucher_codes")
        .update({ status: "reserved" })
        .eq("code", (voucher_code as string).toUpperCase().trim())
        .eq("status", "unused")
        .select("id, duration_minutes, expires_at")
        .maybeSingle();

      if (!claimed) {
        return NextResponse.json({ error: "Code voucher invalide ou déjà utilisé" }, { status: 400 });
      }
      if (claimed.expires_at && new Date(claimed.expires_at) < new Date()) {
        await supabase.from("voucher_codes").update({ status: "expired" }).eq("id", claimed.id);
        return NextResponse.json({ error: "Ce voucher a expiré" }, { status: 400 });
      }

      const voucherDuration = claimed.duration_minutes ?? 0;
      const covered = Math.min(packProduct.voucher_duration_minutes, voucherDuration);
      const discount = Math.round((packProduct.price / packProduct.voucher_duration_minutes) * covered);
      finalPrice = Math.max(0, finalPrice - discount);
      voucherId = claimed.id;
      resolvedVoucherCode = (voucher_code as string).toUpperCase().trim();
    }

    // ── Code promo ───────────────────────────────────────────────────
    let appliedCouponCode: string | null = null;
    if (coupon_code && finalPrice > 0) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", (coupon_code as string).toUpperCase().trim())
        .eq("active", true)
        .maybeSingle();

      if (coupon &&
          !(coupon.expires_at && new Date(coupon.expires_at) < new Date()) &&
          !(coupon.max_uses && (coupon.usage_count ?? 0) >= coupon.max_uses)) {
        const discount = coupon.type === "percentage"
          ? Math.round(finalPrice * coupon.value / 100)
          : Math.min(coupon.value, finalPrice);
        finalPrice = Math.max(0, finalPrice - discount);
        appliedCouponCode = coupon.code;
      }
    }

    if (finalPrice <= 0) {
      return NextResponse.json(
        { error: "Le montant est nul — utilisez le formulaire de réservation gratuit." },
        { status: 400 },
      );
    }

    // ── Client : trouver ou créer ────────────────────────────────────
    const { data: existingClients } = await supabase
      .from("clients")
      .select("id")
      .eq("email", email)
      .limit(1);
    const existingClient = existingClients?.[0] ?? null;

    let clientId: string;
    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const { data: newId } = await supabase.rpc("next_client_id");
      if (!newId) return NextResponse.json({ error: "Erreur génération ID client" }, { status: 500 });
      clientId = newId;
      const { error: cliErr } = await supabase.from("clients").insert({
        id: clientId, nom, prenom, email, telephone: telephone || null,
      });
      if (cliErr) return NextResponse.json({ error: "Erreur création client" }, { status: 500 });
    }

    // ── Vérification finale de disponibilité du créneau ─────────────
    const { data: conflicts } = await supabase
      .from("reservations")
      .select("id, heure_vol, duree")
      .eq("date_vol", date)
      .neq("statut", "annulee");

    const newStart = parseInt(heure.slice(0, 2)) * 60 + parseInt(heure.slice(3, 5));
    const newEnd   = newStart + dureeMins;

    const taken = (conflicts ?? []).some(r => {
      if (!r.heure_vol) return false;
      const [rh, rm] = r.heure_vol.split(":").map(Number);
      const rStart = rh * 60 + rm;
      const rEnd   = rStart + r.duree + 30;
      return newEnd + 30 > rStart && newStart < rEnd;
    });

    if (taken) {
      if (voucherId) {
        await supabase.from("voucher_codes").update({ status: "unused" }).eq("id", voucherId).eq("status", "reserved");
      }
      return NextResponse.json({ error: "Ce créneau vient d'être réservé. Veuillez en choisir un autre." }, { status: 409 });
    }

    // ── Token de paiement ────────────────────────────────────────────
    const payment_token = crypto.randomUUID();

    // ── Créer la réservation en payment_pending ──────────────────────
    const { data: resa, error: resaErr } = await supabase
      .from("reservations")
      .insert({
        client_id: clientId,
        date_vol: date,
        heure_vol: heure,
        duree: dureeMins,
        passagers: passengers ? parseInt(passengers) : 1,
        statut: "payment_pending",
        type_resa: "standard",
        acompte: finalPrice,
        payment_token,
        voucher_code: resolvedVoucherCode,
        coupon_code: appliedCouponCode,
        poids_total: poids_total ? parseInt(poids_total) : null,
        commentaire: commentaire || null,
      })
      .select()
      .single();

    if (resaErr) {
      if (voucherId) {
        await supabase.from("voucher_codes").update({ status: "unused" }).eq("id", voucherId).eq("status", "reserved");
      }
      return NextResponse.json({ error: "Erreur création réservation" }, { status: 500 });
    }

    // ── Finaliser le voucher (used) ──────────────────────────────────
    // On marque used immédiatement comme dans le flux admin (envoyer_paiement).
    // Le webhook n'a donc rien à faire côté voucher pour ce flux.
    if (voucherId) {
      await supabase.from("voucher_codes").update({ status: "used", used_at: new Date().toISOString() }).eq("id", voucherId);
    }

    // ── Email client ─────────────────────────────────────────────────
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const paymentUrl = `${siteUrl}/api/reservation/pay/${payment_token}`;
    const dateStr = new Date(date + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    // Deadline = vol - 48h (affiché dans l'email)
    const flightTime = new Date(`${date}T${heure}:00+02:00`).getTime();
    const deadlineStr = new Date(flightTime - 48 * 60 * 60 * 1000).toLocaleString("fr-BE", {
      timeZone: "Europe/Brussels",
      weekday: "long", day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    await resend.emails.send({
      from: EMAIL_FROM,
      to: [email],
      replyTo: EMAIL_REPLY_TO,
      subject: "Votre réservation — Lien de paiement Fly Horizons",
      html: reservationPaymentInvitationEmail({
        prenom,
        nom,
        dateStr,
        heure,
        duree: dureeMins,
        montant: finalPrice,
        paymentUrl,
        voucherCode: resolvedVoucherCode,
      }),
    });

    // ── Notification admin ───────────────────────────────────────────
    const passagersCount = passengers ? parseInt(passengers) : 1;
    await resend.emails.send({
      from: EMAIL_FROM,
      to: [EMAIL_REPLY_TO],
      subject: `[Réservation — Payer plus tard] ${prenom} ${nom} — ${date} à ${heure}`,
      html: `<p><strong>✈️ Nouvelle réservation (paiement différé)</strong></p>
<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Client</td><td><strong>${prenom} ${nom}</strong> (${clientId})</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Téléphone</td><td>${telephone || "—"}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Date</td><td><strong>${dateStr}</strong></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Heure</td><td><strong>${heure}</strong></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Durée</td><td>${dureeMins} min</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Passagers</td><td>${passagersCount}</td></tr>
  ${poids_total ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">Poids total</td><td>${poids_total} kg</td></tr>` : ""}
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Montant</td><td><strong style="color:#e85d04;">${finalPrice} €</strong> (en attente de paiement)</td></tr>
  ${resolvedVoucherCode ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">Voucher</td><td style="color:#16a34a;font-weight:600;">${resolvedVoucherCode} ✓</td></tr>` : ""}
  ${appliedCouponCode ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">Coupon</td><td style="color:#16a34a;font-weight:600;">${appliedCouponCode} ✓</td></tr>` : ""}
  ${commentaire ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;vertical-align:top;">Remarque</td><td style="font-style:italic;">${commentaire}</td></tr>` : ""}
</table>`,
    });

    return NextResponse.json({ success: true, reservationId: resa.id });
  } catch (error) {
    console.error("Reservation pay-later error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
