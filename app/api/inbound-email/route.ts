import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { reservationMessageClientReplyEmail } from "@/lib/email-templates";

/**
 * POST /api/inbound-email
 *
 * ⚠️ NON BRANCHÉ EN PROD (2026-09-11). Requiert :
 *  1. un sous-domaine `reply.fly-horizons.com` avec des enregistrements MX,
 *  2. Resend Inbound configuré pour POSTer les emails reçus sur cette route,
 *  3. côté `sendReservationMessage` : `replyTo` passé à
 *     `thread+<messages_token>@reply.fly-horizons.com` (au lieu de info@).
 *
 * Une fois branché : capte la réponse email directe d'un client et la recoud au
 * fil de messages de sa réservation (même effet que `submitClientMessageReply`).
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
  // Garde optionnelle : si un secret est configuré, on l'exige.
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (secret) {
    const provided = req.headers.get("x-webhook-secret") ?? req.nextUrl.searchParams.get("secret");
    if (provided !== secret) return NextResponse.json({ ok: true }); // silencieux
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const data = (payload.data ?? payload) as Record<string, unknown>;
  const token = extractToken(data.to);
  const rawText = typeof data.text === "string" ? data.text : "";
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

  return NextResponse.json({ ok: true });
}
