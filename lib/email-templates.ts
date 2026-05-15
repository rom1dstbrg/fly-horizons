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

interface OrderConfirmationProps {
  orderRef: string;
  customerEmail: string;
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

interface OrderProcessingProps {
  orderRef: string;
  customerName?: string;
}

interface OrderShippedProps {
  orderRef: string;
  customerName?: string;
  shippingAddress?: ShippingAddress;
}

function esc(str: string | null | undefined): string {
  return (str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmt(amount: number): string {
  return new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(amount);
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shop.fly-horizons.com";

function emailBase(bodyContent: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f8fc;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fc;padding:40px 20px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background:#0b2238;border-radius:10px 10px 0 0;padding:22px 32px;text-align:center;">
            <img src="https://fly-horizons.com/media/image/logo_mail.png" alt="Fly Horizons Shop"
              style="height:40px;width:auto;display:block;margin:0 auto;" />
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border:1px solid #e0e5ef;border-top:0;border-radius:0 0 10px 10px;padding:36px 32px;">
            ${bodyContent}
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-top:24px;padding-bottom:8px;">
            <p style="color:#64748b;font-size:12px;margin:0;">Fly Horizons Shop &mdash; shop.fly-horizons.com</p>
            <p style="color:#94a3b8;font-size:11px;margin:4px 0 0;">Une question ? R&eacute;pondez directement &agrave; cet email.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<div style="text-align:center;margin-top:32px;">
    <a href="${esc(href)}" style="display:inline-block;background:#F2B705;color:#113356;font-size:14px;font-weight:700;padding:13px 30px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;">${esc(label)}</a>
  </div>`;
}

function orderRefBox(ref: string): string {
  return `<div style="background:#f6f8fc;border:1px solid #e0e5ef;border-radius:10px;padding:14px;margin-bottom:28px;text-align:center;">
    <p style="margin:0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">R&eacute;f&eacute;rence commande</p>
    <p style="margin:6px 0 0;color:#F2B705;font-size:16px;font-weight:700;font-family:monospace;letter-spacing:0.05em;">#${esc(ref)}</p>
  </div>`;
}

// ─── Confirmation ───────────────────────────────────────────────────────────

export function orderConfirmationEmail(props: OrderConfirmationProps): string {
  const {
    orderRef, customerEmail, items, subtotal, shippingCost,
    discountAmount, total, couponCode, shippingAddress, orderDate,
  } = props;

  const invoiceDate = new Date(orderDate ?? Date.now()).toLocaleDateString("fr-BE", {
    day: "numeric", month: "long", year: "numeric",
  });

  // Items with thumbnails (confirmation section)
  const itemRows = items.map((item) => `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid #e0e5ef;vertical-align:middle;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${item.image_url ? `<td width="52" style="padding-right:12px;vertical-align:middle;">
              <img src="${esc(item.image_url)}" alt="" width="48" height="48"
                style="width:48px;height:48px;border-radius:6px;object-fit:cover;display:block;border:1px solid #e0e5ef;" />
            </td>` : ""}
            <td style="vertical-align:middle;">
              <p style="margin:0;font-size:14px;color:#1e2535;font-weight:600;">${esc(item.title)}</p>
              <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Qté : ${item.quantity}</p>
            </td>
          </tr>
        </table>
      </td>
      <td style="padding:11px 0;border-bottom:1px solid #e0e5ef;text-align:right;vertical-align:middle;font-size:14px;font-weight:700;color:#1e2535;white-space:nowrap;">
        ${fmt(item.unit_price * item.quantity)}
      </td>
    </tr>`).join("");

  const addressBlock = shippingAddress?.city ? `
    <div style="margin-top:24px;background:#f6f8fc;border:1px solid #e0e5ef;border-radius:10px;padding:16px;">
      <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px 0;">Adresse de livraison</p>
      ${shippingAddress.full_name ? `<p style="color:#1e2535;font-size:13px;margin:3px 0;font-weight:600;">${esc(shippingAddress.full_name)}</p>` : ""}
      ${shippingAddress.line1 ? `<p style="color:#64748b;font-size:13px;margin:3px 0;">${esc(shippingAddress.line1)}</p>` : ""}
      ${shippingAddress.line2 ? `<p style="color:#64748b;font-size:13px;margin:3px 0;">${esc(shippingAddress.line2)}</p>` : ""}
      <p style="color:#64748b;font-size:13px;margin:3px 0;">${esc(shippingAddress.postal_code ?? "")} ${esc(shippingAddress.city ?? "")}</p>
      ${shippingAddress.country ? `<p style="color:#64748b;font-size:13px;margin:3px 0;">${esc(shippingAddress.country)}</p>` : ""}
    </div>` : "";

  // Invoice items (no thumbnail, more compact)
  const invoiceItemRows = items.map((item) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #e8ecf4;font-size:13px;color:#1e2535;">${esc(item.title)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e8ecf4;font-size:13px;color:#64748b;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e8ecf4;font-size:13px;color:#64748b;text-align:right;white-space:nowrap;">${fmt(item.unit_price)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e8ecf4;font-size:13px;font-weight:600;color:#1e2535;text-align:right;white-space:nowrap;">${fmt(item.unit_price * item.quantity)}</td>
    </tr>`).join("");

  const addrBuyer = shippingAddress ? [
    shippingAddress.full_name ? `<p style="font-size:13px;color:#1e2535;font-weight:600;margin:0 0 2px;">${esc(shippingAddress.full_name)}</p>` : "",
    (shippingAddress.email ?? customerEmail) ? `<p style="font-size:12px;color:#64748b;margin:1px 0;">${esc(shippingAddress.email ?? customerEmail)}</p>` : "",
    shippingAddress.line1 ? `<p style="font-size:12px;color:#64748b;margin:1px 0;">${esc(shippingAddress.line1)}</p>` : "",
    shippingAddress.line2 ? `<p style="font-size:12px;color:#64748b;margin:1px 0;">${esc(shippingAddress.line2)}</p>` : "",
    (shippingAddress.postal_code || shippingAddress.city) ? `<p style="font-size:12px;color:#64748b;margin:1px 0;">${esc([shippingAddress.postal_code, shippingAddress.city].filter(Boolean).join(" "))}</p>` : "",
    shippingAddress.country ? `<p style="font-size:12px;color:#64748b;margin:1px 0;">${esc(shippingAddress.country)}</p>` : "",
  ].filter(Boolean).join("") : `<p style="font-size:12px;color:#64748b;margin:0;">${esc(customerEmail)}</p>`;

  const body = `
    <!-- Icone + titre -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="width:52px;height:52px;background:rgba(242,183,5,.12);border:1.5px solid rgba(242,183,5,.4);border-radius:50%;margin:0 auto 14px;line-height:52px;text-align:center;">
        <span style="color:#F2B705;font-size:22px;font-weight:700;">&#10003;</span>
      </div>
      <h2 style="margin:0;color:#1e2535;font-size:20px;font-weight:700;">Commande confirm&eacute;e !</h2>
      <p style="margin:6px 0 0;color:#64748b;font-size:13px;">Merci pour votre commande, nous l&apos;avons bien re&ccedil;ue.</p>
    </div>

    ${orderRefBox(orderRef)}

    <!-- Articles -->
    <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;">D&eacute;tail de la commande</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <th style="text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #e0e5ef;font-weight:600;">Produit</th>
        <th style="text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #e0e5ef;font-weight:600;">Prix</th>
      </tr>
      ${itemRows}
    </table>

    <!-- Totaux -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
      <tr>
        <td style="color:#64748b;font-size:13px;padding:4px 0;">Sous-total</td>
        <td style="color:#1e2535;font-size:13px;text-align:right;padding:4px 0;">${fmt(subtotal)}</td>
      </tr>
      <tr>
        <td style="color:#64748b;font-size:13px;padding:4px 0;">Livraison</td>
        <td style="color:#1e2535;font-size:13px;text-align:right;padding:4px 0;">${shippingCost === 0 ? "Offerte" : fmt(shippingCost)}</td>
      </tr>
      ${discountAmount > 0 ? `<tr>
        <td style="color:#64748b;font-size:13px;padding:4px 0;">Remise${couponCode ? ` (${esc(couponCode)})` : ""}</td>
        <td style="color:#16a34a;font-size:13px;text-align:right;padding:4px 0;">-${fmt(discountAmount)}</td>
      </tr>` : ""}
      <tr>
        <td style="color:#113356;font-size:15px;font-weight:700;padding:14px 0 0;border-top:1px solid #e0e5ef;">Total</td>
        <td style="color:#F2B705;font-size:15px;font-weight:700;text-align:right;padding:14px 0 0;border-top:1px solid #e0e5ef;">${fmt(total)}</td>
      </tr>
    </table>

    ${addressBlock}
    ${ctaButton(`${SITE_URL}/orders`, "Voir mes commandes")}

    <!-- Séparateur facture -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:40px 0 0;">
      <tr><td style="border-top:2px dashed #e0e5ef;padding:0;height:0;"></td></tr>
    </table>

    <!-- FACTURE -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
      <tr>
        <td style="background:#f6f8fc;border:1px solid #e0e5ef;border-radius:10px;padding:22px 24px;">

          <!-- En-tête facture -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:top;">
                <p style="font-size:18px;font-weight:700;color:#1e2535;margin:0 0 3px;letter-spacing:0.04em;">FACTURE</p>
                <p style="font-size:12px;color:#64748b;margin:0;">N&deg; FAC-${esc(orderRef)}</p>
              </td>
              <td style="text-align:right;vertical-align:top;">
                <p style="font-size:12px;color:#64748b;margin:0 0 2px;">Date : ${invoiceDate}</p>
                <p style="font-size:12px;color:#64748b;margin:0;">Paiement : Carte bancaire</p>
              </td>
            </tr>
          </table>

          <!-- Vendeur / Acheteur -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border-top:1px solid #e0e5ef;padding-top:16px;">
            <tr>
              <td width="50%" style="vertical-align:top;padding-right:16px;">
                <p style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">Vendeur</p>
                <p style="font-size:13px;color:#1e2535;font-weight:600;margin:0 0 2px;">Fly Horizons Shop</p>
                <p style="font-size:12px;color:#64748b;margin:1px 0;">shop.fly-horizons.com</p>
                <p style="font-size:12px;color:#64748b;margin:1px 0;">info@fly-horizons.com</p>
              </td>
              <td width="50%" style="vertical-align:top;">
                <p style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">Acheteur</p>
                ${addrBuyer}
              </td>
            </tr>
          </table>

          <!-- Tableau articles -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border-top:1px solid #e0e5ef;padding-top:16px;">
            <tr>
              <th style="text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #e0e5ef;font-weight:600;">Description</th>
              <th style="text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #e0e5ef;font-weight:600;width:36px;">Qt&eacute;</th>
              <th style="text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #e0e5ef;font-weight:600;width:80px;">P.U.</th>
              <th style="text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #e0e5ef;font-weight:600;width:80px;">Total</th>
            </tr>
            ${invoiceItemRows}
          </table>

          <!-- Totaux facture -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            <tr>
              <td style="color:#64748b;font-size:13px;padding:3px 0;">Sous-total</td>
              <td style="color:#1e2535;font-size:13px;text-align:right;padding:3px 0;white-space:nowrap;">${fmt(subtotal)}</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-size:13px;padding:3px 0;">Frais de livraison</td>
              <td style="color:#1e2535;font-size:13px;text-align:right;padding:3px 0;white-space:nowrap;">${shippingCost === 0 ? "Offerts" : fmt(shippingCost)}</td>
            </tr>
            ${discountAmount > 0 ? `<tr>
              <td style="color:#64748b;font-size:13px;padding:3px 0;">Remise${couponCode ? ` (${esc(couponCode)})` : ""}</td>
              <td style="color:#16a34a;font-size:13px;text-align:right;padding:3px 0;white-space:nowrap;">-${fmt(discountAmount)}</td>
            </tr>` : ""}
            <tr>
              <td style="color:#113356;font-size:14px;font-weight:700;padding:10px 0 0;border-top:1px solid #e0e5ef;">Total TTC</td>
              <td style="color:#113356;font-size:14px;font-weight:700;text-align:right;padding:10px 0 0;border-top:1px solid #e0e5ef;white-space:nowrap;">${fmt(total)}</td>
            </tr>
          </table>

          <p style="font-size:11px;color:#94a3b8;margin:14px 0 0;">TVA non applicable &mdash; Art. 293bis CTVA</p>
        </td>
      </tr>
    </table>`;

  return emailBase(body, `Confirmation de commande #${orderRef} - Fly Horizons Shop`);
}

// ─── En cours de traitement ──────────────────────────────────────────────────

export function orderProcessingEmail(props: OrderProcessingProps): string {
  const { orderRef, customerName } = props;

  const body = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="width:52px;height:52px;background:rgba(99,102,241,.12);border:1.5px solid rgba(99,102,241,.4);border-radius:50%;margin:0 auto 14px;line-height:52px;text-align:center;">
        <span style="color:#6366f1;font-size:20px;font-weight:700;">&#9881;</span>
      </div>
      <h2 style="margin:0;color:#1e2535;font-size:20px;font-weight:700;">Commande en pr&eacute;paration</h2>
      <p style="margin:6px 0 0;color:#64748b;font-size:13px;">
        ${customerName ? `Bonjour ${esc(customerName)}, votre` : "Votre"} commande est en cours de traitement.
      </p>
    </div>

    ${orderRefBox(orderRef)}

    <div style="background:#f0f0ff;border:1px solid #c7d2fe;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0;font-size:14px;color:#3730a3;line-height:1.6;">
        Nous pr&eacute;parons votre commande avec soin. Vous recevrez un email d&egrave;s qu&rsquo;elle est d&eacute;pos&eacute;e &agrave; la poste.
      </p>
    </div>

    ${ctaButton(`${SITE_URL}/orders`, "Suivre mes commandes")}`;

  return emailBase(body, `Votre commande #${orderRef} est en préparation`);
}

// ─── Expédiée ────────────────────────────────────────────────────────────────

export function orderShippedEmail(props: OrderShippedProps): string {
  const { orderRef, customerName, shippingAddress } = props;

  const addrBlock = shippingAddress?.city ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr>
        <td style="background:#f6f8fc;border:1px solid #e0e5ef;border-radius:10px;padding:16px;">
          <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px 0;">Adresse de livraison</p>
          ${shippingAddress.full_name ? `<p style="color:#1e2535;font-size:13px;margin:3px 0;font-weight:600;">${esc(shippingAddress.full_name)}</p>` : ""}
          ${shippingAddress.line1 ? `<p style="color:#64748b;font-size:13px;margin:3px 0;">${esc(shippingAddress.line1)}</p>` : ""}
          ${shippingAddress.line2 ? `<p style="color:#64748b;font-size:13px;margin:3px 0;">${esc(shippingAddress.line2)}</p>` : ""}
          <p style="color:#64748b;font-size:13px;margin:3px 0;">${esc(shippingAddress.postal_code ?? "")} ${esc(shippingAddress.city ?? "")}</p>
          ${shippingAddress.country ? `<p style="color:#64748b;font-size:13px;margin:3px 0;">${esc(shippingAddress.country)}</p>` : ""}
        </td>
      </tr>
    </table>` : "";

  const body = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="width:52px;height:52px;background:rgba(139,92,246,.12);border:1.5px solid rgba(139,92,246,.4);border-radius:50%;margin:0 auto 14px;line-height:52px;text-align:center;">
        <span style="color:#8b5cf6;font-size:22px;">&#9993;</span>
      </div>
      <h2 style="margin:0;color:#1e2535;font-size:20px;font-weight:700;">Votre colis est en route !</h2>
      <p style="margin:6px 0 0;color:#64748b;font-size:13px;">
        ${customerName ? `Bonjour ${esc(customerName)}, votre` : "Votre"} commande a &eacute;t&eacute; d&eacute;pos&eacute;e au bureau de poste.
      </p>
    </div>

    ${orderRefBox(orderRef)}

    <div style="background:#faf5ff;border:1px solid #ddd6fe;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#6d28d9;line-height:1.6;">
        &#128230; Votre colis a &eacute;t&eacute; d&eacute;pos&eacute; au bureau de poste et est d&eacute;sormais en chemin vers vous. La livraison prend g&eacute;n&eacute;ralement 2&ndash;5 jours ouvrables selon votre pays.
      </p>
    </div>

    ${addrBlock}
    ${ctaButton(`${SITE_URL}/orders`, "Voir mes commandes")}`;

  return emailBase(body, `Votre commande #${orderRef} est expédiée !`);
}

// ─── Voucher(s) de vol ───────────────────────────────────────────────────────

export interface VoucherEmailCode {
  code: string;
  duration_minutes: number;
  product_title: string;
}

interface VoucherEmailProps {
  orderRef: string;
  customerName?: string;
  codes: VoucherEmailCode[];
}

function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h} heure${h > 1 ? "s" : ""}`;
}

export function voucherEmail(props: VoucherEmailProps): string {
  const { orderRef, customerName, codes } = props;

  const codeCards = codes.map((c) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="background:#0b2238;border:2px solid #F2B705;border-radius:12px;padding:28px 24px;text-align:center;">
          <p style="color:#F2B705;font-size:10px;text-transform:uppercase;letter-spacing:0.25em;margin:0 0 10px;font-weight:600;">
            &#9992;&nbsp;&nbsp;VOUCHER &mdash; FLY HORIZONS&nbsp;&nbsp;&#9992;
          </p>
          <p style="color:#ffffff;font-size:38px;font-weight:800;margin:0 0 6px;letter-spacing:-0.02em;line-height:1;">
            ${esc(fmtDuration(c.duration_minutes))}
          </p>
          <p style="color:#94a3b8;font-size:13px;margin:0 0 24px;">${esc(c.product_title)}</p>
          <table align="center" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:rgba(242,183,5,0.1);border:1.5px solid rgba(242,183,5,0.5);border-radius:8px;padding:12px 24px;">
                <p style="color:#F2B705;font-size:24px;font-weight:700;font-family:Courier New,monospace;letter-spacing:0.12em;margin:0;">${esc(c.code)}</p>
              </td>
            </tr>
          </table>
          <p style="color:#64748b;font-size:11px;margin:16px 0 0;">Votre code de r&eacute;servation</p>
        </td>
      </tr>
    </table>`).join("");

  const body = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="width:52px;height:52px;background:rgba(242,183,5,.12);border:1.5px solid rgba(242,183,5,.4);border-radius:50%;margin:0 auto 14px;line-height:52px;text-align:center;">
        <span style="color:#F2B705;font-size:24px;">&#9992;</span>
      </div>
      <h2 style="margin:0;color:#1e2535;font-size:20px;font-weight:700;">
        ${codes.length > 1 ? "Vos vouchers sont prêts !" : "Votre voucher est prêt !"}
      </h2>
      <p style="margin:6px 0 0;color:#64748b;font-size:13px;">
        ${customerName ? `Bonjour ${esc(customerName)}, m` : "M"}erci pour votre achat — ref. #${esc(orderRef)}
      </p>
    </div>

    ${codeCards}

    <div style="background:#f6f8fc;border:1px solid #e0e5ef;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
      <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;font-weight:600;">Comment utiliser votre bon ?</p>
      <ol style="margin:0;padding-left:18px;color:#1e2535;font-size:13px;line-height:1.8;">
        <li>Rendez-vous sur <strong>fly-horizons.com</strong> pour r&eacute;server votre vol</li>
        <li>S&eacute;lectionnez votre cr&eacute;neau et entrez votre code lors de la r&eacute;servation</li>
        <li>Le temps de vol sera d&eacute;duit automatiquement</li>
      </ol>
    </div>

    ${ctaButton("https://fly-horizons.com", "Réserver mon vol")}

    <p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:20px;">
      Conservez cet email &mdash; il vous servira lors de la r&eacute;servation.
    </p>`;

  return emailBase(body, `Vos vouchers Fly Horizons — #${orderRef}`);
}

// ─── Vol sur mesure — devis + lien de paiement ───────────────────────────────

export interface VolSurMesureQuoteEmailProps {
  prenom: string;
  nom: string;
  date: string;
  heure: string;
  dureMin: number;
  distKm: number;
  nbWaypoints: number;
  stopovers: Array<{ icao: string; nom: string; taxe: number }>;
  prixEstime: number;
  discount: number;
  prixBillable: number;
  acompte: number;
  taxesEscales: number;
  totalAcompte: number;
  voucherCode: string | null;
  paymentUrl: string | null;
}

export function volSurMesureQuoteEmail(props: VolSurMesureQuoteEmailProps): string {
  const {
    prenom, nom, date, heure, dureMin, distKm, nbWaypoints, stopovers,
    prixEstime, discount, prixBillable, acompte, taxesEscales, totalAcompte,
    voucherCode, paymentUrl,
  } = props;

  const dateStr = new Date(date + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const stopoverRow = stopovers.length > 0
    ? `<tr>
        <td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #e8ecf4;">Escale(s)</td>
        <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1e2535;border-bottom:1px solid #e8ecf4;text-align:right;">
          ${esc(stopovers.map(s => s.icao).join(", "))}
        </td>
      </tr>`
    : "";

  const voucherRow = discount > 0
    ? `<tr>
        <td style="padding:8px 0;font-size:13px;color:#16a34a;border-bottom:1px solid #e8ecf4;">
          Voucher <span style="font-family:monospace;font-size:12px;">${esc(voucherCode ?? "")}</span>
        </td>
        <td style="padding:8px 0;font-size:13px;font-weight:600;color:#16a34a;border-bottom:1px solid #e8ecf4;text-align:right;">
          &minus;${prixEstime - prixBillable}&nbsp;&euro;
        </td>
      </tr>`
    : "";

  const taxesRow = taxesEscales > 0
    ? `<tr>
        <td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #e8ecf4;">Taxes d&apos;atterrissage</td>
        <td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #e8ecf4;text-align:right;">+${taxesEscales}&nbsp;&euro;</td>
      </tr>`
    : "";

  const ctaSection = paymentUrl
    ? `<div style="background:#f0f7ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:24px;margin:28px 0;text-align:center;">
        <p style="margin:0 0 6px;font-size:13px;color:#1e40af;font-weight:600;">Acompte &agrave; r&eacute;gler</p>
        <p style="margin:0 0 20px;font-size:32px;font-weight:800;color:#113356;">${totalAcompte}&nbsp;&euro;</p>
        <p style="margin:0 0 20px;font-size:12px;color:#64748b;">
          Payez votre acompte en ligne pour confirmer votre r&eacute;servation.<br>
          Le solde sera r&eacute;gl&eacute; apr&egrave;s votre vol selon la dur&eacute;e r&eacute;elle.
        </p>
        ${ctaButton(paymentUrl, `Payer mon acompte — ${totalAcompte} €`)}
        <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;">
          Paiement s&eacute;curis&eacute; par Stripe &mdash; carte bancaire
        </p>
      </div>`
    : `<div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:24px;margin:28px 0;text-align:center;">
        <p style="margin:0 0 8px;font-size:22px;">&#10003;</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:#15803d;">Votre vol est enti&egrave;rement couvert par votre voucher.</p>
        <p style="margin:8px 0 0;font-size:12px;color:#64748b;">Aucun paiement n&apos;est requis. Nous vous recontacterons sous 24h.</p>
      </div>`;

  const body = `
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#113356;border-radius:12px;padding:14px 20px;margin-bottom:16px;">
        <span style="color:#F2B705;font-size:28px;">&#9992;</span>
      </div>
      <h2 style="margin:0 0 6px;color:#1e2535;font-size:22px;font-weight:800;">
        Votre vol sur mesure
      </h2>
      <p style="margin:0;color:#64748b;font-size:14px;">
        Bonjour <strong>${esc(prenom)}</strong>, voici le r&eacute;capitulatif de votre demande.
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e0e5ef;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 14px;font-weight:600;">D&eacute;tails du vol</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #e8ecf4;">Date souhait&eacute;e</td>
              <td style="padding:8px 0;font-size:13px;font-weight:700;color:#1e2535;border-bottom:1px solid #e8ecf4;text-align:right;text-transform:capitalize;">${esc(dateStr)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #e8ecf4;">Heure de d&eacute;part</td>
              <td style="padding:8px 0;font-size:13px;font-weight:700;color:#1e2535;border-bottom:1px solid #e8ecf4;text-align:right;">${esc(heure)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #e8ecf4;">D&eacute;part / retour</td>
              <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1e2535;border-bottom:1px solid #e8ecf4;text-align:right;">Charleroi EBCI</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #e8ecf4;">Itin&eacute;raire</td>
              <td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #e8ecf4;text-align:right;">
                ~${dureMin}&nbsp;min &middot; ${distKm}&nbsp;km &middot; ${nbWaypoints}&nbsp;point${nbWaypoints > 1 ? "s" : ""}
              </td>
            </tr>
            ${stopoverRow}
          </table>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e0e5ef;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 14px;font-weight:600;">D&eacute;tail du prix</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #e8ecf4;">Prix estim&eacute; du vol (~${dureMin}&nbsp;min)</td>
              <td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #e8ecf4;text-align:right;">${prixEstime}&nbsp;&euro;</td>
            </tr>
            ${voucherRow}
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #e8ecf4;">Montant facturable</td>
              <td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #e8ecf4;text-align:right;">${prixBillable}&nbsp;&euro;</td>
            </tr>
            <tr>
              <td style="padding:10px 0 4px;font-size:13px;font-weight:700;color:#1e2535;">
                Acompte demand&eacute; <span style="font-weight:400;font-size:11px;color:#94a3b8;">(confirm. r&eacute;servation)</span>
              </td>
              <td style="padding:10px 0 4px;font-size:15px;font-weight:800;color:#113356;text-align:right;">${acompte}&nbsp;&euro;</td>
            </tr>
            ${taxesRow}
          </table>
          <p style="margin:12px 0 0;font-size:11px;color:#94a3b8;line-height:1.6;">
            Le solde (diff&eacute;rence entre la dur&eacute;e r&eacute;elle et l&apos;acompte) est r&eacute;gl&eacute; apr&egrave;s le vol.
          </p>
        </td>
      </tr>
    </table>

    ${ctaSection}

    <p style="font-size:13px;color:#64748b;line-height:1.7;margin:0 0 8px;">
      Des questions ? R&eacute;pondez directement &agrave; cet email ou contactez-nous &agrave;
      <a href="mailto:info@fly-horizons.com" style="color:#113356;font-weight:600;">info@fly-horizons.com</a>.
    </p>
    <p style="font-size:13px;color:#64748b;margin:0;">
      &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord !<br>
      <strong style="color:#113356;">L&apos;&eacute;quipe Fly Horizons</strong>
    </p>`;

  return emailBase(body, `Votre vol sur mesure — ${dateStr}`);
}

// ─── Contact ─────────────────────────────────────────────────────────────────

export interface ContactNotificationProps {
  nom: string;
  email: string;
  sujet: string;
  message: string;
}

export function contactNotificationEmail({ nom, email, sujet, message }: ContactNotificationProps): string {
  const body = `
    <h2 style="margin:0 0 20px;color:#1e2535;font-size:20px;font-weight:700;">Nouveau message de contact</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e5ef;border-radius:10px;overflow:hidden;margin-bottom:24px;">
      <tr style="background:#f6f8fc;">
        <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;width:90px;">Nom</td>
        <td style="padding:10px 16px;font-size:13px;color:#1e2535;font-weight:600;">${esc(nom)}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;border-top:1px solid #e0e5ef;">Email</td>
        <td style="padding:10px 16px;font-size:13px;border-top:1px solid #e0e5ef;"><a href="mailto:${esc(email)}" style="color:#113356;font-weight:600;">${esc(email)}</a></td>
      </tr>
      <tr style="background:#f6f8fc;">
        <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;border-top:1px solid #e0e5ef;">Sujet</td>
        <td style="padding:10px 16px;font-size:13px;color:#1e2535;border-top:1px solid #e0e5ef;">${esc(sujet)}</td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Message</p>
    <div style="background:#f6f8fc;border:1px solid #e0e5ef;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0;font-size:13px;color:#1e2535;line-height:1.7;white-space:pre-wrap;">${esc(message)}</p>
    </div>
    ${ctaButton(`${SITE_URL}/admin/contacts`, "Voir dans l'admin")}`;

  return emailBase(body, "Nouveau message de contact — Fly Horizons");
}

export interface ContactAcknowledgmentProps {
  nom: string;
  email: string;
  sujet: string;
}

export function contactAcknowledgmentEmail({ nom, sujet }: ContactAcknowledgmentProps): string {
  const body = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="width:52px;height:52px;background:rgba(17,51,86,.1);border:1.5px solid rgba(17,51,86,.3);border-radius:50%;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;line-height:52px;">
        <span style="color:#113356;font-size:22px;">&#10003;</span>
      </div>
      <h2 style="margin:0 0 6px;color:#1e2535;font-size:20px;font-weight:700;">Message bien reçu</h2>
      <p style="margin:0;color:#64748b;font-size:13px;">Nous vous répondrons sous 48&nbsp;h ouvrables.</p>
    </div>
    <p style="font-size:14px;color:#1e2535;margin:0 0 16px;">Bonjour <strong>${esc(nom)}</strong>,</p>
    <p style="font-size:14px;color:#64748b;line-height:1.7;margin:0 0 20px;">
      Merci pour votre message concernant <strong style="color:#1e2535;">${esc(sujet)}</strong>.
      Nous l&apos;avons bien reçu et vous répondrons dans les meilleurs délais.
    </p>
    <p style="font-size:14px;color:#64748b;line-height:1.7;margin:0 0 28px;">
      En attendant, n&apos;hésitez pas à explorer nos vols disponibles.
    </p>
    ${ctaButton(`${SITE_URL}/packs`, "Voir nos vols")}
    <p style="font-size:13px;color:#64748b;margin:28px 0 0;text-align:center;">
      <strong style="color:#113356;">L&apos;équipe Fly Horizons</strong>
    </p>`;

  return emailBase(body, "Votre message a été reçu — Fly Horizons");
}

export interface ContactReplyProps {
  nom: string;
  email: string;
  sujet: string;
  reponse: string;
}

export function contactReplyEmail({ nom, sujet, reponse }: ContactReplyProps): string {
  const body = `
    <h2 style="margin:0 0 6px;color:#1e2535;font-size:20px;font-weight:700;">Réponse à votre message</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:13px;">Concernant : <strong style="color:#1e2535;">${esc(sujet)}</strong></p>
    <p style="font-size:14px;color:#1e2535;margin:0 0 16px;">Bonjour <strong>${esc(nom)}</strong>,</p>
    <p style="font-size:14px;color:#64748b;margin:0 0 20px;line-height:1.7;">
      Voici notre réponse à votre demande :
    </p>
    <div style="background:#f0f7ff;border-left:4px solid #113356;border-radius:0 10px 10px 0;padding:18px 24px;margin:0 0 28px;">
      <p style="margin:0;font-size:14px;color:#1e2535;line-height:1.7;white-space:pre-wrap;">${esc(reponse)}</p>
    </div>
    <p style="font-size:13px;color:#64748b;line-height:1.7;margin:0 0 8px;">
      Des questions supplémentaires ? Répondez directement à cet email.
    </p>
    ${ctaButton(`${SITE_URL}/contact`, "Nous recontacter")}
    <p style="font-size:13px;color:#64748b;margin:28px 0 0;text-align:center;">
      <strong style="color:#113356;">L&apos;équipe Fly Horizons</strong>
    </p>`;

  return emailBase(body, `Réponse de Fly Horizons — ${sujet}`);
}
