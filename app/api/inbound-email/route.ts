import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { reservationMessageClientReplyEmail } from "@/lib/email-templates";
import { notifyPiloteReservation } from "@/lib/push";

/**
 * POST /api/inbound-email : webhook Resend « email.received » (27/09).
 *
 * Un client répond à l'email d'un message de sa réservation : l'adresse de
 * réponse est `thread+<messages_token>@<INBOUND_REPLY_DOMAIN>` (voir
 * `threadReplyTo`). Resend reçoit l'email sur ce sous-domaine (MX), appelle ce
 * webhook avec les métadonnées, et on récupère le texte par l'API. La réponse
 * est recousue au fil de la réservation (même effet que `submitClientMessageReply`).
 *
 * Variables : INBOUND_REPLY_DOMAIN (ex. reply.fly-horizons.com) et
 * RESEND_INBOUND_WEBHOOK_SECRET (le « signing secret » whsec_… du webhook Resend).
 */

// Coupe l'historique cité d'une réponse email (heuristique simple).
function stripQuoted(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    if (/^\s*>/.test(line)) break;
    if (/^\s*(Le\s.+\sa\s écrit\s*:|On\s.+\swrote:|-{2,}\s*Message d'origine)/i.test(line)) break;
    if (/^\s*De\s*:\s.+@/i.test(line) && out.length > 0) break;
    out.push(line);
  }
  return out.join("\n").trim();
}

// Secours quand l'email n'a pas de partie texte.
function htmlToText(html: string): string {
  return html
    .replace(/<(br|\/p|\/div)\s*\/?>/gi, "\n")
    .replace(/<blockquote[\s\S]*$/i, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}

function extractToken(to: unknown): string | null {
  const candidates: string[] = [];
  if (typeof to === "string") candidates.push(to);
  else if (Array.isArray(to)) {
    for (const t of to) {
      if (typeof t === "string") candidates.push(t);
      else if (t && typeof t === "object" && "address" in t) candidates.push(String((t as { address: string }).address));
      else if (t && typeof t === "object" && "email" in t) candidates.push(String((t as { email: string }).email));
    }
  }
  for (const addr of candidates) {
    const m = addr.match(/thread\+([0-9a-f-]{36})@/i);
    if (m) return m[1];
  }
  return null;
}

export async function POST(req: NextRequest) {
  // Signature obligatoire : sans elle, n'importe qui connaissant un
  // messages_token pourrait injecter un message dans un fil.
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "RESEND_INBOUND_WEBHOOK_SECRET non configuré" }, { status: 400 });
  }
  const raw = await req.text();
  let event: ReturnType<typeof resend.webhooks.verify>;
  try {
    event = resend.webhooks.verify({
      payload: raw,
      headers: {
        id: req.headers.get("svix-id") ?? "",
        timestamp: req.headers.get("svix-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? "",
      },
      webhookSecret: secret,
    });
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }
  if (event.type !== "email.received") return NextResponse.json({ ok: true });

  const token = extractToken(event.data.to);
  if (!token) return NextResponse.json({ ok: true });

  // Le webhook ne porte que les métadonnées : le texte se lit par l'API.
  const { data: email } = await resend.emails.receiving.get(event.data.email_id);
  const rawText = email?.text ?? (email?.html ? htmlToText(email.html) : "");
  const content = stripQuoted(rawText).slice(0, 5000);

  if (!token || !content) return NextResponse.json({ ok: true });

  const db = createAdminClient();
  const { data: resa } = await db
    .from("reservations")
    .select("id, date_vol, clients(prenom, nom), pilotes(nom, email)")
    .eq("messages_token", token)
    .maybeSingle();

  if (!resa) return NextResponse.json({ ok: true });

  await db.from("reservation_messages").insert({
    reservation_id: resa.id,
    author: "client",
    author_nom: null,
    content,
  });

  const client = Array.isArray(resa.clients) ? resa.clients[0] : resa.clients;
  const pilote = Array.isArray(resa.pilotes) ? resa.pilotes[0] : resa.pilotes;
  const clientNom = client ? `${client.prenom} ${client.nom}` : "Le client";
  const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const siteUrl = rawUrl.startsWith("http://localhost") || rawUrl.startsWith("http://127")
    ? rawUrl
    : "https://fly-horizons.com";

  await resend.emails
    .send({
      from: EMAIL_FROM,
      to: pilote?.email ? [pilote.email, EMAIL_REPLY_TO] : [EMAIL_REPLY_TO],
      replyTo: EMAIL_REPLY_TO,
      subject: `[Message client] ${clientNom} · vol du ${resa.date_vol}`,
      html: reservationMessageClientReplyEmail({
        clientNom,
        dateStr,
        message: content,
        adminUrl: `${siteUrl}/pilote/vols`,
      }),
    })
    .catch(() => {});

  await db.from("reservation_history").insert({
    reservation_id: resa.id,
    action: "message_received",
    new_value: content.slice(0, 120),
    author: "client",
    note: "Réponse email du client (webhook inbound)",
  });

  await notifyPiloteReservation(resa.id, "message_client", content);
  return NextResponse.json({ ok: true });
}
