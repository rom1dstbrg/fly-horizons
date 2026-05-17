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
              Une question ? R&eacute;pondez directement &agrave; cet email &mdash;
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

function infoRows(rows: Array<[string, string]>): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
    ${rows.map(([k, v], i, arr) => `
    <tr>
      <td class="em-muted" style="padding:11px 0;${i < arr.length - 1 ? "border-bottom:1px solid #f1f5f9;" : ""}font-size:13px;color:#64748b;">${esc(k)}</td>
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
                  R&eacute;server mon vol avec ce code
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
      ${customerName ? `Merci ${esc(customerName)}, m` : "M"}erci pour votre achat.
    </p>

    ${separator()}

    ${codeCards}

    ${separator()}

    ${label("Comment utiliser votre bon de vol")}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;vertical-align:top;width:28px;">
          <span class="em-gold" style="font-size:13px;font-weight:800;color:#F2B705;">1.</span>
        </td>
        <td class="em-body" style="padding:9px 0 9px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;line-height:1.5;">
          Cliquez sur le bouton ci-dessus &mdash; votre code sera automatiquement pr&eacute;-rempli
        </td>
      </tr>
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;vertical-align:top;width:28px;">
          <span class="em-gold" style="font-size:13px;font-weight:800;color:#F2B705;">2.</span>
        </td>
        <td class="em-body" style="padding:9px 0 9px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;line-height:1.5;">
          Choisissez votre date et cr&eacute;neau horaire
        </td>
      </tr>
      <tr>
        <td style="padding:9px 0;vertical-align:top;width:28px;">
          <span class="em-gold" style="font-size:13px;font-weight:800;color:#F2B705;">3.</span>
        </td>
        <td class="em-body" style="padding:9px 0 9px 10px;font-size:13px;color:#334155;line-height:1.5;">
          Finalisez votre r&eacute;servation &mdash; le vol est couvert par votre bon
        </td>
      </tr>
    </table>

    <p class="em-muted" style="margin:20px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
      Conservez cet email &mdash; votre code vous sera demand&eacute; lors de la r&eacute;servation.
    </p>`;

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

  const stopoverRow: Array<[string, string]> = stopovers.length > 0
    ? [["Escale(s)", stopovers.map(s => s.icao).join(", ")]]
    : [];

  const itineraireRows: Array<[string, string]> = [
    ["Date souhait&eacute;e", `<strong style="text-transform:capitalize;">${esc(dateStr)}</strong>`],
    ["Heure de d&eacute;part", esc(heure)],
    ["D&eacute;part / retour", "Charleroi EBCI"],
    ["Itin&eacute;raire", `~${dureMin} min &middot; ${distKm} km &middot; ${nbWaypoints} point${nbWaypoints > 1 ? "s" : ""}`],
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
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td style="border:2px solid #F2B705;border-radius:12px;padding:28px 24px;text-align:center;">
            <p class="em-muted" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;">Acompte &agrave; r&eacute;gler</p>
            <p class="em-dark" style="margin:0 0 20px;font-size:42px;font-weight:800;color:#0b2238;line-height:1;">${totalAcompte}&nbsp;&euro;</p>
            <p class="em-muted" style="margin:0 0 20px;font-size:13px;color:#64748b;line-height:1.6;">Payez votre acompte pour confirmer votre r&eacute;servation.<br>Le solde sera r&eacute;gl&eacute; apr&egrave;s votre vol selon la dur&eacute;e r&eacute;elle.</p>
            <a href="${esc(paymentUrl)}" class="em-btn"
              style="display:inline-block;background-color:#F2B705;color:#0b2238;font-size:14px;font-weight:800;padding:14px 36px;border-radius:10px;text-decoration:none;">
              Payer mon acompte &mdash; ${totalAcompte}&nbsp;&euro;
            </a>
            <p class="em-muted" style="margin:14px 0 0;font-size:11px;color:#94a3b8;">Paiement s&eacute;curis&eacute; par Stripe &mdash; carte bancaire</p>
          </td>
        </tr>
      </table>`
    : `${callout("Votre vol est enti&egrave;rement couvert par votre voucher &mdash; aucun paiement requis. Nous vous recontacterons sous 24&nbsp;h.")}`;

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Vol sur mesure</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Votre vol sur mesure</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Bonjour <strong style="color:#0b2238;">${esc(prenom)}</strong>, voici le r&eacute;capitulatif de votre demande.</p>

    ${separator()}
    ${label("Itin&eacute;raire")}
    ${infoRows(itineraireRows)}

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
      &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord &mdash;
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
}

export function reservationConfirmationFreeEmail(p: ReservationConfirmationProps): string {
  const rows: Array<[string, string]> = [
    ["Date", `<strong>${esc(p.dateStr)}</strong>`],
    ["Heure", `<strong>${esc(p.heure)}</strong>`],
    ["Dur&eacute;e", `<strong>${p.duree} minutes</strong>`],
    ["Lieu", "A&eacute;roport de Charleroi (EBCI)"],
  ];
  if (p.passengers) rows.push(["Passager(s)", `${p.passengers}`]);
  if (p.poids_total) rows.push(["Poids total", `${p.poids_total} kg`]);
  if (p.voucherCode) rows.push(["Voucher", `<span style="color:#16a34a;font-weight:600;">${esc(p.voucherCode)}</span>`]);

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">R&eacute;servation</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">R&eacute;servation confirm&eacute;e</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, votre vol est confirm&eacute;.</p>

    ${separator()}
    ${label("D&eacute;tails du vol")}
    ${infoRows(rows)}

    ${callout("Votre vol est enti&egrave;rement couvert par votre voucher &mdash; aucun paiement suppl&eacute;mentaire requis. Nous vous contacterons rapidement pour confirmer tous les d&eacute;tails.")}

    ${separator()}
    ${label("Informations pratiques")}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">A&eacute;roport de Charleroi (EBCI), Belgique</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">Pr&eacute;sentez-vous <strong>15 minutes avant</strong> l&rsquo;heure du vol</td></tr>
      <tr><td class="em-body" style="padding:8px 0;font-size:13px;color:#334155;">Questions &mdash; <a href="mailto:info@fly-horizons.com" style="color:#F2B705;font-weight:600;text-decoration:none;">info@fly-horizons.com</a></td></tr>
    </table>

    <p class="em-body" style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
      &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord &mdash;
      <strong class="em-dark" style="color:#0b2238;">L&rsquo;&eacute;quipe Fly Horizons</strong>
    </p>`;

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
    ["Dur&eacute;e", `<strong>${p.duree} minutes</strong>`],
    ["Lieu", "A&eacute;roport de Charleroi (EBCI)"],
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
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">A&eacute;roport de Charleroi (EBCI), Belgique</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">Pr&eacute;sentez-vous <strong>15 minutes avant</strong> l&rsquo;heure du vol</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">Casques audio fournis &mdash; aucun &eacute;quipement n&eacute;cessaire</td></tr>
      <tr><td class="em-body" style="padding:8px 0;font-size:13px;color:#334155;">Questions &mdash; <a href="mailto:info@fly-horizons.com" style="color:#F2B705;font-weight:600;text-decoration:none;">info@fly-horizons.com</a></td></tr>
    </table>

    <p class="em-body" style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
      Nous vous contacterons pour confirmer tous les d&eacute;tails. &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord &mdash;
      <strong class="em-dark" style="color:#0b2238;">L&rsquo;&eacute;quipe Fly Horizons</strong>
    </p>`;

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
}

export function volSurMesureAcompteEmail(p: VolSurMesureAcompteProps): string {
  const rows: Array<[string, string]> = [
    ["Date souhait&eacute;e", `<strong style="text-transform:capitalize;">${esc(p.dateStr)}</strong>`],
    ["Heure", `<strong>${esc(p.heure)}</strong>`],
    ["Dur&eacute;e estim&eacute;e", `~${p.dureeEstimee} minutes`],
    ["D&eacute;part / retour", "Charleroi EBCI"],
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

    ${callout("Nous vous recontacterons sous 24&nbsp;h pour affiner votre itin&eacute;raire et confirmer la date exacte. Le solde sera r&eacute;gl&eacute; apr&egrave;s votre vol selon la dur&eacute;e r&eacute;elle.")}

    <p class="em-body" style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
      Des questions ? R&eacute;pondez &agrave; cet email ou &eacute;crivez-nous &agrave;
      <a href="mailto:info@fly-horizons.com" style="color:#F2B705;font-weight:600;text-decoration:none;">info@fly-horizons.com</a>.<br>
      &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord &mdash;
      <strong class="em-dark" style="color:#0b2238;">L&rsquo;&eacute;quipe Fly Horizons</strong>
    </p>`;

  return emailBase(body, "Acompte reçu — Vol sur mesure Fly Horizons");
}

// ── 9. Date de vol confirmée (admin) ──────────────────────────────────────────

export interface ReservationDateConfirmeeProps {
  prenom: string;
  dateStr: string;
  duree: number;
}

export function reservationDateConfirmeeEmail(p: ReservationDateConfirmeeProps): string {
  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Fly Horizons</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Date de vol confirm&eacute;e</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, votre date est r&eacute;serv&eacute;e.</p>

    ${separator()}
    ${label("D&eacute;tails")}
    ${infoRows([
      ["Date confirm&eacute;e", `<strong style="text-transform:capitalize;">${esc(p.dateStr)}</strong>`],
      ["Dur&eacute;e estim&eacute;e", `~${p.duree} minutes`],
      ["Lieu", "A&eacute;roport de Charleroi (EBCI)"],
    ])}

    ${callout("Votre date est confirm&eacute;e. Nous vous recontacterons tr&egrave;s prochainement pour vous communiquer votre cr&eacute;neau horaire exact.")}

    <p class="em-body" style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
      Questions ? R&eacute;pondez directement &agrave; cet email &mdash;
      <strong class="em-dark" style="color:#0b2238;">L&rsquo;&eacute;quipe Fly Horizons</strong>
    </p>`;

  return emailBase(body, "Votre date de vol est confirmée — Fly Horizons");
}

// ── 10. Créneau horaire confirmé (admin) ──────────────────────────────────────

export interface ReservationHeureConfirmeeProps {
  prenom: string;
  dateStr: string;
  heure: string;
  duree: number;
}

export function reservationHeureConfirmeeEmail(p: ReservationHeureConfirmeeProps): string {
  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Fly Horizons</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">C&rsquo;est confirm&eacute; &mdash; &agrave; bient&ocirc;t !</h1>
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
        <td class="em-dark" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#0b2238;text-align:right;">~${p.duree} minutes</td>
      </tr>
      <tr>
        <td class="em-muted" style="padding:11px 0;font-size:13px;color:#64748b;">D&eacute;part / retour</td>
        <td class="em-dark" style="padding:11px 0;font-size:13px;font-weight:700;color:#0b2238;text-align:right;">Charleroi &mdash; EBCI</td>
      </tr>
    </table>

    ${separator()}
    ${label("Informations pratiques")}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">A&eacute;roport de Charleroi (EBCI), Belgique</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">Pr&eacute;sentez-vous <strong>15 minutes avant</strong> l&rsquo;heure du vol</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">Casques audio fournis &mdash; aucun &eacute;quipement n&eacute;cessaire</td></tr>
      <tr><td class="em-body" style="padding:8px 0;font-size:13px;color:#334155;">Questions &mdash; <a href="mailto:info@fly-horizons.com" style="color:#F2B705;font-weight:600;text-decoration:none;">info@fly-horizons.com</a></td></tr>
    </table>

    <p class="em-body" style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
      Beau temps et bon vol ! Rendez-vous &agrave; l&rsquo;a&eacute;roport &mdash;
      <strong class="em-dark" style="color:#0b2238;">L&rsquo;&eacute;quipe Fly Horizons</strong>
    </p>`;

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
    ["Heure de d&eacute;part", esc(p.heure)],
    ["Dur&eacute;e du vol", `${p.duree} min`],
    ["D&eacute;part / retour", "Charleroi EBCI"],
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
            Payer ma r&eacute;servation &mdash; ${p.montant}&nbsp;&euro;
          </a>
          <p class="em-muted" style="margin:14px 0 0;font-size:11px;color:#94a3b8;">Paiement s&eacute;curis&eacute; par Stripe &mdash; carte bancaire</p>
        </td>
      </tr>
    </table>

    <p class="em-body" style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
      Des questions ? R&eacute;pondez &agrave; cet email ou &eacute;crivez-nous &agrave;
      <a href="mailto:info@fly-horizons.com" style="color:#F2B705;font-weight:600;text-decoration:none;">info@fly-horizons.com</a>.<br>
      &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord &mdash;
      <strong class="em-dark" style="color:#0b2238;">L&rsquo;&eacute;quipe Fly Horizons</strong>
    </p>`;

  return emailBase(body, `Votre réservation — ${p.dateStr}`);
}
