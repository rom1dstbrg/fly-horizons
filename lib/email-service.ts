import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import {
  orderConfirmationEmail,
  voucherEmail,
  flightReminderEmail,
  volSurMesureQuoteEmail,
  contactNotificationEmail,
  contactAcknowledgmentEmail,
  contactReplyEmail,
  type VoucherEmailCode,
  type FlightReminderEmailProps,
  type VolSurMesureQuoteEmailProps,
  type ContactNotificationProps,
  type ContactAcknowledgmentProps,
  type ContactReplyProps,
} from "@/lib/email-templates";

interface OrderItem {
  title: string;
  quantity: number;
  unit_price: number;
  image_url?: string | null;
}

interface ShippingAddress {
  full_name?: string;
  email?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  postal_code?: string;
  country?: string;
}

interface EmailAttachment {
  filename: string;
  content: Buffer;
}

interface SendOrderConfirmationParams {
  to: string;
  orderRef: string;
  customerName?: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
  couponCode?: string | null;
  shippingAddress?: ShippingAddress;
  orderDate?: string;
  voucherCodes?: VoucherEmailCode[];
  attachments?: EmailAttachment[];
}

async function send(to: string, subject: string, html: string, attachments?: EmailAttachment[]) {
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      replyTo: EMAIL_REPLY_TO,
      subject,
      html,
      ...(attachments && attachments.length > 0 ? { attachments } : {}),
    });
    if (error) {
      console.error("Resend error:", error);
      return { error };
    }
    return { data };
  } catch (err) {
    console.error("Email send error:", err);
    return { error: err };
  }
}

export async function sendOrderConfirmation(params: SendOrderConfirmationParams) {
  const { to, orderRef, attachments, ...rest } = params;
  const html = orderConfirmationEmail({ orderRef, customerEmail: to, ...rest });
  return send(to, `Confirmation de commande #${orderRef} — Fly Horizons`, html, attachments);
}

export async function sendVoucherEmail(params: {
  to: string;
  orderRef: string;
  customerName?: string;
  codes: VoucherEmailCode[];
  attachments?: EmailAttachment[];
}) {
  const { to, orderRef, customerName, codes, attachments } = params;
  const html = voucherEmail({ orderRef, customerName, codes });
  return send(to, `Votre bon de vol Fly Horizons`, html, attachments);
}

export async function sendFlightReminder(params: FlightReminderEmailProps & { to: string }) {
  const { to, ...rest } = params;
  const html = flightReminderEmail(rest);
  return send(to, `Rappel — Votre vol le ${rest.dateStr} — Fly Horizons`, html);
}

type SendVolSurMesureQuoteParams = VolSurMesureQuoteEmailProps & { to: string };

export async function sendVolSurMesureQuote(params: SendVolSurMesureQuoteParams) {
  const { to, ...rest } = params;
  const dateStr = new Date(rest.date + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const html = volSurMesureQuoteEmail(rest);
  return send(to, `Votre vol sur mesure — ${dateStr} · Fly Horizons`, html);
}

export async function sendContactNotificationEmail(params: ContactNotificationProps) {
  const html = contactNotificationEmail(params);
  return send("info@fly-horizons.com", `Nouveau message : ${params.sujet} — ${params.nom}`, html);
}

export async function sendContactAcknowledgmentEmail(params: ContactAcknowledgmentProps) {
  const html = contactAcknowledgmentEmail(params);
  return send(params.email, "Votre message a bien été reçu — Fly Horizons", html);
}

export async function sendContactReplyEmail(params: ContactReplyProps) {
  const html = contactReplyEmail(params);
  return send(params.email, `Réponse Fly Horizons — ${params.sujet}`, html);
}
