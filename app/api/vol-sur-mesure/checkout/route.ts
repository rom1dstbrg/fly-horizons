import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendVolSurMesureQuote } from "@/lib/email-service";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { randomUUID } from "crypto";
import { rateLimit, getIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const { allowed } = rateLimit(`vsm-checkout:${getIp(request)}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes, veuillez patienter." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const {
      prenom, nom, email, telephone,
      date, heure, passagers, poids_total, commentaire,
      waypoints, stopovers, distKm, dureMin, taxesEscales,
      voucher_code, voucher_id,
    } = body;

    if (!prenom || !nom || !email || !date || !heure) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch settings
    const { data: settings } = await supabase
      .from("crm_settings")
      .select("key, value")
      .in("key", ["acompte_perso_heure", "prix_heure"]);

    const settingsMap = Object.fromEntries((settings ?? []).map(s => [s.key, s.value]));
    const acompteHeure = parseFloat(settingsMap.acompte_perso_heure ?? "300");
    const prixHeure = parseFloat(settingsMap.prix_heure ?? "254");

    // Valider le voucher côté serveur (statut + expiration)
    let voucherDuration = 0;
    if (voucher_id) {
      const { data: voucher } = await supabase
        .from("voucher_codes")
        .select("duration_minutes, status, expires_at")
        .eq("id", voucher_id)
        .single();

      if (!voucher || voucher.status !== "unused") {
        return NextResponse.json({ error: "Code voucher invalide ou déjà utilisé" }, { status: 400 });
      }
      if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
        return NextResponse.json({ error: "Ce voucher a expiré" }, { status: 400 });
      }

      voucherDuration = voucher.duration_minutes ?? 0;
    }

    const effectiveDureMin = dureMin ?? 0;
    const billableMin = Math.max(0, effectiveDureMin - voucherDuration);
    const prixEstime = Math.round((prixHeure / 60) * effectiveDureMin);
    const prixBillable = Math.round((prixHeure / 60) * billableMin);
    const acompte = effectiveDureMin > 0
      ? Math.round((acompteHeure / 60) * billableMin)
      : Math.round(acompteHeure);
    const discount = prixEstime - prixBillable;
    const taxes = Math.max(0, taxesEscales ? parseInt(taxesEscales) : 0);
    const totalAcompte = acompte + taxes;

    // Find or create client by email
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("email", email)
      .maybeSingle();

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

    // Generate payment token for deferred Stripe checkout
    const paymentToken = totalAcompte > 0 ? randomUUID() : null;

    const { data: resa, error: resaErr } = await supabase
      .from("reservations")
      .insert({
        client_id: clientId,
        date_vol: date,
        heure_vol: heure,
        duree: parseInt(dureMin) || 60,
        passagers: parseInt(passagers) || 1,
        poids_total: poids_total ? parseInt(poids_total) : null,
        commentaire: commentaire || null,
        statut: "en_attente",
        type_resa: "perso",
        waypoints: waypoints?.length ? waypoints : null,
        stopovers: stopovers?.length ? stopovers : null,
        distance_km: distKm ? parseFloat(distKm) : null,
        taxes_escales: taxes,
        acompte: totalAcompte,
        voucher_code: voucher_code || null,
        payment_token: paymentToken,
      })
      .select()
      .single();

    if (resaErr) {
      console.error("Erreur création réservation perso:", resaErr);
      return NextResponse.json({ error: "Erreur création réservation" }, { status: 500 });
    }

    // If voucher covers everything: mark it used immediately
    if (totalAcompte <= 0 && voucher_id) {
      await supabase.from("voucher_codes")
        .update({ status: "used", used_at: new Date().toISOString() })
        .eq("id", voucher_id);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const paymentUrl = paymentToken ? `${siteUrl}/api/vol-sur-mesure/pay/${paymentToken}` : null;

    // Send quote email to client
    await sendVolSurMesureQuote({
      to: email,
      prenom,
      nom,
      date,
      heure,
      dureMin: effectiveDureMin,
      distKm: distKm ?? 0,
      nbWaypoints: waypoints?.length ?? 0,
      stopovers: stopovers ?? [],
      prixEstime,
      discount,
      prixBillable,
      acompte,
      taxesEscales: taxes,
      totalAcompte,
      voucherCode: voucher_code || null,
      paymentUrl,
    });

    // Notify admin
    const dateStr = new Date(date + "T12:00:00Z").toLocaleDateString("fr-BE", {
      day: "numeric", month: "long", year: "numeric",
    });
    await resend.emails.send({
      from: EMAIL_FROM,
      to: [EMAIL_REPLY_TO],
      subject: `[Nouvelle demande vol sur mesure] ${prenom} ${nom} — ${dateStr}`,
      html: `<p><strong>${prenom} ${nom}</strong> (${email}) a soumis une demande de vol sur mesure.</p>
        <ul>
          <li>Date : ${dateStr} à ${heure}</li>
          <li>Durée estimée : ~${effectiveDureMin} min · ${distKm ?? "?"} km</li>
          <li>Acompte : ${totalAcompte} €${discount > 0 ? ` (voucher −${discount} €)` : ""}</li>
          <li>Réservation : ${resa.id}</li>
        </ul>
        ${paymentUrl ? `<p>Lien de paiement envoyé au client : <a href="${paymentUrl}">${paymentUrl}</a></p>` : "<p>Vol entièrement couvert par voucher — aucun paiement requis.</p>"}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Vol sur mesure checkout error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
