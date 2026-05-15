import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import {
  orderConfirmationEmail,
  orderProcessingEmail,
  orderShippedEmail,
  voucherEmail,
  volSurMesureQuoteEmail,
  contactNotificationEmail,
  contactAcknowledgmentEmail,
  contactReplyEmail,
  type VoucherEmailCode,
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
}

interface SendStatusEmailParams {
  to: string;
  orderRef: string;
  customerName?: string;
  shippingAddress?: ShippingAddress;
}

async function send(to: string, subject: string, html: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      replyTo: EMAIL_REPLY_TO,
      subject,
      html,
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
  const { to, orderRef, ...rest } = params;
  const html = orderConfirmationEmail({ orderRef, customerEmail: to, ...rest });
  return send(to, `Confirmation de commande #${orderRef} — Fly Horizons Shop`, html);
}

export async function sendOrderProcessingEmail(params: SendStatusEmailParams) {
  const { to, orderRef, customerName } = params;
  const html = orderProcessingEmail({ orderRef, customerName });
  return send(to, `Votre commande #${orderRef} est en préparation — Fly Horizons Shop`, html);
}

export async function sendOrderShippedEmail(params: SendStatusEmailParams) {
  const { to, orderRef, customerName, shippingAddress } = params;
  const html = orderShippedEmail({ orderRef, customerName, shippingAddress });
  return send(to, `Votre commande #${orderRef} est expédiée ! — Fly Horizons Shop`, html);
}

export async function sendVoucherEmail(params: {
  to: string;
  orderRef: string;
  customerName?: string;
  codes: VoucherEmailCode[];
}) {
  const { to, orderRef, customerName, codes } = params;
  const html = voucherEmail({ orderRef, customerName, codes });
  return send(to, `Vos vouchers Fly Horizons — #${orderRef}`, html);
}

type SendVolSurMesureQuoteParams = Omit<VolSurMesureQuoteEmailProps, never> & { to: string };

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
