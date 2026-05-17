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
      voucher_code, voucher_id, coupon_code,
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

    // Valider et réserver atomiquement le voucher côté serveur
    // L'UPDATE avec .eq("status","unused") garantit qu'une seule requête concurrente réussit
    let voucherValue = 0;  // valeur monétaire déduite de l'acompte (= prix d'achat du voucher)
    let claimedVoucherId: string | null = null;
    if (voucher_id) {
      const { data: claimed } = await supabase
        .from("voucher_codes")
        .update({ status: "reserved" })
        .eq("id", voucher_id)
        .eq("status", "unused")
        .select("id, expires_at, product_id")
        .maybeSingle();

      if (!claimed) {
        return NextResponse.json({ error: "Code voucher invalide ou déjà utilisé" }, { status: 400 });
      }
      if (claimed.expires_at && new Date(claimed.expires_at) < new Date()) {
        await supabase.from("voucher_codes").update({ status: "expired" }).eq("id", claimed.id);
        return NextResponse.json({ error: "Ce voucher a expiré" }, { status: 400 });
      }

      // Récupérer le prix du produit pour calculer la déduction exacte
      if (claimed.product_id) {
        const { data: prod } = await supabase
          .from("products").select("price").eq("id", claimed.product_id).maybeSingle();
        voucherValue = prod?.price ?? 0;
      }
      claimedVoucherId = claimed.id;
    }

    const effectiveDureMin = dureMin ?? 0;
    const prixEstime   = Math.round((prixHeure / 60) * effectiveDureMin);
    const acompte      = effectiveDureMin > 0
      ? Math.round((acompteHeure / 60) * effectiveDureMin)
      : Math.round(acompteHeure);
    const discount     = voucherValue;
    const prixBillable = Math.max(0, prixEstime - discount);
    const taxes        = Math.max(0, taxesEscales ? parseInt(taxesEscales) : 0);
    const afterVoucher = Math.max(0, acompte + taxes - discount);

    // Appliquer le code promo s'il y en a un (sur le montant après voucher)
    let couponDiscountAmount = 0;
    if (coupon_code && afterVoucher > 0) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", (coupon_code as string).toUpperCase().trim())
        .eq("active", true)
        .maybeSingle();

      if (coupon &&
          !(coupon.expires_at && new Date(coupon.expires_at) < new Date()) &&
          !(coupon.max_uses && (coupon.usage_count ?? 0) >= coupon.max_uses)) {
        couponDiscountAmount = coupon.type === "percentage"
          ? Math.round(afterVoucher * coupon.value / 100)
          : Math.min(coupon.value, afterVoucher);
        await supabase.rpc("increment_coupon_usage", { coupon_code: coupon.code });
      }
    }
    const finalAcompte = Math.max(0, afterVoucher - couponDiscountAmount);

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

    // Generate payment token for deferred Stripe checkout
    const paymentToken = finalAcompte > 0 ? randomUUID() : null;

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
        acompte: finalAcompte,
        voucher_code: voucher_code || null,
        payment_token: paymentToken,
      })
      .select()
      .single();

    if (resaErr) {
      // Rollback voucher claim
      if (claimedVoucherId) {
        await supabase.from("voucher_codes").update({ status: "unused" }).eq("id", claimedVoucherId).eq("status", "reserved");
      }
      console.error("Erreur création réservation perso:", resaErr);
      return NextResponse.json({ error: "Erreur création réservation" }, { status: 500 });
    }

    // If voucher/coupon covers everything: mark it used immediately (no payment link needed)
    if (finalAcompte <= 0 && claimedVoucherId) {
      await supabase.from("voucher_codes")
        .update({ status: "used", used_at: new Date().toISOString() })
        .eq("id", claimedVoucherId);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const paymentUrl = paymentToken ? `${siteUrl}/api/vol-sur-mesure/pay/${paymentToken}` : null;

    // Send quote email to client
    // acompteForEmail = acompte après déduction voucher, avant taxes (pour le tableau de l'email)
    const acompteForEmail = Math.max(0, acompte - discount);
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
      acompte: acompteForEmail,
      taxesEscales: taxes,
      totalAcompte: finalAcompte,
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
          <li>Acompte : ${finalAcompte} €${discount > 0 ? ` (voucher −${discount} €)` : ""}${couponDiscountAmount > 0 ? ` (code promo −${couponDiscountAmount} €)` : ""}</li>
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
