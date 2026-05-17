import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reservationConfirmationFreeEmail } from "@/lib/email-templates";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { rateLimit, getIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const { allowed } = rateLimit(`reservation-submit:${getIp(request)}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes, veuillez patienter." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { prenom, nom, email, telephone, duree, date, heure, voucher_code, poids_total, passengers } = body;

    if (!prenom || !nom || !email || !duree || !date || !heure) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Claim atomique du voucher : l'UPDATE avec .eq("status","unused") garantit
    // qu'une seule requête concurrente peut réussir (élimine le TOCTOU)
    let voucherId: string | null = null;
    if (voucher_code) {
      const { data: claimed } = await supabase
        .from("voucher_codes")
        .update({ status: "used", used_at: new Date().toISOString() })
        .eq("code", voucher_code.toUpperCase().trim())
        .eq("status", "unused")
        .select("id")
        .maybeSingle();

      if (!claimed) {
        return NextResponse.json({ error: "Code voucher invalide ou déjà utilisé" }, { status: 400 });
      }
      voucherId = claimed.id;
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
      const { error: cliErr } = await supabase.from("clients").insert({
        id: clientId, nom, prenom, email, telephone: telephone || null,
      });
      if (cliErr) return NextResponse.json({ error: "Erreur création client" }, { status: 500 });
    }

    // Créer la réservation
    const { data: resa, error: resaErr } = await supabase
      .from("reservations")
      .insert({
        client_id: clientId,
        date_vol: date,
        heure_vol: heure,
        duree: parseInt(duree),
        passagers: passengers ? parseInt(passengers) : 1,
        statut: "en_attente",
        type_resa: "standard",
        voucher_code: voucher_code?.toUpperCase().trim() || null,
        poids_total: poids_total ? parseInt(poids_total) : null,
      })
      .select()
      .single();

    if (resaErr) return NextResponse.json({ error: "Erreur création réservation" }, { status: 500 });

    // Email de confirmation au client
    const dateStr = new Date(date + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    await resend.emails.send({
      from: EMAIL_FROM,
      to: [email],
      replyTo: EMAIL_REPLY_TO,
      subject: "Demande de réservation reçue — Fly Horizons",
      html: reservationConfirmationFreeEmail({
        prenom,
        nom,
        dateStr,
        heure,
        duree: parseInt(duree),
        passengers: passengers ? parseInt(passengers) : 1,
        poids_total: poids_total ? parseInt(poids_total) : null,
        voucherCode: voucher_code?.toUpperCase().trim() || null,
      }),
    });

    // Notification admin
    const passagersCount = passengers ? parseInt(passengers) : 1;
    await resend.emails.send({
      from: EMAIL_FROM,
      to: [EMAIL_REPLY_TO],
      subject: `[Réservation] ${prenom} ${nom} — ${date} à ${heure}`,
      html: `<p><strong>✈️ Nouvelle réservation</strong></p>
<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Client</td><td><strong>${prenom} ${nom}</strong> (${clientId})</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Téléphone</td><td>${telephone || "—"}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Date</td><td><strong>${dateStr}</strong></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Heure</td><td><strong>${heure}</strong></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Durée</td><td>${duree} min</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Passagers</td><td>${passagersCount}</td></tr>
  ${poids_total ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">Poids total</td><td>${poids_total} kg</td></tr>` : ""}
  ${voucher_code ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">Voucher</td><td style="color:#16a34a;font-weight:600;">${voucher_code.toUpperCase().trim()} ✓</td></tr>` : ""}
</table>`,
    });

    return NextResponse.json({ success: true, reservationId: resa.id });
  } catch (error) {
    console.error("Reservation submit error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

