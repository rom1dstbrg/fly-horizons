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

export function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http://localhost")
  ? process.env.NEXT_PUBLIC_SITE_URL
  : "https://fly-horizons.com";
const LOGO_URL = "https://fly-horizons.com/logo-email.png";

// ── Base ─────────────────────────────────────────────────────────────────────
// bgcolor attributes + !important garantissent le fond clair même en dark mode

function emailBase(bodyContent: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(title)}</title>
<style>
  :root { color-scheme: light; }
  html, body { color-scheme: light !important; background-color: #f6f8fc !important; }
  @media (prefers-color-scheme: dark) {
    html, body { color-scheme: light !important; background-color: #f6f8fc !important; }
    table, td, th { color-scheme: light !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f6f8fc;font-family:'Segoe UI',Arial,sans-serif;color-scheme:light;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f6f8fc" style="background-color:#f6f8fc;padding:32px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Logo header -->
        <tr>
          <td bgcolor="#0b2238" style="background-color:#0b2238;border-radius:12px 12px 0 0;padding:22px 32px;text-align:center;">
            <img src="${LOGO_URL}" alt="Fly Horizons" width="180"
              style="display:block;margin:0 auto;width:180px;height:auto;border:0;outline:none;text-decoration:none;" />
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid #e0e5ef;border-top:none;border-radius:0 0 12px 12px;padding:36px 32px;">
            ${bodyContent}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="text-align:center;padding:20px 0 8px;">
            <p style="color:#64748b;font-size:12px;margin:0 0 4px;">Fly Horizons &mdash; <a href="https://fly-horizons.com" style="color:#64748b;text-decoration:none;">fly-horizons.com</a></p>
            <p style="color:#94a3b8;font-size:11px;margin:0;">Une question ? R&eacute;pondez directement &agrave; cet email &mdash; <a href="mailto:info@fly-horizons.com" style="color:#94a3b8;">info@fly-horizons.com</a></p>
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
  return `<div style="text-align:center;margin-top:28px;">
    <a href="${esc(href)}" style="display:inline-block;background-color:#F2B705;color:#113356;font-size:14px;font-weight:700;padding:13px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;">${esc(label)}</a>
  </div>`;
}

function orderRefBox(ref: string): string {
  return `<div style="background-color:#f6f8fc;border:1px solid #e0e5ef;border-radius:10px;padding:14px;margin-bottom:28px;text-align:center;">
    <p style="margin:0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">R&eacute;f&eacute;rence</p>
    <p style="margin:6px 0 0;color:#F2B705;font-size:17px;font-weight:700;font-family:monospace;letter-spacing:0.05em;">#${esc(ref)}</p>
  </div>`;
}

function flightInfoBox(rows: Array<[string, string]>): string {
  const rowsHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #e8ecf4;width:140px;">${esc(label)}</td>
      <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1e2535;border-bottom:1px solid #e8ecf4;text-align:right;">${value}</td>
    </tr>`).join("");

  return `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e0e5ef;border-radius:12px;margin-bottom:24px;">
    <tr>
      <td style="padding:20px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
      </td>
    </tr>
  </table>`;
}

function infoCallout(color: string, bgColor: string, borderColor: string, content: string): string {
  return `<div style="background-color:${bgColor};border:1.5px solid ${borderColor};border-radius:10px;padding:18px 20px;margin-bottom:20px;">
    <p style="margin:0;font-size:13px;color:${color};line-height:1.65;">${content}</p>
  </div>`;
}

// ─── 1. Confirmation commande shop ───────────────────────────────────────────

export function orderConfirmationEmail(props: OrderConfirmationProps): string {
  const {
    orderRef, customerEmail, customerName, items, subtotal, shippingCost,
    discountAmount, total, couponCode, shippingAddress, orderDate,
  } = props;

  const invoiceDate = new Date(orderDate ?? Date.now()).toLocaleDateString("fr-BE", {
    day: "numeric", month: "long", year: "numeric",
  });

  const itemRows = items.map((item) => `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid #e0e5ef;vertical-align:middle;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          ${item.image_url ? `<td width="52" style="padding-right:12px;vertical-align:middle;">
            <img src="${esc(item.image_url)}" alt="" width="48" height="48"
              style="width:48px;height:48px;border-radius:6px;object-fit:cover;display:block;border:1px solid #e0e5ef;" />
          </td>` : ""}
          <td style="vertical-align:middle;">
            <p style="margin:0;font-size:14px;color:#1e2535;font-weight:600;">${esc(item.title)}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Qté : ${item.quantity}</p>
          </td>
        </tr></table>
      </td>
      <td style="padding:11px 0;border-bottom:1px solid #e0e5ef;text-align:right;vertical-align:middle;font-size:14px;font-weight:700;color:#1e2535;white-space:nowrap;">${fmt(item.unit_price * item.quantity)}</td>
    </tr>`).join("");

  const addressBlock = shippingAddress?.city ? `
    <div style="margin-top:24px;background-color:#f6f8fc;border:1px solid #e0e5ef;border-radius:10px;padding:16px;">
      <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px 0;">Adresse de livraison</p>
      ${shippingAddress.full_name ? `<p style="color:#1e2535;font-size:13px;margin:3px 0;font-weight:600;">${esc(shippingAddress.full_name)}</p>` : ""}
      ${shippingAddress.line1 ? `<p style="color:#64748b;font-size:13px;margin:3px 0;">${esc(shippingAddress.line1)}</p>` : ""}
      ${shippingAddress.line2 ? `<p style="color:#64748b;font-size:13px;margin:3px 0;">${esc(shippingAddress.line2)}</p>` : ""}
      <p style="color:#64748b;font-size:13px;margin:3px 0;">${esc(shippingAddress.postal_code ?? "")} ${esc(shippingAddress.city ?? "")}</p>
      ${shippingAddress.country ? `<p style="color:#64748b;font-size:13px;margin:3px 0;">${esc(shippingAddress.country)}</p>` : ""}
    </div>` : "";

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
    <div style="text-align:center;margin-bottom:28px;">
      <div style="width:52px;height:52px;background-color:#f0fdf4;border:1.5px solid #86efac;border-radius:50%;margin:0 auto 14px;display:table-cell;vertical-align:middle;text-align:center;width:52px;height:52px;">
        <span style="color:#16a34a;font-size:24px;font-weight:700;line-height:52px;display:block;">&#10003;</span>
      </div>
      <h2 style="margin:0;color:#1e2535;font-size:20px;font-weight:700;">Commande confirm&eacute;e !</h2>
      <p style="margin:6px 0 0;color:#64748b;font-size:13px;">${customerName ? `Merci ${esc(customerName)}, nous` : "Nous"} avons bien re&ccedil;u votre commande.</p>
    </div>

    ${orderRefBox(orderRef)}

    <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;">D&eacute;tail de la commande</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <th style="text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #e0e5ef;font-weight:600;">Produit</th>
        <th style="text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #e0e5ef;font-weight:600;">Prix</th>
      </tr>
      ${itemRows}
    </table>
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

    <!-- Facture -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:40px 0 0;">
      <tr><td style="border-top:2px dashed #e0e5ef;height:0;padding:0;"></td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
      <tr>
        <td bgcolor="#f6f8fc" style="background-color:#f6f8fc;border:1px solid #e0e5ef;border-radius:10px;padding:22px 24px;">
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
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border-top:1px solid #e0e5ef;padding-top:16px;">
            <tr>
              <td width="50%" style="vertical-align:top;padding-right:16px;">
                <p style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">Vendeur</p>
                <p style="font-size:13px;color:#1e2535;font-weight:600;margin:0 0 2px;">Fly Horizons</p>
                <p style="font-size:12px;color:#64748b;margin:1px 0;">fly-horizons.com</p>
                <p style="font-size:12px;color:#64748b;margin:1px 0;">info@fly-horizons.com</p>
              </td>
              <td width="50%" style="vertical-align:top;">
                <p style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">Acheteur</p>
                ${addrBuyer}
              </td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border-top:1px solid #e0e5ef;padding-top:16px;">
            <tr>
              <th style="text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #e0e5ef;font-weight:600;">Description</th>
              <th style="text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #e0e5ef;font-weight:600;width:36px;">Qt&eacute;</th>
              <th style="text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #e0e5ef;font-weight:600;width:80px;">P.U.</th>
              <th style="text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #e0e5ef;font-weight:600;width:80px;">Total</th>
            </tr>
            ${invoiceItemRows}
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            <tr><td style="color:#64748b;font-size:13px;padding:3px 0;">Sous-total</td><td style="color:#1e2535;font-size:13px;text-align:right;white-space:nowrap;">${fmt(subtotal)}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:3px 0;">Frais de livraison</td><td style="color:#1e2535;font-size:13px;text-align:right;white-space:nowrap;">${shippingCost === 0 ? "Offerts" : fmt(shippingCost)}</td></tr>
            ${discountAmount > 0 ? `<tr><td style="color:#64748b;font-size:13px;padding:3px 0;">Remise${couponCode ? ` (${esc(couponCode)})` : ""}</td><td style="color:#16a34a;font-size:13px;text-align:right;white-space:nowrap;">-${fmt(discountAmount)}</td></tr>` : ""}
            <tr><td style="color:#113356;font-size:14px;font-weight:700;padding:10px 0 0;border-top:1px solid #e0e5ef;">Total TTC</td><td style="color:#113356;font-size:14px;font-weight:700;text-align:right;padding:10px 0 0;border-top:1px solid #e0e5ef;white-space:nowrap;">${fmt(total)}</td></tr>
          </table>
          <p style="font-size:11px;color:#94a3b8;margin:14px 0 0;">TVA non applicable &mdash; Art. 293bis CTVA</p>
        </td>
      </tr>
    </table>`;

  return emailBase(body, `Confirmation de commande #${orderRef} - Fly Horizons`);
}

// ─── 2. Commande en préparation ──────────────────────────────────────────────

export function orderProcessingEmail(props: OrderProcessingProps): string {
  const { orderRef, customerName } = props;
  const body = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="width:52px;height:52px;background-color:#eff6ff;border:1.5px solid #93c5fd;border-radius:50%;margin:0 auto 14px;text-align:center;">
        <span style="color:#2563eb;font-size:22px;font-weight:700;line-height:52px;display:block;">&#9881;</span>
      </div>
      <h2 style="margin:0;color:#1e2535;font-size:20px;font-weight:700;">Commande en pr&eacute;paration</h2>
      <p style="margin:6px 0 0;color:#64748b;font-size:13px;">${customerName ? `Bonjour ${esc(customerName)}, votre` : "Votre"} commande est en cours de traitement.</p>
    </div>
    ${orderRefBox(orderRef)}
    ${infoCallout("#1d4ed8", "#eff6ff", "#bfdbfe", "Nous pr&eacute;parons votre commande avec soin. Vous recevrez un email d&egrave;s qu&rsquo;elle est d&eacute;pos&eacute;e &agrave; la poste.")}
    ${ctaButton(`${SITE_URL}/orders`, "Suivre mes commandes")}`;
  return emailBase(body, `Votre commande #${orderRef} est en préparation`);
}

// ─── 3. Commande expédiée ────────────────────────────────────────────────────

export function orderShippedEmail(props: OrderShippedProps): string {
  const { orderRef, customerName, shippingAddress } = props;
  const addrBlock = shippingAddress?.city ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      <tr>
        <td bgcolor="#f6f8fc" style="background-color:#f6f8fc;border:1px solid #e0e5ef;border-radius:10px;padding:16px;">
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
      <div style="width:52px;height:52px;background-color:#faf5ff;border:1.5px solid #c4b5fd;border-radius:50%;margin:0 auto 14px;text-align:center;">
        <span style="color:#7c3aed;font-size:22px;line-height:52px;display:block;">&#128230;</span>
      </div>
      <h2 style="margin:0;color:#1e2535;font-size:20px;font-weight:700;">Votre colis est en route !</h2>
      <p style="margin:6px 0 0;color:#64748b;font-size:13px;">${customerName ? `Bonjour ${esc(customerName)}, votre` : "Votre"} commande a &eacute;t&eacute; d&eacute;pos&eacute;e au bureau de poste.</p>
    </div>
    ${orderRefBox(orderRef)}
    ${infoCallout("#6d28d9", "#faf5ff", "#ddd6fe", "Votre colis est d&eacute;sormais en chemin. La livraison prend g&eacute;n&eacute;ralement 2&ndash;5 jours ouvrables selon votre pays.")}
    ${addrBlock}
    ${ctaButton(`${SITE_URL}/orders`, "Voir mes commandes")}`;
  return emailBase(body, `Votre commande #${orderRef} est expédiée !`);
}

// ─── 4. Vouchers de vol ───────────────────────────────────────────────────────

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

export function voucherEmail(props: VoucherEmailProps): string {
  const { orderRef, customerName, codes } = props;

  const codeCards = codes.map((c) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td bgcolor="#0b2238" style="background-color:#0b2238;border:2px solid #F2B705;border-radius:12px;padding:28px 24px;text-align:center;">
          <p style="color:#F2B705;font-size:10px;text-transform:uppercase;letter-spacing:0.25em;margin:0 0 12px;font-weight:600;">
            &#9992;&nbsp;&nbsp;VOUCHER VOL &mdash; FLY HORIZONS&nbsp;&nbsp;&#9992;
          </p>
          <p style="color:#ffffff;font-size:40px;font-weight:800;margin:0 0 6px;letter-spacing:-0.02em;line-height:1;">
            ${esc(fmtDuration(c.duration_minutes))}
          </p>
          <p style="color:#94a3b8;font-size:13px;margin:0 0 24px;">${esc(c.product_title)}</p>
          <table align="center" cellpadding="0" cellspacing="0">
            <tr>
              <td bgcolor="#1a3a55" style="background-color:rgba(242,183,5,0.12);border:1.5px solid rgba(242,183,5,0.5);border-radius:8px;padding:12px 24px;">
                <p style="color:#F2B705;font-size:22px;font-weight:700;font-family:'Courier New',Courier,monospace;letter-spacing:0.15em;margin:0;">${esc(c.code)}</p>
              </td>
            </tr>
          </table>
          <p style="color:#64748b;font-size:11px;margin:16px 0 0;">Votre code &mdash; valable 1 an</p>
        </td>
      </tr>
    </table>`).join("");

  const body = `
    <div style="text-align:center;margin-bottom:28px;">
      <span style="font-size:36px;display:block;margin-bottom:12px;">&#9992;</span>
      <h2 style="margin:0;color:#1e2535;font-size:20px;font-weight:700;">
        ${codes.length > 1 ? "Vos vouchers sont pr&ecirc;ts !" : "Votre voucher est pr&ecirc;t !"}
      </h2>
      <p style="margin:6px 0 0;color:#64748b;font-size:13px;">
        ${customerName ? `Merci ${esc(customerName)}, m` : "M"}erci pour votre achat &mdash; r&eacute;f. #${esc(orderRef)}
      </p>
    </div>

    ${codeCards}

    <div style="background-color:#f6f8fc;border:1px solid #e0e5ef;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
      <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;font-weight:600;">Comment utiliser votre bon de vol</p>
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:top;padding:4px 10px 4px 0;font-size:13px;color:#F2B705;font-weight:700;">1.</td>
          <td style="padding:4px 0;font-size:13px;color:#1e2535;line-height:1.5;">Rendez-vous sur <strong>fly-horizons.com/reservation</strong></td>
        </tr>
        <tr>
          <td style="vertical-align:top;padding:4px 10px 4px 0;font-size:13px;color:#F2B705;font-weight:700;">2.</td>
          <td style="padding:4px 0;font-size:13px;color:#1e2535;line-height:1.5;">Choisissez votre date et cr&eacute;neau horaire</td>
        </tr>
        <tr>
          <td style="vertical-align:top;padding:4px 10px 4px 0;font-size:13px;color:#F2B705;font-weight:700;">3.</td>
          <td style="padding:4px 0;font-size:13px;color:#1e2535;line-height:1.5;">Entrez votre code lors de la r&eacute;servation &mdash; le vol sera automatiquement couvert</td>
        </tr>
      </table>
    </div>

    ${ctaButton(`${SITE_URL}/reservation`, "Réserver mon vol")}
    <p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:16px;">
      Conservez cet email &mdash; votre code vous sera demand&eacute; lors de la r&eacute;servation.
    </p>`;

  return emailBase(body, `Vos vouchers Fly Horizons — #${orderRef}`);
}

// ─── 5. Vol sur mesure — devis + lien de paiement ────────────────────────────

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
    prenom, date, heure, dureMin, distKm, nbWaypoints, stopovers,
    prixEstime, discount, prixBillable, acompte, taxesEscales, totalAcompte,
    voucherCode, paymentUrl,
  } = props;

  const dateStr = new Date(date + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const stopoverRow = stopovers.length > 0
    ? `<tr><td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #e8ecf4;">Escale(s)</td><td style="padding:8px 0;font-size:13px;font-weight:600;color:#1e2535;border-bottom:1px solid #e8ecf4;text-align:right;">${esc(stopovers.map(s => s.icao).join(", "))}</td></tr>` : "";

  const voucherRow = discount > 0
    ? `<tr><td style="padding:8px 0;font-size:13px;color:#16a34a;border-bottom:1px solid #e8ecf4;">Voucher <span style="font-family:monospace;font-size:12px;">${esc(voucherCode ?? "")}</span></td><td style="padding:8px 0;font-size:13px;font-weight:600;color:#16a34a;border-bottom:1px solid #e8ecf4;text-align:right;">&minus;${prixEstime - prixBillable}&nbsp;&euro;</td></tr>` : "";

  const taxesRow = taxesEscales > 0
    ? `<tr><td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #e8ecf4;">Taxes d&apos;atterrissage</td><td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #e8ecf4;text-align:right;">+${taxesEscales}&nbsp;&euro;</td></tr>` : "";

  const ctaSection = paymentUrl
    ? `<div style="background-color:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:24px;margin:28px 0;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#1e40af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Acompte &agrave; r&eacute;gler</p>
        <p style="margin:0 0 20px;font-size:34px;font-weight:800;color:#113356;">${totalAcompte}&nbsp;&euro;</p>
        <p style="margin:0 0 20px;font-size:12px;color:#64748b;">Payez votre acompte en ligne pour confirmer votre r&eacute;servation.<br>Le solde sera r&eacute;gl&eacute; apr&egrave;s votre vol selon la dur&eacute;e r&eacute;elle.</p>
        ${ctaButton(paymentUrl, `Payer mon acompte — ${totalAcompte} €`)}
        <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;">Paiement s&eacute;curis&eacute; par Stripe &mdash; carte bancaire</p>
      </div>`
    : `<div style="background-color:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:24px;margin:28px 0;text-align:center;">
        <span style="font-size:24px;display:block;margin-bottom:8px;">&#10003;</span>
        <p style="margin:0;font-size:14px;font-weight:700;color:#15803d;">Votre vol est enti&egrave;rement couvert par votre voucher.</p>
        <p style="margin:8px 0 0;font-size:12px;color:#64748b;">Aucun paiement requis. Nous vous recontacterons sous 24h.</p>
      </div>`;

  const body = `
    <div style="text-align:center;margin-bottom:32px;">
      <h2 style="margin:0 0 6px;color:#1e2535;font-size:22px;font-weight:800;">Votre vol sur mesure</h2>
      <p style="margin:0;color:#64748b;font-size:14px;">Bonjour <strong>${esc(prenom)}</strong>, voici le r&eacute;capitulatif de votre demande.</p>
    </div>

    ${flightInfoBox([
      ["Date souhaitée", `<span style="text-transform:capitalize;">${esc(dateStr)}</span>`],
      ["Heure de départ", esc(heure)],
      ["Départ / retour", "Charleroi EBCI"],
      ["Itinéraire", `~${dureMin} min · ${distKm} km · ${nbWaypoints} point${nbWaypoints > 1 ? "s" : ""}`],
    ])}

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e0e5ef;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;">
        <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 14px;font-weight:600;">D&eacute;tail du prix</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #e8ecf4;">Prix estim&eacute; du vol (~${dureMin}&nbsp;min)</td><td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #e8ecf4;text-align:right;">${prixEstime}&nbsp;&euro;</td></tr>
          ${voucherRow}
          <tr><td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #e8ecf4;">Montant facturable</td><td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #e8ecf4;text-align:right;">${prixBillable}&nbsp;&euro;</td></tr>
          <tr><td style="padding:10px 0 4px;font-size:13px;font-weight:700;color:#1e2535;">Acompte demand&eacute; <span style="font-weight:400;font-size:11px;color:#94a3b8;">(confirmation r&eacute;servation)</span></td><td style="padding:10px 0 4px;font-size:15px;font-weight:800;color:#113356;text-align:right;">${acompte}&nbsp;&euro;</td></tr>
          ${taxesRow}
        </table>
        <p style="font-size:11px;color:#94a3b8;margin:12px 0 0;line-height:1.6;">Le solde est r&eacute;gl&eacute; apr&egrave;s votre vol selon la dur&eacute;e r&eacute;elle.</p>
      </td></tr>
    </table>

    ${ctaSection}

    <p style="font-size:13px;color:#64748b;line-height:1.7;margin:0;">
      Des questions ? R&eacute;pondez &agrave; cet email ou &eacute;crivez-nous &agrave;
      <a href="mailto:info@fly-horizons.com" style="color:#113356;font-weight:600;text-decoration:none;">info@fly-horizons.com</a>.
      <br>&Agrave; tr&egrave;s bient&ocirc;t &agrave; bord !<br>
      <strong style="color:#113356;">L&apos;&eacute;quipe Fly Horizons</strong>
    </p>`;

  return emailBase(body, `Votre vol sur mesure — ${dateStr}`);
}

// ─── 6. Réservation standard — demande reçue (vol gratuit via voucher) ────────

export interface ReservationConfirmationProps {
  prenom: string;
  nom: string;
  dateStr: string;
  heure: string;
  duree: number;
  passengers?: number;
  poids_total?: number | null;
  voucherCode?: string | null;
}

export function reservationConfirmationFreeEmail(p: ReservationConfirmationProps): string {
  const rows: Array<[string, string]> = [
    ["Date", `<strong>${esc(p.dateStr)}</strong>`],
    ["Heure", `<strong>${esc(p.heure)}</strong>`],
    ["Durée", `<strong>${p.duree} minutes</strong>`],
    ["Lieu", "Aéroport de Charleroi (EBCI)"],
  ];
  if (p.passengers) rows.push(["Passager(s)", `${p.passengers}`]);
  if (p.poids_total) rows.push(["Poids total", `${p.poids_total} kg`]);
  if (p.voucherCode) rows.push(["Voucher", `<span style="color:#16a34a;font-weight:600;">${esc(p.voucherCode)}</span>`]);

  const body = `
    <div style="text-align:center;margin-bottom:28px;">
      <h2 style="margin:0;color:#1e2535;font-size:20px;font-weight:700;">R&eacute;servation confirm&eacute;e</h2>
      <p style="margin:6px 0 0;color:#64748b;font-size:13px;">Bonjour <strong>${esc(p.prenom)}</strong>, votre vol est confirm&eacute;.</p>
    </div>

    ${flightInfoBox(rows)}

    ${infoCallout("#15803d", "#f0fdf4", "#86efac",
      "Votre vol est enti&egrave;rement couvert par votre voucher &mdash; aucun paiement suppl&eacute;mentaire requis. Nous vous contacterons rapidement pour confirmer tous les d&eacute;tails."
    )}

    <div style="background-color:#f8fafc;border:1px solid #e0e5ef;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;font-weight:600;">Informations pratiques</p>
      <table cellpadding="0" cellspacing="0">
        <tr><td style="padding:3px 0;font-size:13px;color:#1e2535;line-height:1.7;">A&eacute;roport de Charleroi (EBCI), Belgique</td></tr>
        <tr><td style="padding:3px 0;font-size:13px;color:#1e2535;line-height:1.7;">Pr&eacute;sentez-vous 15 min avant l&apos;heure du vol</td></tr>
        <tr><td style="padding:3px 0;font-size:13px;color:#1e2535;line-height:1.7;">Questions ? <a href="mailto:info@fly-horizons.com" style="color:#113356;font-weight:600;text-decoration:none;">info@fly-horizons.com</a></td></tr>
      </table>
    </div>

    <p style="font-size:13px;color:#64748b;line-height:1.7;margin:0 0 4px;">
      &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord !<br>
      <strong style="color:#113356;">L&apos;&eacute;quipe Fly Horizons</strong>
    </p>`;

  return emailBase(body, "Réservation confirmée — Fly Horizons");
}

// ─── 7. Réservation standard — paiement confirmé ─────────────────────────────

export interface ReservationPaymentConfirmationProps extends ReservationConfirmationProps {
  montantPaye: number;
}

export function reservationPaymentConfirmationEmail(p: ReservationPaymentConfirmationProps): string {
  const rows: Array<[string, string]> = [
    ["Date", `<strong>${esc(p.dateStr)}</strong>`],
    ["Heure", `<strong>${esc(p.heure)}</strong>`],
    ["Durée", `<strong>${p.duree} minutes</strong>`],
    ["Lieu", "Aéroport de Charleroi (EBCI)"],
  ];
  if (p.passengers) rows.push(["Passager(s)", `${p.passengers}`]);
  if (p.poids_total) rows.push(["Poids total", `${p.poids_total} kg`]);
  if (p.voucherCode) rows.push(["Voucher", `<span style="color:#16a34a;font-weight:600;">${esc(p.voucherCode)}</span>`]);

  const body = `
    <div style="text-align:center;margin-bottom:28px;">
      <h2 style="margin:0;color:#1e2535;font-size:20px;font-weight:700;">Paiement re&ccedil;u &mdash; R&eacute;servation confirm&eacute;e</h2>
      <p style="margin:6px 0 0;color:#64748b;font-size:13px;">Bonjour <strong>${esc(p.prenom)}</strong>, votre paiement a bien &eacute;t&eacute; re&ccedil;u.</p>
    </div>

    <div style="text-align:center;background-color:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:16px 24px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:11px;color:#15803d;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Montant pay&eacute;</p>
      <p style="margin:0;font-size:32px;font-weight:800;color:#15803d;">${p.montantPaye}&nbsp;&euro;</p>
    </div>

    ${flightInfoBox(rows)}

    <div style="background-color:#f8fafc;border:1px solid #e0e5ef;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;font-weight:600;">Informations pratiques</p>
      <table cellpadding="0" cellspacing="0">
        <tr><td style="padding:3px 0;font-size:13px;color:#1e2535;line-height:1.7;">A&eacute;roport de Charleroi (EBCI), Belgique</td></tr>
        <tr><td style="padding:3px 0;font-size:13px;color:#1e2535;line-height:1.7;">Pr&eacute;sentez-vous 15 min avant l&apos;heure du vol</td></tr>
        <tr><td style="padding:3px 0;font-size:13px;color:#1e2535;line-height:1.7;">Casques audio fournis &mdash; aucun &eacute;quipement n&eacute;cessaire</td></tr>
        <tr><td style="padding:3px 0;font-size:13px;color:#1e2535;line-height:1.7;">Questions ? <a href="mailto:info@fly-horizons.com" style="color:#113356;font-weight:600;text-decoration:none;">info@fly-horizons.com</a></td></tr>
      </table>
    </div>

    <p style="font-size:13px;color:#64748b;line-height:1.7;margin:0 0 4px;">
      Nous vous contacterons pour confirmer tous les d&eacute;tails. &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord !<br>
      <strong style="color:#113356;">L&apos;&eacute;quipe Fly Horizons</strong>
    </p>`;

  return emailBase(body, "Paiement confirmé — Fly Horizons");
}

// ─── 8. Vol sur mesure — acompte reçu ────────────────────────────────────────

export interface VolSurMesureAcompteProps {
  prenom: string;
  nom: string;
  dateStr: string;
  heure: string;
  dureeEstimee: number;
  voucherCode?: string | null;
  montantPaye: number;
}

export function volSurMesureAcompteEmail(p: VolSurMesureAcompteProps): string {
  const rows: Array<[string, string]> = [
    ["Date souhaitée", `<strong style="text-transform:capitalize;">${esc(p.dateStr)}</strong>`],
    ["Heure", `<strong>${esc(p.heure)}</strong>`],
    ["Durée estimée", `~${p.dureeEstimee} minutes`],
    ["Départ / retour", "Charleroi EBCI"],
  ];
  if (p.voucherCode) rows.push(["Voucher", `<span style="color:#16a34a;font-weight:600;">${esc(p.voucherCode)}</span>`]);

  const body = `
    <div style="text-align:center;margin-bottom:28px;">
      <h2 style="margin:0;color:#1e2535;font-size:20px;font-weight:700;">Acompte re&ccedil;u</h2>
      <p style="margin:6px 0 0;color:#64748b;font-size:13px;">Bonjour <strong>${esc(p.prenom)}</strong>, votre acompte a bien &eacute;t&eacute; re&ccedil;u.</p>
    </div>

    <div style="text-align:center;background-color:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:16px 24px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:11px;color:#15803d;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Acompte pay&eacute;</p>
      <p style="margin:0;font-size:32px;font-weight:800;color:#15803d;">${p.montantPaye}&nbsp;&euro;</p>
    </div>

    ${flightInfoBox(rows)}

    ${infoCallout("#1e40af", "#eff6ff", "#bfdbfe",
      "Nous vous recontacterons sous 24h pour affiner votre itin&eacute;raire et confirmer la date exacte. Le solde sera r&eacute;gl&eacute; apr&egrave;s votre vol selon la dur&eacute;e r&eacute;elle."
    )}

    <p style="font-size:13px;color:#64748b;line-height:1.7;margin:0 0 4px;">
      Des questions ? R&eacute;pondez &agrave; cet email ou contactez-nous &agrave;
      <a href="mailto:info@fly-horizons.com" style="color:#113356;font-weight:600;text-decoration:none;">info@fly-horizons.com</a>.<br>
      &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord !<br>
      <strong style="color:#113356;">L&apos;&eacute;quipe Fly Horizons</strong>
    </p>`;

  return emailBase(body, "Acompte reçu — Vol sur mesure Fly Horizons");
}

// ─── 9. Date de vol confirmée (admin) ────────────────────────────────────────

export interface ReservationDateConfirmeeProps {
  prenom: string;
  dateStr: string;
  duree: number;
}

export function reservationDateConfirmeeEmail(p: ReservationDateConfirmeeProps): string {
  const body = `
    <div style="text-align:center;margin-bottom:28px;">
      <h2 style="margin:0;color:#1e2535;font-size:20px;font-weight:700;">Date de vol confirm&eacute;e</h2>
      <p style="margin:6px 0 0;color:#64748b;font-size:13px;">Bonjour <strong>${esc(p.prenom)}</strong>, votre date est r&eacute;serv&eacute;e.</p>
    </div>

    ${flightInfoBox([
      ["Date confirmée", `<strong style="text-transform:capitalize;">${esc(p.dateStr)}</strong>`],
      ["Durée estimée", `~${p.duree} minutes`],
      ["Lieu", "Aéroport de Charleroi (EBCI)"],
    ])}

    ${infoCallout("#92400e", "#fffbeb", "#fde68a",
      "Votre date est confirm&eacute;e ! Nous vous recontacterons tr&egrave;s prochainement pour vous communiquer votre cr&eacute;neau horaire exact."
    )}

    <p style="font-size:13px;color:#64748b;line-height:1.7;margin:0 0 4px;">
      Questions ? R&eacute;pondez directement &agrave; cet email.<br>
      <strong style="color:#113356;">L&apos;&eacute;quipe Fly Horizons</strong>
    </p>`;

  return emailBase(body, "Votre date de vol est confirmée — Fly Horizons");
}

// ─── 10. Créneau horaire confirmé (admin) ─────────────────────────────────────

export interface ReservationHeureConfirmeeProps {
  prenom: string;
  dateStr: string;
  heure: string;
  duree: number;
}

export function reservationHeureConfirmeeEmail(p: ReservationHeureConfirmeeProps): string {
  const body = `
    <div style="text-align:center;margin-bottom:28px;">
      <span style="font-size:36px;display:block;margin-bottom:12px;">&#9992;</span>
      <h2 style="margin:0;color:#1e2535;font-size:20px;font-weight:700;">C&rsquo;est confirm&eacute; &mdash; &agrave; bientôt !</h2>
      <p style="margin:6px 0 0;color:#64748b;font-size:13px;">Bonjour <strong>${esc(p.prenom)}</strong>, votre vol est planifi&eacute;.</p>
    </div>

    ${flightInfoBox([
      ["Date", `<strong style="text-transform:capitalize;">${esc(p.dateStr)}</strong>`],
      ["Heure de départ", `<strong style="font-size:16px;color:#113356;">${esc(p.heure)}</strong>`],
      ["Durée estimée", `~${p.duree} minutes`],
      ["Lieu", "Aéroport de Charleroi (EBCI)"],
    ])}

    <div style="background-color:#f8fafc;border:1px solid #e0e5ef;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;font-weight:600;">Informations pratiques</p>
      <table cellpadding="0" cellspacing="0">
        <tr><td style="padding:3px 0;font-size:13px;color:#1e2535;line-height:1.7;">A&eacute;roport de Charleroi (EBCI), Belgique</td></tr>
        <tr><td style="padding:3px 0;font-size:13px;color:#1e2535;line-height:1.7;">Pr&eacute;sentez-vous <strong>15 minutes avant</strong> l&apos;heure du vol</td></tr>
        <tr><td style="padding:3px 0;font-size:13px;color:#1e2535;line-height:1.7;">Casques audio fournis &mdash; aucun &eacute;quipement n&eacute;cessaire</td></tr>
        <tr><td style="padding:3px 0;font-size:13px;color:#1e2535;line-height:1.7;"><a href="mailto:info@fly-horizons.com" style="color:#113356;font-weight:600;text-decoration:none;">info@fly-horizons.com</a></td></tr>
      </table>
    </div>

    <p style="font-size:13px;color:#64748b;line-height:1.7;margin:0 0 4px;">
      Beau temps et bon vol ! Rendez-vous &agrave; l&apos;a&eacute;roport.<br>
      <strong style="color:#113356;">L&apos;&eacute;quipe Fly Horizons</strong>
    </p>`;

  return emailBase(body, "Votre créneau horaire est confirmé — Fly Horizons");
}

// ─── 11. Contact — accusé de réception ───────────────────────────────────────

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
      <tr bgcolor="#f6f8fc" style="background-color:#f6f8fc;">
        <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;width:90px;">Nom</td>
        <td style="padding:10px 16px;font-size:13px;color:#1e2535;font-weight:600;">${esc(nom)}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;border-top:1px solid #e0e5ef;">Email</td>
        <td style="padding:10px 16px;font-size:13px;border-top:1px solid #e0e5ef;"><a href="mailto:${esc(email)}" style="color:#113356;font-weight:600;">${esc(email)}</a></td>
      </tr>
      <tr bgcolor="#f6f8fc" style="background-color:#f6f8fc;">
        <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;border-top:1px solid #e0e5ef;">Sujet</td>
        <td style="padding:10px 16px;font-size:13px;color:#1e2535;border-top:1px solid #e0e5ef;">${esc(sujet)}</td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Message</p>
    <div style="background-color:#f6f8fc;border:1px solid #e0e5ef;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
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
      <span style="font-size:36px;display:block;margin-bottom:12px;">&#10003;</span>
      <h2 style="margin:0 0 6px;color:#1e2535;font-size:20px;font-weight:700;">Message bien re&ccedil;u</h2>
      <p style="margin:0;color:#64748b;font-size:13px;">Nous vous r&eacute;pondrons sous 48&nbsp;h ouvrables.</p>
    </div>
    <p style="font-size:14px;color:#1e2535;margin:0 0 16px;">Bonjour <strong>${esc(nom)}</strong>,</p>
    <p style="font-size:14px;color:#64748b;line-height:1.7;margin:0 0 20px;">
      Merci pour votre message concernant <strong style="color:#1e2535;">${esc(sujet)}</strong>. Nous l&apos;avons bien re&ccedil;u et vous r&eacute;pondrons dans les meilleurs d&eacute;lais.
    </p>
    ${infoCallout("#1e40af", "#eff6ff", "#bfdbfe", "En attendant, n&apos;h&eacute;sitez pas &agrave; explorer nos offres de vol sur la boutique.")}
    ${ctaButton(`${SITE_URL}/nos-offres`, "Voir nos offres")}
    <p style="font-size:13px;color:#64748b;margin:24px 0 0;text-align:center;">
      <strong style="color:#113356;">L&apos;&eacute;quipe Fly Horizons</strong>
    </p>`;
  return emailBase(body, "Votre message a été reçu — Fly Horizons");
}

export interface ContactReplyProps {
  nom: string;
  email: string;
  sujet: string;
  reponse: string;
}

// ─── 11. Invitation au paiement (réservation créée par admin) ────────────────

export interface ReservationPaymentInvitationProps {
  prenom: string;
  nom: string;
  dateStr: string;
  heure: string;
  duree: number;
  montant: number;
  paymentUrl: string;
  voucherCode?: string | null;
}

export function reservationPaymentInvitationEmail(p: ReservationPaymentInvitationProps): string {
  const voucherRow = p.voucherCode
    ? `<tr><td style="padding:8px 0;font-size:13px;color:#16a34a;border-bottom:1px solid #e8ecf4;">Voucher <span style="font-family:monospace;font-size:12px;">${esc(p.voucherCode)}</span></td><td style="padding:8px 0;font-size:13px;font-weight:600;color:#16a34a;border-bottom:1px solid #e8ecf4;text-align:right;">Appliqué</td></tr>`
    : "";

  const body = `
    <div style="text-align:center;margin-bottom:32px;">
      <h2 style="margin:0 0 6px;color:#1e2535;font-size:22px;font-weight:800;">Votre r&eacute;servation de vol</h2>
      <p style="margin:0;color:#64748b;font-size:14px;">Bonjour <strong>${esc(p.prenom)} ${esc(p.nom)}</strong>, voici le r&eacute;capitulatif de votre r&eacute;servation.</p>
    </div>

    ${flightInfoBox([
      ["Date", `<span style="text-transform:capitalize;">${esc(p.dateStr)}</span>`],
      ["Heure de départ", esc(p.heure)],
      ["Durée du vol", `${p.duree} min`],
      ["Départ / retour", "Charleroi EBCI"],
    ])}

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e0e5ef;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;">
        <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 14px;font-weight:600;">D&eacute;tail du prix</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${voucherRow}
          <tr><td style="padding:10px 0 4px;font-size:13px;font-weight:700;color:#1e2535;">Total &agrave; r&eacute;gler</td><td style="padding:10px 0 4px;font-size:18px;font-weight:800;color:#113356;text-align:right;">${p.montant}&nbsp;&euro;</td></tr>
        </table>
      </td></tr>
    </table>

    <div style="background-color:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:24px;margin:28px 0;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;color:#1e40af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Montant &agrave; r&eacute;gler</p>
      <p style="margin:0 0 20px;font-size:36px;font-weight:800;color:#113356;">${p.montant}&nbsp;&euro;</p>
      ${ctaButton(p.paymentUrl, `Payer ma réservation — ${p.montant} €`)}
      <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;">Paiement s&eacute;curis&eacute; par Stripe &mdash; carte bancaire</p>
    </div>

    <p style="font-size:13px;color:#64748b;line-height:1.7;margin:0;">
      Des questions ? R&eacute;pondez &agrave; cet email ou &eacute;crivez-nous &agrave;
      <a href="mailto:info@fly-horizons.com" style="color:#113356;font-weight:600;text-decoration:none;">info@fly-horizons.com</a>.
      <br>&Agrave; tr&egrave;s bient&ocirc;t &agrave; bord !<br>
      <strong style="color:#113356;">L&apos;&eacute;quipe Fly Horizons</strong>
    </p>`;

  return emailBase(body, `Votre réservation — ${p.dateStr}`);
}

export function contactReplyEmail({ nom, sujet, reponse }: ContactReplyProps): string {
  const body = `
    <h2 style="margin:0 0 6px;color:#1e2535;font-size:20px;font-weight:700;">R&eacute;ponse &agrave; votre message</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:13px;">Concernant : <strong style="color:#1e2535;">${esc(sujet)}</strong></p>
    <p style="font-size:14px;color:#1e2535;margin:0 0 16px;">Bonjour <strong>${esc(nom)}</strong>,</p>
    <p style="font-size:14px;color:#64748b;margin:0 0 20px;line-height:1.7;">Voici notre r&eacute;ponse &agrave; votre demande :</p>
    <div style="background-color:#f0f7ff;border-left:4px solid #113356;border-radius:0 10px 10px 0;padding:18px 24px;margin:0 0 28px;">
      <p style="margin:0;font-size:14px;color:#1e2535;line-height:1.7;white-space:pre-wrap;">${esc(reponse)}</p>
    </div>
    <p style="font-size:13px;color:#64748b;line-height:1.7;margin:0 0 8px;">Des questions suppl&eacute;mentaires ? R&eacute;pondez directement &agrave; cet email.</p>
    ${ctaButton(`${SITE_URL}/contact`, "Nous recontacter")}
    <p style="font-size:13px;color:#64748b;margin:24px 0 0;text-align:center;">
      <strong style="color:#113356;">L&apos;&eacute;quipe Fly Horizons</strong>
    </p>`;
  return emailBase(body, `Réponse de Fly Horizons — ${sujet}`);
}
