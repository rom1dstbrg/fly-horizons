import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prenom, nom, email, telephone, duree, date, heure, voucher_code, poids_total } = body;

    if (!prenom || !nom || !email || !duree || !date || !heure) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Valider et consommer le voucher si fourni
    let voucherId: string | null = null;
    if (voucher_code) {
      const { data: voucher } = await supabase
        .from("voucher_codes")
        .select("id, status, duration_minutes")
        .eq("code", voucher_code.toUpperCase().trim())
        .single();

      if (!voucher || voucher.status !== "unused") {
        return NextResponse.json({ error: "Code voucher invalide ou déjà utilisé" }, { status: 400 });
      }
      voucherId = voucher.id;
    }

    // Créer le client
    const { data: clientId } = await supabase.rpc("next_client_id");
    if (!clientId) return NextResponse.json({ error: "Erreur génération ID client" }, { status: 500 });

    const { error: cliErr } = await supabase.from("clients").insert({
      id: clientId,
      nom,
      prenom,
      email,
      telephone: telephone || null,
    });
    if (cliErr) return NextResponse.json({ error: "Erreur création client" }, { status: 500 });

    // Créer la réservation
    const { data: resa, error: resaErr } = await supabase
      .from("reservations")
      .insert({
        client_id: clientId,
        date_vol: date,
        heure_vol: heure,
        duree: parseInt(duree),
        passagers: 1,
        statut: "en_attente",
        type_resa: "standard",
        voucher_code: voucher_code?.toUpperCase().trim() || null,
        poids_total: poids_total ? parseInt(poids_total) : null,
      })
      .select()
      .single();

    if (resaErr) return NextResponse.json({ error: "Erreur création réservation" }, { status: 500 });

    // Marquer le voucher comme utilisé
    if (voucherId) {
      await supabase
        .from("voucher_codes")
        .update({ status: "used", used_at: new Date().toISOString() })
        .eq("id", voucherId);
    }

    // Email de confirmation au client
    const dateStr = new Date(date + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    await resend.emails.send({
      from: EMAIL_FROM,
      to: [email],
      replyTo: EMAIL_REPLY_TO,
      subject: "Demande de réservation reçue — Fly Horizons",
      html: reservationConfirmationEmail({ prenom, nom, date: dateStr, heure, duree: parseInt(duree) }),
    });

    // Notification admin
    await resend.emails.send({
      from: EMAIL_FROM,
      to: [EMAIL_REPLY_TO],
      subject: `[Réservation] ${prenom} ${nom} — ${date} à ${heure}`,
      html: adminNotificationEmail({ prenom, nom, email, telephone, date: dateStr, heure, duree: parseInt(duree), clientId, voucher_code, poids_total: poids_total ? parseInt(poids_total) : undefined }),
    });

    return NextResponse.json({ success: true, reservationId: resa.id });
  } catch (error) {
    console.error("Reservation submit error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

function reservationConfirmationEmail(p: {
  prenom: string; nom: string; date: string; heure: string; duree: number;
}) {
  return `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f0f4f8;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(17,51,86,.1);">
  <div style="background:#113356;padding:28px 32px;">
    <p style="color:#F2B705;margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Fly Horizons</p>
    <h1 style="color:#fff;margin:8px 0 0;font-size:20px;font-weight:700;">Demande de réservation reçue</h1>
  </div>
  <div style="padding:32px;">
    <p style="color:#113356;font-size:15px;">Bonjour <strong>${p.prenom}</strong>,</p>
    <p style="color:#4a5568;font-size:14px;line-height:1.6;">
      Nous avons bien reçu votre demande de vol. Voici le récapitulatif :
    </p>
    <div style="background:#f8fafc;border-radius:10px;padding:20px;margin:20px 0;border:1px solid #e2e8f0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#64748b;width:130px;">Date</td>
          <td style="padding:6px 0;font-size:14px;font-weight:600;color:#113356;">${p.date}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#64748b;">Heure</td>
          <td style="padding:6px 0;font-size:14px;font-weight:600;color:#113356;">${p.heure}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#64748b;">Durée</td>
          <td style="padding:6px 0;font-size:14px;font-weight:600;color:#113356;">${p.duree} minutes</td>
        </tr>
      </table>
    </div>
    <p style="color:#4a5568;font-size:13px;line-height:1.6;">
      Nous vous contacterons rapidement pour confirmer votre vol. Pour toute question, répondez directement à cet email.
    </p>
    <p style="color:#4a5568;font-size:13px;">À très bientôt à bord !</p>
    <p style="color:#113356;font-size:13px;font-weight:600;margin-top:24px;">L'équipe Fly Horizons</p>
  </div>
  <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="color:#94a3b8;font-size:11px;margin:0;">fly-horizons.com · info@fly-horizons.com</p>
  </div>
</div>
</body></html>`;
}

function adminNotificationEmail(p: {
  prenom: string; nom: string; email: string; telephone?: string;
  date: string; heure: string; duree: number; clientId: string; voucher_code?: string; poids_total?: number;
}) {
  return `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f0f4f8;">
<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;">
  <div style="background:#113356;padding:20px 24px;">
    <h2 style="color:#fff;margin:0;font-size:16px;">✈️ Nouvelle réservation</h2>
  </div>
  <div style="padding:24px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:5px 0;font-size:12px;color:#64748b;width:120px;">Client</td><td style="padding:5px 0;font-size:14px;font-weight:600;">${p.prenom} ${p.nom} (${p.clientId})</td></tr>
      <tr><td style="padding:5px 0;font-size:12px;color:#64748b;">Email</td><td style="padding:5px 0;font-size:14px;"><a href="mailto:${p.email}">${p.email}</a></td></tr>
      <tr><td style="padding:5px 0;font-size:12px;color:#64748b;">Téléphone</td><td style="padding:5px 0;font-size:14px;">${p.telephone || "—"}</td></tr>
      <tr><td style="padding:5px 0;font-size:12px;color:#64748b;">Date</td><td style="padding:5px 0;font-size:14px;font-weight:600;">${p.date}</td></tr>
      <tr><td style="padding:5px 0;font-size:12px;color:#64748b;">Heure</td><td style="padding:5px 0;font-size:14px;font-weight:600;">${p.heure}</td></tr>
      <tr><td style="padding:5px 0;font-size:12px;color:#64748b;">Durée</td><td style="padding:5px 0;font-size:14px;">${p.duree} min</td></tr>
      ${p.poids_total ? `<tr><td style="padding:5px 0;font-size:12px;color:#64748b;">Poids total</td><td style="padding:5px 0;font-size:14px;font-weight:600;">${p.poids_total} kg</td></tr>` : ""}
      ${p.voucher_code ? `<tr><td style="padding:5px 0;font-size:12px;color:#64748b;">Voucher</td><td style="padding:5px 0;font-size:14px;color:#16a34a;font-weight:600;">${p.voucher_code} ✓</td></tr>` : ""}
    </table>
    <div style="margin-top:20px;">
      <a href="https://fly-horizons.com/admin.html" style="display:inline-block;background:#113356;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">Ouvrir le CRM</a>
    </div>
  </div>
</div>
</body></html>`;
}
