import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { escapeHtml } from "@/lib/utils";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(request: NextRequest) {
  const { allowed } = await rateLimit(`vol-annonce-checkout:${getIp(request)}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes, veuillez patienter." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { annonce_id, prenom, nom, email, telephone, passagers } = body;

    if (!annonce_id || !prenom || !nom || !email || !passagers) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const passagersCount = parseInt(passagers, 10);
    if (isNaN(passagersCount) || passagersCount < 1) {
      return NextResponse.json({ error: "Nombre de passagers invalide" }, { status: 400 });
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

    // Réclamation atomique — empêche deux clients de payer la même annonce en même temps
    // (même pattern que la réclamation d'un voucher_codes).
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
        date_vol: annonce.date_vol,
        heure_vol: annonce.heure_vol,
        duree: annonce.duree,
        passagers: passagersCount,
        statut: "payment_pending",
        type_resa: "annonce_pilote",
        acompte: prixClient,
      })
      .select()
      .single();

    if (resaErr) {
      // Libérer l'annonce si la création de la réservation échoue
      await supabase.from("annonces_pilote").update({ statut: "publiee" }).eq("id", annonce_id).eq("statut", "reservee");
      return NextResponse.json({ error: "Erreur création réservation" }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http://localhost")
      ? process.env.NEXT_PUBLIC_SITE_URL
      : "https://fly-horizons.com";

    const dateStr = new Date(annonce.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
      day: "numeric", month: "long", year: "numeric",
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      locale: "fr",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Vol partagé avec ${pilote.nom} — ${annonce.duree} min`,
              description: `${dateStr} à ${annonce.heure_vol.slice(0, 5)} · ${prenom} ${nom}`,
            },
            unit_amount: Math.round(prixClient * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "annonce_pilote",
        reservationId: resa.id,
        annonceId: annonce.id,
        piloteId: pilote.id,
      },
      success_url: `${siteUrl}/account/reservations/${resa.id}`,
      cancel_url: `${siteUrl}/vol/annonce/${annonce.id}`,
    });

    if (!session.url) {
      await supabase.from("annonces_pilote").update({ statut: "publiee" }).eq("id", annonce_id).eq("statut", "reservee");
      await supabase.from("reservations").update({ statut: "annulee" }).eq("id", resa.id);
      return NextResponse.json({ error: "Erreur lors de la création du paiement" }, { status: 500 });
    }

    // Notification admin (best-effort, ne bloque pas le retour au client)
    const eNom = escapeHtml(`${prenom} ${nom}`);
    const eEmail = escapeHtml(email);
    resend.emails.send({
      from: EMAIL_FROM,
      to: [EMAIL_REPLY_TO],
      subject: `[Annonce en cours de paiement] ${eNom} · ${dateStr}`,
      html: `<p><strong>${eNom}</strong> (${eEmail}) est en train de payer le vol de <strong>${escapeHtml(pilote.nom)}</strong> du ${dateStr} à ${annonce.heure_vol.slice(0, 5)}.</p>`,
    }).catch(() => {});

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Vol annonce checkout error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
