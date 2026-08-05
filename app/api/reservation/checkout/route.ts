import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { optInNewsletter } from "@/lib/newsletter";
import { reservationConfirmationFreeEmail } from "@/lib/email-templates";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { escapeHtml } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const { allowed } = await rateLimit(`reservation-checkout:${getIp(request)}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes, veuillez patienter." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { prenom, nom, email, telephone, duree, date, heure, voucher_code, voucher_id, poids_total, passengers, coupon_code, commentaire, newsletter_opt_in } = body;

    if (!prenom || !nom || !email || !duree || !date || !heure || !poids_total) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const dureeMins = parseInt(duree);
    if (isNaN(dureeMins) || dureeMins <= 0) {
      return NextResponse.json({ error: "Durée invalide" }, { status: 400 });
    }

    // Règle J-2 : minimum 48h d'avance (basé sur la date du jour en heure de Bruxelles)
    const brusselsTodayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Brussels",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
    const todayMidnight = new Date(brusselsTodayStr + "T00:00:00Z");
    const minBookable = new Date(todayMidnight);
    minBookable.setDate(minBookable.getDate() + 2);
    if (new Date(date + "T12:00:00Z") < minBookable) {
      return NextResponse.json(
        { error: "Les réservations sont possibles uniquement 48h à l'avance minimum (J-2)." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Récupérer le prix depuis la DB — jamais depuis le client
    const { data: settings } = await supabase
      .from("crm_settings")
      .select("key, value")
      .in("key", ["prix_heure"]);

    const prixHeure = parseFloat(
      settings?.find((s) => s.key === "prix_heure")?.value ?? "254"
    );

    // Prix du pack depuis les produits (priorité sur le taux horaire)
    const { data: packProduct } = await supabase
      .from("products")
      .select("price")
      .eq("active", true)
      .eq("product_type", "voucher")
      .eq("voucher_duration_minutes", dureeMins)
      .maybeSingle();

    const prixPlein = packProduct?.price ?? Math.round((prixHeure / 60) * dureeMins);

    // Valider et récupérer le voucher côté serveur
    let voucherDuration = 0;
    let resolvedVoucherId: string | null = null;

    if (voucher_code || voucher_id) {
      // Atomic claim — marks as "reserved" only if currently "unused"
      // Prevents two concurrent checkouts from using the same voucher
      const updateQuery = supabase
        .from("voucher_codes")
        .update({ status: "reserved" })
        .eq("status", "unused")
        .select("id, duration_minutes, expires_at");

      const { data: claimed } = voucher_id
        ? await updateQuery.eq("id", voucher_id).maybeSingle()
        : await updateQuery.eq("code", (voucher_code as string).toUpperCase().trim()).maybeSingle();

      if (!claimed) {
        return NextResponse.json({ error: "Code voucher invalide ou déjà utilisé" }, { status: 400 });
      }
      if (claimed.expires_at && new Date(claimed.expires_at) < new Date()) {
        // Release immediately if already expired
        await supabase.from("voucher_codes").update({ status: "expired" }).eq("id", claimed.id);
        return NextResponse.json({ error: "Ce voucher a expiré" }, { status: 400 });
      }

      voucherDuration = claimed.duration_minutes ?? 0;
      resolvedVoucherId = claimed.id;
    }

    const billableMins = Math.max(0, dureeMins - voucherDuration);
    const price = billableMins === 0
      ? 0
      : Math.round((prixHeure / 60) * billableMins);

    let amountCents = Math.round(price * 100);

    // Prix 0 : ne devrait pas arriver ici (le client appelle /submit), mais on couvre le cas
    if (amountCents <= 0) {
      return NextResponse.json({ error: "Montant invalide pour un paiement Stripe" }, { status: 400 });
    }

    // Appliquer le code promo s'il y en a un
    // L'incrément de usage_count est différé au webhook checkout.session.completed pour
    // garantir qu'un crash entre ici et le paiement Stripe ne crée pas d'incrément orphelin.
    let appliedCouponCode: string | null = null;
    if (coupon_code) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", (coupon_code as string).toUpperCase().trim())
        .eq("active", true)
        .maybeSingle();

      if (coupon &&
          !(coupon.expires_at && new Date(coupon.expires_at) < new Date()) &&
          !(coupon.max_uses && (coupon.usage_count ?? 0) >= coupon.max_uses)) {
        const discountCents = coupon.type === "percentage"
          ? Math.round(amountCents * coupon.value / 100)
          : Math.min(Math.round(coupon.value * 100), amountCents);
        amountCents = Math.max(0, amountCents - discountCents);
        appliedCouponCode = coupon.code;
      }
    }

    if (amountCents <= 0) {
      return NextResponse.json({ error: "Le montant après réduction est nul — utilisez le formulaire de réservation gratuit." }, { status: 400 });
    }

    // Find or create client by email
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
      await supabase.from("clients").insert({
        id: clientId, nom, prenom, email, telephone: telephone || null,
      });
    }

    // ── Vérification finale de disponibilité du créneau ─────────────────
    // Recheck serveur-side juste avant d'insérer : évite la race condition
    // si deux utilisateurs soumettent le même créneau en même temps.
    const { data: conflicts } = await supabase
      .from("reservations")
      .select("id, heure_vol, duree")
      .eq("date_vol", date)
      .neq("statut", "annulee");

    const newStart = parseInt(heure.replace(":", "").slice(0, 2)) * 60 + parseInt(heure.slice(3, 5));
    const newEnd   = newStart + dureeMins;

    const taken = (conflicts ?? []).some(r => {
      if (!r.heure_vol) return false;
      const [rh, rm] = r.heure_vol.split(":").map(Number);
      const rStart = rh * 60 + rm;
      const rEnd   = rStart + r.duree + 30; // +30 min de tampon (identique à calcSlots)
      return newEnd + 30 > rStart && newStart < rEnd;
    });

    if (taken) {
      if (resolvedVoucherId) {
        await supabase.from("voucher_codes").update({ status: "unused" }).eq("id", resolvedVoucherId).eq("status", "reserved");
      }
      return NextResponse.json({ error: "Ce créneau vient d'être réservé. Veuillez en choisir un autre." }, { status: 409 });
    }

    // Créer la demande — pas de paiement à ce stade. Romain valide la demande
    // depuis l'admin et déclenche lui-même l'envoi du lien de paiement (sendPaymentLinkAdmin).
    // Le voucher reste "reserved" (claimé plus haut) jusqu'à confirmation ou refus.
    const montantDemande = amountCents / 100;
    const { data: resa, error: resaErr } = await supabase
      .from("reservations")
      .insert({
        client_id: clientId,
        date_vol: date,
        heure_vol: heure,
        duree: dureeMins,
        passagers: passengers ? parseInt(passengers) : 1,
        statut: "demande_recue",
        type_resa: "standard",
        voucher_code: voucher_code || null,
        coupon_code: appliedCouponCode,
        poids_total: poids_total ? parseInt(poids_total) : null,
        commentaire: commentaire || null,
        acompte: montantDemande,
      })
      .select()
      .single();

    if (resaErr) {
      // Rollback voucher claim if reservation creation failed
      if (resolvedVoucherId) {
        await supabase.from("voucher_codes").update({ status: "unused" }).eq("id", resolvedVoucherId).eq("status", "reserved");
      }
      // Pas de release_coupon : l'incrément n'a pas encore eu lieu (différé au webhook)
      // Unique constraint violation = slot taken by a concurrent request
      if ((resaErr as { code?: string }).code === "23505") {
        return NextResponse.json({ error: "Ce créneau vient d'être réservé. Veuillez en choisir un autre." }, { status: 409 });
      }
      return NextResponse.json({ error: "Erreur création réservation" }, { status: 500 });
    }

    if (newsletter_opt_in) await optInNewsletter(email, prenom);

    const dateStr = new Date(date + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    // Email de confirmation de la demande au client
    await resend.emails.send({
      from: EMAIL_FROM,
      to: [email],
      replyTo: EMAIL_REPLY_TO,
      subject: "Demande de vol reçue · Fly Horizons",
      html: reservationConfirmationFreeEmail({
        prenom, nom, dateStr, heure,
        duree: dureeMins,
        passengers: passengers ? parseInt(passengers) : 1,
        poids_total: poids_total ? parseInt(poids_total) : null,
        voucherCode: voucher_code || null,
        reservationId: resa.id,
        montant: montantDemande,
      }),
    });

    // Notification admin
    const passagersCount = passengers ? parseInt(passengers) : 1;
    const ePrenom = escapeHtml(prenom);
    const eNom = escapeHtml(nom);
    const eEmail = escapeHtml(email);
    const eTel = escapeHtml(telephone || "non renseigné");
    const eVoucher = voucher_code ? escapeHtml(voucher_code.toUpperCase().trim()) : null;
    const eComment = commentaire ? escapeHtml(commentaire) : null;
    await resend.emails.send({
      from: EMAIL_FROM,
      to: [EMAIL_REPLY_TO],
      subject: `[Nouvelle demande] ${ePrenom} ${eNom} · ${date} à ${heure}`,
      html: `<p><strong>✈️ Nouvelle demande de vol — ${montantDemande} €</strong></p>
<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Client</td><td><strong>${ePrenom} ${eNom}</strong> (${clientId})</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Email</td><td><a href="mailto:${eEmail}">${eEmail}</a></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Téléphone</td><td>${eTel}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Date</td><td><strong>${dateStr}</strong></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Heure</td><td><strong>${heure}</strong></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Durée</td><td>${dureeMins} min</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Passagers</td><td>${passagersCount}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Montant</td><td><strong>${montantDemande} €</strong></td></tr>
  ${poids_total ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">Poids total</td><td>${poids_total} kg</td></tr>` : ""}
  ${eVoucher ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">Voucher</td><td style="color:#16a34a;font-weight:600;">${eVoucher} ✓</td></tr>` : ""}
  ${eComment ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;vertical-align:top;">Remarque</td><td style="font-style:italic;">${eComment}</td></tr>` : ""}
</table>
<p>Créneau bloqué 72h en attente de votre décision (lien de paiement ou refus depuis l'admin).</p>`,
    });

    return NextResponse.json({ success: true, reservationId: resa.id });
  } catch (error) {
    console.error("Reservation demande error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
