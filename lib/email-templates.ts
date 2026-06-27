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
  voucherCodes?: VoucherEmailCode[];
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

function emailBase(bodyContent: string, title: string, footerExtra?: string): string {
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
  html, body { color-scheme: light only !important; background-color: #ffffff !important; }
  [data-ogsc] .em-card { background-color: #ffffff !important; }
  [data-ogsc] .em-bg { background-color: #ffffff !important; }
  [data-ogsc] .em-dark { color: #0b2238 !important; }
  [data-ogsc] .em-muted { color: #64748b !important; }
  [data-ogsc] .em-gold { color: #F2B705 !important; }
  [data-ogsc] .em-body { color: #334155 !important; }
  [data-ogsc] .em-btn { background-color: #F2B705 !important; color: #0b2238 !important; }
  [data-ogsc] .em-sep { border-color: #e8ecf4 !important; }
  @media (prefers-color-scheme: dark) {
    html, body { color-scheme: light only !important; background-color: #ffffff !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:'Segoe UI',Arial,sans-serif;">
<table class="em-bg" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="background-color:#ffffff;padding:40px 16px;">
  <tr>
    <td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Logo -->
        <tr>
          <td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 0 24px;text-align:center;">
            <img src="${LOGO_URL}" alt="Fly Horizons" width="140"
              style="display:block;margin:0 auto;width:140px;height:auto;border:0;outline:none;" />
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td class="em-card" bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid #e8ecf4;border-radius:12px;padding:40px 36px;">
            ${bodyContent}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td bgcolor="#ffffff" style="background-color:#ffffff;padding:20px 0 0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">
              Fly Horizons &mdash; <a href="https://fly-horizons.com" style="color:#94a3b8;text-decoration:none;">fly-horizons.com</a> &middot; <a href="mailto:info@fly-horizons.com" style="color:#94a3b8;text-decoration:none;">info@fly-horizons.com</a>
            </p>
            ${footerExtra ? `<p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">${footerExtra}</p>` : ""}
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
                style="display:inline-block;background-color:#f1f5f9;color:#0b2238;font-size:13px;font-weight:700;padding:13px 24px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;border:1.5px solid #cbd5e1;">
                ${esc(btn2.text)}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

function secondaryButton(href: string, text: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
    <tr>
      <td align="center">
        <a href="${esc(href)}"
          style="display:inline-block;background-color:#f1f5f9;color:#0b2238;font-size:13px;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;border:1.5px solid #cbd5e1;">
          ${esc(text)}
        </a>
      </td>
    </tr>
  </table>`;
}

function nextStep(text: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 28px;">
    <tr>
      <td style="background:#fffbeb;border:1.5px solid #fde68a;border-left:4px solid #F2B705;border-radius:8px;padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:0.15em;">&#9658;&nbsp;Prochaine &eacute;tape</p>
        <p style="margin:0;font-size:13px;color:#334155;line-height:1.65;">${text}</p>
      </td>
    </tr>
  </table>`;
}

export interface EmailPriceBreakdown {
  coutVol: number;
  dureeMin?: number | null;
  distKm?: number | null;
  provisionMarge?: number | null;
  taxesEscales?: number | null;
  voucherDiscount?: number | null;
  voucherCode?: string | null;
  couponDiscount?: number | null;
  couponCode?: string | null;
  total: number;
  totalLabel?: string;
}

function buildPriceBreakdown(b: EmailPriceBreakdown): string {
  const dureeLabel = b.dureeMin ? ` (~${b.dureeMin}&nbsp;min${b.distKm ? `, ~${b.distKm}&nbsp;km` : ""})` : "";
  let rows = `
    <tr>
      <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Co&ucirc;t du vol estim&eacute;${dureeLabel}</td>
      <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;text-align:right;white-space:nowrap;">${fmt(b.coutVol)}</td>
    </tr>`;
  if (b.voucherDiscount && b.voucherDiscount > 0) {
    rows += `<tr>
      <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Voucher${b.voucherCode ? ` <span style="font-family:'Courier New',monospace;">${esc(b.voucherCode)}</span>` : ""}</td>
      <td style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#16a34a;text-align:right;white-space:nowrap;">&minus;${fmt(b.voucherDiscount)}</td>
    </tr>`;
  }
  if (b.couponDiscount && b.couponDiscount > 0) {
    rows += `<tr>
      <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Code promo${b.couponCode ? ` <span style="font-family:'Courier New',monospace;">${esc(b.couponCode)}</span>` : ""}</td>
      <td style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#16a34a;text-align:right;white-space:nowrap;">&minus;${fmt(b.couponDiscount)}</td>
    </tr>`;
  }
  if (b.provisionMarge && b.provisionMarge > 0) {
    rows += `<tr>
      <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Provision de s&eacute;curit&eacute;</td>
      <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;text-align:right;white-space:nowrap;">+${fmt(b.provisionMarge)}</td>
    </tr>`;
  }
  if (b.taxesEscales && b.taxesEscales > 0) {
    rows += `<tr>
      <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Taxes d&rsquo;atterrissage</td>
      <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;text-align:right;white-space:nowrap;">+${fmt(b.taxesEscales)}</td>
    </tr>`;
  }
  rows += `<tr>
    <td class="em-dark" style="padding:14px 0 4px;font-size:14px;font-weight:800;color:#0b2238;border-top:1px solid #e8ecf4;">${b.totalLabel ?? "Total &agrave; r&eacute;gler"}</td>
    <td class="em-gold" style="padding:14px 0 4px;font-size:18px;font-weight:800;color:#F2B705;text-align:right;border-top:1px solid #e8ecf4;white-space:nowrap;">${fmt(b.total)}</td>
  </tr>`;
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">${rows}</table>`;
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

function addToCalendarBlock(dateISO: string, heure: string, dureeMin: number): string {
  const parts = heure.replace("h", ":").split(":");
  const startH = parseInt(parts[0] ?? "0", 10);
  const startM = parseInt(parts[1] ?? "0", 10);
  if (isNaN(startH) || isNaN(startM)) return "";

  const endTotal = startH * 60 + startM + dureeMin;
  const endH = Math.floor(endTotal / 60) % 24;
  const endM = endTotal % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateCompact = dateISO.replace(/-/g, "");

  const gcalDates = `${dateCompact}T${pad(startH)}${pad(startM)}00/${dateCompact}T${pad(endH)}${pad(endM)}00`;
  const outlookStart = `${dateISO}T${pad(startH)}:${pad(startM)}:00`;
  const outlookEnd   = `${dateISO}T${pad(endH)}:${pad(endM)}:00`;

  const title    = encodeURIComponent(`Vol Fly Horizons (${dureeMin} min)`);
  const details  = encodeURIComponent("Vol en avion léger avec Romain — Fly Horizons");
  const location = encodeURIComponent("Aéroport de Charleroi (EBCI), Rue des Frères Wright 8, Gosselies");

  const googleUrl  = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${gcalDates}&details=${details}&location=${location}`;
  const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${outlookStart}&enddt=${outlookEnd}&body=${details}&location=${location}`;
  const appleUrl   = `${SITE_URL}/api/ical?date=${dateISO}&heure=${encodeURIComponent(heure)}&duree=${dureeMin}`;

  return `${separator()}
  <p class="em-muted" style="margin:0 0 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.12em;">Ajouter &agrave; mon agenda</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:8px;">
              <a href="${esc(googleUrl)}"
                style="display:inline-block;background-color:#f1f5f9;color:#0b2238;font-size:12px;font-weight:700;padding:10px 16px;border-radius:8px;text-decoration:none;border:1.5px solid #e2e8f0;">
                Google
              </a>
            </td>
            <td style="padding-right:8px;">
              <a href="${esc(appleUrl)}"
                style="display:inline-block;background-color:#f1f5f9;color:#0b2238;font-size:12px;font-weight:700;padding:10px 16px;border-radius:8px;text-decoration:none;border:1.5px solid #e2e8f0;">
                Apple
              </a>
            </td>
            <td>
              <a href="${esc(outlookUrl)}"
                style="display:inline-block;background-color:#f1f5f9;color:#0b2238;font-size:12px;font-weight:700;padding:10px 16px;border-radius:8px;text-decoration:none;border:1.5px solid #e2e8f0;">
                Outlook
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

// ── 1. Confirmation commande ──────────────────────────────────────────────────

export function orderConfirmationEmail(props: OrderConfirmationProps): string {
  const {
    orderRef, customerEmail, customerName, items, subtotal, shippingCost,
    discountAmount, total, couponCode, shippingAddress, orderDate, voucherCodes,
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
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">${customerName ? `Merci <strong style="color:#0b2238;">${esc(customerName)}</strong> pour votre commande.` : "Merci pour votre commande."}</p>

    ${separator()}
    ${label("D&eacute;tail de la commande")}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">${itemRows}</table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
      <tr>
        <td class="em-muted" style="padding:5px 0;font-size:13px;color:#64748b;">Sous-total</td>
        <td class="em-body" style="padding:5px 0;font-size:13px;color:#334155;text-align:right;">${fmt(subtotal)}</td>
      </tr>
      ${shippingCost > 0 ? `<tr>
        <td class="em-muted" style="padding:5px 0;font-size:13px;color:#64748b;">Frais de livraison</td>
        <td class="em-body" style="padding:5px 0;font-size:13px;color:#334155;text-align:right;">${fmt(shippingCost)}</td>
      </tr>` : ""}
      ${discountAmount > 0 ? `<tr>
        <td class="em-muted" style="padding:5px 0;font-size:13px;color:#64748b;">Remise${couponCode ? ` (${esc(couponCode)})` : ""}</td>
        <td style="padding:5px 0;font-size:13px;color:#16a34a;text-align:right;">&minus;${fmt(discountAmount)}</td>
      </tr>` : ""}
      <tr>
        <td class="em-dark" style="padding:14px 0 4px;font-size:15px;font-weight:800;color:#0b2238;border-top:1px solid #e8ecf4;">Total</td>
        <td class="em-gold" style="padding:14px 0 4px;font-size:18px;font-weight:800;color:#F2B705;text-align:right;border-top:1px solid #e8ecf4;">${fmt(total)}</td>
      </tr>
    </table>

    ${ctaButton(`${SITE_URL}/orders`, "Voir mes commandes")}

    ${voucherCodes && voucherCodes.length > 0 ? `
    ${separator()}
    ${label("Vos bons de vol")}
    <p class="em-muted" style="margin:0 0 20px;font-size:13px;color:#64748b;">Scannez le QR code ou rendez-vous sur fly-horizons.com/reservation et saisissez votre code.</p>
    ${voucherCodes.map(v => {
      const rawCode = v.code.replace(/[^A-Z0-9]/gi, "").toUpperCase();
      const reservationUrl = `${SITE_URL}/reservation?duree=${v.duration_minutes}&code=${rawCode}`;
      return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
      <tr>
        <td style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:18px 24px;text-align:center;">
          <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:2.5px;">Votre code</p>
          <p style="margin:0 0 6px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:22px;font-weight:900;color:#062548;letter-spacing:5px;text-transform:uppercase;">${esc(v.code)}</p>
          <p style="margin:0 0 16px;font-size:10px;color:#94a3b8;">${esc(v.product_title)}</p>
          <a href="${reservationUrl}" style="display:inline-block;background-color:#F2B705;color:#062548;font-size:13px;font-weight:800;padding:11px 26px;border-radius:8px;text-decoration:none;">R&eacute;server mon vol</a>
        </td>
      </tr>
    </table>`;
    }).join("")}` : ""}

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
      ${shippingCost > 0 ? `<tr>
        <td colspan="3" class="em-muted" style="padding:3px 0;font-size:13px;color:#64748b;">Frais de livraison</td>
        <td class="em-body" style="padding:3px 0;font-size:13px;text-align:right;white-space:nowrap;">${fmt(shippingCost)}</td>
      </tr>` : ""}
      ${discountAmount > 0 ? `<tr>
        <td colspan="3" class="em-muted" style="padding:3px 0;font-size:13px;color:#64748b;">Remise${couponCode ? ` (${esc(couponCode)})` : ""}</td>
        <td style="padding:3px 0;font-size:13px;color:#16a34a;text-align:right;white-space:nowrap;">&minus;${fmt(discountAmount)}</td>
      </tr>` : ""}
      <tr>
        <td colspan="3" class="em-dark" style="padding:12px 0 0;font-size:14px;font-weight:800;color:#0b2238;border-top:1px solid #e8ecf4;">Total TTC</td>
        <td class="em-dark" style="padding:12px 0 0;font-size:14px;font-weight:800;text-align:right;white-space:nowrap;border-top:1px solid #e8ecf4;">${fmt(total)}</td>
      </tr>
    </table>
    <p class="em-muted" style="margin:12px 0 0;font-size:11px;color:#94a3b8;">TVA non applicable &mdash; Art. 293bis CTVA</p>
    ${separator()}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;text-align:center;">
      Des questions ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, `Confirmation de commande #${orderRef} — Fly Horizons`);
}


// ── 4. Vouchers de vol ────────────────────────────────────────────────────────

export interface VoucherEmailCode {
  code: string;
  duration_minutes: number;
  product_title: string;
  expires_at?: Date | string | null;
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
    const validityStr = c.expires_at
      ? `Valable jusqu&rsquo;au ${new Date(c.expires_at).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}`
      : "Valable 12 mois &agrave; compter de la date d&rsquo;achat";
    return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:20px 24px;text-align:center;">
          <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:2.5px;">Votre code</p>
          <p style="margin:0 0 6px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:24px;font-weight:900;color:#062548;letter-spacing:5px;text-transform:uppercase;">${esc(c.code)}</p>
          <p style="margin:0 0 16px;font-size:10px;color:#94a3b8;">${esc(c.product_title)} &middot; ${validityStr}</p>
          <a href="${esc(reservationUrl)}" style="display:inline-block;background-color:#F2B705;color:#062548;font-size:13px;font-weight:800;padding:11px 26px;border-radius:8px;text-decoration:none;">R&eacute;server mon vol</a>
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
    </table>
    ${separator()}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;text-align:center;">
      Des questions ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, `Vos vouchers Fly Horizons — #${orderRef}`);
}

// ── 5. Vol sur mesure — confirmation de demande (sans paiement) ───────────────

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
}

export function volSurMesureQuoteEmail(props: VolSurMesureQuoteEmailProps): string {
  const {
    prenom, date, heure, dureMin, distKm, reservationId, styleVol, stopovers,
    prixEstime, discount, prixBillable, acompte, taxesEscales, totalAcompte,
    voucherCode,
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
        <td style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#16a34a;text-align:right;">&minus;${fmt(prixEstime - prixBillable)}</td>
      </tr>` : "";

  const taxesRow = taxesEscales > 0
    ? `<tr>
        <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Taxes d&rsquo;atterrissage</td>
        <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;text-align:right;">+${fmt(taxesEscales)}</td>
      </tr>` : "";

  const nextStepsSection = totalAcompte > 0
    ? `${separator()}
    ${label("Prochaines &eacute;tapes")}
    <p class="em-body" style="margin:0 0 12px;font-size:13px;color:#334155;line-height:1.7;">
      Je vais analyser votre itin&eacute;raire dans les <strong>24&nbsp;h</strong> et vous enverrai une proposition de route d&eacute;finitive. Si certaines zones ne peuvent pas &ecirc;tre survol&eacute;es, je vous proposerai des alternatives et le devis sera ajust&eacute; en cons&eacute;quence.
    </p>
    <p class="em-body" style="margin:0 0 20px;font-size:13px;color:#334155;line-height:1.7;">
      Une fois que vous aurez valid&eacute; la route, je vous enverrai un lien pour r&eacute;gler la provision. <strong>Aucun paiement n&rsquo;est demand&eacute; &agrave; ce stade.</strong>
    </p>`
    : `${callout("Votre vol est enti&egrave;rement couvert par votre voucher, aucun paiement requis. Je vous contacterai sous 24&nbsp;h pour vous envoyer la route d&eacute;finitive.")}`;

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Vol sur mesure</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Votre vol sur mesure</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Bonjour <strong style="color:#0b2238;">${esc(prenom)}</strong>, voici le r&eacute;capitulatif de votre demande.</p>

    ${separator()}
    ${label("Itin&eacute;raire")}
    ${infoRows(itineraireRows)}
    ${reservationId ? ctaButton(`${SITE_URL}/account/reservations/${reservationId}`, "Voir mon itinéraire") : ""}

    ${separator()}
    ${label("Devis — estimation des co&ucirc;ts")}
    <p class="em-body" style="margin:0 0 16px;font-size:13px;color:#334155;line-height:1.7;">
      Ces montants sont calcul&eacute;s sur la base de l&rsquo;itin&eacute;raire soumis. Je vais analyser la route dans les 24&nbsp;h et vous enverrai une proposition d&eacute;finitive. Si certaines zones sont interdites au survol ou n&eacute;cessitent un ajustement, je vous proposerai un itinéraire modifi&eacute; et le devis sera mis &agrave; jour.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Co&ucirc;t du vol estim&eacute; (~${dureMin}&nbsp;min, ~${distKm}&nbsp;km)</td>
        <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;text-align:right;white-space:nowrap;">${fmt(prixEstime)}</td>
      </tr>
      ${voucherRow}
      ${taxesRow}
      ${totalAcompte > 0 ? `<tr>
        <td class="em-dark" style="padding:14px 0 4px;font-size:14px;font-weight:800;color:#0b2238;border-top:1px solid #e8ecf4;">Provision estim&eacute;e</td>
        <td class="em-gold" style="padding:14px 0 4px;font-size:18px;font-weight:800;color:#F2B705;text-align:right;border-top:1px solid #e8ecf4;white-space:nowrap;">${fmt(totalAcompte)}</td>
      </tr>` : ""}
    </table>
    <p class="em-muted" style="margin:0 0 28px;font-size:12px;color:#94a3b8;line-height:1.6;">Ces montants sont des estimations. Le montant d&eacute;finitif sera &eacute;tabli apr&egrave;s le vol selon la dur&eacute;e r&eacute;ellement effectu&eacute;e.</p>

    ${nextStepsSection}

    ${separator()}
    <p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">
      &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord,<br>
      <strong class="em-dark" style="color:#0b2238;">Romain, pilote et fondateur de Fly Horizons</strong>
    </p>
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
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
  dateISO?: string | null;
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
    ? ctaButton(`${SITE_URL}/account/reservations/${p.reservationId}`, "Suivre ma réservation")
    : "";

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">R&eacute;servation</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Demande de vol re&ccedil;ue &#10003;</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, votre demande a bien &eacute;t&eacute; enregistr&eacute;e.</p>

    ${separator()}
    ${label("D&eacute;tails du vol")}
    ${infoRows(rows)}

    ${callout("Votre vol est enti&egrave;rement pris en charge par votre voucher, aucun paiement suppl&eacute;mentaire requis. En cas de m&eacute;t&eacute;o d&eacute;favorable, le vol est report&eacute; sans frais.")}

    ${nextStep("Je vous enverrai votre itin&eacute;raire de vol dans les prochains jours, avec les lieux que nous survolerons.")}

    ${separator()}
    ${label("Informations pratiques")}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">A&eacute;roport de Charleroi (EBCI), Rue des Fr&egrave;res Wright 8, Gosselies</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">Pr&eacute;sentez-vous <strong>15 minutes avant</strong> le d&eacute;collage. Je serai sur place pour vous accueillir.</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">En cas de m&eacute;t&eacute;o d&eacute;favorable, le vol est report&eacute; sans frais ni p&eacute;nalit&eacute;.</td></tr>
      <tr><td class="em-body" style="padding:8px 0;font-size:13px;color:#334155;">Questions : <a href="mailto:info@fly-horizons.com" style="color:#F2B705;font-weight:600;text-decoration:none;">info@fly-horizons.com</a> &middot; <a href="${SITE_URL}/faq" style="color:#F2B705;font-weight:600;text-decoration:none;">FAQ</a></td></tr>
    </table>

    <p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">
      &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord,<br>
      <strong class="em-dark" style="color:#0b2238;">Romain, votre pilote</strong>
    </p>
    <p class="em-muted" style="margin:0 0 24px;font-size:12px;color:#64748b;">
      Des questions ? Romain, votre pilote, vous r&eacute;pondra rapidement. R&eacute;pondez &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>

    ${p.reservationId
      ? ctaButtons2(
          { href: `${SITE_URL}/account/reservations/${p.reservationId}`, text: "Suivre ma réservation" },
          { href: `${SITE_URL}/access-ebci`, text: "Plan d'accès" }
        )
      : secondaryButton(`${SITE_URL}/access-ebci`, "Plan d'accès")}`;

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

    ${nextStep("Je vous enverrai votre itin&eacute;raire de vol dans les prochains jours, avec les lieux que nous survolerons.")}

    ${separator()}
    ${label("Informations pratiques")}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">A&eacute;roport de Charleroi (EBCI), Rue des Fr&egrave;res Wright 8, Gosselies</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">Pr&eacute;sentez-vous <strong>15 minutes avant</strong> le d&eacute;collage. Romain vous accueillera &agrave; l&rsquo;accueil.</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">Casques audio fournis. Habillez-vous confortablement, aucun &eacute;quipement sp&eacute;cifique n&rsquo;est n&eacute;cessaire.</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;"><strong>Maximum 3 passagers</strong> par vol (avion l&eacute;ger), sans exception.</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">En cas de m&eacute;t&eacute;o d&eacute;favorable, le vol est report&eacute; sans frais ni p&eacute;nalit&eacute;.</td></tr>
      <tr><td class="em-body" style="padding:8px 0;font-size:13px;color:#334155;">Questions : <a href="mailto:info@fly-horizons.com" style="color:#F2B705;font-weight:600;text-decoration:none;">info@fly-horizons.com</a> &middot; <a href="${SITE_URL}/faq" style="color:#F2B705;font-weight:600;text-decoration:none;">FAQ</a></td></tr>
    </table>

    <p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">
      &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord,<br>
      <strong class="em-dark" style="color:#0b2238;">Romain, pilote et fondateur de Fly Horizons</strong>
    </p>
    <p class="em-muted" style="margin:0 0 24px;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>

    ${p.reservationId
      ? ctaButtons2(
          { href: `${SITE_URL}/account/reservations/${p.reservationId}`, text: "Suivre ma réservation" },
          { href: `${SITE_URL}/access-ebci`, text: "Plan d'accès" }
        )
      : secondaryButton(`${SITE_URL}/access-ebci`, "Plan d'accès")}

    ${p.dateISO ? addToCalendarBlock(p.dateISO, p.heure, p.duree) : ""}`;

  return emailBase(body, "Paiement confirmé — Fly Horizons");
}

// ── 8. Vol sur mesure — provision reçue ──────────────────────────────────────

export interface VolSurMesureAcompteProps {
  prenom: string;
  nom: string;
  dateStr: string;
  heure: string;
  dureeEstimee: number;
  voucherCode?: string | null;
  montantPaye: number;
  reservationId?: string | null;
  breakdown?: EmailPriceBreakdown | null;
  dateISO?: string | null;
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
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Provision re&ccedil;ue</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Votre r&eacute;servation est confirm&eacute;e</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, votre provision a bien &eacute;t&eacute; re&ccedil;ue.</p>

    ${separator()}

    <p class="em-muted" style="margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.12em;text-align:center;">Provision pay&eacute;e</p>
    <p class="em-gold" style="margin:0 0 28px;font-size:42px;font-weight:800;color:#F2B705;text-align:center;line-height:1;">${p.montantPaye}&nbsp;&euro;</p>

    ${separator()}
    ${label("Vol sur mesure")}
    ${infoRows(rows)}

    ${p.breakdown ? `${separator()}${label("D&eacute;tail du paiement")}${buildPriceBreakdown({ ...p.breakdown, totalLabel: "Provision r&eacute;gl&eacute;e" })}` : ""}

    ${separator()}
    ${label("Comment fonctionne la provision ?")}
    <p class="em-body" style="margin:0 0 12px;font-size:13px;color:#334155;line-height:1.7;">
      La provision encaiss&eacute;e couvre le co&ucirc;t r&eacute;el du vol, calcul&eacute; apr&egrave;s le vol sur base de la dur&eacute;e effectivement r&eacute;alis&eacute;e. Le temps de vol peut varier selon la m&eacute;t&eacute;o, les instructions du contr&ocirc;le a&eacute;rien ou les contraintes op&eacute;rationnelles du jour.
    </p>
    <p class="em-body" style="margin:0 0 28px;font-size:13px;color:#334155;line-height:1.7;">
      Apr&egrave;s votre vol, la dur&eacute;e r&eacute;elle est mesur&eacute;e et le montant d&eacute;finitif calcul&eacute;. Si la provision d&eacute;passe ce montant, la diff&eacute;rence vous est rembours&eacute;e sous 24&nbsp;h. En cas de m&eacute;t&eacute;o d&eacute;favorable, le vol est report&eacute; sans frais ni p&eacute;nalit&eacute;.
    </p>

    ${nextStep(`C&rsquo;est tout bon&nbsp;! Rendez-vous le <strong>${esc(p.dateStr)}</strong> &agrave; <strong>${esc(p.heure)}</strong> &agrave; l&rsquo;a&eacute;roport de Charleroi (EBCI). Pr&eacute;sentez-vous 15&nbsp;min avant le d&eacute;collage.`)}

    <p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">
      &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord,<br>
      <strong class="em-dark" style="color:#0b2238;">Romain, pilote et fondateur de Fly Horizons</strong>
    </p>
    <p class="em-muted" style="margin:0 0 24px;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>

    ${p.reservationId
      ? ctaButtons2(
          { href: `${SITE_URL}/account/reservations/${p.reservationId}`, text: "Suivre ma réservation" },
          { href: `${SITE_URL}/access-ebci`, text: "Plan d'accès" }
        )
      : secondaryButton(`${SITE_URL}/access-ebci`, "Plan d'accès")}

    ${p.dateISO ? addToCalendarBlock(p.dateISO, p.heure, p.dureeEstimee) : ""}`;

  return emailBase(body, "Provision reçue — Vol sur mesure Fly Horizons");
}

// ── 9. Date de vol confirmée (admin) ──────────────────────────────────────────

export interface ReservationDateConfirmeeProps {
  prenom: string;
  dateStr: string;
  duree: number;
  route?: string | null;
  routeUrl?: string | null;
}

export interface ReservationHeureConfirmeeProps {
  prenom: string;
  dateStr: string;
  heure: string;
  duree: number;
  route?: string | null;
  routeUrl?: string | null;
  dateISO?: string | null;
}

export function reservationDateConfirmeeEmail(p: ReservationDateConfirmeeProps): string {
  const routeSection = p.route && p.routeUrl ? `
    ${separator()}
    ${label("Itin&eacute;raire pr&eacute;vu")}
    <p class="em-body" style="margin:0 0 20px;font-size:13px;color:#334155;line-height:1.8;white-space:pre-line;border-left:3px solid #F2B705;padding:4px 0 4px 16px;">${esc(p.route)}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr><td align="center">
      <a href="${esc(p.routeUrl)}" class="em-btn"
        style="display:inline-block;background-color:#F2B705;color:#0b2238;font-size:14px;font-weight:800;padding:14px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;">
        Valider ou modifier l&rsquo;itin&eacute;raire
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

    ${callout("Votre date est bloqu&eacute;e dans notre planning. Si les conditions m&eacute;t&eacute;o ne permettent pas le vol ce jour-l&agrave;, il sera report&eacute; sans frais suppl&eacute;mentaires.")}

    ${!p.route ? nextStep("Je vous confirmerai l&rsquo;heure exacte du d&eacute;part et vous enverrai l&rsquo;itin&eacute;raire pr&eacute;vu quelques jours avant votre vol.") : ""}

    ${routeSection}

    <p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">
      &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord,<br>
      <strong class="em-dark" style="color:#0b2238;">Romain, pilote et fondateur de Fly Horizons</strong>
    </p>
    <p class="em-muted" style="margin:0 0 24px;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>

    ${!p.route ? secondaryButton(`${SITE_URL}/access-ebci`, "Plan d'accès") : ""}

    ${separator()}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;text-align:center;">
      Besoin de reporter votre vol ? Vous pouvez choisir une nouvelle date jusqu&rsquo;&agrave; 48&nbsp;h avant le d&eacute;collage depuis
      <a href="${SITE_URL}/account#reservations" style="color:#F2B705;font-weight:600;text-decoration:none;">votre espace client</a>.
    </p>`;

  return emailBase(body, "Votre date de vol est confirmée — Fly Horizons");
}

// ── 10. Créneau horaire confirmé (admin) ──────────────────────────────────────

export function reservationHeureConfirmeeEmail(p: ReservationHeureConfirmeeProps): string {
  const routeSection = p.route && p.routeUrl ? `
    ${separator()}
    ${label("Itin&eacute;raire pr&eacute;vu")}
    <p class="em-body" style="margin:0 0 20px;font-size:13px;color:#334155;line-height:1.8;white-space:pre-line;border-left:3px solid #F2B705;padding:4px 0 4px 16px;">${esc(p.route)}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr><td align="center">
      <a href="${esc(p.routeUrl)}" class="em-btn"
        style="display:inline-block;background-color:#F2B705;color:#0b2238;font-size:14px;font-weight:800;padding:14px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;">
        Valider ou modifier l&rsquo;itin&eacute;raire
      </a>
    </td></tr></table>` : "";

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Fly Horizons</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">C&rsquo;est confirm&eacute; !</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, votre vol est planifi&eacute;.</p>

    ${separator()}
    ${label("D&eacute;tails du vol")}
    ${infoRows([
      ["Date", `<strong style="text-transform:capitalize;">${esc(p.dateStr)}</strong>`],
      ["Heure de d&eacute;part", `<strong>${esc(p.heure)}</strong>`],
      ["Dur&eacute;e estim&eacute;e", `~${p.duree}&nbsp;min`],
      ["D&eacute;part, retour", "Charleroi (EBCI)"],
    ])}

    ${routeSection}

    ${separator()}
    ${label("Informations pratiques")}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">A&eacute;roport de Charleroi (EBCI), Rue des Fr&egrave;res Wright 8, Gosselies</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">Pr&eacute;sentez-vous <strong>15 minutes avant</strong> le d&eacute;collage. Romain vous accueillera &agrave; l&rsquo;accueil.</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">Casques audio fournis. Habillez-vous confortablement, aucun &eacute;quipement sp&eacute;cifique n&rsquo;est n&eacute;cessaire.</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">Le vol se d&eacute;roule par beau temps. En cas de m&eacute;t&eacute;o d&eacute;favorable, je vous contacterai au plus t&ocirc;t.</td></tr>
      <tr><td class="em-body" style="padding:8px 0;font-size:13px;color:#334155;">Questions : <a href="mailto:info@fly-horizons.com" style="color:#F2B705;font-weight:600;text-decoration:none;">info@fly-horizons.com</a> &middot; <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a></td></tr>
    </table>

    ${!p.route
      ? nextStep("Je vous enverrai votre itin&eacute;raire de vol avant le jour J, avec les lieux que nous survolerons.")
      : nextStep(`C&rsquo;est tout bon&nbsp;! Rendez-vous le <strong>${esc(p.dateStr)}</strong> &agrave; <strong>${esc(p.heure)}</strong> &agrave; l&rsquo;a&eacute;roport de Charleroi (EBCI). Pr&eacute;sentez-vous 15&nbsp;min avant le d&eacute;collage.`)}

    <p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">
      Beau temps et bon vol, rendez-vous &agrave; l&rsquo;a&eacute;roport.<br>
      <strong class="em-dark" style="color:#0b2238;">Romain, pilote et fondateur de Fly Horizons</strong>
    </p>
    <p class="em-muted" style="margin:0 0 24px;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>

    ${secondaryButton(`${SITE_URL}/access-ebci`, "Plan d'accès")}

    ${p.dateISO ? addToCalendarBlock(p.dateISO, p.heure, p.duree) : ""}

    ${separator()}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;text-align:center;">
      Emp&ecirc;chement de derni&egrave;re minute ? Vous pouvez reporter votre vol jusqu&rsquo;&agrave; 48&nbsp;h avant le d&eacute;collage depuis
      <a href="${SITE_URL}/account#reservations" style="color:#F2B705;font-weight:600;text-decoration:none;">votre espace client</a>.
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

    ${ctaButton(`${SITE_URL}/admin/contacts`, "Voir dans l'admin")}
    `;

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
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Nous vous r&eacute;pondrons sous 24&nbsp;h.</p>

    ${separator()}

    <p class="em-body" style="margin:0 0 16px;font-size:14px;color:#334155;">Bonjour <strong style="color:#0b2238;">${esc(nom)}</strong>,</p>
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">
      Merci pour votre message concernant <strong style="color:#0b2238;">${esc(sujet)}</strong>. Nous l&rsquo;avons bien re&ccedil;u et vous r&eacute;pondrons dans les meilleurs d&eacute;lais.
    </p>

    ${separator()}
    ${label("Votre message")}
    <p class="em-body" style="margin:0 0 28px;font-size:13px;color:#334155;line-height:1.7;white-space:pre-wrap;border-left:3px solid #e8ecf4;padding:2px 0 2px 16px;">${esc(message)}</p>

    ${separator()}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;text-align:center;">
      Des questions ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
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
    <p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">Voici ma r&eacute;ponse &agrave; votre demande :</p>

    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;white-space:pre-wrap;border-left:3px solid #F2B705;padding:2px 0 2px 16px;">${esc(reponse)}</p>

    ${ctaButton(`${SITE_URL}/contact`, "Nous recontacter")}

    <p class="em-body" style="margin:24px 0 12px;font-size:14px;color:#334155;">
      <strong class="em-dark" style="color:#0b2238;">Romain, pilote et fondateur de Fly Horizons</strong>
    </p>
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
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
  breakdown?: EmailPriceBreakdown | null;
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
          <p class="em-dark" style="margin:0 0 20px;font-size:42px;font-weight:800;color:#0b2238;line-height:1;">${fmt(p.montant)}</p>
          <a href="${esc(p.paymentUrl)}" class="em-btn"
            style="display:inline-block;background-color:#F2B705;color:#0b2238;font-size:14px;font-weight:800;padding:14px 36px;border-radius:10px;text-decoration:none;">
            Payer ma r&eacute;servation, ${fmt(p.montant)}
          </a>
          <p class="em-muted" style="margin:14px 0 0;font-size:11px;color:#94a3b8;">Paiement s&eacute;curis&eacute; par Stripe, carte bancaire</p>
        </td>
      </tr>
    </table>

    ${p.breakdown ? `${separator()}${label("D&eacute;tail du paiement")}${buildPriceBreakdown(p.breakdown)}` : ""}

    <p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">
      &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord,<br>
      <strong class="em-dark" style="color:#0b2238;">Romain, pilote et fondateur de Fly Horizons</strong>
    </p>
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, `Votre réservation — ${p.dateStr}`);
}


// ── 14c. Rappel de paiement — T-72h (deadline T-48h) ─────────────────────────

export interface ReservationPaymentReminderEmailProps {
  prenom: string;
  nom: string;
  dateStr: string;
  heure: string;
  duree: number;
  montant: number;
  paymentUrl: string;
  deadlineStr: string;
  breakdown?: EmailPriceBreakdown | null;
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
            <strong>Votre lien de paiement expire le ${esc(p.deadlineStr)}.</strong><br>
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

    ${p.breakdown ? `${separator()}${label("D&eacute;tail du paiement")}${buildPriceBreakdown(p.breakdown)}` : ""}

    <p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">
      &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord,<br>
      <strong class="em-dark" style="color:#0b2238;">Romain, pilote et fondateur de Fly Horizons</strong>
    </p>
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
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
  source?: "auto" | "admin"; // "auto" = délai dépassé ; "admin" = annulation manuelle
}

export function reservationAutoAnnuleeEmail(p: ReservationAutoAnnuleeEmailProps): string {
  const isAdmin = p.source === "admin";

  const introSuffix = isAdmin
    ? `a &eacute;t&eacute; annul&eacute;e.`
    : `a &eacute;t&eacute; annul&eacute;e automatiquement car le paiement n&rsquo;a pas &eacute;t&eacute; re&ccedil;u avant la date limite.`;

  const noticeText = isAdmin
    ? `Le cr&eacute;neau a &eacute;t&eacute; lib&eacute;r&eacute;. Si un paiement avait &eacute;t&eacute; effectu&eacute;, nous vous contacterons pour le remboursement.`
    : `Le cr&eacute;neau a &eacute;t&eacute; remis en vente. Aucun montant n&rsquo;a &eacute;t&eacute; pr&eacute;lev&eacute;.`;

  const rows: Array<[string, string]> = [
    ["Date", `<span style="text-transform:capitalize;">${esc(p.dateStr)}</span>`],
    ["Heure de départ", esc(p.heure)],
    ["Durée du vol", fmtDuration(p.duree)],
    ["Départ / retour", "Charleroi EBCI"],
  ];

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">R&eacute;servation annul&eacute;e</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Votre r&eacute;servation a &eacute;t&eacute; annul&eacute;e</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)} ${esc(p.nom)}</strong>, votre r&eacute;servation du <strong style="color:#0b2238;text-transform:capitalize;">${esc(p.dateStr)}</strong> ${introSuffix}</p>

    ${separator()}
    ${label("R&eacute;servation annul&eacute;e")}
    ${infoRows(rows)}

    ${separator()}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background-color:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;padding:14px 18px;">
          <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.6;">
            ${noticeText}
          </p>
        </td>
      </tr>
    </table>

    <p class="em-muted" style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">Vous souhaitez tout de m&ecirc;me voler ? Effectuez une nouvelle r&eacute;servation directement sur notre site.</p>

    ${ctaButton(p.bookingUrl, "Réserver à nouveau")}

    ${separator()}
    <p class="em-body" style="margin:0 0 12px;font-size:13px;color:#334155;line-height:1.7;">
      S&rsquo;il s&rsquo;agit d&rsquo;une erreur ou si vous avez des questions, n&rsquo;h&eacute;sitez pas &agrave; nous contacter.
    </p>
    <p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">
      Bonne journ&eacute;e,<br>
      <strong class="em-dark" style="color:#0b2238;">Romain, pilote et fondateur de Fly Horizons</strong>
    </p>
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, `Réservation annulée — ${p.dateStr}`);
}

// ── 14e. Rappel J-2 avant le vol ─────────────────────────────────────────────

export interface FlightReminderEmailProps {
  prenom: string;
  dateStr: string;   // ex : "samedi 14 juin 2025"
  heure: string;     // ex : "14:00"
  duree: number;
  type_resa: "standard" | "perso";
  accountUrl: string;
  dateISO?: string | null;
}

export function flightReminderEmail(p: FlightReminderEmailProps): string {
  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Rappel de vol</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Votre vol est dans 2 jours !</h1>
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">
      Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, voici un rappel pour votre vol du <strong style="color:#0b2238;text-transform:capitalize;">${esc(p.dateStr)}</strong>.
    </p>

    ${separator()}
    ${label("D&eacute;tails du vol")}
    ${infoRows([
      ["Date", `<span style="text-transform:capitalize;">${esc(p.dateStr)}</span>`],
      ["Heure de départ", `<strong style="font-size:15px;">${esc(p.heure)}</strong>`],
      ["Durée", fmtDuration(p.duree)],
      ["Lieu de départ", "Aéroport de Charleroi (EBCI)"],
    ])}

    ${separator()}
    ${label("Informations pratiques")}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">A&eacute;roport de Charleroi (EBCI), Rue des Fr&egrave;res Wright 8, Gosselies</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">Pr&eacute;sentez-vous <strong>15 minutes avant</strong> le d&eacute;collage. Je serai sur place pour vous accueillir.</td></tr>
      <tr><td class="em-body" style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">Pr&eacute;voyez des <strong>v&ecirc;tements chauds</strong> en cabine, m&ecirc;me en &eacute;t&eacute;.</td></tr>
      <tr><td class="em-body" style="padding:8px 0;font-size:13px;color:#334155;">Aucun document sp&eacute;cifique requis.</td></tr>
    </table>

    ${ctaButton(p.accountUrl, "Voir ma réservation")}

    ${separator()}

    <p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">
      &Agrave; tr&egrave;s bient&ocirc;t &agrave; bord,<br>
      <strong class="em-dark" style="color:#0b2238;">Romain, pilote et fondateur de Fly Horizons</strong>
    </p>
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Une question de derni&egrave;re minute ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>

    ${p.dateISO ? addToCalendarBlock(p.dateISO, p.heure, p.duree) : ""}`;

  return emailBase(body, `Rappel — Votre vol le ${p.dateStr} — Fly Horizons`);
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
      C&rsquo;est avec beaucoup de plaisir que je vous ai accompagn&eacute; lors de votre vol du <strong>${p.dateStr}</strong> (${p.duree}&nbsp;min). Merci de votre confiance pour ce moment. J&rsquo;esp&egrave;re sinc&egrave;rement que vous avez v&eacute;cu quelque chose d&rsquo;unique l&agrave;-haut.
    </p>
    <p class="em-body" style="margin:0 0 4px;font-size:14px;color:#334155;line-height:1.7;">
      Votre avis compte vraiment : il m&rsquo;aide &agrave; am&eacute;liorer chaque vol. L&rsquo;enqu&ecirc;te prend moins d&rsquo;une minute, et je lis chaque r&eacute;ponse personnellement.
    </p>
    ${ctaButton(p.surveyUrl, "Donner mon avis")}
    <p class="em-body" style="margin:20px 0 12px;font-size:14px;color:#334155;line-height:1.7;">
      &Agrave; bient&ocirc;t,<br>
      <strong class="em-dark" style="color:#0b2238;">Romain, pilote et fondateur de Fly Horizons</strong>
    </p>
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
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

// ── 19. Email libre stylisé ───────────────────────────────────────────────────

export function customEmail({ subject, body, rescheduleUrl }: { subject: string; body: string; rescheduleUrl?: string | null }): string {
  const paragraphs = body
    .split("\n")
    .map(line =>
      line.trim() === ""
        ? `<br>`
        : `<p class="em-body" style="margin:0 0 10px;font-size:14px;color:#334155;line-height:1.7;">${esc(line)}</p>`
    )
    .join("");

  const rescheduleBlock = rescheduleUrl ? `
    ${separator()}
    ${ctaButton(rescheduleUrl, "Choisir une nouvelle date")}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;text-align:center;">
      Ce lien vous permet de choisir votre nouvelle date en quelques secondes.
    </p>` : "";

  const emailBody = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Fly Horizons</p>
    <h1 class="em-dark" style="margin:0 0 28px;font-size:20px;font-weight:800;color:#0b2238;">${esc(subject)}</h1>
    ${separator()}
    <div style="margin-bottom:28px;">${paragraphs}</div>
    ${rescheduleBlock}
    ${separator()}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;text-align:center;">
      Des questions ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
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

    ${ctaButton(p.adminUrl, "Voir dans l'admin")}`;

  return emailBase(body, `Itinéraire ${isValidated ? "validé" : "— modification"} — ${p.clientPrenom} ${p.clientNom}`);
}

// ── 19. Invitation à reporter un vol ─────────────────────────────────────────

export function rescheduleInviteEmail(p: {
  prenom: string;
  dateStr: string;
  duree: number;
  rescheduleUrl: string;
}): string {
  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Fly Horizons</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Votre vol est report&eacute;</h1>
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">
      Bonjour ${esc(p.prenom)},
    </p>
    ${separator()}
    <p class="em-body" style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.7;">
      Votre vol du <strong style="color:#0b2238;">${esc(p.dateStr)}</strong> (${esc(fmtDuration(p.duree))}) ne peut pas avoir lieu comme pr&eacute;vu. Nous sommes d&eacute;sol&eacute;s pour ce contretemps.
    </p>
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">
      Votre provision est bien conserv&eacute;e. Choisissez simplement une nouvelle date qui vous convient en cliquant ci-dessous. Le lien est valable 30 jours.
    </p>
    ${ctaButton(p.rescheduleUrl, "Choisir une nouvelle date")}
    <p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">
      &Agrave; tr&egrave;s bient&ocirc;t,<br>
      <strong class="em-dark" style="color:#0b2238;">Romain, pilote et fondateur de Fly Horizons</strong>
    </p>
    ${separator()}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;text-align:center;">
      Des questions ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, "Votre vol est reporté — Fly Horizons");
}

// ── 20. Confirmation de report ────────────────────────────────────────────────

export function rescheduleConfirmationEmail(p: {
  prenom: string;
  oldDateStr: string;
  newDateStr: string;
  duree: number;
  accountUrl: string;
}): string {
  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Fly Horizons</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Report confirm&eacute;</h1>
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">
      Bonjour ${esc(p.prenom)},
    </p>
    ${separator()}
    <p class="em-body" style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.7;">
      Votre vol a bien &eacute;t&eacute; report&eacute;. Voici le r&eacute;capitulatif du changement.
    </p>
    ${infoRows([
      ["Ancienne date", `<span style="text-transform:capitalize;text-decoration:line-through;color:#94a3b8;">${esc(p.oldDateStr)}</span>`],
      ["Nouvelle date", `<span style="text-transform:capitalize;color:#16a34a;font-weight:700;">${esc(p.newDateStr)}</span>`],
      ["Dur&eacute;e", `${p.duree}&nbsp;min`],
    ])}
    ${nextStep("Je confirmerai votre nouveau cr&eacute;neau horaire dans les prochains jours. Votre provision reste acquise.")}

    ${ctaButton(p.accountUrl, "Voir ma réservation")}
    <p class="em-body" style="margin:20px 0 12px;font-size:14px;color:#334155;line-height:1.7;">
      &Agrave; tr&egrave;s bient&ocirc;t,<br>
      <strong class="em-dark" style="color:#0b2238;">Romain, pilote et fondateur de Fly Horizons</strong>
    </p>
    ${separator()}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;text-align:center;">
      Des questions ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, "Votre report est confirmé — Fly Horizons");
}

// ── Route itinéraire (ancien flux texte, /vol/itineraire/[token]) ────────────

export interface RouteItineraireEmailProps {
  prenom: string;
  dateStr: string;
  duree: number;
  route: string;
  routeUrl: string;
}

export function routeItineraireEmail(p: RouteItineraireEmailProps): string {
  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Itin&eacute;raire de vol</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Votre itin&eacute;raire de vol</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, voici l&rsquo;itin&eacute;raire de vol que j&rsquo;ai pr&eacute;par&eacute; pour vous. Regardez et indiquez-moi s&rsquo;il vous convient.</p>

    ${separator()}
    ${label("D&eacute;tails")}
    ${infoRows([
      ["Date", `<strong style="text-transform:capitalize;">${esc(p.dateStr)}</strong>`],
      ["Dur&eacute;e estim&eacute;e", `~${fmtDuration(p.duree)}`],
    ])}

    ${separator()}
    ${label("Itin&eacute;raire pr&eacute;vu")}
    <p class="em-body" style="margin:0 0 20px;font-size:13px;color:#334155;line-height:1.8;white-space:pre-line;border-left:3px solid #F2B705;padding:4px 0 4px 16px;">${esc(p.route)}</p>

    ${ctaButton(p.routeUrl, "Valider ou modifier l’itinéraire")}

    <p class="em-muted" style="margin:0 0 28px;font-size:12px;color:#94a3b8;text-align:center;">Ce lien est actif jusqu&rsquo;&agrave; 48&nbsp;h avant le vol.</p>

    <p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">
      Des ajustements ? Pas de souci, r&eacute;pondez &agrave; cet email ou utilisez le bouton ci-dessus.<br>
      &Agrave; tr&egrave;s bient&ocirc;t,<br>
      <strong class="em-dark" style="color:#0b2238;">Romain, pilote et fondateur de Fly Horizons</strong>
    </p>
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, "Votre itinéraire de vol — Fly Horizons");
}

// ── Route proposal (nouveau flux waypoints, /vol/proposition/[token]) ────────

export interface RouteProposalEmailProps {
  prenom: string;
  dateStr: string;
  waypoints: Array<{ lat?: number; lng?: number; nom?: string }>;
  adminComment: string;
  responseUrl: string;
}

export function routeProposalEmail(p: RouteProposalEmailProps): string {
  const waypointRows = p.waypoints.map((wp, i) => `
    <tr>
      <td style="padding:9px 0;${i < p.waypoints.length - 1 ? "border-bottom:1px solid #f1f5f9;" : ""}vertical-align:middle;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:22px;height:22px;background:#F2B705;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;color:#0b2238;flex-shrink:0;">${i + 1}</div>
          <span class="em-dark" style="font-size:13px;font-weight:600;color:#0b2238;">${esc(wp.nom ?? `Point ${i + 1}`)}</span>
        </div>
      </td>
    </tr>`).join("");

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Proposition d&rsquo;itin&eacute;raire</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Votre itin&eacute;raire personnalis&eacute;</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">
      Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>,
      j&rsquo;ai pr&eacute;par&eacute; un itin&eacute;raire pour votre vol du <strong style="color:#0b2238;">${esc(p.dateStr)}</strong>.
    </p>

    ${p.adminComment ? `
    ${separator()}
    ${label("Message de votre pilote")}
    ${callout(esc(p.adminComment))}
    ` : ""}

    ${separator()}
    ${label("Votre parcours — " + p.waypoints.length + " point" + (p.waypoints.length > 1 ? "s" : ""))}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;vertical-align:middle;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:22px;height:22px;background:#0b2238;border:2px solid #F2B705;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span style="font-size:11px;font-weight:800;color:#F2B705;">&rarr;</span>
            </div>
            <span class="em-muted" style="font-size:13px;color:#64748b;font-weight:600;">Charleroi EBCI &mdash; D&eacute;part</span>
          </div>
        </td>
      </tr>
      ${waypointRows}
      <tr>
        <td style="padding:9px 0;vertical-align:middle;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:22px;height:22px;background:#0b2238;border:2px solid #F2B705;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span style="font-size:11px;font-weight:800;color:#F2B705;">&larr;</span>
            </div>
            <span class="em-muted" style="font-size:13px;color:#64748b;font-weight:600;">Charleroi EBCI &mdash; Retour</span>
          </div>
        </td>
      </tr>
    </table>

    ${ctaButton(p.responseUrl, "Voir la carte et répondre")}

    ${separator()}
    <p class="em-body" style="margin:0 0 20px;font-size:13px;color:#334155;line-height:1.7;">
      Vous pouvez visualiser le trac&eacute; sur la carte, accepter l&rsquo;itin&eacute;raire ou me demander des ajustements.<br>
      Ce lien est personnel et valable uniquement pour cette proposition.<br><br>
      &Agrave; bient&ocirc;t,<br>
      <strong class="em-dark" style="color:#0b2238;">Romain, pilote et fondateur de Fly Horizons</strong>
    </p>
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, `Votre itinéraire personnalisé — Fly Horizons`);
}

// ── Payment link after route acceptance ──────────────────────────────────────

export interface PaymentLinkEmailProps {
  prenom: string;
  dateStr: string;
  duree: number;
  acompte: number;
  paymentUrl: string;
  breakdown?: EmailPriceBreakdown | null;
}

export function paymentLinkEmail(p: PaymentLinkEmailProps): string {
  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">R&eacute;servation confirm&eacute;e</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Finalisez votre r&eacute;servation</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">
      Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>,
      vous avez valid&eacute; votre itin&eacute;raire pour le vol du <strong style="color:#0b2238;">${esc(p.dateStr)}</strong>.
      Il ne reste qu&rsquo;une &eacute;tape&nbsp;: r&eacute;gler la provision pour confirmer d&eacute;finitivement votre r&eacute;servation.
    </p>

    ${separator()}
    ${label("D&eacute;tail")}
    ${infoRows([
      ["Date du vol", `<strong style="text-transform:capitalize;">${esc(p.dateStr)}</strong>`],
      ["D&eacute;part / retour", "Charleroi EBCI"],
      ["Dur&eacute;e estim&eacute;e", `~${p.duree}&nbsp;min`],
    ])}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="border:2px solid #F2B705;border-radius:12px;padding:28px 24px;text-align:center;">
          <p class="em-muted" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;">Provision &agrave; r&eacute;gler</p>
          <p class="em-dark" style="margin:0 0 20px;font-size:42px;font-weight:800;color:#0b2238;line-height:1;">${p.acompte}&nbsp;&euro;</p>
          <a href="${esc(p.paymentUrl)}" class="em-btn"
            style="display:inline-block;background-color:#F2B705;color:#0b2238;font-size:14px;font-weight:800;padding:14px 36px;border-radius:10px;text-decoration:none;">
            R&eacute;gler ma provision &mdash; ${p.acompte}&nbsp;&euro;
          </a>
          <p class="em-muted" style="margin:14px 0 0;font-size:11px;color:#94a3b8;">Paiement s&eacute;curis&eacute; par Stripe, carte bancaire</p>
        </td>
      </tr>
    </table>

    ${p.breakdown ? `${separator()}${label("D&eacute;tail de la provision")}${buildPriceBreakdown({ ...p.breakdown, totalLabel: "Provision &agrave; r&eacute;gler" })}` : ""}

    ${separator()}
    <p class="em-body" style="margin:0 0 20px;font-size:13px;color:#334155;line-height:1.7;">
      La provision encaiss&eacute;e couvre votre vol. Apr&egrave;s le vol, le montant d&eacute;finitif est calcul&eacute; selon la dur&eacute;e r&eacute;ellement effectu&eacute;e. Si la provision d&eacute;passe ce montant, la diff&eacute;rence vous est rembours&eacute;e sous 24&nbsp;h.
    </p>
    <p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">
      &Agrave; tr&egrave;s bient&ocirc;t,<br>
      <strong class="em-dark" style="color:#0b2238;">Romain, pilote et fondateur de Fly Horizons</strong>
    </p>
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, `Finalisez votre réservation — Fly Horizons`);
}

// ── Newsletter — types de blocs ──────────────────────────────────────────────

export type NewsletterBlock =
  | { id: string; type: "text";      content: string }
  | { id: string; type: "heading";   level: 1 | 2; text: string }
  | { id: string; type: "button";    text: string; url: string }
  | { id: string; type: "image";     url: string; alt?: string; link?: string }
  | { id: string; type: "callout";   text: string }
  | { id: string; type: "separator" }

function blockToHtml(block: NewsletterBlock): string {
  switch (block.type) {
    case "text": {
      if (!block.content.trim()) return "";
      const p = `<p class="em-body" style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.75;">`;
      const html = esc(block.content)
        .replace(/\n\n/g, `</p>${p}`)
        .replace(/\n/g, "<br>");
      return `${p}${html}</p>`;
    }
    case "heading": {
      if (!block.text.trim()) return "";
      const sz  = block.level === 1 ? "20px" : "16px";
      const fw  = block.level === 1 ? "800"  : "700";
      const mg  = block.level === 1 ? "0 0 20px" : "0 0 14px";
      return `<h${block.level} class="em-dark" style="margin:${mg};font-size:${sz};font-weight:${fw};color:#0b2238;">${esc(block.text)}</h${block.level}>`;
    }
    case "button": {
      if (!block.text.trim() || !block.url.trim()) return "";
      return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td align="center">
    <a href="${esc(block.url)}" class="em-btn" style="display:inline-block;background-color:#F2B705;color:#0b2238;font-size:14px;font-weight:800;padding:14px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;">${esc(block.text)}</a>
  </td></tr>
</table>`;
    }
    case "image": {
      if (!block.url.trim()) return "";
      const img = `<img src="${esc(block.url)}" alt="${esc(block.alt ?? "")}" style="display:block;max-width:100%;height:auto;border-radius:8px;margin:0 auto;border:0;" />`;
      return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td align="center">${block.link?.trim() ? `<a href="${esc(block.link)}">${img}</a>` : img}</td></tr></table>`;
    }
    case "callout": {
      if (!block.text.trim()) return "";
      return `<p class="em-body" style="margin:0 0 20px;font-size:13px;color:#334155;line-height:1.7;border-left:3px solid #F2B705;padding:2px 0 2px 16px;">${esc(block.text)}</p>`;
    }
    case "separator": {
      return `<hr class="em-sep" style="border:none;border-top:1px solid #e8ecf4;margin:24px 0;">`;
    }
  }
}

// ── Newsletter — éditeur de blocs ────────────────────────────────────────────

export function newsletterFromBlocksEmail(
  subject: string,
  blocks: NewsletterBlock[],
  prenom: string | null,
  unsubscribeUrl: string,
): string {
  const unsubLink = `<a href="${esc(unsubscribeUrl)}" style="color:#94a3b8;text-decoration:underline;">Se d&eacute;sinscrire</a>`;
  const blocksHtml = blocks.map(blockToHtml).filter(Boolean).join("\n");

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Newsletter</p>
    <h1 class="em-dark" style="margin:0 0 28px;font-size:22px;font-weight:800;color:#0b2238;">${esc(subject)}</h1>
    <hr class="em-sep" style="border:none;border-top:1px solid #e8ecf4;margin:0 0 28px;">
    ${blocksHtml || `<p class="em-muted" style="color:#94a3b8;font-size:13px;font-style:italic;">(Aucun contenu)</p>`}
    <hr class="em-sep" style="border:none;border-top:1px solid #e8ecf4;margin:28px 0 0;">`;

  return emailBase(body, subject, unsubLink);
}

// ── Newsletter — confirmation d'inscription ───────────────────────────────────

export function newsletterConfirmationEmail(prenom: string | null, unsubscribeUrl: string): string {
  const unsubLink = `<a href="${esc(unsubscribeUrl)}" style="color:#94a3b8;text-decoration:underline;">Se d&eacute;sinscrire de la newsletter</a>`;

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Newsletter</p>
    <h1 class="em-dark" style="margin:0 0 28px;font-size:22px;font-weight:800;color:#0b2238;">Bienvenue chez Fly Horizons&nbsp;!</h1>

    ${separator()}

    <p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">
      Merci pour votre inscription &agrave; notre newsletter. Vous serez inform&eacute; en avant-premi&egrave;re de nos actualit&eacute;s, nouvelles disponibilit&eacute;s et offres exclusives.
    </p>

    ${ctaButton(SITE_URL, "Découvrir nos vols")}

    ${separator()}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;text-align:center;">
      Des questions ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, "Bienvenue dans la newsletter Fly Horizons", unsubLink);
}

// ── Newsletter — campagne (envoi admin) ───────────────────────────────────────

export function newsletterCampaignEmail(subject: string, body: string, prenom: string | null, unsubscribeUrl: string): string {
  const bodyHtml = esc(body).replace(/\n\n/g, "</p><p style=\"margin:0 0 16px;\">").replace(/\n/g, "<br>");
  const unsubLink = `<a href="${esc(unsubscribeUrl)}" style="color:#94a3b8;text-decoration:underline;">Se d&eacute;sinscrire de la newsletter</a>`;

  const bodyContent = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Newsletter</p>
    <h1 class="em-dark" style="margin:0 0 28px;font-size:22px;font-weight:800;color:#0b2238;">${esc(subject)}</h1>

    ${separator()}

    <div class="em-body" style="font-size:14px;color:#334155;line-height:1.75;">
      <p style="margin:0 0 16px;">${bodyHtml}</p>
    </div>

    ${ctaButton(SITE_URL, "Visiter le site")}

    ${separator()}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;text-align:center;">
      Des questions ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(bodyContent, subject, unsubLink);
}
