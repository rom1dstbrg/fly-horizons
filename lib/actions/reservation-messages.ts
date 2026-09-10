"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminOrOwningPilote } from "./auth-guards";
import { rateLimit } from "@/lib/rate-limit";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import {
  reservationMessageEmail,
  reservationMessageClientReplyEmail,
} from "@/lib/email-templates";

// Fil de messages rattache a une reservation (espace pilote). Le pilote (ou
// l'admin) ecrit au client depuis l'onglet Messages du drawer ; le client
// repond via la page publique /reservation/messages/[token]. L'envoi part
// toujours de info@fly-horizons.com, corps au nom de l'expediteur.

export interface ReservationMessage {
  id: string;
  author: "client" | "pilote" | "admin";
  author_nom: string | null;
  content: string;
  created_at: string;
}

function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return raw.startsWith("http://localhost") || raw.startsWith("http://127")
    ? raw
    : "https://fly-horizons.com";
}

function pick<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

function dateLabel(dateVol: string): string {
  return new Date(dateVol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Signature par defaut d'un pilote quand il n'en a pas saisi une. */
function defaultSignature(nom: string, telephone: string | null): string {
  return `${nom} · Pilote${telephone ? ` · ${telephone}` : ""}`;
}

/** Le pilote (ou l'admin) envoie un message au client sur une reservation. */
export async function sendReservationMessage(reservationId: string, content: string) {
  try {
    const actor = await requireAdminOrOwningPilote(reservationId);
    const body = content.trim();
    if (!body) return { error: "Le message ne peut pas être vide." };
    if (body.length > 5000) return { error: "Message trop long (5000 caractères max)." };

    const db = createAdminClient();
    const { data: resa } = await db
      .from("reservations")
      .select(
        "id, date_vol, messages_token, clients(prenom, nom, email), pilotes(nom, telephone, signature)",
      )
      .eq("id", reservationId)
      .single();
    if (!resa) return { error: "Réservation introuvable" };

    const client = pick<{ prenom: string; nom: string; email: string }>(resa.clients);
    if (!client?.email) return { error: "Ce client n'a pas d'adresse email." };
    const pilote = pick<{ nom: string; telephone: string | null; signature: string | null }>(
      resa.pilotes,
    );

    const isPilote = actor.role === "pilote";
    const expediteurNom = isPilote ? actor.piloteNom : "Romain";
    const signature = isPilote
      ? (pilote?.signature?.trim() || defaultSignature(actor.piloteNom, pilote?.telephone ?? null))
      : "Romain · Fly Horizons";

    const { error: insErr } = await db.from("reservation_messages").insert({
      reservation_id: reservationId,
      author: actor.role,
      author_nom: expediteurNom,
      content: body,
    });
    if (insErr) return { error: insErr.message };

    // Phase 1 : le client repond via la page publique. Quand l'email entrant
    // sera branche : replyTo = `thread+${resa.messages_token}@reply.fly-horizons.com`.
    await resend.emails.send({
      from: EMAIL_FROM,
      to: [client.email],
      replyTo: EMAIL_REPLY_TO,
      subject: `Message ${isPilote ? `de ${expediteurNom} ` : ""}· votre vol Fly Horizons`,
      html: reservationMessageEmail({
        prenom: client.prenom,
        expediteurNom: isPilote ? expediteurNom : "l'équipe Fly Horizons",
        dateStr: dateLabel(resa.date_vol),
        message: body,
        signature,
        threadUrl: `${siteUrl()}/reservation/messages/${resa.messages_token}`,
      }),
    });

    await db.from("reservation_history").insert({
      reservation_id: reservationId,
      action: "message_sent",
      new_value: body.slice(0, 120),
      author: isPilote ? `pilote:${actor.piloteNom}` : "admin",
      note: "Message envoyé au client",
    });

    revalidatePath("/admin/vols");
    revalidatePath("/pilote/vols");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

/** Fil complet d'une reservation (admin ou pilote proprietaire). */
export async function getReservationMessages(reservationId: string) {
  try {
    await requireAdminOrOwningPilote(reservationId);
    const db = createAdminClient();
    const { data } = await db
      .from("reservation_messages")
      .select("id, author, author_nom, content, created_at")
      .eq("reservation_id", reservationId)
      .order("created_at", { ascending: true });
    return { data: (data ?? []) as ReservationMessage[] };
  } catch {
    return { error: "Erreur serveur" };
  }
}

/** Reponse du client depuis la page publique du fil (pas d'auth). */
export async function submitClientMessageReply(messagesToken: string, content: string) {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "unknown";
  const { allowed } = await rateLimit(`resa-message-reply:${ip}`, 5, 60_000);
  if (!allowed) return { error: "Trop de messages. Veuillez patienter." };

  const body = content.trim();
  if (!body) return { error: "Le message ne peut pas être vide." };
  if (body.length > 5000) return { error: "Message trop long." };

  const db = createAdminClient();
  const { data: resa } = await db
    .from("reservations")
    .select("id, date_vol, clients(prenom, nom), pilotes(nom, email)")
    .eq("messages_token", messagesToken)
    .single();
  if (!resa) return { error: "Lien invalide." };

  const { error: insErr } = await db.from("reservation_messages").insert({
    reservation_id: resa.id,
    author: "client",
    author_nom: null,
    content: body,
  });
  if (insErr) return { error: "Erreur serveur" };

  const client = pick<{ prenom: string; nom: string }>(resa.clients);
  const pilote = pick<{ nom: string; email: string | null }>(resa.pilotes);
  const clientNom = client ? `${client.prenom} ${client.nom}` : "Le client";
  const to = pilote?.email ? [pilote.email, EMAIL_REPLY_TO] : [EMAIL_REPLY_TO];

  await resend.emails
    .send({
      from: EMAIL_FROM,
      to,
      replyTo: EMAIL_REPLY_TO,
      subject: `[Message client] ${clientNom} · vol du ${resa.date_vol}`,
      html: reservationMessageClientReplyEmail({
        clientNom,
        dateStr: dateLabel(resa.date_vol),
        message: body,
        adminUrl: `${siteUrl()}/pilote/vols`,
      }),
    })
    .catch(() => {});

  await db.from("reservation_history").insert({
    reservation_id: resa.id,
    action: "message_received",
    new_value: body.slice(0, 120),
    author: "client",
    note: "Réponse du client dans le fil de messages",
  });

  return { success: true };
}
