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

interface OrderConfirmationProps {
  orderRef: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
  couponCode?: string | null;
  shippingAddress?: ShippingAddress;
}

function fmt(amount: number): string {
  return new Intl.NumberFormat("fr-BE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function orderConfirmationEmail(props: OrderConfirmationProps): string {
  const {
    orderRef,
    customerEmail,
    items,
    subtotal,
    shippingCost,
    discountAmount,
    total,
    couponCode,
    shippingAddress,
  } = props;

  const itemsRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #1e2d4a;color:#94a3b8;font-size:14px;">
          ${item.title}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #1e2d4a;color:#94a3b8;font-size:14px;text-align:center;">
          x${item.quantity}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #1e2d4a;color:#e2e8f0;font-size:14px;text-align:right;font-weight:600;">
          ${fmt(item.unit_price * item.quantity)}
        </td>
      </tr>`
    )
    .join("");

  const addressBlock =
    shippingAddress?.city
      ? `
    <div style="margin-top:20px;background:#0f172a;border:1px solid #1e2d4a;border-radius:8px;padding:16px;">
      <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px 0;">
        Adresse de livraison
      </p>
      ${shippingAddress.full_name ? `<p style="color:#e2e8f0;font-size:13px;margin:3px 0;font-weight:600;">${shippingAddress.full_name}</p>` : ""}
      <p style="color:#94a3b8;font-size:13px;margin:3px 0;">${shippingAddress.line1}</p>
      ${shippingAddress.line2 ? `<p style="color:#94a3b8;font-size:13px;margin:3px 0;">${shippingAddress.line2}</p>` : ""}
      <p style="color:#94a3b8;font-size:13px;margin:3px 0;">${shippingAddress.postal_code} ${shippingAddress.city}</p>
      <p style="color:#94a3b8;font-size:13px;margin:3px 0;">${shippingAddress.country}</p>
    </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Confirmation de commande - Fly Horizons Shop</title>
</head>
<body style="margin:0;padding:0;background:#060d1a;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#060d1a;padding:40px 20px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="text-align:center;padding-bottom:28px;">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#c9a84c;letter-spacing:0.05em;">
              FLY HORIZONS
            </h1>
            <p style="margin:4px 0 0;color:#64748b;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">
              Shop
            </p>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#0d1628;border:1px solid #1e2d4a;border-radius:12px;padding:32px;">

            <!-- Titre -->
            <div style="text-align:center;margin-bottom:24px;">
              <div style="width:52px;height:52px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);border-radius:50%;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;">
                <span style="color:#c9a84c;font-size:22px;font-weight:700;">&#10003;</span>
              </div>
              <h2 style="margin:0;color:#e2e8f0;font-size:20px;font-weight:600;">
                Commande confirmee !
              </h2>
              <p style="margin:6px 0 0;color:#64748b;font-size:13px;">
                Merci pour votre commande, ${customerEmail}
              </p>
            </div>

            <!-- Reference -->
            <div style="background:#0f172a;border:1px solid #1e2d4a;border-radius:8px;padding:14px;margin-bottom:24px;text-align:center;">
              <p style="margin:0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">
                Reference commande
              </p>
              <p style="margin:6px 0 0;color:#c9a84c;font-size:16px;font-weight:700;font-family:monospace;letter-spacing:0.05em;">
                #${orderRef}
              </p>
            </div>

            <!-- Articles -->
            <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;">
              Detail de la commande
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <th style="text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #1e2d4a;">Produit</th>
                <th style="text-align:center;color:#64748b;font-size:11px;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #1e2d4a;">Qte</th>
                <th style="text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #1e2d4a;">Prix</th>
              </tr>
              ${itemsRows}
            </table>

            <!-- Totaux -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
              <tr>
                <td style="color:#64748b;font-size:13px;padding:3px 0;">Sous-total</td>
                <td style="color:#94a3b8;font-size:13px;text-align:right;padding:3px 0;">${fmt(subtotal)}</td>
              </tr>
              <tr>
                <td style="color:#64748b;font-size:13px;padding:3px 0;">Livraison</td>
                <td style="color:#94a3b8;font-size:13px;text-align:right;padding:3px 0;">${shippingCost === 0 ? "Offerte" : fmt(shippingCost)}</td>
              </tr>
              ${discountAmount > 0 ? `
              <tr>
                <td style="color:#64748b;font-size:13px;padding:3px 0;">
                  Remise${couponCode ? ` (${couponCode})` : ""}
                </td>
                <td style="color:#22c55e;font-size:13px;text-align:right;padding:3px 0;">-${fmt(discountAmount)}</td>
              </tr>` : ""}
              <tr>
                <td style="color:#e2e8f0;font-size:15px;font-weight:700;padding:12px 0 0;border-top:1px solid #1e2d4a;">Total</td>
                <td style="color:#c9a84c;font-size:15px;font-weight:700;text-align:right;padding:12px 0 0;border-top:1px solid #1e2d4a;">${fmt(total)}</td>
              </tr>
            </table>

            ${addressBlock}

            <!-- CTA -->
            <div style="text-align:center;margin-top:28px;">
              <a
                href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://shop.fly-horizons.com"}/orders"
                style="display:inline-block;background:#c9a84c;color:#060d1a;font-size:14px;font-weight:700;padding:12px 28px;border-radius:6px;text-decoration:none;letter-spacing:0.02em;"
              >
                Voir mes commandes
              </a>
            </div>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="text-align:center;padding-top:24px;">
            <p style="color:#334155;font-size:12px;margin:0;">
              Fly Horizons Shop &mdash; shop.fly-horizons.com
            </p>
            <p style="color:#1e2d4a;font-size:11px;margin:4px 0 0;">
              Cet email a ete envoye automatiquement, merci de ne pas y repondre.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
