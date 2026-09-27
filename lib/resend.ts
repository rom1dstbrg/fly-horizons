import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_FROM = "Fly Horizons <info@fly-horizons.com>";
export const EMAIL_REPLY_TO = "info@fly-horizons.com";

/**
 * Adresse de réponse d'un email lié au fil de messages d'une réservation
 * (27/09) : `thread+<token>@<INBOUND_REPLY_DOMAIN>`, reçue par Resend et
 * recousue au fil par /api/inbound-email. Tant que le sous-domaine de
 * réception n'est pas configuré, on garde info@.
 */
export function threadReplyTo(messagesToken: string | null | undefined): string {
  const domain = process.env.INBOUND_REPLY_DOMAIN;
  return domain && messagesToken ? `thread+${messagesToken}@${domain}` : EMAIL_REPLY_TO;
}
