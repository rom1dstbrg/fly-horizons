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

// ── Base ──────────────────────────────────────────────────────────────────────

function emailBase(bodyContent: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(title)}</title>
<style>
  :root { color-scheme: light only; }
  html, body { color-scheme: light only !important; background-color: #0b2238 !important; }
  [data-ogsc] .em-card { background-color: #fefefe !important; }
  [data-ogsc] .em-bg { background-color: #0b2238 !important; }
  [data-ogsc] .em-dark { color: #0b2238 !important; }
  [data-ogsc] .em-muted { color: #64748b !important; }
  [data-ogsc] .em-gold { color: #F2B705 !important; }
  [data-ogsc] .em-body { color: #334155 !important; }
  [data-ogsc] .em-btn { background-color: #F2B705 !important; color: #0b2238 !important; }
  [data-ogsc] .em-sep { border-color: #e8ecf4 !important; }
  @media (prefers-color-scheme: dark) {
    html, body { color-scheme: light only !important; background-color: #0b2238 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#0b2238;font-family:'Segoe UI',Arial,sans-serif;">
<table class="em-bg" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0b2238" style="background-color:#0b2238;padding:40px 16px;">
  <tr>
    <td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Logo -->
        <tr>
          <td bgcolor="#0b2238" style="background-color:#0b2238;padding:0 0 28px;text-align:center;">
            <img src="${LOGO_URL}" alt="Fly Horizons" width="160"
              style="display:block;margin:0 auto;width:160px;height:auto;border:0;outline:none;" />
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td class="em-card" bgcolor="#fefefe" style="background-color:#fefefe;border-radius:16px;padding:40px 36px;">
            ${bodyContent}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td bgcolor="#0b2238" style="background-color:#0b2238;padding:28px 0 0;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;color:#4e7096;">
              Fly Horizons &mdash; <a href="https://fly-horizons.com" style="color:#4e7096;text-decoration:none;">fly-horizons.com</a>
            </p>
            <p style="margin:0;font-size:11px;color:#2d4f6e;">
              Une question ? &Eacute;crivez-nous :
              <a href="mailto:info@fly-horizons.com" style="color:#2d4f6e;text-decoration:none;">info@fly-horizons.com</a>
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

function label(text: string): string {
  return `<p class="em-muted" style="margin:0 0 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.12em;">${text}</p>`;
}

function separator(): string {
  return `<hr class="em-sep" style="border:none;border-top:1px solid #e8ecf4;margin:28px 0;">`;
}

function ctaButton(href: string, text: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr>
      <td align="center">
        <a href="${esc(href)}" class="em-btn"
          style="display:inline-block;background-color:#F2B705;color:#0b2238;font-size:14px;font-weight:800;padding:14px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;">
          ${esc(text)}
        </a>
      </td>
    </tr>
  </table>`;
}

function ctaButtons2(
  btn1: { href: string; text: string },
  btn2: { href: string; text: string }
): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:10px;">
              <a href="${esc(btn1.href)}" class="em-btn"
                style="display:inline-block;background-color:#F2B705;color:#0b2238;font-size:13px;font-weight:800;padding:13px 24px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;">
                ${esc(btn1.text)}
              </a>
            </td>
            <td>
              <a href="${esc(btn2.href)}"
                style="display:inline-block;background-color:#0b2238;color:#F2B705;font-size:13px;font-weight:800;padding:13px 24px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;border:2px solid #F2B705;">
                ${esc(btn2.text)}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

function infoRows(rows: Array<[string, string]>): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
    ${rows.map(([k, v], i, arr) => `
    <tr>
      <td class="em-muted" style="padding:11px 0;${i < arr.length - 1 ? "border-bottom:1px solid #f1f5f9;" : ""}font-size:13px;color:#64748b;">${k}</td>
      <td class="em-dark" style="padding:11px 0;${i < arr.length - 1 ? "border-bottom:1px solid #f1f5f9;" : ""}font-size:13px;font-weight:700;color:#0b2238;text-align:right;">${v}</td>
    </tr>`).join("")}
  </table>`;
}

function callout(text: string): string {
  return `<p class="em-body" style="margin:0 0 28px;font-size:13px;color:#334155;line-height:1.7;border-left:3px solid #F2B705;padding:2px 0 2px 16px;">${text}</p>`;
}

// ── 1. Confirmation commande ──────────────────────────────────────────────────

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
      <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;vertical-align:middle;">
        <table cellpadding="0" cellspacing="0"><tr>
          ${item.image_url ? `<td style="padding-right:14px;vertical-align:middle;">
            <img src="${esc(item.image_url)}" alt="" width="44" height="44"
              style="width:44px;height:44px;border-radius:8px;object-fit:cover;border:1px solid #e8ecf4;display:block;" />
          </td>` : ""}
          <td style="vertical-align:middle;">
            <p class="em-dark" style="margin:0;font-size:14px;font-weight:600;color:#0b2238;">${esc(item.title)}</p>
            <p class="em-muted" style="margin:3px 0 0;font-size:12px;color:#94a3b8;">Qt&eacute; : ${item.quantity}</p>
          </td>
        </tr></table>
      </td>
      <td class="em-dark" style="padding:12px 0;border-bottom:1px solid #f1f5f9;text-align:right;vertical-align:middle;font-size:14px;font-weight:700;color:#0b2238;white-space:nowrap;">
        ${fmt(item.unit_price * item.quantity)}
      </td>
    </tr>`).join("");

  const addressBlock = shippingAddress?.city ? `
    ${separator()}
    ${label("Adresse de livraison")}
    ${shippingAddress.full_name ? `<p class="em-dark" style="margin:0 0 3px;font-size:13px;font-weight:600;color:#0b2238;">${esc(shippingAddress.full_name)}</p>` : ""}
    ${shippingAddress.line1 ? `<p class="em-muted" style="margin:2px 0;font-size:13px;color:#64748b;">${esc(shippingAddress.line1)}</p>` : ""}
    ${shippingAddress.line2 ? `<p class="em-muted" style="margin:2px 0;font-size:13px;color:#64748b;">${esc(shippingAddress.line2)}</p>` : ""}
    <p class="em-muted" style="margin:2px 0;font-size:13px;color:#64748b;">${esc(shippingAddress.postal_code ?? "")} ${esc(shippingAddress.city ?? "")}</p>
    ${shippingAddress.country ? `<p class="em-muted" style="margin:2px 0;font-size:13px;color:#64748b;">${esc(shippingAddress.country)}</p>` : ""}` : "";

  const addrBuyer = shippingAddress ? [
    shippingAddress.full_name ? `<p class="em-dark" style="margin:0 0 2px;font-size:13px;font-weight:600;color:#0b2238;">${esc(shippingAddress.full_name)}</p>` : "",
    (shippingAddress.email ?? customerEmail) ? `<p class="em-muted" style="margin:1px 0;font-size:12px;color:#64748b;">${esc(shippingAddress.email ?? customerEmail)}</p>` : "",
    shippingAddress.line1 ? `<p class="em-muted" style="margin:1px 0;font-size:12px;color:#64748b;">${esc(shippingAddress.line1)}</p>` : "",
    shippingAddress.line2 ? `<p class="em-muted" style="margin:1px 0;font-size:12px;color:#64748b;">${esc(shippingAddress.line2)}</p>` : "",
    (shippingAddress.postal_code || shippingAddress.city) ? `<p class="em-muted" style="margin:1px 0;font-size:12px;color:#64748b;">${esc([shippingAddress.postal_code, shippingAddress.city].filter(Boolean).join(" "))}</p>` : "",
    shippingAddress.country ? `<p class="em-muted" style="margin:1px 0;font-size:12px;color:#64748b;">${esc(shippingAddress.country)}</p>` : "",
  ].filter(Boolean).join("") : `<p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">${esc(customerEmail)}</p>`;

  const invoiceItemRows = items.map((item) => `
    <tr>
      <td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">${esc(item.title)}</td>
      <td class="em-muted" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;text-align:center;">${item.quantity}</td>
      <td class="em-muted" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;text-align:right;white-space:nowrap;">${fmt(item.unit_price)}</td>
      <td class="em-dark" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#0b2238;text-align:right;white-space:nowrap;">${fmt(item.unit_price * item.quantity)}</td>
    </tr>`).join("");

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">R&eacute;f. #${esc(orderRef)}</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Commande confirm&eacute;e !</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">${customerName ? `Merci ${esc(customerName)}, nous` : "Nous"} avons bien re&ccedil;u votre commande.</p>

    ${separator()}
    ${label("D&eacute;tail de la commande")}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">${itemRows}</table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
      <tr>
        <td class="em-muted" style="padding:5px 0;font-size:13px;color:#64748b;">Sous-total</td>
        <td class="em-body" style="padding:5px 0;font-size:13px;color:#334155;text-align:right;">${fmt(subtotal)}</td>
      </tr>
      <tr>
        <td class="em-muted" style="padding:5px 0;font-size:13px;color:#64748b;">Livraison (produits physiques)</td>
        <td class="em-body" style="padding:5px 0;font-size:13px;color:#334155;text-align:right;">${shippingCost === 0 ? "Offerte" : fmt(shippingCost)}</td>
      </tr>
      ${discountAmount > 0 ? `<tr>
        <td class="em-muted" style="padding:5px 0;font-size:13px;color:#64748b;">Remise${couponCode ? ` (${esc(couponCode)})` : ""}</td>
        <td style="padding:5px 0;font-size:13px;color:#16a34a;text-align:right;">&minus;${fmt(discountAmount)}</td>
      </tr>` : ""}
      <tr>
        <td class="em-dark" style="padding:14px 0 4px;font-size:15px;font-weight:800;color:#0b2238;border-top:1px solid #e8ecf4;">Total</td>
        <td class="em-gold" style="padding:14px 0 4px;font-size:18px;font-weight:800;color:#F2B705;text-align:right;border-top:1px solid #e8ecf4;">${fmt(total)}</td>
      </tr>
    </table>

    ${addressBlock}

    ${ctaButton(`${SITE_URL}/orders`, "Voir mes commandes")}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:36px;">
      <tr><td style="border-top:2px dashed #e8ecf4;height:0;padding:0;"></td></tr>
    </table>

    <p class="em-dark" style="margin:28px 0 2px;font-size:18px;font-weight:800;color:#0b2238;letter-spacing:0.04em;">FACTURE</p>
    <p class="em-muted" style="margin:0 0 20px;font-size:12px;color:#94a3b8;">N&deg; FAC-${esc(orderRef)} &middot; ${invoiceDate} &middot; Carte bancaire</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td width="50%" style="vertical-align:top;padding-right:16px;">
          <p class="em-muted" style="margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Vendeur</p>
          <p class="em-dark" style="margin:0 0 2px;font-size:13px;font-weight:600;color:#0b2238;">Fly Horizons</p>
          <p class="em-muted" style="margin:1px 0;font-size:12px;color:#64748b;">fly-horizons.com</p>
          <p class="em-muted" style="margin:1px 0;font-size:12px;color:#64748b;">info@fly-horizons.com</p>
        </td>
        <td width="50%" style="vertical-align:top;">
          <p class="em-muted" style="margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Acheteur</p>
          ${addrBuyer}
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e8ecf4;margin-top:16px;">
      <tr>
        <th style="text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase;padding:10px 0 8px;font-weight:600;border-bottom:1px solid #e8ecf4;">Description</th>
        <th style="text-align:center;font-size:11px;color:#94a3b8;text-transform:uppercase;padding:10px 0 8px;font-weight:600;border-bottom:1px solid #e8ecf4;width:36px;">Qt&eacute;</th>
        <th style="text-align:right;font-size:11px;color:#94a3b8;text-transform:uppercase;padding:10px 0 8px;font-weight:600;border-bottom:1px solid #e8ecf4;width:80px;">P.U.</th>
        <th style="text-align:right;font-size:11px;color:#94a3b8;text-transform:uppercase;padding:10px 0 8px;font-weight:600;border-bottom:1px solid #e8ecf4;width:80px;">Total</th>
      </tr>
      ${invoiceItemRows}
      <tr>
        <td colspan="3" class="em-muted" style="padding:10px 0 3px;font-size:13px;color:#64748b;border-top:1px solid #e8ecf4;">Sous-total</td>
        <td class="em-body" style="padding:10px 0 3px;font-size:13px;text-align:right;white-space:nowrap;border-top:1px solid #e8ecf4;">${fmt(subtotal)}</td>
      </tr>
      <tr>
        <td colspan="3" class="em-muted" style="padding:3px 0;font-size:13px;color:#64748b;">Frais de livraison</td>
        <td class="em-body" style="padding:3px 0;font-size:13px;text-align:right;white-space:nowrap;">${shippingCost === 0 ? "Offerts" : fmt(shippingCost)}</td>
      </tr>
      ${discountAmount > 0 ? `<tr>
        <td colspan="3" class="em-muted" style="padding:3px 0;font-size:13px;color:#64748b;">Remise${couponCode ? ` (${esc(couponCode)})` : ""}</td>
        <td style="padding:3px 0;font-size:13px;color:#16a34a;text-align:right;white-space:nowrap;">&minus;${fmt(discountAmount)}</td>
      </tr>` : ""}
      <tr>
        <td colspan="3" class="em-dark" style="padding:12px 0 0;font-size:14px;font-weight:800;color:#0b2238;border-top:1px solid #e8ecf4;">Total TTC</td>
        <td class="em-dark" style="padding:12px 0 0;font-size:14px;font-weight:800;text-align:right;white-space:nowrap;border-top:1px solid #e8ecf4;">${fmt(total)}</td>
      </tr>
    </table>
    <p class="em-muted" style="margin:12px 0 0;font-size:11px;color:#94a3b8;">TVA non applicable &mdash; Art. 293bis CTVA</p>`;

  return emailBase(body, `Confirmation de commande #${orderRef} — Fly Horizons`);
}

// ── 2. Commande en préparation ────────────────────────────────────────────────

export function orderProcessingEmail(props: OrderProcessingProps): string {
  const { orderRef, customerName } = props;
  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">R&eacute;f. #${esc(orderRef)}</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Commande en pr&eacute;paration</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">${customerName ? `Bonjour ${esc(customerName)}, votre` : "Votre"} commande est en cours de traitement.</p>

    ${separator()}

    ${callout("Nous pr&eacute;parons votre commande avec soin. Vous recevrez un email d&egrave;s qu&rsquo;elle est d&eacute;pos&eacute;e &agrave; la poste.")}

    ${ctaButton(`${SITE_URL}/orders`, "Suivre mes commandes")}`;
  return emailBase(body, `Votre commande #${orderRef} est en préparation — Fly Horizons`);
}

// ── 3. Commande expédiée ──────────────────────────────────────────────────────

export function orderShippedEmail(props: OrderShippedProps): string {
  const { orderRef, customerName, shippingAddress } = props;

  const addrBlock = shippingAddress?.city ? `
    ${separator()}
    ${label("Adresse de livraison")}
    ${shippingAddress.full_name ? `<p class="em-dark" style="margin:0 0 3px;font-size:13px;font-weight:600;color:#0b2238;">${esc(shippingAddress.full_name)}</p>` : ""}
    ${shippingAddress.line1 ? `<p class="em-muted" style="margin:2px 0;font-size:13px;color:#64748b;">${esc(shippingAddress.line1)}</p>` : ""}
    ${shippingAddress.line2 ? `<p class="em-muted" style="margin:2px 0;font-size:13px;color:#64748b;">${esc(shippingAddress.line2)}</p>` : ""}
    <p class="em-muted" style="margin:2px 0;font-size:13px;color:#64748b;">${esc(shippingAddress.postal_code ?? "")} ${esc(shippingAddress.city ?? "")}</p>
    ${shippingAddress.country ? `<p class="em-muted" style="margin:2px 0;font-size:13px;color:#64748b;">${esc(shippingAddress.country)}</p>` : ""}` : "";

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">R&eacute;f. #${esc(orderRef)}</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Votre colis est en route !</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">${customerName ? `Bonjour ${esc(customerName)}, votre` : "Votre"} commande a &eacute;t&eacute; d&eacute;pos&eacute;e au bureau de poste.</p>

    ${separator()}

    ${callout("Votre colis est d&eacute;sormais en chemin. La livraison prend g&eacute;n&eacute;ralement 2&ndash;5 jours ouvrables selon votre pays.")}

    ${addrBlock}

    ${ctaButton(`${SITE_URL}/orders`, "Voir mes commandes")}`;
  return emailBase(body, `Votre commande #${orderRef} est expédiée ! — Fly Horizons`);
}

// ── 4. Vouchers de vol ────────────────────────────────────────────────────────

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

  const codeCards = codes.map((c) => {
    const rawCode = c.code.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const reservationUrl = `${SITE_URL}/reservation?duree=${c.duration_minutes}&code=${rawCode}`;
    return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="border:2px solid #F2B705;border-radius:12px;padding:28px 24px;text-align:center;">
          <p class="em-gold" style="margin:0 0 6px;font-size:10px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.2em;">
            VOUCHER VOL &mdash; FLY HORIZONS
          </p>
          <p class="em-dark" style="margin:0 0 4px;font-size:52px;font-weight:800;color:#0b2238;line-height:1;">
            ${esc(fmtDuration(c.duration_minutes))}
          </p>
          <p class="em-muted" style="margin:0 0 24px;font-size:13px;color:#64748b;">${esc(c.product_title)}</p>
          <p class="em-muted" style="margin:0 0 8px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">Votre code</p>
          <p class="em-gold" style="margin:0 0 14px;font-size:26px;font-weight:800;font-family:'Courier New',Courier,monospace;color:#F2B705;letter-spacing:0.15em;background-color:#0b2238;display:inline-block;padding:10px 24px;border-radius:8px;">
            ${esc(c.code)}
          </p>
          <p class="em-muted" style="margin:0;font-size:11px;color:#94a3b8;">Valable 12 mois &agrave; compter de la date d&rsquo;achat</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
            <tr>
              <td align="center">
                <a href="${esc(reservationUrl)}" class="em-btn"
                  style="display:inline-block;background-color:#F2B705;color:#0b2238;font-size:13px;font-weight:800;padding:12px 28px;border-radius:8px;text-decoration:none;">
                  Réserver mon vol avec ce code
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
  }).join("");

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">R&eacute;f. #${esc(orderRef)}</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">
      ${codes.length > 1 ? "Vos vouchers sont pr&ecirc;ts !" : "Votre voucher est pr&ecirc;t !"}
    </h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">
      ${customerName ? `Bonjour <strong style="color:#0b2238;">${esc(customerName)}</strong>, merci` : "Merci"} pour votre achat.
    </p>

    ${separator()}

    ${codeCards}

    ${separator()}

    ${label("Comment utiliser votre bon de vol")}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;vertical-align:top;width:28px;">
          <span class="em-gold" style="font-size:13px;font-weight:800;color:#F2B705;">1.</span>
        </td>
        <td class="em-body" style="padding:9px 0 9px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;line-height:1.5;">
          Cliquez sur le bouton ci-dessus : votre code sera automatiquement pr&eacute;-rempli
        </td>
      </tr>
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;vertical-align:top;width:28px;">
          <span class="em-gold" style="font-size:13px;font-weight:800;color:#F2B705;">2.</span>
        </td>
        <td class="em-body" style="padding:9px 0 9px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;line-height:1.5;">
          Choisissez votre date et votre cr&eacute;neau horaire
        </td>
      </tr>
      <tr>
        <td style="padding:9px 0;vertical-align:top;width:28px;">
          <span class="em-gold" style="font-size:13px;font-weight:800;color:#F2B705;">3.</span>
        </td>
        <td class="em-body" style="padding:9px 0 9px 10px;font-size:13px;color:#334155;line-height:1.5;">
          Finalisez votre r&eacute;servation, le vol est int&eacute;gralement couvert par votre bon
        </td>
      </tr>
    </table>

    ${separator()}
    ${label("Bon &agrave; savoir")}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td class="em-body" style="padding:9px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;line-height:1.6;">
          Votre voucher couvre exactement la dur&eacute;e de vol indiqu&eacute;e sur le bon. Si vous souhaitez r&eacute;server un vol d&rsquo;une dur&eacute;e sup&eacute;rieure, il s&rsquo;applique comme bon de r&eacute;duction : son montant est d&eacute;duit du prix total et vous r&eacute;glez uniquement la diff&eacute;rence.
        </td>
      </tr>
      <tr>
        <td class="em-body" style="padding:9px 0;font-size:13px;color:#334155;line-height:1.6;">
          En cas de perte de cet email, votre bon est disponible directement dans votre espace client :
          <a href="${SITE_URL}/account" style="color:#F2B705;font-weight:600;text-decoration:none;">fly-horizons.com/account</a>
        </td>
      </tr>
    </table>`;

  return emailBase(body, `Vos vouchers Fly Horizons — #${orderRef}`);
}

// ── 5. Vol sur mesure — devis + lien de paiement ──────────────────────────────

export interface VolSurMesureQuoteEmailProps {
  prenom: string;
  nom: string;
  date: string;
  heure: string;
  dureMin: number;
  distKm: number;
  reservationId?: string | null;
  styleVol: string | null;
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
    prenom, date, heure, dureMin, distKm, reservationId, styleVol, stopovers,
    prixEstime, discount, prixBillable, acompte, taxesEscales, totalAcompte,
    voucherCode, paymentUrl,
  } = props;

  const dateStr = new Date(date + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const stopoverRow: Array<[string, string]> = stopovers.length > 0
    ? [["Escale(s)", stopovers.map(s => s.icao).join(", ")]]
    : [];

  const styleRow: Array<[string, string]> = styleVol
    ? [["Style de vol", `<strong>${esc(styleVol)}</strong>`]]
    : [];

  const itineraireRows: Array<[string, string]> = [
    ["Date souhaitée", `<strong style="text-transform:capitalize;">${esc(dateStr)}</strong>`],
    ["Heure de départ", esc(heure)],
    ["Départ / retour", "Charleroi EBCI"],
    ["Durée estimée", `~${dureMin}&nbsp;min &middot; ${distKm}&nbsp;km`],
    ...styleRow,
    ...stopoverRow,
  ];

  const voucherRow = discount > 0
    ? `<tr>
        <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Voucher <span style="font-family:monospace;">${esc(voucherCode ?? "")}</span></td>
        <td style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#16a34a;text-align:right;">&minus;${prixEstime - prixBillable}&nbsp;&euro;</td>
      </tr>` : "";

  const taxesRow = taxesEscales > 0
    ? `<tr>
        <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Taxes d&rsquo;atterrissage</td>
        <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;text-align:right;">+${taxesEscales}&nbsp;&euro;</td>
      </tr>` : "";

  const ctaSection = paymentUrl
    ? `${separator()}
    ${label("Comment fonctionne l&rsquo;acompte ?")}
    <p class="em-body" style="margin:0 0 12px;font-size:13px;color:#334155;line-height:1.7;">
      Le temps de vol r&eacute;el peut varier selon la m&eacute;t&eacute;o, les instructions du contr&ocirc;le a&eacute;rien ou les contraintes op&eacute;rationnelles du jour. Pour tenir compte de ces variations, l&rsquo;acompte demand&eacute; est volontairement fix&eacute; au-dessus du montant final estim&eacute;.
    </p>
    <p class="em-body" style="margin:0 0 28px;font-size:13px;color:#334155;line-height:1.7;">
      Apr&egrave;s votre vol, la dur&eacute;e r&eacute;elle est calcul&eacute;e et le montant d&eacute;finitif &eacute;tabli. Si l&rsquo;acompte vers&eacute; d&eacute;passe ce montant, la diff&eacute;rence vous est rembours&eacute;e sous 24&nbsp;h.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="border:2px solid #F2B705;border-radius:12px;padding:28px 24px;text-align:center;">
          <p class="em-muted" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;">Acompte &agrave; r&eacute;gler</p>
          <p class="em-dark" style="margin:0 0 20px;font-size:42px;font-weight:800;color:#0b2238;line-height:1;">${totalAcompte}&nbsp;&euro;</p>
          <a href="${esc(paymentUrl)}" class="em-btn"
            style="display:inline-block;background-color:#F2B705;color:#0b2238;font-size:14px;font-weight:800;padding:14px 36px;border-radius:10px;text-decoration:none;">
            Payer mon acompte, ${totalAcompte}&nbsp;&euro;
          </a>
          <p class="em-muted" style="margin:14px 0 0;font-size:11px;color:#94a3b8;">Paiement s&eacute;curis&eacute; par Stripe, carte bancaire</p>
        </td>
      </tr>
    </table>`
    : `${callout("Votre vol est enti&egrave;rement couvert par votre voucher, aucun paiement requis. La dur&eacute;e r&eacute;elle du vol peut varier selon la m&eacute;t&eacute;o ou les contraintes a&eacute;riennes. Si la dur&eacute;e r&eacute;elle est inf&eacute;rieure &agrave; l&rsquo;estimation, aucun frais suppl&eacute;mentaire ne s&rsquo;applique. Fly Horizons vous recontactera sous 24&nbsp;h pour pr&eacute;ciser les d&eacute;tails de votre vol.")}`;

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Vol sur mesure</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Votre vol sur mesure</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Bonjour <strong style="color:#0b2238;">${esc(prenom)}</strong>, voici le r&eacute;capitulatif de votre demande.</p>

    ${separator()}
    ${label("Itin&eacute;raire")}
    ${infoRows(itineraireRows)}
    ${reservationId ? ctaButton(`${SITE_URL}/account/reservations/${reservationId}`, "Voir mon itinéraire →") : ""}

    ${separator()}
    ${label("D&eacute;tail du prix")}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Prix estim&eacute; du vol (~${dureMin}&nbsp;min)</td>
        <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;text-align:right;">${prixEstime}&nbsp;&euro;</td>
      </tr>
      ${voucherRow}
      <tr>
        <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Montant facturable</td>
        <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;text-align:right;">${prixBillable}&nbsp;&euro;</td>
      </tr>
      ${taxesRow}
      <tr>
        <td class="em-dark" style="padding:11px 0;font-size:14px;font-weight:700;color:#0b2238;">Acompte demand&eacute;</td>
        <td class="em-gold" style="padding:11px 0;font-size:18px;font-weight:800;color:#F2B705;text-align:right;">${acompte}&nbsp;&euro;</td>
      </tr>
    </table>
    <p class="em-muted" style="margin:0 0 28px;font-size:12px;color:#94a3b8;line-height:1.6;">Le solde est r&eacute;gl&eacute; apr&egrave;s votre vol selon la dur&eacute;e r&eacute;elle.</p>

    ${ctaSection}

    ${separator()}
    <p class="em-body" style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
      Des questions ? R&eacute;pondez &agrave; cet email ou &eacute;crivez-nous &agrave;
      <a href="mailto:info@fly-horizons.com" style="color:#F2B705;font-weight:600;text-decoration:none;">info@fly-horizons.com</a>.<br>
      &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord,
      <strong class="em-dark" style="color:#0b2238;">L&rsquo;&eacute;quipe Fly Horizons</strong>
    </p>`;

  return emailBase(body, `Votre vol sur mesure — ${dateStr}`);
}

// ── 6. Réservation standard — couverte par voucher ────────────────────────────

export interface ReservationConfirmationProps {
  prenom: string;
  nom: string;
  dateStr: string;
  heure: string;
  duree: number;
  passengers?: number;
  poids_total?: number | null;
  voucherCode?: string | null;
  reservationId?: string | null;
}

export function reservationConfirmationFreeEmail(p: ReservationConfirmationProps): string {
  const rows: Array<[string, string]> = [
    ["Date souhaitée", `<strong>${esc(p.dateStr)}</strong>`],
    ["Heure", `<strong>${esc(p.heure)}</strong>`],
    ["Durée", `<strong>${fmtDuration(p.duree)}</strong>`],
    ["Lieu", "Aéroport de Charleroi (EBCI)"],
  ];
  if (p.passengers) rows.push(["Passager(s)", `${p.passengers}`]);
  if (p.poids_total) rows.push(["Poids total", `${p.poids_total} kg`]);
  if (p.voucherCode) rows.push(["Voucher", `<span style="color:#16a34a;font-weight:600;">${esc(p.voucherCode)}</span>`]);

  const trackingBtn = p.reservationId
    ? ctaButton(`${SITE_URL}/account/reservations/${p.reservationId}`, "Suivre ma réservation →")
    : "";

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">R&eacute;servation</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Demande de vol re&ccedil;ue &#10003;</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, votre demande a bien &eacute;t&eacute; enregistr&eacute;e.</p>

    ${separator()}
    ${label("D&eacute;tails du vol")}
    ${infoRows(rows)}

    ${callout("Votre vol est enti&egrave;rement pris en charge par votre voucher, aucun paiement suppl&eacute;mentaire requis. Fly Horizons vous appellera dans les prochains jours pour convenir de votre cr&eacute;neau. En cas de m&eacute;t&eacute;o d&eacute;favorable, le vol est report&eacute; sans frais.")}

    ${separator()}
    ${label("Informations pratiques")}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">A&eacute;roport de Charleroi (EBCI), Rue des Fr&egrave;res Wright 8, Gosselies</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">Pr&eacute;sentez-vous <strong>15 minutes avant</strong> le d&eacute;collage. Romain vous accueillera &agrave; l&rsquo;accueil.</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">&#128101; <strong>Maximum 3 passagers</strong> par vol (avion l&eacute;ger priv&eacute;), sans exception.</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">&#9925; En cas de m&eacute;t&eacute;o d&eacute;favorable, le vol est report&eacute; sans frais ni p&eacute;nalit&eacute;.</td></tr>
      <tr><td class="em-body" style="padding:8px 0;font-size:13px;color:#334155;">Questions : <a href="mailto:info@fly-horizons.com" style="color:#F2B705;font-weight:600;text-decoration:none;">info@fly-horizons.com</a> &middot; <a href="${SITE_URL}/faq" style="color:#F2B705;font-weight:600;text-decoration:none;">FAQ</a></td></tr>
    </table>

    <p class="em-body" style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
      &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord,
      <strong class="em-dark" style="color:#0b2238;">Romain, Fly Horizons</strong>
    </p>

    ${p.reservationId
      ? ctaButtons2(
          { href: `${SITE_URL}/account/reservations/${p.reservationId}`, text: "Suivre ma réservation" },
          { href: `${SITE_URL}/access-ebci`, text: "Plan d'accès" }
        )
      : ctaButton(`${SITE_URL}/access-ebci`, "Plan d'accès →")}`;

  return emailBase(body, "Réservation confirmée — Fly Horizons");
}

// ── 7. Réservation standard — paiement reçu ───────────────────────────────────

export interface ReservationPaymentConfirmationProps extends ReservationConfirmationProps {
  montantPaye: number;
}

export function reservationPaymentConfirmationEmail(p: ReservationPaymentConfirmationProps): string {
  const rows: Array<[string, string]> = [
    ["Date", `<strong>${esc(p.dateStr)}</strong>`],
    ["Heure", `<strong>${esc(p.heure)}</strong>`],
    ["Durée", `<strong>${fmtDuration(p.duree)}</strong>`],
    ["Lieu", "Aéroport de Charleroi (EBCI)"],
  ];
  if (p.passengers) rows.push(["Passager(s)", `${p.passengers}`]);
  if (p.poids_total) rows.push(["Poids total", `${p.poids_total} kg`]);
  if (p.voucherCode) rows.push(["Voucher", `<span style="color:#16a34a;font-weight:600;">${esc(p.voucherCode)}</span>`]);

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Paiement re&ccedil;u</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">R&eacute;servation confirm&eacute;e</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, votre paiement a bien &eacute;t&eacute; re&ccedil;u.</p>

    ${separator()}

    <p class="em-muted" style="margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.12em;text-align:center;">Montant pay&eacute;</p>
    <p class="em-gold" style="margin:0 0 28px;font-size:42px;font-weight:800;color:#F2B705;text-align:center;line-height:1;">${p.montantPaye}&nbsp;&euro;</p>

    ${separator()}
    ${label("D&eacute;tails du vol")}
    ${infoRows(rows)}

    ${separator()}
    ${label("Informations pratiques")}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">A&eacute;roport de Charleroi (EBCI), Rue des Fr&egrave;res Wright 8, Gosselies</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">Pr&eacute;sentez-vous <strong>15 minutes avant</strong> le d&eacute;collage. Romain vous accueillera &agrave; l&rsquo;accueil.</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">Casques audio fournis. Habillez-vous confortablement, aucun &eacute;quipement sp&eacute;cifique n&rsquo;est n&eacute;cessaire.</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">&#128101; <strong>Maximum 3 passagers</strong> par vol (avion l&eacute;ger priv&eacute;), sans exception.</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">&#9925; En cas de m&eacute;t&eacute;o d&eacute;favorable, le vol est report&eacute; sans frais ni p&eacute;nalit&eacute;.</td></tr>
      <tr><td class="em-body" style="padding:8px 0;font-size:13px;color:#334155;">Questions : <a href="mailto:info@fly-horizons.com" style="color:#F2B705;font-weight:600;text-decoration:none;">info@fly-horizons.com</a> &middot; <a href="${SITE_URL}/faq" style="color:#F2B705;font-weight:600;text-decoration:none;">FAQ</a></td></tr>
    </table>

    <p class="em-body" style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
      Fly Horizons vous contactera dans les prochains jours pour convenir de votre cr&eacute;neau. Des questions d&rsquo;ici l&agrave; ? R&eacute;pondez directement &agrave; cet email,
      <strong class="em-dark" style="color:#0b2238;">Romain vous r&eacute;pondra rapidement.</strong>
    </p>

    ${p.reservationId
      ? ctaButtons2(
          { href: `${SITE_URL}/account/reservations/${p.reservationId}`, text: "Suivre ma réservation" },
          { href: `${SITE_URL}/access-ebci`, text: "Plan d'accès" }
        )
      : ctaButton(`${SITE_URL}/access-ebci`, "Plan d'accès")}`;

  return emailBase(body, "Paiement confirmé — Fly Horizons");
}

// ── 8. Vol sur mesure — acompte reçu ─────────────────────────────────────────

export interface VolSurMesureAcompteProps {
  prenom: string;
  nom: string;
  dateStr: string;
  heure: string;
  dureeEstimee: number;
  voucherCode?: string | null;
  montantPaye: number;
  reservationId?: string | null;
}

export function volSurMesureAcompteEmail(p: VolSurMesureAcompteProps): string {
  const rows: Array<[string, string]> = [
    ["Date souhaitée", `<strong style="text-transform:capitalize;">${esc(p.dateStr)}</strong>`],
    ["Heure", `<strong>${esc(p.heure)}</strong>`],
    ["Durée estimée", `~${fmtDuration(p.dureeEstimee)}`],
    ["Départ / retour", "Charleroi EBCI"],
  ];
  if (p.voucherCode) rows.push(["Voucher", `<span style="color:#16a34a;font-weight:600;">${esc(p.voucherCode)}</span>`]);

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Acompte re&ccedil;u</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Votre r&eacute;servation est confirm&eacute;e</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, votre acompte a bien &eacute;t&eacute; re&ccedil;u.</p>

    ${separator()}

    <p class="em-muted" style="margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.12em;text-align:center;">Acompte pay&eacute;</p>
    <p class="em-gold" style="margin:0 0 28px;font-size:42px;font-weight:800;color:#F2B705;text-align:center;line-height:1;">${p.montantPaye}&nbsp;&euro;</p>

    ${separator()}
    ${label("Vol sur mesure")}
    ${infoRows(rows)}

    ${separator()}
    ${label("Comment fonctionne l&rsquo;acompte ?")}
    <p class="em-body" style="margin:0 0 12px;font-size:13px;color:#334155;line-height:1.7;">
      Le temps de vol r&eacute;el peut varier selon la m&eacute;t&eacute;o, les instructions du contr&ocirc;le a&eacute;rien ou les contraintes op&eacute;rationnelles du jour. L&rsquo;acompte vers&eacute; est volontairement fix&eacute; au-dessus du montant final estim&eacute;.
    </p>
    <p class="em-body" style="margin:0 0 28px;font-size:13px;color:#334155;line-height:1.7;">
      Apr&egrave;s votre vol, la dur&eacute;e r&eacute;elle est calcul&eacute;e et le montant d&eacute;finitif &eacute;tabli. Si l&rsquo;acompte d&eacute;passe ce montant, la diff&eacute;rence vous est rembours&eacute;e sous 24&nbsp;h. En cas de m&eacute;t&eacute;o d&eacute;favorable, le vol est report&eacute; sans frais ni p&eacute;nalit&eacute;.
    </p>

    <p class="em-body" style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
      Fly Horizons vous contactera sous 24&nbsp;h pour affiner votre itin&eacute;raire et confirmer votre date de vol. Des questions : r&eacute;pondez &agrave; cet email, Romain vous r&eacute;pondra rapidement.<br>
      &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord,
      <strong class="em-dark" style="color:#0b2238;">Romain, Fly Horizons</strong>
    </p>

    ${p.reservationId
      ? ctaButtons2(
          { href: `${SITE_URL}/account/reservations/${p.reservationId}`, text: "Suivre ma réservation" },
          { href: `${SITE_URL}/access-ebci`, text: "Plan d'accès" }
        )
      : ctaButton(`${SITE_URL}/access-ebci`, "Plan d'accès")}`;

  return emailBase(body, "Acompte reçu — Vol sur mesure Fly Horizons");
}

// ── 9. Date de vol confirmée (admin) ──────────────────────────────────────────

export interface ReservationDateConfirmeeProps {
  prenom: string;
  dateStr: string;
  duree: number;
  route?: string | null;
  routeUrl?: string | null;
}

export function reservationDateConfirmeeEmail(p: ReservationDateConfirmeeProps): string {
  const routeSection = p.route && p.routeUrl ? `
    ${separator()}
    ${label("Itin&eacute;raire pr&eacute;vu")}
    <p class="em-body" style="margin:0 0 20px;font-size:13px;color:#334155;line-height:1.8;white-space:pre-line;border-left:3px solid #F2B705;padding:4px 0 4px 16px;">${esc(p.route)}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr><td align="center">
      <a href="${esc(p.routeUrl)}" class="em-btn"
        style="display:inline-block;background-color:#F2B705;color:#0b2238;font-size:14px;font-weight:800;padding:14px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;">
        Valider ou modifier l&rsquo;itin&eacute;raire &#8594;
      </a>
    </td></tr></table>` : "";

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Fly Horizons</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Date de vol confirm&eacute;e</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, votre date est r&eacute;serv&eacute;e.</p>

    ${separator()}
    ${label("D&eacute;tails")}
    ${infoRows([
      ["Date confirmée", `<strong style="text-transform:capitalize;">${esc(p.dateStr)}</strong>`],
      ["Durée estimée", `~${fmtDuration(p.duree)}`],
      ["Lieu", "Aéroport de Charleroi (EBCI)"],
    ])}

    ${callout("Votre date est bloqu&eacute;e dans notre planning. Fly Horizons vous recontactera quelques jours avant pour confirmer votre cr&eacute;neau horaire, en fonction de la m&eacute;t&eacute;o. Si les conditions ne permettent pas le vol ce jour-l&agrave;, il sera report&eacute; sans frais suppl&eacute;mentaires.")}

    ${routeSection}

    <p class="em-body" style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, Romain vous r&eacute;pondra rapidement.<br>
      <strong class="em-dark" style="color:#0b2238;">Romain, Fly Horizons</strong>
    </p>

    ${!p.route ? ctaButton(`${SITE_URL}/access-ebci`, "Plan d'accès →") : ""}`;

  return emailBase(body, "Votre date de vol est confirmée — Fly Horizons");
}

// ── 10. Créneau horaire confirmé (admin) ──────────────────────────────────────

export interface ReservationHeureConfirmeeProps {
  prenom: string;
  dateStr: string;
  heure: string;
  duree: number;
  route?: string | null;
  routeUrl?: string | null;
}

export function reservationHeureConfirmeeEmail(p: ReservationHeureConfirmeeProps): string {
  const routeSection = p.route && p.routeUrl ? `
    ${separator()}
    ${label("Itin&eacute;raire pr&eacute;vu")}
    <p class="em-body" style="margin:0 0 20px;font-size:13px;color:#334155;line-height:1.8;white-space:pre-line;border-left:3px solid #F2B705;padding:4px 0 4px 16px;">${esc(p.route)}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr><td align="center">
      <a href="${esc(p.routeUrl)}" class="em-btn"
        style="display:inline-block;background-color:#F2B705;color:#0b2238;font-size:14px;font-weight:800;padding:14px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;">
        Valider ou modifier l&rsquo;itin&eacute;raire &#8594;
      </a>
    </td></tr></table>` : "";

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Fly Horizons</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">C&rsquo;est confirm&eacute;, &agrave; bient&ocirc;t !</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, votre vol est planifi&eacute;.</p>

    ${separator()}
    ${label("D&eacute;tails du vol")}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Date</td>
        <td class="em-dark" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#0b2238;text-align:right;text-transform:capitalize;">${esc(p.dateStr)}</td>
      </tr>
      <tr>
        <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Heure de d&eacute;part</td>
        <td class="em-gold" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:20px;font-weight:800;color:#F2B705;text-align:right;">${esc(p.heure)}</td>
      </tr>
      <tr>
        <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Dur&eacute;e estim&eacute;e</td>
        <td class="em-dark" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#0b2238;text-align:right;">~${fmtDuration(p.duree)}</td>
      </tr>
      <tr>
        <td class="em-muted" style="padding:11px 0;font-size:13px;color:#64748b;">D&eacute;part / retour</td>
        <td class="em-dark" style="padding:11px 0;font-size:13px;font-weight:700;color:#0b2238;text-align:right;">Charleroi &mdash; EBCI</td>
      </tr>
    </table>

    ${routeSection}

    ${separator()}
    ${label("Informations pratiques")}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">A&eacute;roport de Charleroi (EBCI), Rue des Fr&egrave;res Wright 8, Gosselies</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">Pr&eacute;sentez-vous <strong>15 minutes avant</strong> le d&eacute;collage. Romain vous accueillera &agrave; l&rsquo;accueil.</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">Casques audio fournis. Habillez-vous confortablement, aucun &eacute;quipement sp&eacute;cifique n&rsquo;est n&eacute;cessaire.</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">Le vol se d&eacute;roule par beau temps. En cas de m&eacute;t&eacute;o d&eacute;favorable, Fly Horizons vous contactera au plus t&ocirc;t.</td></tr>
      <tr><td class="em-body" style="padding:8px 0;font-size:13px;color:#334155;">Questions : <a href="mailto:info@fly-horizons.com" style="color:#F2B705;font-weight:600;text-decoration:none;">info@fly-horizons.com</a></td></tr>
    </table>

    <p class="em-body" style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
      Beau temps et bon vol ! Rendez-vous &agrave; l&rsquo;a&eacute;roport,
      <strong class="em-dark" style="color:#0b2238;">Romain, Fly Horizons</strong>
    </p>

    ${ctaButton(`${SITE_URL}/access-ebci`, "Plan d'accès →")}`;

  return emailBase(body, "Votre créneau horaire est confirmé — Fly Horizons");
}

// ── 11. Contact — notification interne ───────────────────────────────────────

export interface ContactNotificationProps {
  nom: string;
  email: string;
  sujet: string;
  message: string;
}

export function contactNotificationEmail({ nom, email, sujet, message }: ContactNotificationProps): string {
  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Nouveau message</p>
    <h1 class="em-dark" style="margin:0 0 28px;font-size:22px;font-weight:800;color:#0b2238;">Message de contact</h1>

    ${separator()}
    ${infoRows([
      ["Nom", esc(nom)],
      ["Email", `<a href="mailto:${esc(email)}" style="color:#F2B705;font-weight:600;text-decoration:none;">${esc(email)}</a>`],
      ["Sujet", esc(sujet)],
    ])}

    ${label("Message")}
    <p class="em-body" style="margin:0 0 28px;font-size:13px;color:#334155;line-height:1.7;white-space:pre-wrap;border-left:3px solid #F2B705;padding:2px 0 2px 16px;">${esc(message)}</p>

    ${ctaButton(`${SITE_URL}/admin/contacts`, "Voir dans l'admin")}`;

  return emailBase(body, `Nouveau message : ${sujet} — ${nom}`);
}

// ── 12. Contact — accusé de réception client ─────────────────────────────────

export interface ContactAcknowledgmentProps {
  nom: string;
  email: string;
  sujet: string;
  message: string;
}

export function contactAcknowledgmentEmail({ nom, sujet, message }: ContactAcknowledgmentProps): string {
  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Contact</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Message bien re&ccedil;u</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Nous vous r&eacute;pondrons sous 48&nbsp;h ouvrables.</p>

    ${separator()}

    <p class="em-body" style="margin:0 0 16px;font-size:14px;color:#334155;">Bonjour <strong style="color:#0b2238;">${esc(nom)}</strong>,</p>
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">
      Merci pour votre message concernant <strong style="color:#0b2238;">${esc(sujet)}</strong>. Nous l&rsquo;avons bien re&ccedil;u et vous r&eacute;pondrons dans les meilleurs d&eacute;lais.
    </p>

    ${separator()}
    ${label("Votre message")}
    <p class="em-body" style="margin:0 0 28px;font-size:13px;color:#334155;line-height:1.7;white-space:pre-wrap;border-left:3px solid #e8ecf4;padding:2px 0 2px 16px;">${esc(message)}</p>

    ${separator()}

    <p class="em-body" style="margin:0;font-size:14px;color:#334155;text-align:center;">
      <strong class="em-dark" style="color:#0b2238;">L&rsquo;&eacute;quipe Fly Horizons</strong>
    </p>`;

  return emailBase(body, "Votre message a été reçu — Fly Horizons");
}

// ── 13. Contact — réponse admin ───────────────────────────────────────────────

export interface ContactReplyProps {
  nom: string;
  email: string;
  sujet: string;
  reponse: string;
}

export function contactReplyEmail({ nom, sujet, reponse }: ContactReplyProps): string {
  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Fly Horizons</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">R&eacute;ponse &agrave; votre message</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Concernant : <strong style="color:#0b2238;">${esc(sujet)}</strong></p>

    ${separator()}

    <p class="em-body" style="margin:0 0 16px;font-size:14px;color:#334155;">Bonjour <strong style="color:#0b2238;">${esc(nom)}</strong>,</p>
    <p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">Voici notre r&eacute;ponse &agrave; votre demande :</p>

    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;white-space:pre-wrap;border-left:3px solid #F2B705;padding:2px 0 2px 16px;">${esc(reponse)}</p>

    ${ctaButton(`${SITE_URL}/contact`, "Nous recontacter")}

    <p class="em-muted" style="margin:24px 0 0;font-size:14px;color:#334155;text-align:center;">
      <strong class="em-dark" style="color:#0b2238;">L&rsquo;&eacute;quipe Fly Horizons</strong>
    </p>`;

  return emailBase(body, `Réponse de Fly Horizons — ${sujet}`);
}

// ── 14. Invitation au paiement (réservation admin) ────────────────────────────

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
  const rows: Array<[string, string]> = [
    ["Date", `<span style="text-transform:capitalize;">${esc(p.dateStr)}</span>`],
    ["Heure de départ", esc(p.heure)],
    ["Durée du vol", fmtDuration(p.duree)],
    ["Départ / retour", "Charleroi EBCI"],
  ];
  if (p.voucherCode) rows.push(["Voucher", `<span style="color:#16a34a;font-weight:600;">${esc(p.voucherCode)}</span>`]);

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">R&eacute;servation de vol</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Votre r&eacute;servation</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)} ${esc(p.nom)}</strong>, voici le r&eacute;capitulatif de votre r&eacute;servation.</p>

    ${separator()}
    ${label("D&eacute;tails du vol")}
    ${infoRows(rows)}

    ${separator()}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="border:2px solid #F2B705;border-radius:12px;padding:28px 24px;text-align:center;">
          <p class="em-muted" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;">Montant &agrave; r&eacute;gler</p>
          <p class="em-dark" style="margin:0 0 20px;font-size:42px;font-weight:800;color:#0b2238;line-height:1;">${p.montant}&nbsp;&euro;</p>
          <a href="${esc(p.paymentUrl)}" class="em-btn"
            style="display:inline-block;background-color:#F2B705;color:#0b2238;font-size:14px;font-weight:800;padding:14px 36px;border-radius:10px;text-decoration:none;">
            Payer ma r&eacute;servation, ${p.montant}&nbsp;&euro;
          </a>
          <p class="em-muted" style="margin:14px 0 0;font-size:11px;color:#94a3b8;">Paiement s&eacute;curis&eacute; par Stripe, carte bancaire</p>
        </td>
      </tr>
    </table>

    <p class="em-body" style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
      Des questions ? R&eacute;pondez &agrave; cet email ou &eacute;crivez-nous &agrave;
      <a href="mailto:info@fly-horizons.com" style="color:#F2B705;font-weight:600;text-decoration:none;">info@fly-horizons.com</a>.<br>
      &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord,
      <strong class="em-dark" style="color:#0b2238;">L&rsquo;&eacute;quipe Fly Horizons</strong>
    </p>`;

  return emailBase(body, `Votre réservation — ${p.dateStr}`);
}

// ── 14b. Invitation au paiement — flux client "payer plus tard" ───────────────

export interface ReservationPayLaterEmailProps {
  prenom: string;
  nom: string;
  dateStr: string;
  heure: string;
  duree: number;
  montant: number;
  paymentUrl: string;
  accountUrl: string;
  deadlineStr: string;   // ex : "vendredi 30 mai 2025 à 14:00"
  voucherCode?: string | null;
}

export function reservationPayLaterEmail(p: ReservationPayLaterEmailProps): string {
  const rows: Array<[string, string]> = [
    ["Date", `<span style="text-transform:capitalize;">${esc(p.dateStr)}</span>`],
    ["Heure de départ", esc(p.heure)],
    ["Durée du vol", fmtDuration(p.duree)],
    ["Départ / retour", "Charleroi EBCI"],
    ["Paiement avant le", `<strong style="color:#b45309;">${esc(p.deadlineStr)}</strong>`],
  ];
  if (p.voucherCode) rows.push(["Voucher", `<span style="color:#16a34a;font-weight:600;">${esc(p.voucherCode)}</span>`]);

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">R&eacute;servation de vol</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Votre cr&eacute;neau est r&eacute;serv&eacute;&nbsp;!</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)} ${esc(p.nom)}</strong>, votre cr&eacute;neau est bloqu&eacute; pour vous. R&eacute;glez le montant ci-dessous avant la date limite pour confirmer votre vol.</p>

    ${separator()}
    ${label("D&eacute;tails du vol")}
    ${infoRows(rows)}

    ${separator()}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background-color:#fff8ed;border:1.5px solid #f59e0b;border-radius:10px;padding:14px 18px;">
          <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
            <strong style="color:#b45309;">&#8987; Paiement requis avant le ${esc(p.deadlineStr)}</strong><br>
            Pass&eacute; ce d&eacute;lai, votre cr&eacute;neau sera lib&eacute;r&eacute; et la r&eacute;servation automatiquement annul&eacute;e.
          </p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="border:2px solid #F2B705;border-radius:12px;padding:28px 24px;text-align:center;">
          <p class="em-muted" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;">Montant &agrave; r&eacute;gler</p>
          <p class="em-dark" style="margin:0 0 20px;font-size:42px;font-weight:800;color:#0b2238;line-height:1;">${p.montant}&nbsp;&euro;</p>
          <a href="${esc(p.paymentUrl)}" class="em-btn"
            style="display:inline-block;background-color:#F2B705;color:#0b2238;font-size:14px;font-weight:800;padding:14px 36px;border-radius:10px;text-decoration:none;">
            Payer ma r&eacute;servation, ${p.montant}&nbsp;&euro;
          </a>
          <p class="em-muted" style="margin:14px 0 0;font-size:11px;color:#94a3b8;">Paiement s&eacute;curis&eacute; par Stripe, carte bancaire</p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="background-color:#f1f5f9;border-radius:10px;padding:14px 18px;">
          <p style="margin:0;font-size:12px;color:#475569;line-height:1.7;">
            Vous pouvez retrouver ce lien de paiement &agrave; tout moment depuis votre
            <a href="${esc(p.accountUrl)}" style="color:#F2B705;font-weight:700;text-decoration:none;">espace personnel</a>
            sur fly-horizons.com, dans la section <strong>Mes r&eacute;servations</strong>.
          </p>
        </td>
      </tr>
    </table>

    <p class="em-body" style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
      Des questions ? R&eacute;pondez &agrave; cet email ou &eacute;crivez-nous &agrave;
      <a href="mailto:info@fly-horizons.com" style="color:#F2B705;font-weight:600;text-decoration:none;">info@fly-horizons.com</a>.<br>
      &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord,
      <strong class="em-dark" style="color:#0b2238;">L&rsquo;&eacute;quipe Fly Horizons</strong>
    </p>`;

  return emailBase(body, `Votre réservation — ${p.dateStr}`);
}

// ── 14c. Rappel de paiement — T-72h (deadline T-48h) ─────────────────────────

export interface ReservationPaymentReminderEmailProps {
  prenom: string;
  nom: string;
  dateStr: string;   // ex : "dimanche 1 juin 2025"
  heure: string;     // ex : "14:00"
  duree: number;
  montant: number;
  paymentUrl: string;
  deadlineStr: string; // ex : "vendredi 30 mai 2025 à 14:00"
}

export function reservationPaymentReminderEmail(p: ReservationPaymentReminderEmailProps): string {
  const rows: Array<[string, string]> = [
    ["Date", `<span style="text-transform:capitalize;">${esc(p.dateStr)}</span>`],
    ["Heure de départ", esc(p.heure)],
    ["Durée du vol", fmtDuration(p.duree)],
    ["Départ / retour", "Charleroi EBCI"],
  ];

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Rappel de paiement</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Votre vol n&rsquo;est pas encore confirm&eacute;&nbsp;!</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)} ${esc(p.nom)}</strong>, votre r&eacute;servation du <strong style="color:#0b2238;text-transform:capitalize;">${esc(p.dateStr)}</strong> est toujours en attente de paiement.</p>

    ${separator()}
    ${label("D&eacute;tails du vol")}
    ${infoRows(rows)}

    ${separator()}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background-color:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;padding:14px 18px;">
          <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.6;">
            <strong>&#9888;&#65039; Votre lien de paiement expire le ${esc(p.deadlineStr)}.</strong><br>
            Pass&eacute; ce d&eacute;lai, votre r&eacute;servation sera automatiquement annul&eacute;e et le cr&eacute;neau remis en vente.
          </p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="border:2px solid #F2B705;border-radius:12px;padding:28px 24px;text-align:center;">
          <p class="em-muted" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;">Montant &agrave; r&eacute;gler</p>
          <p class="em-dark" style="margin:0 0 20px;font-size:42px;font-weight:800;color:#0b2238;line-height:1;">${p.montant}&nbsp;&euro;</p>
          <a href="${esc(p.paymentUrl)}" class="em-btn"
            style="display:inline-block;background-color:#F2B705;color:#0b2238;font-size:14px;font-weight:800;padding:14px 36px;border-radius:10px;text-decoration:none;">
            Payer maintenant, ${p.montant}&nbsp;&euro;
          </a>
          <p class="em-muted" style="margin:14px 0 0;font-size:11px;color:#94a3b8;">Paiement s&eacute;curis&eacute; par Stripe, carte bancaire</p>
        </td>
      </tr>
    </table>

    <p class="em-body" style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
      Des questions ? R&eacute;pondez &agrave; cet email ou &eacute;crivez-nous &agrave;
      <a href="mailto:info@fly-horizons.com" style="color:#F2B705;font-weight:600;text-decoration:none;">info@fly-horizons.com</a>.<br>
      &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord,
      <strong class="em-dark" style="color:#0b2238;">L&rsquo;&eacute;quipe Fly Horizons</strong>
    </p>`;

  return emailBase(body, `Rappel — Confirmez votre vol du ${p.dateStr}`);
}

// ── 14d. Annulation automatique — délai de paiement dépassé ──────────────────

export interface ReservationAutoAnnuleeEmailProps {
  prenom: string;
  nom: string;
  dateStr: string;   // ex : "dimanche 1 juin 2025"
  heure: string;
  duree: number;
  bookingUrl: string; // lien pour réserver à nouveau
}

export function reservationAutoAnnuleeEmail(p: ReservationAutoAnnuleeEmailProps): string {
  const rows: Array<[string, string]> = [
    ["Date", `<span style="text-transform:capitalize;">${esc(p.dateStr)}</span>`],
    ["Heure de départ", esc(p.heure)],
    ["Durée du vol", fmtDuration(p.duree)],
    ["Départ / retour", "Charleroi EBCI"],
  ];

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">R&eacute;servation annul&eacute;e</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Votre r&eacute;servation a &eacute;t&eacute; annul&eacute;e</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)} ${esc(p.nom)}</strong>, votre r&eacute;servation du <strong style="color:#0b2238;text-transform:capitalize;">${esc(p.dateStr)}</strong> a &eacute;t&eacute; annul&eacute;e automatiquement car le paiement n&rsquo;a pas &eacute;t&eacute; re&ccedil;u avant la date limite.</p>

    ${separator()}
    ${label("R&eacute;servation annul&eacute;e")}
    ${infoRows(rows)}

    ${separator()}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background-color:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;padding:14px 18px;">
          <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.6;">
            Le cr&eacute;neau a &eacute;t&eacute; remis en vente. Aucun montant n&rsquo;a &eacute;t&eacute; pr&eacute;lev&eacute;.
          </p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="text-align:center;padding:8px 0;">
          <p class="em-muted" style="margin:0 0 16px;font-size:13px;color:#64748b;">Vous souhaitez tout de m&ecirc;me voler&nbsp;? Effectuez une nouvelle r&eacute;servation directement sur notre site.</p>
          <a href="${esc(p.bookingUrl)}" class="em-btn"
            style="display:inline-block;background-color:#0b2238;color:#ffffff;font-size:14px;font-weight:800;padding:14px 36px;border-radius:10px;text-decoration:none;">
            R&eacute;server &agrave; nouveau
          </a>
        </td>
      </tr>
    </table>

    <p class="em-body" style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
      Une question ? R&eacute;pondez &agrave; cet email ou contactez-nous &agrave;
      <a href="mailto:info@fly-horizons.com" style="color:#F2B705;font-weight:600;text-decoration:none;">info@fly-horizons.com</a>.<br>
      Bonne journ&eacute;e,
      <strong class="em-dark" style="color:#0b2238;">L&rsquo;&eacute;quipe Fly Horizons</strong>
    </p>`;

  return emailBase(body, `Réservation annulée — ${p.dateStr}`);
}

// ── 15. Post-vol — remerciement + lien enquête ────────────────────────────────

interface PostVolEmailProps {
  prenom: string;
  dateStr: string;
  duree: number;
  surveyUrl: string;
}

export function postVolEmail(p: PostVolEmailProps): string {
  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Fly Horizons</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Merci pour votre vol&nbsp;!</h1>
    <p class="em-body" style="margin:0 0 24px;font-size:14px;color:#334155;line-height:1.7;">
      Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>,<br><br>
      C&rsquo;est avec beaucoup de plaisir que Romain vous a accompagn&eacute; lors de votre vol du <strong>${p.dateStr}</strong> (${fmtDuration(p.duree)}). Merci de votre confiance pour ce moment. Fly Horizons esp&egrave;re sinc&egrave;rement que vous avez v&eacute;cu quelque chose d&rsquo;unique l&agrave;-haut&nbsp;!
    </p>
    <p class="em-body" style="margin:0 0 4px;font-size:14px;color:#334155;line-height:1.7;">
      Votre avis compte vraiment : il aide Fly Horizons &agrave; am&eacute;liorer chaque vol. L&rsquo;enqu&ecirc;te prend moins d&rsquo;une minute, et Romain lit chaque r&eacute;ponse personnellement.
    </p>
    ${ctaButton(p.surveyUrl, "Donner mon avis")}
    <p class="em-muted" style="margin:20px 0 0;font-size:13px;color:#334155;line-height:1.7;text-align:center;">
      &Agrave; bient&ocirc;t,
      <strong class="em-dark" style="color:#0b2238;">Romain, Fly Horizons</strong>
    </p>`;
  return emailBase(body, "Merci pour votre vol — Fly Horizons");
}

// ── 16. Résultat enquête — notification admin ─────────────────────────────────

interface SatisfactionResultEmailProps {
  prenom: string;
  nom: string;
  dateStr: string;
  duree: number;
  noteGlobale: number;
  noteAccueil: number;
  notePilote: number;
  commentaire?: string | null;
  pointsAmelioration?: string | null;
}

export function satisfactionResultEmail(p: SatisfactionResultEmailProps): string {
  const stars = (n: number) =>
    `<span style="color:#F2B705;font-size:16px;">${"★".repeat(n)}</span><span style="color:#e2e8f0;font-size:16px;">${"☆".repeat(5 - n)}</span> <span style="font-size:13px;color:#64748b;">(${n}/5)</span>`;

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Nouvel avis re&ccedil;u</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Enqu&ecirc;te de satisfaction</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">
      <strong style="color:#0b2238;">${esc(p.prenom)} ${esc(p.nom)}</strong>, vol du ${p.dateStr} (${fmtDuration(p.duree)})
    </p>
    ${separator()}
    ${label("Notes")}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Note globale</td>
        <td style="padding:11px 0;border-bottom:1px solid #f1f5f9;text-align:right;">${stars(p.noteGlobale)}</td>
      </tr>
      <tr>
        <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Qualit&eacute; de l&rsquo;accueil</td>
        <td style="padding:11px 0;border-bottom:1px solid #f1f5f9;text-align:right;">${stars(p.noteAccueil)}</td>
      </tr>
      <tr>
        <td class="em-muted" style="padding:11px 0;font-size:13px;color:#64748b;">Professionnalisme du pilote</td>
        <td style="padding:11px 0;text-align:right;">${stars(p.notePilote)}</td>
      </tr>
    </table>
    ${p.commentaire ? `${separator()}${label("Exp&eacute;rience g&eacute;n&eacute;rale")}${callout(esc(p.commentaire))}` : ""}
    ${p.pointsAmelioration ? `${separator()}${label("Points &agrave; am&eacute;liorer")}<p style="margin:0;padding:12px 16px;background:#fef3c7;border-left:3px solid #F2B705;border-radius:6px;font-size:13px;color:#334155;line-height:1.7;">${esc(p.pointsAmelioration)}</p>` : ""}`;

  return emailBase(body, `Satisfaction — ${p.prenom} ${p.nom}`);
}

// ── 17. Route — proposition d'itinéraire au client ───────────────────────────

export interface RouteProposalEmailProps {
  prenom: string;
  dateStr: string;
  duree: number;
  route: string;
  routeUrl: string;
}

export function routeProposalEmail(p: RouteProposalEmailProps): string {
  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Itin&eacute;raire de vol</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Votre itin&eacute;raire de vol</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, voici l&rsquo;itin&eacute;raire de vol propos&eacute; par Romain. Regardez et indiquez-nous s&rsquo;il vous convient&nbsp;!</p>

    ${separator()}
    ${label("D&eacute;tails")}
    ${infoRows([
      ["Date", `<strong style="text-transform:capitalize;">${esc(p.dateStr)}</strong>`],
      ["Durée estimée", `~${fmtDuration(p.duree)}`],
    ])}

    ${separator()}
    ${label("Itin&eacute;raire pr&eacute;vu")}
    <p class="em-body" style="margin:0 0 20px;font-size:13px;color:#334155;line-height:1.8;white-space:pre-line;border-left:3px solid #F2B705;padding:4px 0 4px 16px;">${esc(p.route)}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;"><tr><td align="center">
      <a href="${esc(p.routeUrl)}" class="em-btn"
        style="display:inline-block;background-color:#F2B705;color:#0b2238;font-size:15px;font-weight:800;padding:16px 44px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;">
        Valider ou modifier l&rsquo;itin&eacute;raire &#8594;
      </a>
    </td></tr></table>

    <p class="em-muted" style="margin:0 0 28px;font-size:12px;color:#94a3b8;text-align:center;">Ce lien est actif jusqu&rsquo;&agrave; 48&nbsp;h avant le vol. Pass&eacute; ce d&eacute;lai, r&eacute;pondez directement &agrave; cet email.</p>


    <p class="em-body" style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
      Des ajustements ? Pas de souci, r&eacute;pondez &agrave; cet email ou utilisez le bouton ci-dessus.<br>
      &Agrave; tr&egrave;s bient&ocirc;t,
      <strong class="em-dark" style="color:#0b2238;">Romain, Fly Horizons</strong>
    </p>`;

  return emailBase(body, "Votre itinéraire de vol — Fly Horizons");
}

// ── 19. Email libre stylisé ───────────────────────────────────────────────────

export function customEmail({ subject, body }: { subject: string; body: string }): string {
  const paragraphs = body
    .split("\n")
    .map(line =>
      line.trim() === ""
        ? `<br>`
        : `<p class="em-body" style="margin:0 0 10px;font-size:14px;color:#334155;line-height:1.7;">${esc(line)}</p>`
    )
    .join("");

  const emailBody = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Fly Horizons</p>
    <h1 class="em-dark" style="margin:0 0 28px;font-size:20px;font-weight:800;color:#0b2238;">${esc(subject)}</h1>
    ${separator()}
    <div style="margin-bottom:28px;">${paragraphs}</div>
    ${separator()}
    <p class="em-muted" style="margin:0;font-size:13px;color:#64748b;text-align:center;">
      L&rsquo;&eacute;quipe Fly Horizons &mdash;
      <a href="mailto:info@fly-horizons.com" style="color:#F2B705;font-weight:600;text-decoration:none;">info@fly-horizons.com</a>
    </p>`;

  return emailBase(emailBody, subject);
}

// ── 18. Route — notification admin (retour client) ───────────────────────────

export interface RouteFeedbackAdminEmailProps {
  clientPrenom: string;
  clientNom: string;
  clientEmail: string;
  resaId: string;
  dateStr: string;
  type: "validated" | "modification_requested";
  feedback?: string | null;
  adminUrl: string;
}

export function routeFeedbackAdminEmail(p: RouteFeedbackAdminEmailProps): string {
  const isValidated = p.type === "validated";
  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Retour itin&eacute;raire</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">
      ${isValidated ? "Itin&eacute;raire valid&eacute; &#10003;" : "Modification demand&eacute;e"}
    </h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">
      <strong style="color:#0b2238;">${esc(p.clientPrenom)} ${esc(p.clientNom)}</strong> a r&eacute;pondu &agrave; l&rsquo;itin&eacute;raire de vol du ${esc(p.dateStr)}.
    </p>

    ${separator()}
    ${infoRows([
      ["Client", `${esc(p.clientPrenom)} ${esc(p.clientNom)}`],
      ["Email", `<a href="mailto:${esc(p.clientEmail)}" style="color:#F2B705;font-weight:600;text-decoration:none;">${esc(p.clientEmail)}</a>`],
      ["Date du vol", `<span style="text-transform:capitalize;">${esc(p.dateStr)}</span>`],
      ["Réponse", isValidated
        ? `<span style="color:#16a34a;font-weight:700;">&#10003; Valid&eacute;</span>`
        : `<span style="color:#dc2626;font-weight:700;">Modification souhait&eacute;e</span>`],
    ])}

    ${!isValidated && p.feedback ? `${separator()}${label("Message du client")}<p class="em-body" style="margin:0 0 28px;font-size:13px;color:#334155;line-height:1.7;white-space:pre-wrap;border-left:3px solid #F2B705;padding:2px 0 2px 16px;">${esc(p.feedback)}</p>` : ""}

    ${ctaButton(p.adminUrl, "Voir dans l'admin →")}`;

  return emailBase(body, `Itinéraire ${isValidated ? "validé" : "— modification"} — ${p.clientPrenom} ${p.clientNom}`);
}
