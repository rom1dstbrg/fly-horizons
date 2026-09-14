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
const LOGO_URL = "https://fly-horizons.com/logo-fly-horizons-navy.png";

// ── Base ──────────────────────────────────────────────────────────────────────
//
// ARCHITECTURE DES EMAILS PUBLICS (décision 2026-09-14, projet.html → Décisions) — squelette
// fixe : chaque email public choisit lesquels de ces emplacements il utilise, dans cet ordre,
// jamais un ordre improvisé. Détail et justification : plan-refonte-emails.html.
//
//   1. Logo — fixe, emailBase(), jamais touché.
//   2. Phrase d'ouverture — OBLIGATOIRE. Salut + fait principal en une ou deux phrases, poids
//      normal. Jamais de surtitre doré, jamais de <h1> qui redit l'objet du mail.
//   3. Élément hero (optionnel) — le fait fort de cet email juste après l'ouverture :
//      amountCard(), une carte code/voucher, une carte de statut. Absent si l'email n'en a pas.
//   4. Tableau des faits identifiants (optionnel) — infoRows() précédé d'un label() court
//      ("Détails du vol"). Seul endroit où un label reste légitime : il introduit un vrai
//      tableau, pas une phrase.
//   5. Contexte additionnel (optionnel, un seul bloc) — callout() (mise en garde réelle),
//      nextStep() (prochaine action de notre côté), itinéraire, détail de prix... Ne pas empiler
//      plusieurs de ces blocs sauf nécessité réelle.
//   6. Fait(s) pratique(s) du moment (optionnel) — seulement si un fait est vraiment utile à ce
//      stade précis du parcours. Chaque fait distinct sur sa PROPRE LIGNE (<br>, pas de label,
//      pas de puce, pas de <hr>) — ne jamais fondre plusieurs faits dans une même phrase.
//   7. CTA principal (optionnel) — UN SEUL bouton par défaut (ctaButton()). Deux
//      (ctaButtons2()) seulement si les deux actions servent vraiment au même instant (ex. le
//      rappel J-2 : suivre + plan d'accès — seul cas identifié à ce jour).
//   8. Séparateur unique (separator()) — LA seule coupure de tout l'email, juste ici. Pas de
//      <hr> entre les sections précédentes, l'espacement seul les sépare.
//   9. Signature (signOff()) — prénom du pilote si un pilote est déjà identifié pour ce vol,
//      sinon voix institutionnelle "Fly Horizons" (paramètre `pilote` optionnel, `null`/absent
//      par défaut tant que l'attribution réelle n'est pas branchée côté appelant).
//   10. Ligne de contact — une seule phrase, une seule fois (jamais 2-3 façons de dire pareil).
//   11. Ligne complémentaire discrète (optionnel) — report, calendrier (addToCalendarBlock)...
//       texte simple, jamais un nouveau bloc avec titre.
//
// Emails admin (contactNotificationEmail, routeFeedbackAdminEmail, satisfactionResultEmail,
// flightOfferExpiredAdminEmail, piloteReleasedFlightAdminEmail) : hors périmètre de ce squelette,
// gabarit dédié pas encore défini — voir plan-refonte-emails.html.

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
          <td class="em-card" bgcolor="#ffffff" style="background-color:#ffffff;padding:24px 36px 40px;">
            ${bodyContent}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td bgcolor="#ffffff" style="background-color:#ffffff;padding:20px 0 0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">
              Fly Horizons &middot; <a href="https://fly-horizons.com" style="color:#94a3b8;text-decoration:none;">fly-horizons.com</a> &middot; <a href="mailto:info@fly-horizons.com" style="color:#94a3b8;text-decoration:none;">info@fly-horizons.com</a> &middot; <a href="https://wa.me/32472324135" style="color:#94a3b8;text-decoration:none;">WhatsApp</a>
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

// Réservé à UNE seule coupure par email (entre le contenu et la signature/clôture) — pas un
// filet entre chaque section. Décision 2026-09-14 (projet.html → Décisions) : l'espacement seul
// sépare les sections, le <hr> ne marque qu'une vraie rupture "contenu / clôture".
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

// Montant mis en avant (paiement/provision reçu) — carte autonome, pas de <hr> autour.
// Décision 2026-09-14 : remplace le motif "texte centré entre deux séparateurs".
function amountCard(labelText: string, amount: number): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
    <tr>
      <td style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:22px 24px;text-align:center;">
        <p class="em-muted" style="margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.12em;">${labelText}</p>
        <p class="em-gold" style="margin:0;font-size:36px;font-weight:800;color:#F2B705;line-height:1;">${fmt(amount)}</p>
      </td>
    </tr>
  </table>`;
}

// Signature de clôture : voix "je"/prénom si un pilote est déjà identifié pour ce vol, sinon
// voix institutionnelle "Fly Horizons" (le pilote n'est pas encore connu — marketplace).
// Décision 2026-09-14 (projet.html → Décisions). Le param est optionnel : les appelants qui ne
// savent pas encore quel pilote est assigné passent `null`/rien, et obtiennent la voix "nous".
function signOff(pilote?: { prenom: string } | null, closing = "À très bientôt à bord,"): string {
  return `<p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">
    ${esc(closing)}<br>
    <strong class="em-dark" style="color:#0b2238;">${pilote?.prenom ? esc(pilote.prenom) : "Fly Horizons"}</strong>
  </p>`;
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

// Section "Itinéraire prévu" partagée entre reservationDateConfirmeeEmail et
// reservationHeureConfirmeeEmail — routeUrl (système carte / route_proposals) est le vrai
// signal qu'un itinéraire existe ; route (texte libre, ancien système) n'est qu'un
// complément d'affichage optionnel, jamais requis pour afficher le lien.
function routeSectionBlock(route: string | null | undefined, routeUrl: string | null | undefined): string {
  if (!routeUrl) return "";
  return `
    ${separator()}
    ${label("Itin&eacute;raire pr&eacute;vu")}
    ${route ? `<p class="em-body" style="margin:0 0 20px;font-size:13px;color:#334155;line-height:1.8;white-space:pre-line;border-left:3px solid #F2B705;padding:4px 0 4px 16px;">${esc(route)}</p>` : ""}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr><td align="center">
      <a href="${esc(routeUrl)}" class="em-btn"
        style="display:inline-block;background-color:#F2B705;color:#0b2238;font-size:14px;font-weight:800;padding:14px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;">
        Valider ou modifier l&rsquo;itin&eacute;raire
      </a>
    </td></tr></table>`;
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

  const pad = (n: number) => String(n).padStart(2, "0");

  // Calculer la fin via Date pour gérer le passage minuit
  const startDate = new Date(`${dateISO}T${pad(startH)}:${pad(startM)}:00Z`);
  const endDate   = new Date(startDate.getTime() + dureeMin * 60 * 1000);
  const endH = endDate.getUTCHours();
  const endM = endDate.getUTCMinutes();
  const endDateISO = endDate.toISOString().slice(0, 10);

  const startCompact = dateISO.replace(/-/g, "");
  const endCompact   = endDateISO.replace(/-/g, "");

  const gcalDates = `${startCompact}T${pad(startH)}${pad(startM)}00/${endCompact}T${pad(endH)}${pad(endM)}00`;
  const outlookStart = `${dateISO}T${pad(startH)}:${pad(startM)}:00`;
  const outlookEnd   = `${endDateISO}T${pad(endH)}:${pad(endM)}:00`;

  const title    = encodeURIComponent(`Vol Fly Horizons (${dureeMin} min)`);
  const details  = encodeURIComponent("Vol en avion léger avec Romain, Fly Horizons");
  const location = encodeURIComponent("Aéroport de Charleroi (EBCI), Rue des Frères Wright 8, Gosselies");

  const googleUrl  = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${gcalDates}&details=${details}&location=${location}`;
  const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${outlookStart}&enddt=${outlookEnd}&body=${details}&location=${location}`;
  const appleUrl   = `${SITE_URL}/api/ical?date=${dateISO}&heure=${encodeURIComponent(heure)}&duree=${dureeMin}`;

  // Ligne de texte, pas un bloc à 3 boutons encadrés — décision 2026-09-14.
  return `<p class="em-muted" style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
    Ajouter &agrave; l&rsquo;agenda&nbsp;: <a href="${esc(googleUrl)}" style="color:#94a3b8;text-decoration:underline;">Google</a> &middot; <a href="${esc(appleUrl)}" style="color:#94a3b8;text-decoration:underline;">Apple</a> &middot; <a href="${esc(outlookUrl)}" style="color:#94a3b8;text-decoration:underline;">Outlook</a>
  </p>`;
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
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">${customerName ? `Merci <strong style="color:#0b2238;">${esc(customerName)}</strong>, votre commande` : "Merci, votre commande"} <strong style="color:#0b2238;">#${esc(orderRef)}</strong> est confirm&eacute;e.</p>

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

    ${separator()}

    <p class="em-dark" style="margin:0 0 2px;font-size:18px;font-weight:800;color:#0b2238;letter-spacing:0.04em;">REÇU</p>
    <p class="em-muted" style="margin:0 0 20px;font-size:12px;color:#94a3b8;">N&deg; REC-${esc(orderRef)} &middot; ${invoiceDate} &middot; Carte bancaire</p>

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
    <p class="em-muted" style="margin:20px 0 0;font-size:12px;color:#64748b;text-align:center;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, `Confirmation de commande #${orderRef} · Fly Horizons`);
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
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">
      ${customerName ? `Bonjour <strong style="color:#0b2238;">${esc(customerName)}</strong>, ${codes.length > 1 ? "vos bons de vol sont prêts" : "votre bon de vol est prêt"}` : codes.length > 1 ? "Vos bons de vol sont prêts" : "Votre bon de vol est prêt"} &mdash; merci pour votre achat.
    </p>

    ${codeCards}

    ${label("Comment l&rsquo;utiliser")}
    <p class="em-body" style="margin:0 0 28px;font-size:13px;color:#334155;line-height:1.9;">
      Cliquez sur « R&eacute;server mon vol » ci-dessus : votre code sera pr&eacute;-rempli.<br>
      Choisissez votre date et votre cr&eacute;neau horaire.<br>
      Finalisez votre r&eacute;servation &mdash; le vol est int&eacute;gralement couvert par votre bon.
    </p>

    <p class="em-body" style="margin:0 0 28px;font-size:13px;color:#334155;line-height:1.9;">
      Pour un vol plus long que la dur&eacute;e du bon, celui-ci s&rsquo;applique comme r&eacute;duction : vous ne payez que la diff&eacute;rence.<br>
      En cas de perte de cet email, votre bon reste disponible dans <a href="${SITE_URL}/account" style="color:#F2B705;font-weight:600;text-decoration:none;">votre espace client</a>.
    </p>

    ${separator()}
    ${signOff(null)}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, `Vos vouchers Fly Horizons · #${orderRef}`);
}

// ── 5. Vol sur mesure — confirmation de demande (sans paiement) ───────────────

export interface VolSurMesureQuoteEmailProps {
  prenom: string;
  nom: string;
  date: string;
  heure: string;
  dureeMin: number;
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
  /** Pilote déjà identifié pour ce vol, s'il y en a un — sinon voix institutionnelle "Fly Horizons". */
  pilote?: { prenom: string } | null;
}

export function volSurMesureQuoteEmail(props: VolSurMesureQuoteEmailProps): string {
  const {
    prenom, date, heure, dureeMin, distKm, reservationId, styleVol, stopovers,
    prixEstime, discount, prixBillable, acompte, taxesEscales, totalAcompte,
    voucherCode, pilote,
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
    ["Durée estimée", `~${dureeMin}&nbsp;min &middot; ${distKm}&nbsp;km`],
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

  const analysePronoun = pilote?.prenom ? esc(pilote.prenom) : "Nous";
  const analyseVerbe = pilote?.prenom ? "va" : "allons";

  const nextStepsSection = totalAcompte > 0
    ? `${label("Prochaines &eacute;tapes")}
    <p class="em-body" style="margin:0 0 20px;font-size:13px;color:#334155;line-height:1.7;">
      ${analysePronoun} ${analyseVerbe} analyser votre itin&eacute;raire dans les <strong>24&nbsp;h</strong> et vous enverr${pilote?.prenom ? "a" : "ons"} une proposition de route d&eacute;finitive (ajust&eacute;e si une zone ne peut pas &ecirc;tre survol&eacute;e). Une fois la route valid&eacute;e, vous recevrez un lien pour r&eacute;gler la provision. <strong>Aucun paiement n&rsquo;est demand&eacute; &agrave; ce stade.</strong>
    </p>`
    : callout(`Votre vol est enti&egrave;rement couvert par votre voucher, aucun paiement requis. ${pilote?.prenom ? `${esc(pilote.prenom)} vous contactera` : "Nous vous contacterons"} sous 24&nbsp;h pour vous envoyer la route d&eacute;finitive.`);

  const body = `
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">Bonjour <strong style="color:#0b2238;">${esc(prenom)}</strong>, voici le r&eacute;capitulatif de votre demande de vol sur mesure.</p>

    ${label("Itin&eacute;raire")}
    ${infoRows(itineraireRows)}
    ${reservationId ? ctaButton(`${SITE_URL}/account/reservations/${reservationId}`, "Voir mon itinéraire") : ""}

    ${label("Devis : estimation des co&ucirc;ts")}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Co&ucirc;t du vol estim&eacute; (~${dureeMin}&nbsp;min, ~${distKm}&nbsp;km)</td>
        <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;text-align:right;white-space:nowrap;">${fmt(prixEstime)}</td>
      </tr>
      ${voucherRow}
      ${taxesRow}
      ${totalAcompte > 0 ? `<tr>
        <td class="em-dark" style="padding:14px 0 4px;font-size:14px;font-weight:800;color:#0b2238;border-top:1px solid #e8ecf4;">Provision estim&eacute;e</td>
        <td class="em-gold" style="padding:14px 0 4px;font-size:18px;font-weight:800;color:#F2B705;text-align:right;border-top:1px solid #e8ecf4;white-space:nowrap;">${fmt(totalAcompte)}</td>
      </tr>` : ""}
    </table>
    <p class="em-muted" style="margin:0 0 28px;font-size:12px;color:#94a3b8;line-height:1.6;">Estimations bas&eacute;es sur l&rsquo;itin&eacute;raire soumis, ajust&eacute;es si la route change. Montant d&eacute;finitif &eacute;tabli apr&egrave;s le vol selon la dur&eacute;e r&eacute;ellement effectu&eacute;e.</p>

    ${nextStepsSection}

    ${separator()}
    ${signOff(pilote)}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, `Votre vol sur mesure · ${dateStr}`);
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
  /** Montant à payer une fois la demande confirmée par le pilote (undefined/0 = vol déjà couvert, rien à payer). */
  montant?: number | null;
  /** Pilote déjà identifié pour ce vol, s'il y en a un — sinon voix institutionnelle "Fly Horizons". */
  pilote?: { prenom: string } | null;
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

  const calloutText = p.montant
    ? `Ce vol n&rsquo;est pas encore confirm&eacute;. Nous v&eacute;rifions la disponibilit&eacute; d&rsquo;un pilote et revenons vers vous sous 72h. Si le vol peut avoir lieu, vous recevrez un lien de paiement s&eacute;curis&eacute; pour la participation aux frais (${fmt(p.montant)}) — aucun paiement n&rsquo;est demand&eacute; avant cette confirmation.`
    : "Votre vol est enti&egrave;rement pris en charge par votre voucher, aucun paiement suppl&eacute;mentaire requis. En cas de m&eacute;t&eacute;o d&eacute;favorable, le vol est report&eacute; sans frais.";

  const nextStepText = p.pilote?.prenom
    ? `${esc(p.pilote.prenom)} vous enverra votre itin&eacute;raire de vol dans les prochains jours, avec les lieux que vous survolerez.`
    : `Nous vous enverrons votre itin&eacute;raire de vol dans les prochains jours, avec les lieux que vous survolerez.`;

  const body = `
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, votre demande de vol a bien &eacute;t&eacute; enregistr&eacute;e.</p>

    ${label("D&eacute;tails du vol")}
    ${infoRows(rows)}

    ${callout(calloutText)}

    ${nextStep(nextStepText)}

    ${separator()}
    ${signOff(p.pilote)}
    <p class="em-muted" style="margin:0 0 24px;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>

    ${p.reservationId ? ctaButton(`${SITE_URL}/account/reservations/${p.reservationId}`, "Suivre ma réservation") : ""}`;

  return emailBase(body, "Réservation confirmée · Fly Horizons");
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

  const nextStepText = p.pilote?.prenom
    ? `${esc(p.pilote.prenom)} vous enverra votre itin&eacute;raire de vol dans les prochains jours, avec les lieux que vous survolerez.`
    : `Nous vous enverrons votre itin&eacute;raire de vol dans les prochains jours, avec les lieux que vous survolerez.`;

  const body = `
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, votre paiement a bien &eacute;t&eacute; re&ccedil;u &mdash; votre vol est confirm&eacute;.</p>

    ${amountCard("Montant pay&eacute;", p.montantPaye)}

    ${label("D&eacute;tails du vol")}
    ${infoRows(rows)}

    ${nextStep(nextStepText)}

    ${separator()}
    ${signOff(p.pilote)}
    <p class="em-muted" style="margin:0 0 24px;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>

    ${p.reservationId ? ctaButton(`${SITE_URL}/account/reservations/${p.reservationId}`, "Suivre ma réservation") : ""}

    ${p.dateISO ? addToCalendarBlock(p.dateISO, p.heure, p.duree) : ""}`;

  return emailBase(body, "Paiement confirmé · Fly Horizons");
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
  /** Pilote déjà identifié pour ce vol, s'il y en a un — sinon voix institutionnelle "Fly Horizons". */
  pilote?: { prenom: string } | null;
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
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, votre provision a bien &eacute;t&eacute; re&ccedil;ue &mdash; votre r&eacute;servation est confirm&eacute;e.</p>

    ${amountCard("Provision pay&eacute;e", p.montantPaye)}

    ${label("Vol sur mesure")}
    ${infoRows(rows)}

    ${p.breakdown ? `${label("D&eacute;tail du paiement")}${buildPriceBreakdown({ ...p.breakdown, totalLabel: "Provision r&eacute;gl&eacute;e" })}` : ""}

    <p class="em-body" style="margin:0 0 28px;font-size:13px;color:#334155;line-height:1.7;">
      La provision couvre le co&ucirc;t r&eacute;el du vol, calcul&eacute; apr&egrave;s le vol selon la dur&eacute;e effectivement r&eacute;alis&eacute;e (elle peut varier avec la m&eacute;t&eacute;o ou le contr&ocirc;le a&eacute;rien). Si elle d&eacute;passe le montant d&eacute;finitif, la diff&eacute;rence est rembours&eacute;e sous 24&nbsp;h. En cas de m&eacute;t&eacute;o d&eacute;favorable, le vol est report&eacute; sans frais.
    </p>

    ${nextStep(`C&rsquo;est tout bon&nbsp;! Rendez-vous le <strong>${esc(p.dateStr)}</strong> &agrave; <strong>${esc(p.heure)}</strong> &agrave; l&rsquo;a&eacute;roport de Charleroi (EBCI). Pr&eacute;sentez-vous 15&nbsp;min avant le d&eacute;collage.`)}

    ${separator()}
    ${signOff(p.pilote)}
    <p class="em-muted" style="margin:0 0 24px;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>

    ${p.reservationId ? ctaButton(`${SITE_URL}/account/reservations/${p.reservationId}`, "Suivre ma réservation") : ""}

    ${p.dateISO ? addToCalendarBlock(p.dateISO, p.heure, p.dureeEstimee) : ""}`;

  return emailBase(body, "Provision reçue · Vol sur mesure Fly Horizons");
}

// ── 9. Date de vol confirmée (admin) ──────────────────────────────────────────

export interface ReservationDateConfirmeeProps {
  prenom: string;
  dateStr: string;
  duree: number;
  route?: string | null;
  routeUrl?: string | null;
  /** Pilote déjà identifié pour ce vol, s'il y en a un — sinon voix institutionnelle "Fly Horizons". */
  pilote?: { prenom: string } | null;
}

export interface ReservationHeureConfirmeeProps {
  prenom: string;
  dateStr: string;
  heure: string;
  duree: number;
  route?: string | null;
  routeUrl?: string | null;
  dateISO?: string | null;
  /** Pilote déjà identifié pour ce vol, s'il y en a un — sinon voix institutionnelle "Fly Horizons". */
  pilote?: { prenom: string } | null;
}

// Vol pilote (modèle A) : participation aux frais réglée en direct au pilote,
// envoyée au client quand il valide l'itinéraire (pas avant).
export interface PiloteParticipationInfo {
  piloteNom: string;
  montant: number | null;
  iban: string | null;
  paylink: string | null;
  communication: string;
  qrUrl: string;
  trackerUrl: string;
}

function piloteParticipationBlock(pp: PiloteParticipationInfo): string {
  if (pp.montant == null) {
    return `
      ${separator()}
      ${label("Participation aux frais")}
      <p class="em-body" style="margin:0 0 24px;font-size:13px;color:#334155;line-height:1.7;">
        ${esc(pp.piloteNom)} vous communiquera le montant de la participation aux frais et vous contactera pour le r&egrave;glement. Fly Horizons n&rsquo;encaisse rien sur ce vol.
      </p>`;
  }
  return `
    ${separator()}
    ${label("Participation aux frais")}
    <p class="em-body" style="margin:0 0 16px;font-size:13px;color:#334155;line-height:1.7;">
      <strong>${fmt(pp.montant)}</strong> &agrave; r&eacute;gler directement &agrave; votre pilote <strong>${esc(pp.piloteNom)}</strong>
      (virement / QR / Payconiq). Fly Horizons n&rsquo;encaisse rien et ne prend aucune commission.
    </p>
    ${pp.iban ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td width="140" style="vertical-align:top;padding-right:12px;">
          <img src="${esc(pp.qrUrl)}" alt="QR virement SEPA" width="130" height="130" style="display:block;border:1px solid #e8ecf4;border-radius:8px;" />
        </td>
        <td style="vertical-align:top;font-size:12px;color:#64748b;line-height:1.7;">
          Scannez le QR avec votre appli bancaire, ou virez manuellement&nbsp;:<br>
          <span style="font-family:'Courier New',monospace;color:#0b2238;">${esc(pp.iban)}</span><br>
          B&eacute;n&eacute;ficiaire&nbsp;: ${esc(pp.piloteNom)}<br>
          Communication&nbsp;: ${esc(pp.communication)}
        </td>
      </tr>
    </table>` : ""}
    ${pp.paylink ? secondaryButton(pp.paylink, "Payer via Payconiq / Revolut") : ""}
    <p class="em-muted" style="margin:12px 0 24px;font-size:12px;color:#64748b;">
      Le d&eacute;tail est aussi sur <a href="${esc(pp.trackerUrl)}" style="color:#F2B705;font-weight:600;text-decoration:none;">votre page de suivi</a>.
    </p>`;
}

export function reservationDateConfirmeeEmail(p: ReservationDateConfirmeeProps): string {
  const hasRoute = !!p.routeUrl;
  const routeSection = routeSectionBlock(p.route, p.routeUrl);

  const nextStepText = p.pilote?.prenom
    ? `${esc(p.pilote.prenom)} vous confirmera l&rsquo;heure exacte du d&eacute;part et vous enverra l&rsquo;itin&eacute;raire pr&eacute;vu quelques jours avant votre vol.`
    : `Nous vous confirmerons l&rsquo;heure exacte du d&eacute;part et vous enverrons l&rsquo;itin&eacute;raire pr&eacute;vu quelques jours avant votre vol.`;

  const body = `
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, votre date du <strong style="color:#0b2238;text-transform:capitalize;">${esc(p.dateStr)}</strong> est confirm&eacute;e.</p>

    ${label("D&eacute;tails")}
    ${infoRows([
      ["Date confirmée", `<strong style="text-transform:capitalize;">${esc(p.dateStr)}</strong>`],
      ["Durée estimée", `~${fmtDuration(p.duree)}`],
      ["Lieu", "Aéroport de Charleroi (EBCI)"],
    ])}

    ${callout("Votre date est bloqu&eacute;e dans notre planning. Si les conditions m&eacute;t&eacute;o ne permettent pas le vol ce jour-l&agrave;, il sera report&eacute; sans frais suppl&eacute;mentaires.")}

    ${!hasRoute ? nextStep(nextStepText) : ""}

    ${routeSection}

    ${separator()}
    ${signOff(p.pilote)}
    <p class="em-muted" style="margin:0 0 8px;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Besoin de reporter ? Choisissez une nouvelle date jusqu&rsquo;&agrave; 48&nbsp;h avant le d&eacute;collage depuis
      <a href="${SITE_URL}/account#reservations" style="color:#F2B705;font-weight:600;text-decoration:none;">votre espace client</a>.
    </p>`;

  return emailBase(body, "Votre date de vol est confirmée · Fly Horizons");
}

// ── 10. Créneau horaire confirmé (admin) ──────────────────────────────────────

/** Email envoyé au client quand il valide l'itinéraire d'un vol pilote : comment régler la participation. */
export function piloteParticipationEmail(p: { prenom: string; dateStr: string } & PiloteParticipationInfo): string {
  const body = `
    <p class="em-body" style="margin:0 0 24px;font-size:14px;color:#334155;line-height:1.7;">
      Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, votre itin&eacute;raire du
      <strong style="color:#0b2238;">${esc(p.dateStr)}</strong> est valid&eacute; &mdash; il ne reste plus qu&rsquo;&agrave; r&eacute;gler la participation aux frais &agrave; votre pilote.
    </p>
    ${piloteParticipationBlock(p)}
    <p class="em-body" style="margin:0 0 20px;font-size:13px;color:#334155;line-height:1.7;">
      Une fois le r&egrave;glement effectu&eacute;, votre vol est d&eacute;finitivement confirm&eacute;. Votre pilote vous
      donnera les derniers d&eacute;tails pratiques.
    </p>
    ${separator()}
    ${signOff({ prenom: p.piloteNom })}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Une question ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;
  return emailBase(body, "Itinéraire validé · Fly Horizons");
}

export function reservationHeureConfirmeeEmail(p: ReservationHeureConfirmeeProps): string {
  const hasRoute = !!p.routeUrl;
  const routeSection = routeSectionBlock(p.route, p.routeUrl);

  const nextStepText = !hasRoute
    ? (p.pilote?.prenom
        ? `${esc(p.pilote.prenom)} vous enverra votre itin&eacute;raire de vol avant le jour J, avec les lieux que vous survolerez.`
        : `Nous vous enverrons votre itin&eacute;raire de vol avant le jour J, avec les lieux que vous survolerez.`)
    : `C&rsquo;est tout bon&nbsp;! Rendez-vous le <strong>${esc(p.dateStr)}</strong> &agrave; <strong>${esc(p.heure)}</strong> &agrave; l&rsquo;a&eacute;roport de Charleroi (EBCI). Pr&eacute;sentez-vous 15&nbsp;min avant le d&eacute;collage.`;

  const body = `
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, votre vol du <strong style="color:#0b2238;text-transform:capitalize;">${esc(p.dateStr)}</strong> &agrave; <strong style="color:#0b2238;">${esc(p.heure)}</strong> est planifi&eacute;.</p>

    ${label("D&eacute;tails du vol")}
    ${infoRows([
      ["Date", `<strong style="text-transform:capitalize;">${esc(p.dateStr)}</strong>`],
      ["Heure de d&eacute;part", `<strong>${esc(p.heure)}</strong>`],
      ["Dur&eacute;e estim&eacute;e", `~${p.duree}&nbsp;min`],
      ["D&eacute;part, retour", "Charleroi (EBCI)"],
    ])}

    ${routeSection}

    ${nextStep(nextStepText)}

    ${separator()}
    ${signOff(p.pilote, "Beau temps et bon vol,")}
    <p class="em-muted" style="margin:0 0 8px;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Emp&ecirc;chement de derni&egrave;re minute ? Vous pouvez reporter votre vol jusqu&rsquo;&agrave; 48&nbsp;h avant le d&eacute;collage depuis
      <a href="${SITE_URL}/account#reservations" style="color:#F2B705;font-weight:600;text-decoration:none;">votre espace client</a>.
    </p>

    ${p.dateISO ? addToCalendarBlock(p.dateISO, p.heure, p.duree) : ""}`;

  return emailBase(body, "Votre créneau horaire est confirmé · Fly Horizons");
}

// ── 10bis. Nouvelle date confirmée après un report (admin) ────────────────────
// Volontairement minimal : le client a déjà reçu l'itinéraire et les informations
// pratiques lors de la confirmation initiale, avant le report. On ne fait ici que
// confirmer la nouvelle date/heure, sans reproduire tout l'onboarding.

export interface ReservationReportConfirmeeProps {
  prenom: string;
  dateStr: string;
  heure: string;
  duree: number;
  dateISO?: string | null;
  /** Pilote déjà identifié pour ce vol, s'il y en a un — sinon voix institutionnelle "Fly Horizons". */
  pilote?: { prenom: string } | null;
}

export function reservationReportConfirmeeEmail(p: ReservationReportConfirmeeProps): string {
  const body = `
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, la nouvelle date de votre vol report&eacute; est confirm&eacute;e.</p>

    ${label("D&eacute;tails")}
    ${infoRows([
      ["Date", `<strong style="text-transform:capitalize;">${esc(p.dateStr)}</strong>`],
      ["Heure de d&eacute;part", `<strong>${esc(p.heure)}</strong>`],
      ["Dur&eacute;e estim&eacute;e", `~${fmtDuration(p.duree)}`],
    ])}

    <p class="em-body" style="margin:0 0 28px;font-size:13px;color:#334155;line-height:1.7;">
      Rien d&rsquo;autre ne change&nbsp;: vous avez d&eacute;j&agrave; re&ccedil;u l&rsquo;itin&eacute;raire et les informations pratiques pour votre vol.
    </p>

    ${separator()}
    ${signOff(p.pilote)}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>

    ${p.dateISO ? addToCalendarBlock(p.dateISO, p.heure, p.duree) : ""}`;

  return emailBase(body, "Votre nouvelle date de vol est confirmée · Fly Horizons");
}

// ── 10ter. Boarding pass (envoyé manuellement depuis l'admin) ─────────────────

export interface BoardingPassEmailProps {
  prenom: string;
  dateStr: string;
  heure: string;
  duree: number;
}

export function boardingPassEmail(p: BoardingPassEmailProps): string {
  const body = `
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, voici votre boarding pass en pi&egrave;ce jointe.</p>

    ${label("D&eacute;tails")}
    ${infoRows([
      ["Date", `<strong style="text-transform:capitalize;">${esc(p.dateStr)}</strong>`],
      ["Heure de d&eacute;part", `<strong>${esc(p.heure)}</strong>`],
      ["Dur&eacute;e estim&eacute;e", `~${fmtDuration(p.duree)}`],
    ])}

    <p class="em-body" style="margin:0 0 28px;font-size:13px;color:#334155;line-height:1.7;">
      Imprimez-le et pr&eacute;sentez-le le jour du vol &agrave; l&rsquo;a&eacute;roport de Charleroi (EBCI).
    </p>

    ${separator()}
    ${signOff(null)}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, "Votre boarding pass · Fly Horizons");
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

  return emailBase(body, `Nouveau message : ${sujet} · ${nom}`);
}

// ── 12. Contact — accusé de réception client ─────────────────────────────────

export interface ContactAcknowledgmentProps {
  nom: string;
  email: string;
  sujet: string;
  message: string;
  threadUrl?: string;
}

export function contactAcknowledgmentEmail({ nom, sujet, message, threadUrl }: ContactAcknowledgmentProps): string {
  const body = `
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">Bonjour <strong style="color:#0b2238;">${esc(nom)}</strong>, votre message a bien &eacute;t&eacute; re&ccedil;u &mdash; nous vous r&eacute;pondrons dans les meilleurs d&eacute;lais.</p>

    ${label("Votre message")}
    <p class="em-body" style="margin:0 0 4px;font-size:14px;color:#334155;font-weight:600;">${esc(sujet)}</p>
    <p class="em-body" style="margin:0 0 28px;font-size:13px;color:#334155;line-height:1.7;white-space:pre-wrap;border-left:3px solid #F2B705;padding:2px 0 2px 16px;">${esc(message)}</p>

    ${threadUrl ? ctaButton(threadUrl, "Suivre la conversation") : ""}

    ${separator()}
    ${signOff(null, "À bientôt,")}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      C&rsquo;est urgent ? <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">Contactez-nous sur WhatsApp</a>.
    </p>`;

  return emailBase(body, "Votre message a été reçu · Fly Horizons");
}

// ── 13. Contact — réponse admin ───────────────────────────────────────────────

export interface ContactReplyProps {
  nom: string;
  email: string;
  sujet: string;
  reponse: string;
  threadUrl: string;
}

export function contactReplyEmail({ nom, sujet, reponse, threadUrl }: ContactReplyProps): string {
  const body = `
    <p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">Bonjour <strong style="color:#0b2238;">${esc(nom)}</strong>, vous avez re&ccedil;u une r&eacute;ponse concernant <strong style="color:#0b2238;">${esc(sujet)}</strong>&nbsp;:</p>

    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;white-space:pre-wrap;border-left:3px solid #F2B705;padding:2px 0 2px 16px;">${esc(reponse)}</p>

    ${ctaButton(threadUrl, "Voir la conversation")}

    ${separator()}
    ${signOff(null)}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, `Réponse de Fly Horizons · ${sujet}`);
}

// ── 13b. Messagerie pilote ↔ client (fil rattaché à la réservation) ──────────

export interface ReservationMessageProps {
  prenom: string;
  expediteurNom: string; // nom du pilote, ou "l'équipe Fly Horizons" côté admin
  dateStr: string;
  message: string;
  signature: string;
  threadUrl: string;
}

export function reservationMessageEmail({
  prenom,
  expediteurNom,
  dateStr,
  message,
  signature,
  threadUrl,
}: ReservationMessageProps): string {
  const body = `
    <p class="em-body" style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.7;">Bonjour <strong style="color:#0b2238;">${esc(prenom)}</strong>, ${esc(expediteurNom)} vous a &eacute;crit &agrave; propos de votre vol du <strong style="color:#0b2238;text-transform:capitalize;">${esc(dateStr)}</strong>&nbsp;:</p>

    <p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;white-space:pre-wrap;border-left:3px solid #F2B705;padding:2px 0 2px 16px;">${esc(message)}</p>

    <p class="em-body" style="margin:0 0 28px;font-size:13px;color:#334155;line-height:1.6;white-space:pre-wrap;">${esc(signature)}</p>

    ${ctaButton(threadUrl, "Répondre")}

    ${separator()}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Fly Horizons met en relation les pilotes et les passagers. Les échanges sur votre vol se
      font directement avec votre pilote — ce lien vous donne accès à toute la conversation.
    </p>`;

  return emailBase(body, `Message · votre vol du ${dateStr}`);
}

export interface ReservationMessageClientReplyProps {
  clientNom: string;
  dateStr: string;
  message: string;
  adminUrl: string;
}

export function reservationMessageClientReplyEmail({
  clientNom,
  dateStr,
  message,
  adminUrl,
}: ReservationMessageClientReplyProps): string {
  const body = `
    <p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;"><strong style="color:#0b2238;">${esc(clientNom)}</strong> a r&eacute;pondu, vol du <strong style="color:#0b2238;text-transform:capitalize;">${esc(dateStr)}</strong>&nbsp;:</p>

    <p class="em-body" style="margin:0 0 28px;font-size:13px;color:#334155;line-height:1.7;white-space:pre-wrap;border-left:3px solid #F2B705;padding:2px 0 2px 16px;">${esc(message)}</p>

    ${ctaButton(adminUrl, "Ouvrir dans l'espace pilote")}
    `;

  return emailBase(body, `${clientNom} a répondu · vol du ${dateStr}`);
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
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)} ${esc(p.nom)}</strong>, voici le r&eacute;capitulatif de votre r&eacute;servation.</p>

    ${label("D&eacute;tails du vol")}
    ${infoRows(rows)}

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

    ${p.breakdown ? `${label("D&eacute;tail du paiement")}${buildPriceBreakdown(p.breakdown)}` : ""}

    ${separator()}
    ${signOff(null)}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, `Votre réservation · ${p.dateStr}`);
}


// ── 14b. Règlement d'une annonce pilote par virement (aucun PSP) ─────────────
// Envoyé au client quand le pilote a confirmé la route de son annonce. Le
// règlement se fait par virement direct au pilote via la page de paiement
// dédiée — jamais par carte / Stripe (décision 08/09).

export interface AnnoncePaiementVirementProps {
  prenom: string;
  nom: string;
  dateStr: string;
  heure: string;
  duree: number;
  montant: number;
  piloteNom: string;
  paiementUrl: string;
}

export function annoncePaiementVirementEmail(p: AnnoncePaiementVirementProps): string {
  const rows: Array<[string, string]> = [
    ["Date", `<span style="text-transform:capitalize;">${esc(p.dateStr)}</span>`],
    ["Heure de départ", esc(p.heure)],
    ["Durée du vol", fmtDuration(p.duree)],
    ["Départ / retour", "Charleroi EBCI"],
    ["Pilote", esc(p.piloteNom)],
  ];

  const body = `
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)} ${esc(p.nom)}</strong>, ${esc(p.piloteNom)} a confirm&eacute; l&rsquo;itin&eacute;raire &mdash; il ne reste qu&rsquo;&agrave; r&eacute;gler votre participation aux frais directement par virement.</p>

    ${label("D&eacute;tails du vol")}
    ${infoRows(rows)}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="border:2px solid #F2B705;border-radius:12px;padding:28px 24px;text-align:center;">
          <p class="em-muted" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;">Participation &agrave; r&eacute;gler au pilote</p>
          <p class="em-dark" style="margin:0 0 20px;font-size:42px;font-weight:800;color:#0b2238;line-height:1;">${fmt(p.montant)}</p>
          <a href="${esc(p.paiementUrl)}" class="em-btn"
            style="display:inline-block;background-color:#F2B705;color:#0b2238;font-size:14px;font-weight:800;padding:14px 36px;border-radius:10px;text-decoration:none;">
            Voir la page de paiement
          </a>
          <p class="em-muted" style="margin:14px 0 0;font-size:11px;color:#94a3b8;">Virement SEPA (IBAN + QR code) &mdash; aucun paiement par carte, Fly Horizons n&rsquo;encaisse rien</p>
        </td>
      </tr>
    </table>

    <p class="em-body" style="margin:0 0 28px;font-size:13px;color:#334155;line-height:1.7;">
      Le pilote confirmera la r&eacute;ception de votre virement dans votre espace, et votre re&ccedil;u sera alors disponible au t&eacute;l&eacute;chargement sur cette m&ecirc;me page.
    </p>

    ${separator()}
    ${signOff({ prenom: p.piloteNom })}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Une question ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, `Réglez votre vol partagé · ${p.dateStr}`);
}

// ── 13b. Annonce pilote — paiement confirmé ──────────────────────────────────

export interface AnnoncePaiementConfirmeProps {
  prenom: string;
  nom: string;
  dateStr: string;
  heure: string;
  duree: number;
  piloteNom: string;
  montant: number;
  receiptUrl: string;
}

export function annoncePaiementConfirmeEmail(p: AnnoncePaiementConfirmeProps): string {
  const rows: Array<[string, string]> = [
    ["Date", `<span style="text-transform:capitalize;">${esc(p.dateStr)}</span>`],
    ["Heure de départ", esc(p.heure)],
    ["Durée du vol", fmtDuration(p.duree)],
    ["Pilote", esc(p.piloteNom)],
  ];

  const body = `
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)} ${esc(p.nom)}</strong>, ${esc(p.piloteNom)} confirme avoir bien re&ccedil;u votre participation aux frais.</p>

    ${amountCard("Montant r&eacute;gl&eacute;", p.montant)}

    ${label("D&eacute;tails du vol")}
    ${infoRows(rows)}

    ${ctaButton(p.receiptUrl, "Télécharger mon reçu")}

    ${separator()}
    ${signOff({ prenom: p.piloteNom })}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Une question ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, "Paiement confirmé · Fly Horizons");
}

// ── 13c. Annonce pilote — mode « à la place », inscription en attente ───────
// Le prix n'est pas encore connu : il dépend du nombre réel de passagers une
// fois le groupe complet (part égale entre tous les occupants réels, pas sur
// la capacité max de l'annonce) — décision 2026-09-13.

export interface AnnonceInscriptionPlaceProps {
  prenom: string;
  nom: string;
  dateStr: string;
  heure: string;
  duree: number;
  piloteNom: string;
  passagers: number;
}

export function annonceInscriptionPlaceEmail(p: AnnonceInscriptionPlaceProps): string {
  const rows: Array<[string, string]> = [
    ["Date", `<span style="text-transform:capitalize;">${esc(p.dateStr)}</span>`],
    ["Heure de départ", esc(p.heure)],
    ["Durée du vol", fmtDuration(p.duree)],
    ["Pilote", esc(p.piloteNom)],
    ["Vos places", `${p.passagers}`],
  ];

  const body = `
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)} ${esc(p.nom)}</strong>, ${esc(p.piloteNom)} a bien re&ccedil;u votre demande &mdash; votre place est r&eacute;serv&eacute;e.</p>

    ${label("D&eacute;tails du vol")}
    ${infoRows(rows)}

    ${callout(
      "Le prix d&eacute;finitif n&rsquo;est pas encore fix&eacute; : il d&eacute;pend du nombre de personnes qui rejoignent ce vol. " +
      "D&egrave;s que le groupe est complet (ou cl&ocirc;tur&eacute; par le pilote), les frais sont partag&eacute;s &agrave; parts &eacute;gales entre tous les occupants " +
      "et vous recevrez le lien de paiement par virement."
    )}

    ${separator()}
    ${signOff({ prenom: p.piloteNom })}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Une question ? R&eacute;pondez directement &agrave; cet email ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, `Votre place est réservée · ${p.dateStr}`);
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
  /** Pilote déjà identifié pour ce vol, s'il y en a un — sinon voix institutionnelle "Fly Horizons". */
  pilote?: { prenom: string } | null;
}

export function reservationPaymentReminderEmail(p: ReservationPaymentReminderEmailProps): string {
  const rows: Array<[string, string]> = [
    ["Date", `<span style="text-transform:capitalize;">${esc(p.dateStr)}</span>`],
    ["Heure de départ", esc(p.heure)],
    ["Durée du vol", fmtDuration(p.duree)],
    ["Départ / retour", "Charleroi EBCI"],
  ];

  const body = `
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)} ${esc(p.nom)}</strong>, votre r&eacute;servation du <strong style="color:#0b2238;text-transform:capitalize;">${esc(p.dateStr)}</strong> est toujours en attente de paiement.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;padding:14px 18px;">
          <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.6;">
            <strong>Votre lien de paiement expire le ${esc(p.deadlineStr)}.</strong><br>
            Pass&eacute; ce d&eacute;lai, votre r&eacute;servation sera automatiquement annul&eacute;e et le cr&eacute;neau remis en vente.
          </p>
        </td>
      </tr>
    </table>

    ${label("D&eacute;tails du vol")}
    ${infoRows(rows)}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="border:2px solid #F2B705;border-radius:12px;padding:28px 24px;text-align:center;">
          <p class="em-muted" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;">Montant &agrave; r&eacute;gler</p>
          <p class="em-dark" style="margin:0 0 20px;font-size:42px;font-weight:800;color:#0b2238;line-height:1;">${fmt(p.montant)}</p>
          <a href="${esc(p.paymentUrl)}" class="em-btn"
            style="display:inline-block;background-color:#F2B705;color:#0b2238;font-size:14px;font-weight:800;padding:14px 36px;border-radius:10px;text-decoration:none;">
            Payer maintenant, ${fmt(p.montant)}
          </a>
          <p class="em-muted" style="margin:14px 0 0;font-size:11px;color:#94a3b8;">Paiement s&eacute;curis&eacute; par Stripe, carte bancaire</p>
        </td>
      </tr>
    </table>

    ${p.breakdown ? `${label("D&eacute;tail du paiement")}${buildPriceBreakdown(p.breakdown)}` : ""}

    ${separator()}
    ${signOff(p.pilote)}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, `Rappel : confirmez votre vol du ${p.dateStr}`);
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
    <p class="em-body" style="margin:0 0 24px;font-size:14px;color:#334155;line-height:1.7;">Bonjour <strong style="color:#0b2238;">${esc(p.prenom)} ${esc(p.nom)}</strong>, votre r&eacute;servation du <strong style="color:#0b2238;text-transform:capitalize;">${esc(p.dateStr)}</strong> ${introSuffix}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;padding:14px 18px;">
          <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.6;">
            ${noticeText}
          </p>
        </td>
      </tr>
    </table>

    ${label("D&eacute;tails du vol annul&eacute;")}
    ${infoRows(rows)}

    <p class="em-muted" style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">Vous souhaitez tout de m&ecirc;me voler ? Effectuez une nouvelle r&eacute;servation directement sur notre site.</p>

    ${ctaButton(p.bookingUrl, "Réserver à nouveau")}

    ${separator()}
    ${signOff(null, "Bonne journée,")}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Il s&rsquo;agit d&rsquo;une erreur ou vous avez une question ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, `Réservation annulée · ${p.dateStr}`);
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
  /** Pilote déjà identifié pour ce vol, s'il y en a un — sinon voix institutionnelle "Fly Horizons". */
  pilote?: { prenom: string } | null;
}

export function flightReminderEmail(p: FlightReminderEmailProps): string {
  const accueilText = p.pilote?.prenom
    ? `${esc(p.pilote.prenom)} sera sur place pour vous accueillir.`
    : `Vous serez accueilli sur place.`;

  const body = `
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">
      Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, voici un rappel pour votre vol du <strong style="color:#0b2238;text-transform:capitalize;">${esc(p.dateStr)}</strong>.
    </p>

    ${label("D&eacute;tails du vol")}
    ${infoRows([
      ["Date", `<span style="text-transform:capitalize;">${esc(p.dateStr)}</span>`],
      ["Heure de départ", `<strong style="font-size:15px;">${esc(p.heure)}</strong>`],
      ["Durée", fmtDuration(p.duree)],
      ["Lieu de départ", "Aéroport de Charleroi (EBCI)"],
    ])}

    <p class="em-body" style="margin:0 0 28px;font-size:13px;color:#334155;line-height:1.9;">
      A&eacute;roport de Charleroi (EBCI), Rue des Fr&egrave;res Wright 8, Gosselies.<br>
      Pr&eacute;sentez-vous <strong>15 minutes avant</strong> le d&eacute;collage &mdash; ${accueilText}<br>
      V&ecirc;tements chauds en cabine (m&ecirc;me en &eacute;t&eacute;), aucun document sp&eacute;cifique requis.
    </p>

    ${ctaButtons2(
      { href: p.accountUrl, text: "Voir ma réservation" },
      { href: `${SITE_URL}/access-ebci`, text: "Plan d'accès" }
    )}

    ${separator()}

    ${signOff(p.pilote)}
    <p class="em-muted" style="margin:0 0 20px;font-size:12px;color:#64748b;">
      Une question de derni&egrave;re minute ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>

    ${p.dateISO ? addToCalendarBlock(p.dateISO, p.heure, p.duree) : ""}`;

  return emailBase(body, `Rappel · Votre vol le ${p.dateStr} · Fly Horizons`);
}

// ── 15. Post-vol — remerciement + lien enquête ────────────────────────────────

interface PostVolEmailProps {
  prenom: string;
  dateStr: string;
  duree: number;
  surveyUrl: string;
  /** Pilote qui a effectué le vol, s'il est connu — sinon voix institutionnelle "Fly Horizons". */
  pilote?: { prenom: string } | null;
}

export function postVolEmail(p: PostVolEmailProps): string {
  const accompagnementText = p.pilote?.prenom
    ? `C&rsquo;est avec beaucoup de plaisir que ${esc(p.pilote.prenom)} vous a accompagn&eacute; lors de votre vol du <strong>${esc(p.dateStr)}</strong> (${p.duree}&nbsp;min).`
    : `C&rsquo;est avec beaucoup de plaisir que nous vous avons accompagn&eacute; lors de votre vol du <strong>${esc(p.dateStr)}</strong> (${p.duree}&nbsp;min).`;
  const avisText = p.pilote?.prenom
    ? `Votre avis compte vraiment : il aide ${esc(p.pilote.prenom)} &agrave; am&eacute;liorer chaque vol. L&rsquo;enqu&ecirc;te prend moins d&rsquo;une minute, et chaque r&eacute;ponse est lue personnellement.`
    : `Votre avis compte vraiment : il nous aide &agrave; am&eacute;liorer chaque vol. L&rsquo;enqu&ecirc;te prend moins d&rsquo;une minute, et nous lisons chaque r&eacute;ponse personnellement.`;

  const body = `
    <p class="em-body" style="margin:0 0 24px;font-size:14px;color:#334155;line-height:1.7;">
      Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, merci pour votre confiance. ${accompagnementText} Nous esp&eacute;rons sinc&egrave;rement que vous avez v&eacute;cu quelque chose d&rsquo;unique l&agrave;-haut.
    </p>
    <p class="em-body" style="margin:0 0 4px;font-size:14px;color:#334155;line-height:1.7;">
      ${avisText}
    </p>
    ${ctaButton(p.surveyUrl, "Donner mon avis")}
    ${separator()}
    ${signOff(p.pilote, "À bientôt,")}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;
  return emailBase(body, "Merci pour votre vol · Fly Horizons");
}

// ── 16. Résultat enquête — notification admin ─────────────────────────────────

interface SatisfactionResultEmailProps {
  prenom: string;
  nom: string;
  dateStr: string;
  duree: number;
  notePreparation: number;
  notePilote: number;
  noteVol: number;
  noteQualitePrix: number;
  recommandation: string;
  sourceDecouverte: string;
  commentaire?: string | null;
  nbPhotos?: number;
}

export function satisfactionResultEmail(p: SatisfactionResultEmailProps): string {
  const stars = (n: number) =>
    `<span style="color:#F2B705;font-size:16px;">${"★".repeat(n)}</span><span style="color:#e2e8f0;font-size:16px;">${"☆".repeat(5 - n)}</span> <span style="font-size:13px;color:#64748b;">(${n}/5)</span>`;

  const recoLabels: Record<string, string> = {
    oui_sans_hesiter: "Oui, sans hésiter",
    oui_probablement: "Oui, probablement",
    pas_sur: "Pas sûr",
    non: "Non",
  };
  const sourceLabels: Record<string, string> = {
    bouche_a_oreille: "Bouche à oreille",
    instagram: "Instagram",
    facebook: "Facebook",
    google: "Recherche Google",
    autre: "Autre",
  };
  const recoTxt = recoLabels[p.recommandation] ?? p.recommandation;
  const sourceTxt = sourceLabels[p.sourceDecouverte] ?? p.sourceDecouverte;
  const recoColor = p.recommandation === "non" ? "#dc2626" : p.recommandation === "pas_sur" ? "#d97706" : "#0b2238";

  const noteRow = (name: string, n: number, last = false) => `
      <tr>
        <td class="em-muted" style="padding:11px 0;${last ? "" : "border-bottom:1px solid #f1f5f9;"}font-size:13px;color:#64748b;">${name}</td>
        <td style="padding:11px 0;${last ? "" : "border-bottom:1px solid #f1f5f9;"}text-align:right;">${stars(n)}</td>
      </tr>`;

  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Nouvel avis re&ccedil;u</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Enqu&ecirc;te de satisfaction</h1>
    <p class="em-muted" style="margin:0 0 28px;font-size:14px;color:#64748b;">
      <strong style="color:#0b2238;">${esc(p.prenom)} ${esc(p.nom)}</strong>, vol du ${p.dateStr} (${fmtDuration(p.duree)})
    </p>
    ${separator()}
    ${label("Notes")}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${noteRow("Pr&eacute;paration de la venue", p.notePreparation)}
      ${noteRow("Le pilote en vol", p.notePilote)}
      ${noteRow("Le vol en lui-m&ecirc;me", p.noteVol)}
      ${noteRow("Rapport qualit&eacute; / prix", p.noteQualitePrix, true)}
    </table>
    ${separator()}
    ${label("Recommandation &amp; d&eacute;couverte")}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td class="em-muted" style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Recommanderait Fly Horizons</td>
        <td style="padding:11px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:${recoColor};">${esc(recoTxt)}</td>
      </tr>
      <tr>
        <td class="em-muted" style="padding:11px 0;font-size:13px;color:#64748b;">Nous a connus par</td>
        <td style="padding:11px 0;text-align:right;font-size:13px;font-weight:600;color:#0b2238;">${esc(sourceTxt)}</td>
      </tr>
    </table>
    ${p.commentaire ? `${separator()}${label("Un mot du client")}${callout(esc(p.commentaire))}` : ""}
    ${p.nbPhotos ? `${separator()}${label("Photos")}<p style="margin:0;font-size:13px;color:#64748b;">${p.nbPhotos} photo${p.nbPhotos > 1 ? "s" : ""} partag&eacute;e${p.nbPhotos > 1 ? "s" : ""} par le client, consultable${p.nbPhotos > 1 ? "s" : ""} dans l&rsquo;admin.</p>` : ""}
    ${separator()}
    ${ctaButton(`${SITE_URL}/admin/satisfaction`, "Voir dans l'admin")}`;

  return emailBase(body, `Satisfaction · ${p.prenom} ${p.nom}`);
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
    ${ctaButton(rescheduleUrl, "Choisir une nouvelle date")}
    <p class="em-muted" style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
      Ce lien vous permet de choisir votre nouvelle date en quelques secondes.
    </p>` : "";

  const emailBody = `
    <p class="em-body" style="margin:0 0 20px;font-size:14px;font-weight:700;color:#0b2238;line-height:1.5;">${esc(subject)}</p>
    <div style="margin-bottom:28px;">${paragraphs}</div>
    ${rescheduleBlock}
    ${separator()}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;text-align:center;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
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

  return emailBase(body, `Itinéraire ${isValidated ? "validé" : "modification demandée"} · ${p.clientPrenom} ${p.clientNom}`);
}

// ── 19. Invitation à reporter un vol ─────────────────────────────────────────

export function rescheduleInviteEmail(p: {
  prenom: string;
  dateStr: string;
  duree: number;
  rescheduleUrl: string;
  /** Pilote déjà identifié pour ce vol, s'il y en a un — sinon voix institutionnelle "Fly Horizons". */
  pilote?: { prenom: string } | null;
}): string {
  const body = `
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">
      Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, votre vol du <strong style="color:#0b2238;">${esc(p.dateStr)}</strong> (${esc(fmtDuration(p.duree))}) ne peut malheureusement pas avoir lieu comme pr&eacute;vu.
    </p>
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">
      Votre provision est bien conserv&eacute;e. Choisissez simplement une nouvelle date qui vous convient en cliquant ci-dessous &mdash; le lien est valable 30 jours.
    </p>
    ${ctaButton(p.rescheduleUrl, "Choisir une nouvelle date")}

    ${separator()}
    ${signOff(p.pilote)}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Une question sur ce report ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, "Votre vol est reporté · Fly Horizons");
}

// ── 20. Confirmation de report ────────────────────────────────────────────────

export function rescheduleConfirmationEmail(p: {
  prenom: string;
  oldDateStr: string;
  newDateStr: string;
  duree: number;
  accountUrl: string;
  /** Pilote déjà identifié pour ce vol, s'il y en a un — sinon voix institutionnelle "Fly Horizons". */
  pilote?: { prenom: string } | null;
}): string {
  const nextStepText = p.pilote?.prenom
    ? `${esc(p.pilote.prenom)} vous confirmera votre nouveau cr&eacute;neau horaire dans les prochains jours. Votre provision reste acquise.`
    : `Nous vous confirmerons votre nouveau cr&eacute;neau horaire dans les prochains jours. Votre provision reste acquise.`;

  const body = `
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">
      Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, votre vol a bien &eacute;t&eacute; report&eacute; &mdash; voici le r&eacute;capitulatif du changement.
    </p>
    ${infoRows([
      ["Ancienne date", `<span style="text-transform:capitalize;text-decoration:line-through;color:#94a3b8;">${esc(p.oldDateStr)}</span>`],
      ["Nouvelle date", `<span style="text-transform:capitalize;color:#16a34a;font-weight:700;">${esc(p.newDateStr)}</span>`],
      ["Dur&eacute;e", `${p.duree}&nbsp;min`],
    ])}
    ${nextStep(nextStepText)}

    ${ctaButton(p.accountUrl, "Voir ma réservation")}

    ${separator()}
    ${signOff(p.pilote)}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, "Votre report est confirmé · Fly Horizons");
}

// ── Proposition d'un créneau précis par le pilote (accepter/refuser) ─────────

export function slotProposalEmail(p: {
  prenom: string;
  requestedDateStr: string;
  proposedDateStr: string;
  proposedHeure: string;
  duree: number;
  respondUrl: string;
  /** Pilote déjà identifié pour ce vol, s'il y en a un — sinon voix institutionnelle "Fly Horizons". */
  pilote?: { prenom: string } | null;
}): string {
  const introText = p.pilote?.prenom
    ? `${esc(p.pilote.prenom)} ne peut malheureusement pas organiser votre vol du <strong style="color:#0b2238;">${esc(p.requestedDateStr)}</strong> comme demand&eacute;, et vous propose ce cr&eacute;neau &agrave; la place&nbsp;:`
    : `Votre vol du <strong style="color:#0b2238;">${esc(p.requestedDateStr)}</strong> ne peut malheureusement pas avoir lieu comme demand&eacute; &mdash; voici un cr&eacute;neau propos&eacute; &agrave; la place&nbsp;:`;

  const body = `
    <p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">
      Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, ${introText}
    </p>
    ${infoRows([
      ["Nouvelle date", `<span style="text-transform:capitalize;color:#16a34a;font-weight:700;">${esc(p.proposedDateStr)} &agrave; ${esc(p.proposedHeure)}</span>`],
      ["Dur&eacute;e", `${p.duree}&nbsp;min`],
    ])}
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">
      Ce cr&eacute;neau vous convient ? Vous pouvez l&rsquo;accepter directement, ou choisir une autre date vous-m&ecirc;me si celui-ci ne convient pas.
    </p>
    ${ctaButton(p.respondUrl, "Voir la proposition")}

    ${separator()}
    ${signOff(p.pilote)}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, "Nouveau créneau proposé · Fly Horizons");
}

// ── Route proposal (nouveau flux waypoints, /vol/proposition/[token]) ────────

export interface RouteProposalEmailProps {
  prenom: string;
  dateStr: string;
  waypoints: Array<{ lat?: number; lng?: number; nom?: string }>;
  adminComment: string;
  responseUrl: string;
  totalAcompte?: number | null;
  alreadyPaid?: boolean;
  /** Pilote déjà identifié pour ce vol, s'il y en a un — sinon voix institutionnelle "Fly Horizons". */
  pilote?: { prenom: string } | null;
}

export function routeProposalEmail(p: RouteProposalEmailProps): string {
  const provisionBlock = p.alreadyPaid
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;padding:16px 20px;">
          <p class="em-body" style="margin:0;font-size:13px;color:#166534;line-height:1.65;">
            Votre provision a d&eacute;j&agrave; &eacute;t&eacute; r&eacute;gl&eacute;e. Il ne vous reste qu&rsquo;&agrave; valider cet itin&eacute;raire, aucun paiement suppl&eacute;mentaire ne vous sera demand&eacute;.
          </p>
        </td>
      </tr>
    </table>`
    : p.totalAcompte != null && p.totalAcompte > 0
    ? `${label("Provision")}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:#f0f6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td class="em-body" style="font-size:13px;color:#334155;line-height:1.65;">
                Si vous acceptez cet itin&eacute;raire, une provision de <strong style="color:#0b2238;">${fmt(p.totalAcompte)}</strong> vous sera demand&eacute;e pour confirmer la r&eacute;servation.
              </td>
              <td style="white-space:nowrap;padding-left:16px;text-align:right;">
                <span style="font-size:20px;font-weight:800;color:#0b2238;">${fmt(p.totalAcompte)}</span>
              </td>
            </tr>
            <tr>
              <td colspan="2" class="em-muted" style="padding-top:10px;font-size:12px;color:#64748b;line-height:1.6;">
                D&eacute;duite du prix final apr&egrave;s le vol &middot; rembours&eacute;e int&eacute;gralement si annulation m&eacute;t&eacute;o.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`
    : "";

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
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">
      Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>,
      ${p.pilote?.prenom ? esc(p.pilote.prenom) : "nous"} ${p.pilote?.prenom ? "a" : "avons"} pr&eacute;par&eacute; un itin&eacute;raire pour votre vol du <strong style="color:#0b2238;">${esc(p.dateStr)}</strong>.
    </p>

    ${p.adminComment ? `
    ${label("Message de votre pilote")}
    ${callout(esc(p.adminComment))}
    ` : ""}

    ${label("Votre parcours : " + p.waypoints.length + " point" + (p.waypoints.length > 1 ? "s" : ""))}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;vertical-align:middle;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:22px;height:22px;background:#0b2238;border:2px solid #F2B705;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span style="font-size:11px;font-weight:800;color:#F2B705;">&rarr;</span>
            </div>
            <span class="em-muted" style="font-size:13px;color:#64748b;font-weight:600;">Charleroi EBCI, d&eacute;part</span>
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
            <span class="em-muted" style="font-size:13px;color:#64748b;font-weight:600;">Charleroi EBCI, retour</span>
          </div>
        </td>
      </tr>
    </table>

    ${provisionBlock}

    ${ctaButton(p.responseUrl, "Voir la carte et répondre")}

    <p class="em-muted" style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
      Vous pouvez visualiser le trac&eacute; sur la carte, accepter l&rsquo;itin&eacute;raire ou demander des ajustements. Ce lien est personnel et valable uniquement pour cette proposition.
    </p>

    ${separator()}
    ${signOff(p.pilote, "À bientôt,")}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, `Votre itinéraire personnalisé · Fly Horizons`);
}

// ── Payment link after route acceptance ──────────────────────────────────────

export interface PaymentLinkEmailProps {
  prenom: string;
  dateStr: string;
  duree: number;
  acompte: number;
  paymentUrl: string;
  breakdown?: EmailPriceBreakdown | null;
  /** Pilote déjà identifié pour ce vol, s'il y en a un — sinon voix institutionnelle "Fly Horizons". */
  pilote?: { prenom: string } | null;
}

export function paymentLinkEmail(p: PaymentLinkEmailProps): string {
  const body = `
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">
      Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>,
      vous avez valid&eacute; votre itin&eacute;raire pour le vol du <strong style="color:#0b2238;">${esc(p.dateStr)}</strong> &mdash;
      il ne reste qu&rsquo;une &eacute;tape&nbsp;: r&eacute;gler la provision pour confirmer d&eacute;finitivement votre r&eacute;servation.
    </p>

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
          <p class="em-dark" style="margin:0 0 20px;font-size:42px;font-weight:800;color:#0b2238;line-height:1;">${fmt(p.acompte)}</p>
          <a href="${esc(p.paymentUrl)}" class="em-btn"
            style="display:inline-block;background-color:#F2B705;color:#0b2238;font-size:14px;font-weight:800;padding:14px 36px;border-radius:10px;text-decoration:none;">
            R&eacute;gler ma provision, ${fmt(p.acompte)}
          </a>
          <p class="em-muted" style="margin:14px 0 0;font-size:11px;color:#94a3b8;">Paiement s&eacute;curis&eacute; par Stripe, carte bancaire</p>
        </td>
      </tr>
    </table>

    ${p.breakdown ? `${label("D&eacute;tail de la provision")}${buildPriceBreakdown({ ...p.breakdown, totalLabel: "Provision &agrave; r&eacute;gler" })}` : ""}

    <p class="em-body" style="margin:0 0 28px;font-size:13px;color:#334155;line-height:1.7;">
      La provision encaiss&eacute;e couvre votre vol. Apr&egrave;s le vol, le montant d&eacute;finitif est calcul&eacute; selon la dur&eacute;e r&eacute;ellement effectu&eacute;e. Si elle d&eacute;passe ce montant, la diff&eacute;rence vous est rembours&eacute;e sous 24&nbsp;h.
    </p>

    ${separator()}
    ${signOff(p.pilote)}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, `Finalisez votre réservation · Fly Horizons`);
}

// ── Newsletter — types de blocs ──────────────────────────────────────────────

export type NewsletterBlock =
  | { id: string; type: "text";      content: string }
  | { id: string; type: "heading";   level: 1 | 2; text: string }
  | { id: string; type: "button";    text: string; url: string }
  | { id: string; type: "image";     url: string; alt?: string; link?: string }
  | { id: string; type: "callout";   text: string }
  | { id: string; type: "separator" }

function safeUrl(url: string): string {
  const lower = url.trim().toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) return "#";
  return url;
}

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
    <a href="${esc(safeUrl(block.url))}" class="em-btn" style="display:inline-block;background-color:#F2B705;color:#0b2238;font-size:14px;font-weight:800;padding:14px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;">${esc(block.text)}</a>
  </td></tr>
</table>`;
    }
    case "image": {
      if (!block.url.trim()) return "";
      const img = `<img src="${esc(safeUrl(block.url))}" alt="${esc(block.alt ?? "")}" style="display:block;max-width:100%;height:auto;border-radius:8px;margin:0 auto;border:0;" />`;
      return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td align="center">${block.link?.trim() ? `<a href="${esc(safeUrl(block.link))}">${img}</a>` : img}</td></tr></table>`;
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
    <p class="em-dark" style="margin:0 0 24px;font-size:19px;font-weight:800;color:#0b2238;line-height:1.3;">${esc(subject)}</p>
    ${blocksHtml || `<p class="em-muted" style="color:#94a3b8;font-size:13px;font-style:italic;">(Aucun contenu)</p>`}`;

  return emailBase(body, subject, unsubLink);
}

// ── Newsletter — confirmation d'inscription ───────────────────────────────────

export function newsletterConfirmationEmail(prenom: string | null, unsubscribeUrl: string): string {
  const unsubLink = `<a href="${esc(unsubscribeUrl)}" style="color:#94a3b8;text-decoration:underline;">Se d&eacute;sinscrire de la newsletter</a>`;

  const body = `
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">
      Bienvenue chez Fly Horizons&nbsp;! Merci pour votre inscription : vous recevrez un email d&egrave;s qu&rsquo;un vol est organis&eacute;, pour rejoindre l&rsquo;aventure si une place est disponible.
    </p>

    ${ctaButton(SITE_URL, "Découvrir nos vols")}

    ${separator()}
    ${signOff(null)}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, "Bienvenue dans la newsletter Fly Horizons", unsubLink);
}

// ── Newsletter — campagne (envoi admin) ───────────────────────────────────────

export function newsletterCampaignEmail(subject: string, body: string, prenom: string | null, unsubscribeUrl: string): string {
  const bodyHtml = esc(body).replace(/\n\n/g, "</p><p style=\"margin:0 0 16px;\">").replace(/\n/g, "<br>");
  const unsubLink = `<a href="${esc(unsubscribeUrl)}" style="color:#94a3b8;text-decoration:underline;">Se d&eacute;sinscrire de la newsletter</a>`;

  const bodyContent = `
    <p class="em-dark" style="margin:0 0 24px;font-size:19px;font-weight:800;color:#0b2238;line-height:1.3;">${esc(subject)}</p>

    <div class="em-body" style="font-size:14px;color:#334155;line-height:1.75;margin-bottom:28px;">
      <p style="margin:0 0 16px;">${bodyHtml}</p>
    </div>

    ${ctaButton(SITE_URL, "Visiter le site")}

    ${separator()}
    ${signOff(null)}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Des questions ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(bodyContent, subject, unsubLink);
}

// ── Attribution d'un vol à un pilote (Bloc B) ───────────────────────────────

export function piloteAssignedClientEmail(p: {
  prenom: string;
  dateStr: string;
  duree: number;
  piloteNom: string;
  piloteUrl?: string;
}): string {
  const body = `
    <p class="em-body" style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">
      Bonjour <strong style="color:#0b2238;">${esc(p.prenom)}</strong>, votre vol du <strong style="color:#0b2238;">${esc(p.dateStr)}</strong> (${esc(fmtDuration(p.duree))}) sera assur&eacute; par <strong style="color:#0b2238;">${esc(p.piloteNom)}</strong>.
    </p>
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">
      ${esc(p.piloteNom)} va vous contacter directement pour convenir de l&rsquo;heure et vous donner les d&eacute;tails pratiques. Vous pouvez lui r&eacute;pondre par retour de mail.
    </p>
    ${p.piloteUrl ? ctaButton(p.piloteUrl, "Voir la fiche de votre pilote") : ""}

    ${separator()}
    ${signOff({ prenom: p.piloteNom })}
    <p class="em-muted" style="margin:0;font-size:12px;color:#64748b;">
      Une question ? R&eacute;pondez directement &agrave; cet email, <a href="https://wa.me/32472324135" style="color:#F2B705;font-weight:600;text-decoration:none;">contactez-nous sur WhatsApp</a>, ou visitez notre
      <a href="${SITE_URL}/contact" style="color:#F2B705;font-weight:600;text-decoration:none;">page contact</a>.
    </p>`;

  return emailBase(body, "Votre pilote pour ce vol · Fly Horizons");
}

export function piloteAssignedPiloteEmail(p: {
  piloteNom: string;
  clientNom: string;
  dateStr: string;
  heure: string | null;
  duree: number;
  passagers: number;
  volsUrl: string;
}): string {
  const body = `
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">
      Bonjour <strong style="color:#0b2238;">${esc(p.piloteNom)}</strong>, Romain vous a attribu&eacute; un vol &mdash; voici l&rsquo;essentiel.
    </p>
    ${infoRows([
      ["Client", esc(p.clientNom)],
      ["Date", `<span style="text-transform:capitalize;">${esc(p.dateStr)}</span>${p.heure ? ` &agrave; ${esc(p.heure)}` : ""}`],
      ["Dur&eacute;e", `${p.duree}&nbsp;min`],
      ["Passagers", String(p.passagers)],
    ])}
    ${nextStep("Contactez le client, convenez du cr&eacute;neau, tracez la route et pr&eacute;parez la masse et centrage depuis votre espace.")}
    ${ctaButton(p.volsUrl, "Ouvrir mes vols")}

    ${separator()}
    ${signOff(null, "Merci,")}`;

  return emailBase(body, "Un vol vous a été attribué · Fly Horizons");
}

// ── Retour client sur l'itinéraire → notification au pilote assigné (Bloc B) ──

export function piloteRouteFeedbackEmail(p: {
  piloteNom: string;
  clientNom: string;
  dateStr: string;
  type: "validated" | "modification_requested";
  feedback: string | null;
  volsUrl: string;
}): string {
  const valide = p.type === "validated";
  const body = `
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">
      Bonjour <strong style="color:#0b2238;">${esc(p.piloteNom)}</strong>, ${esc(p.clientNom)} vient de r&eacute;pondre &agrave; la route que vous avez propos&eacute;e pour le vol du <strong style="color:#0b2238;">${esc(p.dateStr)}</strong> :
      ${valide ? "<strong style=\"color:#16a34a;\">itin&eacute;raire valid&eacute;</strong>." : "<strong style=\"color:#0b2238;\">modification demand&eacute;e</strong>."}
    </p>
    ${p.feedback ? infoRows([["Message du client", esc(p.feedback)]]) : ""}
    ${nextStep(valide
      ? "Rien &agrave; faire de plus sur la route. Poursuivez la pr&eacute;paration du vol."
      : "Ajustez le trac&eacute; depuis votre espace et renvoyez la route au client.")}
    ${ctaButton(p.volsUrl, "Ouvrir mes vols")}

    ${separator()}
    ${signOff(null, "Merci,")}`;

  return emailBase(body, (valide ? "Itinéraire validé" : "Modification demandée") + " · Fly Horizons");
}

// ── Mise en jeu d'un vol à tous les pilotes (Bloc C) ────────────────────────

export function flightOfferEmail(p: {
  piloteNom: string;
  dateStr: string;
  heure: string | null;
  duree: number;
  passagers: number;
  routeStr?: string | null;
  expiresStr: string;
  offreUrl: string;
}): string {
  const body = `
    <p class="em-body" style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.7;">
      Bonjour <strong style="color:#0b2238;">${esc(p.piloteNom)}</strong>, un vol est propos&eacute; &agrave; l&rsquo;&eacute;quipe &mdash;
      <strong style="color:#0b2238;">premier arriv&eacute;, premier servi</strong>.
    </p>
    ${infoRows([
      ["Date", `<span style="text-transform:capitalize;">${esc(p.dateStr)}</span>${p.heure ? ` &agrave; ${esc(p.heure)}` : ""}`],
      ["Dur&eacute;e", `${p.duree}&nbsp;min`],
      ["Passagers", String(p.passagers)],
      ...(p.routeStr ? [["Itin&eacute;raire", esc(p.routeStr)] as [string, string]] : []),
    ])}
    ${nextStep(`Ouvrez l&rsquo;offre pour la prendre ou passer votre tour. Sans preneur, elle expire le <strong>${esc(p.expiresStr)}</strong>.`)}
    ${ctaButton(p.offreUrl, "Voir l'offre")}

    ${separator()}
    ${signOff(null, "Merci,")}`;

  return emailBase(body, "Un vol est disponible · Fly Horizons");
}

export function flightOfferExpiredAdminEmail(p: {
  offers: Array<{ dateStr: string; heure: string | null }>;
  volsUrl: string;
}): string {
  const rows = p.offers
    .map(
      (o) =>
        `<li style="margin:4px 0;font-size:13px;color:#334155;"><span style="text-transform:capitalize;">${esc(o.dateStr)}</span>${o.heure ? ` &agrave; ${esc(o.heure)}` : ""}</li>`,
    )
    .join("");
  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Fly Horizons</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">${p.offers.length > 1 ? `${p.offers.length} vols sans preneur` : "Un vol sans preneur"}</h1>
    ${separator()}
    <p class="em-body" style="margin:0 0 12px;font-size:14px;color:#334155;line-height:1.7;">
      Aucun pilote n&rsquo;a pris ${p.offers.length > 1 ? "ces vols" : "ce vol"} dans les 48&nbsp;h. À g&eacute;rer à la main.
    </p>
    <ul style="margin:0 0 20px;padding-left:18px;">${rows}</ul>
    ${ctaButton(p.volsUrl, "Ouvrir les vols")}
    <p class="em-body" style="margin:20px 0 12px;font-size:14px;color:#334155;line-height:1.7;">
      &mdash; Fly Horizons
    </p>`;

  return emailBase(body, "Vol sans preneur · Fly Horizons");
}

// ── Un pilote rend un vol attribué → notification à Romain (Bloc B) ──────────

export function piloteReleasedFlightAdminEmail(p: {
  piloteNom: string;
  clientNom: string;
  dateStr: string;
  heure: string | null;
  volsUrl: string;
}): string {
  const body = `
    <p class="em-gold" style="margin:0 0 4px;font-size:11px;font-weight:700;color:#F2B705;text-transform:uppercase;letter-spacing:0.15em;">Fly Horizons</p>
    <h1 class="em-dark" style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0b2238;">Un pilote a rendu un vol</h1>
    ${separator()}
    <p class="em-body" style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.7;">
      <strong style="color:#0b2238;">${esc(p.piloteNom)}</strong> a rendu ce vol. Il n&rsquo;est plus attribu&eacute; &agrave; personne, il faut le r&eacute;assigner.
    </p>
    ${infoRows([
      ["Client", esc(p.clientNom)],
      ["Date", `<span style="text-transform:capitalize;">${esc(p.dateStr)}</span>${p.heure ? ` &agrave; ${esc(p.heure)}` : ""}`],
    ])}
    ${ctaButton(p.volsUrl, "Ouvrir les vols")}
    <p class="em-body" style="margin:20px 0 12px;font-size:14px;color:#334155;line-height:1.7;">
      &mdash; Fly Horizons
    </p>`;

  return emailBase(body, "Un pilote a rendu un vol · Fly Horizons");
}
