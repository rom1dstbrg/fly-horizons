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
const SURVEY_URL = "https://fly-horizons.com/satisfaction/abc123";
const PAYMENT_URL = "https://buy.stripe.com/preview_test_xxx";
const RESCHEDULE_URL = "https://fly-horizons.com/account/reservations/preview-resa-id";
const ACCOUNT_URL = "https://fly-horizons.com/account/reservations/preview-resa-id";
const BOOKING_URL = "https://fly-horizons.com/reservation";
const ORDER_REF = "FH-2026-0587";

// ── Email list ────────────────────────────────────────────────────────────────

interface EmailMeta {
  id: string;
  label: string;
  trigger: string;
  recipient: "client" | "admin";
  how: "automatique" | "admin" | "webhook" | "client";
  html: string;
}

const emails: EmailMeta[] = [];

function add(
  id: string,
  label: string,
  trigger: string,
  recipient: EmailMeta["recipient"],
  how: EmailMeta["how"],
  html: string
) {
  emails.push({ id, label, trigger, recipient, how, html });
}

// ── BOUTIQUE ──────────────────────────────────────────────────────────────────

add(
  "order-confirmation",
  "1a · Confirmation commande (cadeau)",
  "Stripe webhook checkout.session.completed — achat de vouchers à offrir. Les codes ne sont PAS dans cet email ; ils sont envoyés séparément via 4a/4b.",
  "client",
  "webhook",
  et.orderConfirmationEmail({
    orderRef: ORDER_REF,
    customerEmail: EMAIL,
    customerName: PRENOM + " " + NOM,
    items: [
      { title: "Voucher Exploration · 1h", quantity: 1, unit_price: 17500, image_url: null },
      { title: "Voucher Découverte · 30 min", quantity: 2, unit_price: 9500, image_url: null },
    ],
    subtotal: 36500,
    shippingCost: 0,
    discountAmount: 0,
    total: 36500,
    couponCode: null,
    shippingAddress: {
      full_name: PRENOM + " " + NOM,
      email: EMAIL,
    },
    orderDate: "24 mai 2026",
  })
);

add(
  "order-confirmation-with-codes",
  "1b · Confirmation commande + codes",
  "Stripe webhook checkout.session.completed — achat pour soi-même. Les codes voucher sont inclus directement dans cet email (pas d'email 4a/4b séparé).",
  "client",
  "webhook",
  et.orderConfirmationEmail({
    orderRef: ORDER_REF,
    customerEmail: EMAIL,
    customerName: PRENOM + " " + NOM,
    items: [
      { title: "Voucher Exploration · 1h", quantity: 1, unit_price: 17500, image_url: null },
    ],
    subtotal: 17500,
    shippingCost: 0,
    discountAmount: 0,
    total: 17500,
    couponCode: null,
    shippingAddress: { full_name: PRENOM + " " + NOM, email: EMAIL },
    orderDate: "24 mai 2026",
    voucherCodes: [
      { code: "FLYH-X4K9-2026", duration_minutes: 60, product_title: "Voucher Exploration · 1h" },
    ],
  })
);

add(
  "voucher-single",
  "4a · Voucher (1 code)",
  "Envoi manuel depuis l'admin OU automatique après achat cadeau (1a) — 1 seul code à transmettre au bénéficiaire.",
  "client",
  "admin",
  et.voucherEmail({
    orderRef: ORDER_REF,
    customerName: PRENOM,
    codes: [{ code: "FLYH-X4K9-2026", duration_minutes: 60, product_title: "Vol 1 heure — 2 passagers" }],
  })
);

add(
  "voucher-multi",
  "4b · Vouchers (2 codes)",
  "Envoi manuel depuis l'admin OU automatique après achat cadeau (1a) — plusieurs codes dans un même email.",
  "client",
  "admin",
  et.voucherEmail({
    orderRef: ORDER_REF,
    customerName: PRENOM,
    codes: [
      { code: "FLYH-X4K9-2026", duration_minutes: 60, product_title: "Vol 1 heure — 2 passagers" },
      { code: "FLYH-Z7M2-2026", duration_minutes: 30, product_title: "Vol 30 min — solo" },
    ],
  })
);

// ── VOL SUR MESURE ────────────────────────────────────────────────────────────

add(
  "vsm-quote-payment",
  "5a · Vol sur mesure (provision)",
  "Admin → panel admin → bouton « Envoyer le devis » — vol sur mesure avec provision > 0. Contient le lien de paiement Stripe.",
  "client",
  "admin",
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
  })
);

add(
  "vsm-quote-voucher",
  "5b · Vol sur mesure (voucher)",
  "Admin → panel admin → bouton « Envoyer le devis » — vol sur mesure intégralement couvert par un voucher. Aucun paiement requis, pas de lien Stripe.",
  "client",
  "admin",
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
  })
);

add(
  "vsm-acompte",
  "8 · Provision vol sur mesure",
  "Stripe webhook checkout.session.completed — le client vient de régler la provision vol sur mesure. Confirme la réception du paiement et rappelle les prochaines étapes.",
  "client",
  "webhook",
  et.volSurMesureAcompteEmail({
    prenom: PRENOM,
    nom: NOM,
    dateStr: DATE_STR,
    heure: HEURE,
    dureeEstimee: 75,
    voucherCode: null,
    montantPaye: 420,
    reservationId: "760c8d6c-1bf2-485f-b527-6198fea4907f",
    breakdown: {
      coutVol: 380,
      dureeMin: 75,
      distKm: 142,
      provisionMarge: 40,
      taxesEscales: 0,
      total: 420,
      totalLabel: "Provision réglée",
    },
  })
);

// ── RÉSERVATIONS STANDARD ─────────────────────────────────────────────────────

add(
  "resa-free",
  "6 · Réservation (voucher)",
  "Client soumet une réservation standard avec un code voucher valide — vol intégralement couvert. Envoyé immédiatement à la soumission du formulaire /reservation.",
  "client",
  "client",
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

add(
  "resa-paid",
  "7 · Réservation (paiement reçu)",
  "Stripe webhook checkout.session.completed — le client vient de payer une réservation standard. Confirme le paiement et la réservation.",
  "client",
  "webhook",
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

add(
  "payment-invitation",
  "14 · Invitation paiement",
  "Admin → panel admin → bouton « Inviter au paiement » — envoyé manuellement quand la réservation est prête à être payée (date/heure confirmées).",
  "client",
  "admin",
  et.reservationPaymentInvitationEmail({
    prenom: PRENOM,
    nom: NOM,
    dateStr: DATE_STR,
    heure: HEURE,
    duree: 60,
    montant: 320,
    paymentUrl: PAYMENT_URL,
    voucherCode: null,
    breakdown: {
      coutVol: 360,
      dureeMin: 60,
      provisionMarge: 0,
      taxesEscales: 0,
      couponDiscount: 40,
      couponCode: "PROMO10",
      total: 320,
    },
  })
);

add(
  "payment-reminder",
  "14c · Rappel paiement (T-72h)",
  "Cron automatique — déclenché 72 h avant le vol si le paiement n'a toujours pas été reçu. Dernier rappel avant annulation automatique.",
  "client",
  "automatique",
  et.reservationPaymentReminderEmail({
    prenom: PRENOM,
    nom: NOM,
    dateStr: DATE_STR,
    heure: HEURE,
    duree: 60,
    montant: 320,
    paymentUrl: PAYMENT_URL,
    deadlineStr: "jeudi 21 mai 2026 à 09h30",
    breakdown: {
      coutVol: 360,
      dureeMin: 60,
      couponDiscount: 40,
      couponCode: "PROMO10",
      total: 320,
    },
  })
);

add(
  "auto-annulee",
  "14d · Annulation automatique",
  "Cron automatique — déclenché si le délai de paiement est dépassé sans paiement reçu. La réservation est annulée et le créneau libéré.",
  "client",
  "automatique",
  et.reservationAutoAnnuleeEmail({
    prenom: PRENOM,
    nom: NOM,
    dateStr: DATE_STR,
    heure: HEURE,
    duree: 60,
    bookingUrl: BOOKING_URL,
    source: "auto",
  })
);

add(
  "admin-annulee",
  "14f · Annulation manuelle (admin)",
  "Admin → panel admin → changement de statut « Annulée » depuis la fiche réservation. Envoyé automatiquement pour toute annulation manuelle, standard ou vol sur mesure.",
  "client",
  "admin",
  et.reservationAutoAnnuleeEmail({
    prenom: PRENOM,
    nom: NOM,
    dateStr: DATE_STR,
    heure: HEURE,
    duree: 60,
    bookingUrl: BOOKING_URL,
    source: "admin",
  })
);

// ── SUIVI DE VOL ──────────────────────────────────────────────────────────────


add(
  "heure-confirmee-no-route",
  "10a · Heure confirmée (sans route)",
  "Admin → panel admin → changement de statut « Heure confirmée » — sans itinéraire. Le client a maintenant la date ET l'heure exacte.",
  "client",
  "admin",
  et.reservationHeureConfirmeeEmail({
    prenom: PRENOM,
    dateStr: DATE_STR,
    heure: HEURE,
    duree: 60,
    route: null,
    routeUrl: null,
  })
);

add(
  "heure-confirmee-route",
  "10b · Heure confirmée (avec route)",
  "Admin → panel admin → changement de statut « Heure confirmée » — avec itinéraire. Envoi complet : date, heure et route.",
  "client",
  "admin",
  et.reservationHeureConfirmeeEmail({
    prenom: PRENOM,
    dateStr: DATE_STR,
    heure: HEURE,
    duree: 60,
    route: ROUTE,
    routeUrl: ROUTE_URL,
  })
);

add(
  "flight-reminder",
  "14e · Rappel J-2",
  "Cron automatique — envoyé 2 jours avant le vol. Rappelle la date, l'heure, les infos pratiques et le lien vers l'espace client.",
  "client",
  "automatique",
  et.flightReminderEmail({
    prenom: PRENOM,
    dateStr: DATE_STR,
    heure: HEURE,
    duree: 60,
    type_resa: "standard",
    accountUrl: ACCOUNT_URL,
  })
);

add(
  "post-vol",
  "15 · Post-vol (remerciement)",
  "Admin → panel admin → bouton « Marquer le vol comme terminé » — envoyé après le vol. Contient le lien vers l'enquête de satisfaction.",
  "client",
  "admin",
  et.postVolEmail({
    prenom: PRENOM,
    dateStr: DATE_STR,
    duree: 65,
    surveyUrl: SURVEY_URL,
  })
);

add(
  "satisfaction",
  "16 · Satisfaction (résultat admin)",
  "Automatique — le client soumet l'enquête de satisfaction (lien dans l'email 15). Les résultats sont envoyés à l'admin uniquement.",
  "admin",
  "automatique",
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

// ── ITINÉRAIRES ───────────────────────────────────────────────────────────────

add(
  "route-itineraire",
  "17a · Itinéraire (ancien flux texte)",
  "Admin → panel admin → champ texte libre « Itinéraire ». Ancien flux — envoie l'itinéraire sous forme de texte simple. Remplacé par 17b pour les VSM.",
  "client",
  "admin",
  et.routeItineraireEmail({
    prenom: PRENOM,
    dateStr: DATE_STR,
    duree: 60,
    route: ROUTE,
    routeUrl: ROUTE_URL,
  })
);

add(
  "route-proposal",
  "17b · Proposition d'itinéraire (carte)",
  "Admin → Route Editor → bouton « Proposer l'itinéraire » — nouveau flux waypoints. Contient une carte interactive et les commentaires du pilote. Le client peut valider ou demander une modification (→ 18a/18b).",
  "client",
  "admin",
  et.routeProposalEmail({
    prenom: PRENOM,
    dateStr: DATE_STR,
    waypoints: [
      { lat: 50.467, lng: 4.867, nom: "Citadelle de Namur" },
      { lat: 50.259, lng: 4.912, nom: "Dinant — Rocher Bayard" },
      { lat: 50.119, lng: 4.459, nom: "Couvin" },
    ],
    adminComment:
      "J'ai tracé un parcours qui passe par les trois points que vous m'avez indiqués. On longera la Meuse sur le retour, la vue est magnifique à cette heure-là. Dites-moi si vous souhaitez ajuster quelque chose !",
    responseUrl: "https://fly-horizons.com/vol/proposition/preview-token-abc",
  })
);

add(
  "route-feedback-validated",
  "18a · Retour itinéraire (validé)",
  "Automatique — le client clique « Valider » dans l'email 17b. Notification admin : l'itinéraire est accepté, passer à l'étape suivante (paiement → email 19).",
  "admin",
  "client",
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

add(
  "route-feedback-modification",
  "18b · Retour itinéraire (modification)",
  "Automatique — le client clique « Demander une modification » dans l'email 17b. Notification admin avec le commentaire du client. Retourner dans le Route Editor puis renvoyer 17b.",
  "admin",
  "client",
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

add(
  "payment-link",
  "19 · Lien de paiement (après itinéraire)",
  "Admin → panel admin → bouton « Envoyer le lien de paiement » — après validation de l'itinéraire VSM (18a). Contient le lien Stripe pour régler le solde.",
  "client",
  "admin",
  et.paymentLinkEmail({
    prenom: PRENOM,
    dateStr: DATE_STR,
    duree: 75,
    acompte: 420,
    paymentUrl: PAYMENT_URL,
    breakdown: {
      coutVol: 380,
      dureeMin: 75,
      distKm: 142,
      provisionMarge: 40,
      taxesEscales: 0,
      total: 420,
      totalLabel: "Provision à régler",
    },
  })
);

// ── REPORT ────────────────────────────────────────────────────────────────────

add(
  "reschedule-invite",
  "20 · Invitation à reporter",
  "Admin → panel admin → bouton « Inviter à reporter » — envoyé manuellement, typiquement suite à une météo défavorable. Contient un lien vers l'espace client pour choisir une nouvelle date.",
  "client",
  "admin",
  et.rescheduleInviteEmail({
    prenom: PRENOM,
    dateStr: DATE_STR,
    duree: 60,
    rescheduleUrl: RESCHEDULE_URL,
  })
);

add(
  "reschedule-confirmation",
  "21 · Confirmation de report",
  "Automatique — le client a sélectionné une nouvelle date depuis son espace client (lien dans l'email 20). Confirme l'ancienne et la nouvelle date.",
  "client",
  "client",
  et.rescheduleConfirmationEmail({
    prenom: PRENOM,
    oldDateStr: DATE_STR,
    newDateStr: "dimanche 14 juin 2026",
    duree: 60,
    accountUrl: ACCOUNT_URL,
  })
);

// ── CONTACT ───────────────────────────────────────────────────────────────────

add(
  "contact-notif",
  "11 · Contact (notif interne)",
  "Automatique — le visiteur soumet le formulaire /contact. Notification interne : nom, email, sujet et message du visiteur.",
  "admin",
  "automatique",
  et.contactNotificationEmail({
    nom: PRENOM + " " + NOM,
    email: EMAIL,
    sujet: "Question sur les tarifs groupe",
    message:
      "Bonjour,\n\nJe souhaite organiser un vol en groupe pour 4 personnes à l'occasion d'un anniversaire. Pourriez-vous me communiquer vos tarifs et disponibilités pour juin 2026 ?\n\nMerci d'avance.",
  })
);

add(
  "contact-ack",
  "12 · Contact (accusé réception)",
  "Automatique — envoyé au visiteur en même temps que 11. Confirme la bonne réception de son message et annonce une réponse sous 24 h.",
  "client",
  "automatique",
  et.contactAcknowledgmentEmail({
    nom: PRENOM + " " + NOM,
    email: EMAIL,
    sujet: "Question sur les tarifs groupe",
    message:
      "Bonjour,\n\nJe souhaite organiser un vol en groupe pour 4 personnes à l'occasion d'un anniversaire. Pourriez-vous me communiquer vos tarifs et disponibilités pour juin 2026 ?\n\nMerci d'avance.",
  })
);

add(
  "contact-reply",
  "13 · Contact (réponse admin)",
  "Admin → panel admin → champ réponse + bouton « Envoyer » — réponse personnalisée au message de contact. Le client reçoit la réponse avec son message original en dessous.",
  "client",
  "admin",
  et.contactReplyEmail({
    nom: PRENOM + " " + NOM,
    email: EMAIL,
    sujet: "Question sur les tarifs groupe",
    reponse:
      "Bonjour Sophie,\n\nMerci pour votre message. Pour un groupe de 4 personnes, nous proposons des vols privés à bord d'un ULM 2 places. Pour 4 passagers, nous organisons 2 rotations.\n\nLe tarif pour 2 vols de 30 min est de 280 € au total.\n\nN'hésitez pas à me contacter pour définir une date !",
  })
);

// ── EMAIL LIBRE ───────────────────────────────────────────────────────────────

add(
  "custom-meteo",
  "22a · Email libre (report météo)",
  "Admin → panel admin → onglet « Email libre » — message entièrement personnalisé. Ici : report météo avec lien de report intégré. Peut contenir n'importe quel texte.",
  "client",
  "admin",
  et.customEmail({
    subject: `Fly Horizons — Votre vol du ${DATE_STR}`,
    body:
      `Bonjour ${PRENOM},\n\nJ'ai suivi les prévisions pour le ${DATE_STR} et les conditions ne permettent malheureusement pas de voler en sécurité. Je préfère reporter plutôt que de vous faire prendre des risques ou de vous faire passer une mauvaise expérience.\n\nVotre provision est bien conservée, aucun frais ne vous est facturé.\n\nVous pouvez choisir votre nouvelle date directement depuis votre espace client en cliquant sur le bouton de report ci-dessous.\n\nÀ très vite,\nRomain`,
    rescheduleUrl: RESCHEDULE_URL,
  })
);

add(
  "custom-vol-maintenu",
  "22b · Email libre (vol maintenu)",
  "Admin → panel admin → onglet « Email libre » — message entièrement personnalisé. Ici : confirmation météo favorable, vol maintenu comme prévu.",
  "client",
  "admin",
  et.customEmail({
    subject: `Fly Horizons — Vol confirmé pour le ${DATE_STR}`,
    body:
      `Bonjour ${PRENOM},\n\nBonne nouvelle, j'ai vérifié la météo pour le ${DATE_STR} et tout est au vert. Le vol est bien maintenu comme prévu.\n\nRendez-vous à l'aéroport de Charleroi (EBCI) 15 minutes avant l'heure convenue. N'hésitez pas si vous avez une question avant votre arrivée.\n\nÀ très bientôt,\nRomain`,
  })
);

// ── Build HTML ────────────────────────────────────────────────────────────────

const HOW_COLORS: Record<EmailMeta["how"], string> = {
  automatique: "#16a34a",
  webhook:     "#0369a1",
  admin:       "#7c3aed",
  client:      "#b45309",
};

const HOW_LABELS: Record<EmailMeta["how"], string> = {
  automatique: "Automatique",
  webhook:     "Stripe webhook",
  admin:       "Action admin",
  client:      "Action client",
};

const RECIPIENT_COLORS: Record<EmailMeta["recipient"], string> = {
  client: "#0b2238",
  admin:  "#dc2626",
};

function metaBar(e: EmailMeta): string {
  const how = `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:${HOW_COLORS[e.how]}22;color:${HOW_COLORS[e.how]};border:1px solid ${HOW_COLORS[e.how]}55;">${HOW_LABELS[e.how]}</span>`;
  const recipient = `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:${RECIPIENT_COLORS[e.recipient]}18;color:${RECIPIENT_COLORS[e.recipient]};border:1px solid ${RECIPIENT_COLORS[e.recipient]}44;">→ ${e.recipient === "admin" ? "Admin" : "Client"}</span>`;
  return `<div style="display:flex;align-items:flex-start;gap:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:16px;">
  <div style="font-size:18px;line-height:1;margin-top:1px;">ℹ️</div>
  <div style="flex:1;">
    <div style="display:flex;gap:6px;margin-bottom:6px;">${how}${recipient}</div>
    <p style="margin:0;font-size:12px;color:#475569;line-height:1.5;">${e.trigger}</p>
  </div>
</div>`;
}

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
  ${metaBar(e)}
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
  .nav-section {
    padding: 10px 16px 4px;
    font-size: 10px;
    font-weight: 700;
    color: #4e7096;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }
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
    margin-bottom: 12px;
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
    document.querySelectorAll('.email-panel').forEach(function(p) { p.style.display = 'none'; });
    document.querySelectorAll('.nav-link').forEach(function(a) { a.classList.remove('active'); });
    var panel = document.getElementById('panel-' + id);
    panel.style.display = 'block';
    document.getElementById('link-' + id).classList.add('active');
    document.getElementById('empty-state').style.display = 'none';
    history.replaceState(null, '', '#' + id);
    var iframe = panel.querySelector('iframe');
    if (iframe) {
      resizeIframe(iframe);
      setTimeout(function() { resizeIframe(iframe); }, 80);
    }
  }

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
