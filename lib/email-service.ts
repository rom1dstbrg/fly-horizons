import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { orderConfirmationEmail } from "@/lib/email-templates";

interface OrderItem {
  title: string;
  quantity: number;
  unit_price: number;
}

interface ShippingAddress {
  full_name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}

interface SendOrderConfirmationParams {
  to: string;
  orderRef: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
  couponCode?: string | null;
  shippingAddress?: ShippingAddress;
}

export async function sendOrderConfirmation(params: SendOrderConfirmationParams) {
  const { to, orderRef, ...rest } = params;

  try {
    const html = orderConfirmationEmail({
      orderRef,
      customerEmail: to,
      ...rest,
    });

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      reply_to: EMAIL_REPLY_TO,
      subject: `Confirmation de commande #${orderRef} - Fly Horizons Shop`,
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
