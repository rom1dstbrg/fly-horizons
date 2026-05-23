import * as fs from "fs";
import * as path from "path";
import * as et from "../lib/email-templates";

// ── Dummy data ────────────────────────────────────────────────────────────────

const PRENOM = "Sophie";
const NOM = "Marchal";
const EMAIL = "sophie.marchal@example.com";
const DATE_STR = "samedi 24 mai 2026";
const HEURE = "09h30";
const ROUTE =
  "Charleroi EBCI → survol de Namur et de la Citadelle → descente sur la vallée de la Meuse → Dinant et le rocher Bayard → retour EBCI via Philippeville";
const ROUTE_URL = "https://fly-horizons.com/vol/itineraire/preview-token-123";
const ACCESS_URL = "https://fly-horizons.com/access-ebci";
const SURVEY_URL = "https://fly-horizons.com/satisfaction/abc123";
const PAYMENT_URL = "https://buy.stripe.com/preview_test_xxx";
const ORDER_REF = "FH-2026-0587";

// ── Email list ────────────────────────────────────────────────────────────────

const emails: Array<{ id: string; label: string; html: string }> = [];

function add(id: string, label: string, html: string) {
  emails.push({ id, label, html });
}

// 1. Confirmation de commande
add(
  "order-confirmation",
  "1 · Confirmation commande",
  et.orderConfirmationEmail({
    orderRef: ORDER_REF,
    customerEmail: EMAIL,
    customerName: PRENOM + " " + NOM,
    items: [
      { title: "T-shirt Fly Horizons — M", quantity: 2, unit_price: 2900, image_url: null },
      { title: "Casquette brodée", quantity: 1, unit_price: 1800, image_url: null },
    ],
    subtotal: 7600,
    shippingCost: 500,
    discountAmount: 0,
    total: 8100,
    couponCode: null,
    shippingAddress: {
      full_name: PRENOM + " " + NOM,
      email: EMAIL,
      line1: "Rue de la Paix 12",
      city: "Bruxelles",
      postal_code: "1000",
      country: "BE",
    },
    orderDate: "24 mai 2026",
  })
);

// 2. Commande en préparation
add(
  "order-processing",
  "2 · En préparation",
  et.orderProcessingEmail({ orderRef: ORDER_REF, customerName: PRENOM })
);

// 3. Commande expédiée
add(
  "order-shipped",
  "3 · Expédiée",
  et.orderShippedEmail({
    orderRef: ORDER_REF,
    customerName: PRENOM,
    shippingAddress: {
      full_name: PRENOM + " " + NOM,
      line1: "Rue de la Paix 12",
      city: "Bruxelles",
      postal_code: "1000",
      country: "BE",
    },
  })
);

// 4a. Vouchers — 1 code
add(
  "voucher-single",
  "4a · Voucher (1 code)",
  et.voucherEmail({
    orderRef: ORDER_REF,
    customerName: PRENOM,
    codes: [{ code: "FLYH-X4K9-2026", duration_minutes: 60, product_title: "Vol 1 heure — 2 passagers" }],
  })
);

// 4b. Vouchers — 2 codes
add(
  "voucher-multi",
  "4b · Vouchers (2 codes)",
  et.voucherEmail({
    orderRef: ORDER_REF,
    customerName: PRENOM,
    codes: [
      { code: "FLYH-X4K9-2026", duration_minutes: 60, product_title: "Vol 1 heure — 2 passagers" },
      { code: "FLYH-Z7M2-2026", duration_minutes: 30, product_title: "Vol 30 min — solo" },
    ],
  })
);

// 5a. Vol sur mesure devis — avec paiement
add(
  "vsm-quote-payment",
  "5a · Vol sur mesure (acompte)",
  et.volSurMesureQuoteEmail({
    prenom: PRENOM,
    nom: NOM,
    date: "2026-05-24",
    heure: HEURE,
    dureMin: 75,
    distKm: 142,
    reservationId: "preview-resa-id",
    styleVol: "Itinéraire direct",
    stopovers: [],
    prixEstime: 380,
    discount: 0,
    prixBillable: 380,
    acompte: 100,
    taxesEscales: 0,
    totalAcompte: 100,
    voucherCode: null,
    paymentUrl: PAYMENT_URL,
  })
);

// 5b. Vol sur mesure devis — couvert par voucher
add(
  "vsm-quote-voucher",
  "5b · Vol sur mesure (voucher)",
  et.volSurMesureQuoteEmail({
    prenom: PRENOM,
    nom: NOM,
    date: "2026-05-24",
    heure: HEURE,
    dureMin: 60,
    distKm: 110,
    reservationId: "preview-resa-id",
    styleVol: "Parcours pittoresque",
    stopovers: [],
    prixEstime: 300,
    discount: 300,
    prixBillable: 0,
    acompte: 0,
    taxesEscales: 0,
    totalAcompte: 0,
    voucherCode: "FLYH-X4K9-2026",
    paymentUrl: null,
  })
);

// 6. Réservation couverte par voucher
add(
  "resa-free",
  "6 · Réservation (voucher)",
  et.reservationConfirmationFreeEmail({
    prenom: PRENOM,
    nom: NOM,
    dateStr: DATE_STR,
    heure: HEURE,
    duree: 60,
    passengers: 2,
    poids_total: 145,
    voucherCode: "FLYH-X4K9-2026",
    reservationId: "760c8d6c-1bf2-485f-b527-6198fea4907f",
  })
);

// 7. Réservation paiement reçu
add(
  "resa-paid",
  "7 · Réservation (paiement reçu)",
  et.reservationPaymentConfirmationEmail({
    prenom: PRENOM,
    nom: NOM,
    dateStr: DATE_STR,
    heure: HEURE,
    duree: 60,
    passengers: 2,
    poids_total: 145,
    voucherCode: null,
    montantPaye: 320,
    reservationId: "760c8d6c-1bf2-485f-b527-6198fea4907f",
  })
);

// 8. Acompte vol sur mesure reçu
add(
  "vsm-acompte",
  "8 · Acompte vol sur mesure",
  et.volSurMesureAcompteEmail({
    prenom: PRENOM,
    nom: NOM,
    dateStr: DATE_STR,
    heure: HEURE,
    dureeEstimee: 75,
    voucherCode: null,
    montantPaye: 100,
    reservationId: "760c8d6c-1bf2-485f-b527-6198fea4907f",
  })
);

// 9a. Date confirmée — sans route
add(
  "date-confirmee-no-route",
  "9a · Date confirmée (sans route)",
  et.reservationDateConfirmeeEmail({
    prenom: PRENOM,
    dateStr: DATE_STR,
    duree: 60,
    route: null,
    routeUrl: null,
  })
);

// 9b. Date confirmée — avec route
add(
  "date-confirmee-route",
  "9b · Date confirmée (avec route)",
  et.reservationDateConfirmeeEmail({
    prenom: PRENOM,
    dateStr: DATE_STR,
    duree: 60,
    route: ROUTE,
    routeUrl: ROUTE_URL,
  })
);

// 10a. Heure confirmée — sans route
add(
  "heure-confirmee-no-route",
  "10a · Heure confirmée (sans route)",
  et.reservationHeureConfirmeeEmail({
    prenom: PRENOM,
    dateStr: DATE_STR,
    heure: HEURE,
    duree: 60,
    route: null,
    routeUrl: null,
  })
);

// 10b. Heure confirmée — avec route
add(
  "heure-confirmee-route",
  "10b · Heure confirmée (avec route)",
  et.reservationHeureConfirmeeEmail({
    prenom: PRENOM,
    dateStr: DATE_STR,
    heure: HEURE,
    duree: 60,
    route: ROUTE,
    routeUrl: ROUTE_URL,
  })
);

// 11. Contact — notification interne
add(
  "contact-notif",
  "11 · Contact (notif interne)",
  et.contactNotificationEmail({
    nom: PRENOM + " " + NOM,
    email: EMAIL,
    sujet: "Question sur les tarifs groupe",
    message:
      "Bonjour,\n\nJe souhaite organiser un vol en groupe pour 4 personnes à l'occasion d'un anniversaire. Pourriez-vous me communiquer vos tarifs et disponibilités pour juin 2026 ?\n\nMerci d'avance.",
  })
);

// 12. Contact — accusé de réception
add(
  "contact-ack",
  "12 · Contact (accusé réception)",
  et.contactAcknowledgmentEmail({
    nom: PRENOM + " " + NOM,
    email: EMAIL,
    sujet: "Question sur les tarifs groupe",
    message:
      "Bonjour,\n\nJe souhaite organiser un vol en groupe pour 4 personnes à l'occasion d'un anniversaire. Pourriez-vous me communiquer vos tarifs et disponibilités pour juin 2026 ?\n\nMerci d'avance.",
  })
);

// 13. Contact — réponse admin
add(
  "contact-reply",
  "13 · Contact (réponse admin)",
  et.contactReplyEmail({
    nom: PRENOM + " " + NOM,
    email: EMAIL,
    sujet: "Question sur les tarifs groupe",
    reponse:
      "Bonjour Sophie,\n\nMerci pour votre message. Pour un groupe de 4 personnes, nous proposons des vols privés à bord d'un ULM 2 places. Pour 4 passagers, nous organisons 2 rotations.\n\nLe tarif pour 2 vols de 30 min est de 280 € au total.\n\nN'hésitez pas à me contacter pour définir une date !",
  })
);

// 14. Invitation au paiement
add(
  "payment-invitation",
  "14 · Invitation paiement",
  et.reservationPaymentInvitationEmail({
    prenom: PRENOM,
    nom: NOM,
    dateStr: DATE_STR,
    heure: HEURE,
    duree: 60,
    montant: 320,
    paymentUrl: PAYMENT_URL,
    voucherCode: null,
  })
);

// 15. Post-vol
add(
  "post-vol",
  "15 · Post-vol (remerciement)",
  et.postVolEmail({
    prenom: PRENOM,
    dateStr: DATE_STR,
    duree: 65,
    surveyUrl: SURVEY_URL,
  })
);

// 16. Satisfaction — résultat admin
add(
  "satisfaction",
  "16 · Satisfaction (résultat admin)",
  et.satisfactionResultEmail({
    prenom: PRENOM,
    nom: NOM,
    dateStr: DATE_STR,
    duree: 65,
    noteGlobale: 5,
    noteAccueil: 4,
    notePilote: 5,
    commentaire:
      "Expérience absolument incroyable ! Romain est un pilote formidable, très rassurant et passionné. Je recommande sans hésiter à toute ma famille.",
    pointsAmelioration:
      "Le briefing avant le vol était un peu rapide — j'aurais aimé un peu plus d'explications sur les manœuvres. Rien de grave, juste une petite suggestion !",
  })
);

// 17. Route — proposition itinéraire
add(
  "route-proposal",
  "17 · Itinéraire proposé",
  et.routeProposalEmail({
    prenom: PRENOM,
    dateStr: DATE_STR,
    duree: 60,
    route: ROUTE,
    routeUrl: ROUTE_URL,
  })
);

// 18a. Route — retour admin (validé)
add(
  "route-feedback-validated",
  "18a · Retour itinéraire (validé)",
  et.routeFeedbackAdminEmail({
    clientPrenom: PRENOM,
    clientNom: NOM,
    clientEmail: EMAIL,
    resaId: "resa-abc-123",
    dateStr: DATE_STR,
    type: "validated",
    feedback: null,
    adminUrl: "https://fly-horizons.com/admin/vols?tab=reservations",
  })
);

// 18b. Route — retour admin (modification)
add(
  "route-feedback-modification",
  "18b · Retour itinéraire (modification)",
  et.routeFeedbackAdminEmail({
    clientPrenom: PRENOM,
    clientNom: NOM,
    clientEmail: EMAIL,
    resaId: "resa-abc-123",
    dateStr: DATE_STR,
    type: "modification_requested",
    feedback:
      "Je souhaiterais plutôt survoler le lac de Nismes et la région de l'Entre-Sambre-et-Meuse. Est-ce possible de passer par Couvin ?",
    adminUrl: "https://fly-horizons.com/admin/vols?tab=reservations",
  })
);

// 19. Email libre
add(
  "custom-email",
  "19 · Email libre",
  et.customEmail({
    subject: "Votre vol est reporté — nouvelle date à confirmer",
    body:
      "Bonjour Sophie,\n\nEn raison des conditions météorologiques prévues ce samedi, nous devons reporter votre vol du 24 mai.\n\nVotre sécurité est notre priorité absolue — nous ne décollons jamais dans des conditions incertaines.\n\nJe vous proposerai de nouvelles dates dans les 24 heures. Toutes vos réservations et paiements sont bien conservés.\n\nDésolé pour la gêne occasionnée, et à très bientôt !\n\nRomain — Fly Horizons",
  })
);

// ── Build HTML ────────────────────────────────────────────────────────────────

const sidebarLinks = emails
  .map(
    (e) =>
      `<a href="#${e.id}" onclick="showEmail('${e.id}');return false;" id="link-${e.id}" class="nav-link">${e.label}</a>`
  )
  .join("\n");

const iframes = emails
  .map(
    (e) =>
      `<div id="panel-${e.id}" class="email-panel" style="display:none;">
  <h2 class="panel-title">${e.label}</h2>
  <iframe class="email-frame" srcdoc="${e.html.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" frameborder="0" onload="resizeIframe(this)"></iframe>
</div>`
  )
  .join("\n\n");

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Preview — Emails Fly Horizons</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { display: flex; height: 100vh; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; }

  /* Sidebar */
  #sidebar {
    width: 240px;
    min-width: 240px;
    background: #0b2238;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 0 0 16px;
  }
  #sidebar-header {
    padding: 18px 16px 14px;
    border-bottom: 1px solid #1e3a52;
    margin-bottom: 8px;
  }
  #sidebar-header h1 { font-size: 13px; font-weight: 800; color: #F2B705; letter-spacing: 0.08em; text-transform: uppercase; }
  #sidebar-header p  { font-size: 11px; color: #4e7096; margin-top: 2px; }
  .nav-link {
    display: block;
    padding: 8px 16px;
    font-size: 12px;
    color: #94a3b8;
    text-decoration: none;
    border-left: 3px solid transparent;
    transition: background 0.1s, color 0.1s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .nav-link:hover  { background: #0f2d45; color: #e2e8f0; }
  .nav-link.active { background: #0f2d45; color: #F2B705; border-left-color: #F2B705; font-weight: 600; }

  /* Main */
  #main {
    flex: 1;
    overflow-y: auto;
    padding: 32px;
  }
  .panel-title {
    font-size: 13px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 16px;
  }
  .email-frame {
    width: 100%;
    border: none;
    border-radius: 12px;
    background: #0b2238;
    display: block;
    min-height: 400px;
  }
  #empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 60vh;
    color: #94a3b8;
    gap: 12px;
  }
  #empty-state span { font-size: 40px; }
  #empty-state p { font-size: 14px; }
</style>
</head>
<body>

<nav id="sidebar">
  <div id="sidebar-header">
    <h1>Fly Horizons</h1>
    <p>${emails.length} emails</p>
  </div>
  ${sidebarLinks}
</nav>

<main id="main">
  <div id="empty-state">
    <span>✉️</span>
    <p>Sélectionnez un email dans la barre latérale</p>
  </div>

  ${iframes}
</main>

<script>
  function resizeIframe(frame) {
    try {
      var doc = frame.contentDocument || frame.contentWindow.document;
      var h = doc.documentElement.scrollHeight || doc.body.scrollHeight;
      if (h > 0) frame.style.height = (h + 32) + 'px';
    } catch(e) {}
  }

  function showEmail(id) {
    // Hide all panels
    document.querySelectorAll('.email-panel').forEach(function(p) { p.style.display = 'none'; });
    // Deactivate all links
    document.querySelectorAll('.nav-link').forEach(function(a) { a.classList.remove('active'); });
    // Show selected
    var panel = document.getElementById('panel-' + id);
    panel.style.display = 'block';
    document.getElementById('link-' + id).classList.add('active');
    // Hide empty state
    document.getElementById('empty-state').style.display = 'none';
    // Update hash
    history.replaceState(null, '', '#' + id);
    // Resize iframe now that the panel is visible (scrollHeight is 0 when hidden)
    var iframe = panel.querySelector('iframe');
    if (iframe) {
      resizeIframe(iframe);
      setTimeout(function() { resizeIframe(iframe); }, 80);
    }
  }

  // On load: open from hash or first email
  (function() {
    var hash = location.hash.slice(1);
    var target = hash && document.getElementById('panel-' + hash) ? hash : '${emails[0]?.id ?? ""}';
    if (target) showEmail(target);
  })();
</script>
</body>
</html>`;

const outPath = path.join(__dirname, "..", "emails-preview.html");
fs.writeFileSync(outPath, html, "utf8");
console.log("✓ emails-preview.html generated —", emails.length, "emails");
