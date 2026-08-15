import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { reservationConfirmationFreeEmail } from "@/lib/email-templates";
import { escapeHtml } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const { allowed } = await rateLimit(`vol-annonce-submit:${getIp(request)}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes, veuillez patienter." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { annonce_id, prenom, nom, email, telephone, passagers, date_vol, heure_vol, commentaire } = body;

    if (!annonce_id || !prenom || !nom || !email || !passagers || !date_vol || !heure_vol) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const passagersCount = parseInt(passagers, 10);
    if (isNaN(passagersCount) || passagersCount < 1) {
      return NextResponse.json({ error: "Nombre de passagers invalide" }, { status: 400 });
    }

    // Règle J-2 : minimum 48h d'avance (basé sur la date du jour en heure de Bruxelles) —
    // même règle que app/api/reservation/checkout/route.ts.
    const brusselsTodayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Brussels",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
    const todayMidnight = new Date(brusselsTodayStr + "T00:00:00Z");
    const minBookable = new Date(todayMidnight);
    minBookable.setDate(minBookable.getDate() + 2);
    if (new Date(date_vol + "T12:00:00Z") < minBookable) {
      return NextResponse.json(
        { error: "Les réservations sont possibles uniquement 48h à l'avance minimum (J-2)." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Prix et disponibilité toujours revérifiés côté serveur — jamais depuis le client.
    const { data: annonce } = await supabase
      .from("annonces_pilote")
      .select("*, pilotes(id, nom, email)")
      .eq("id", annonce_id)
      .single();

    if (!annonce || annonce.statut !== "publiee") {
      return NextResponse.json({ error: "Ce vol n'est plus disponible." }, { status: 410 });
    }
    if (passagersCount > annonce.places) {
      return NextResponse.json({ error: `Ce vol n'a que ${annonce.places} place(s) disponible(s).` }, { status: 400 });
    }

    const pilote = annonce.pilotes as { id: string; nom: string; email: string } | null;
    if (!pilote) {
      return NextResponse.json({ error: "Pilote introuvable pour cette annonce." }, { status: 500 });
    }

    const prixClient = Math.round((annonce.prix_total - annonce.part_pilote) * 100) / 100;
    if (prixClient <= 0) {
      return NextResponse.json({ error: "Montant invalide pour ce vol." }, { status: 400 });
    }

    // Conflit d'horaire — scopé au pilote de cette annonce (deux pilotes différents
    // peuvent voler au même moment, contrairement au flow standard mono-pilote).
    const { data: conflicts } = await supabase
      .from("reservations")
      .select("id, heure_vol, duree")
      .eq("pilote_id", pilote.id)
      .eq("date_vol", date_vol)
      .neq("statut", "annulee");

    const [newH, newM] = (heure_vol as string).split(":").map(Number);
    const newStart = newH * 60 + newM;
    const newEnd = newStart + annonce.duree;

    const taken = (conflicts ?? []).some(r => {
      if (!r.heure_vol) return false;
      const [rh, rm] = r.heure_vol.split(":").map(Number);
      const rStart = rh * 60 + rm;
      const rEnd = rStart + r.duree + 30; // +30 min de tampon, comme calcSlots
      return newEnd + 30 > rStart && newStart < rEnd;
    });

    if (taken) {
      return NextResponse.json({ error: "Ce pilote a déjà un vol prévu sur ce créneau. Choisissez une autre date ou heure." }, { status: 409 });
    }

    // Réclamation atomique — dès la demande (pas au paiement, qui vient plus tard une
    // fois le pilote confirmé) : empêche deux clients de demander la même annonce.
    const { data: claimed } = await supabase
      .from("annonces_pilote")
      .update({ statut: "reservee" })
      .eq("id", annonce_id)
      .eq("statut", "publiee")
      .select("id")
      .maybeSingle();

    if (!claimed) {
      return NextResponse.json({ error: "Ce vol vient d'être réservé par quelqu'un d'autre." }, { status: 409 });
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
      if (!newId) {
        await supabase.from("annonces_pilote").update({ statut: "publiee" }).eq("id", annonce_id).eq("statut", "reservee");
        return NextResponse.json({ error: "Erreur génération ID client" }, { status: 500 });
      }
      clientId = newId;
      await supabase.from("clients").insert({
        id: clientId, nom, prenom, email, telephone: telephone || null,
      });
    }

    const { data: resa, error: resaErr } = await supabase
      .from("reservations")
      .insert({
        client_id: clientId,
        pilote_id: pilote.id,
        annonce_id: annonce.id,
        date_vol,
        heure_vol,
        duree: annonce.duree,
        passagers: passagersCount,
        statut: "demande_recue",
        type_resa: "annonce_pilote",
        acompte: prixClient,
        commentaire: commentaire || null,
      })
      .select()
      .single();

    if (resaErr) {
      // Libérer l'annonce si la création de la réservation échoue
      await supabase.from("annonces_pilote").update({ statut: "publiee" }).eq("id", annonce_id).eq("statut", "reservee");
      return NextResponse.json({ error: "Erreur création réservation" }, { status: 500 });
    }

    const dateStr = new Date(date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    // Email de confirmation de la demande au client — même template que le flow standard.
    await resend.emails.send({
      from: EMAIL_FROM,
      to: [email],
      replyTo: EMAIL_REPLY_TO,
      subject: "Demande de vol reçue · Fly Horizons",
      html: reservationConfirmationFreeEmail({
        prenom, nom, dateStr,
        heure: heure_vol,
        duree: annonce.duree,
        passengers: passagersCount,
        reservationId: resa.id,
        montant: prixClient,
      }),
    });

    // Notification au pilote (pas seulement à l'admin) — c'est lui qui doit traiter la demande.
    const ePrenom = escapeHtml(prenom);
    const eNom = escapeHtml(nom);
    const eEmail = escapeHtml(email);
    const notifyTo = pilote.email ? [pilote.email, EMAIL_REPLY_TO] : [EMAIL_REPLY_TO];
    resend.emails.send({
      from: EMAIL_FROM,
      to: notifyTo,
      subject: `[Nouvelle demande] ${ePrenom} ${eNom} · ${date_vol} à ${(heure_vol as string).slice(0, 5)}`,
      html: `<p><strong>✈️ Nouvelle demande sur votre annonce — ${prixClient} €</strong></p>
<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Client</td><td><strong>${ePrenom} ${eNom}</strong> (${clientId})</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Email</td><td><a href="mailto:${eEmail}">${eEmail}</a></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Date</td><td><strong>${dateStr}</strong></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Heure</td><td><strong>${(heure_vol as string).slice(0, 5)}</strong></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Durée</td><td>${annonce.duree} min</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Passagers</td><td>${passagersCount}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Montant</td><td><strong>${prixClient} €</strong></td></tr>
</table>
<p>Connectez-vous à votre espace pilote (Mes vols) pour confirmer le créneau, tracer la route et envoyer le lien de paiement.</p>`,
    }).catch(() => {});

    return NextResponse.json({ success: true, reservationId: resa.id });
  } catch (error) {
    console.error("Vol annonce submit error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
