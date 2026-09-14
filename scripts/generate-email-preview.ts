// Génère email-preview.html (racine du repo) à partir de lib/email-templates.ts,
// avec des données d'exemple, pour que Romain puisse relire chaque email par
// numéro ("email 25, il faut changer xxx") sans devoir chercher dans le code.
//
// Régénérer après une modification d'un template :
//   npx tsx scripts/generate-email-preview.ts
import * as fs from "fs";
import * as path from "path";
import * as T from "../lib/email-templates";

const ROOT = path.join(__dirname, "..");
const SRC_FILE = "lib/email-templates.ts";

interface Entry {
  n: number;
  fn: string;
  label: string;
  line: number;
  subject: string;
  html: string;
  error: string | null;
  side: "admin" | "public";
  category: string;
  rank: number;
}

// Classification vérifiée en lisant les vrais points d'appel (qui reçoit l'email) :
// side = destinataire réel (admin = Romain / info@fly-horizons.com, public = client ou pilote).
// category + rank = ordre du flow métier (pas l'ordre de déclaration dans le fichier).
const PUBLIC_CATEGORIES = [
  "Boutique",
  "Réservation standard",
  "Vol sur mesure",
  "Annonces pilote",
  "Pilotes",
  "Messagerie & Contact",
  "Newsletter",
  "Divers",
] as const;

const ADMIN_CATEGORIES = ["Contact", "Vol sur mesure", "Post-vol", "Pilotes"] as const;

const CLASSIFICATION: Record<string, { side: "admin" | "public"; category: string; rank: number }> = {
  // Boutique
  orderConfirmationEmail: { side: "public", category: "Boutique", rank: 0 },
  voucherEmail: { side: "public", category: "Boutique", rank: 1 },
  // Réservation standard
  reservationConfirmationFreeEmail: { side: "public", category: "Réservation standard", rank: 0 },
  reservationPaymentInvitationEmail: { side: "public", category: "Réservation standard", rank: 1 },
  reservationPaymentReminderEmail: { side: "public", category: "Réservation standard", rank: 2 },
  reservationAutoAnnuleeEmail: { side: "public", category: "Réservation standard", rank: 3 },
  reservationPaymentConfirmationEmail: { side: "public", category: "Réservation standard", rank: 4 },
  reservationDateConfirmeeEmail: { side: "public", category: "Réservation standard", rank: 5 },
  reservationHeureConfirmeeEmail: { side: "public", category: "Réservation standard", rank: 6 },
  slotProposalEmail: { side: "public", category: "Réservation standard", rank: 7 },
  rescheduleInviteEmail: { side: "public", category: "Réservation standard", rank: 8 },
  rescheduleConfirmationEmail: { side: "public", category: "Réservation standard", rank: 9 },
  reservationReportConfirmeeEmail: { side: "public", category: "Réservation standard", rank: 10 },
  boardingPassEmail: { side: "public", category: "Réservation standard", rank: 11 },
  flightReminderEmail: { side: "public", category: "Réservation standard", rank: 12 },
  postVolEmail: { side: "public", category: "Réservation standard", rank: 13 },
  // Vol sur mesure
  volSurMesureQuoteEmail: { side: "public", category: "Vol sur mesure", rank: 0 },
  routeProposalEmail: { side: "public", category: "Vol sur mesure", rank: 1 },
  paymentLinkEmail: { side: "public", category: "Vol sur mesure", rank: 2 },
  volSurMesureAcompteEmail: { side: "public", category: "Vol sur mesure", rank: 3 },
  piloteParticipationEmail: { side: "public", category: "Vol sur mesure", rank: 4 },
  routeFeedbackAdminEmail: { side: "admin", category: "Vol sur mesure", rank: 5 },
  // Annonces pilote
  annonceInscriptionPlaceEmail: { side: "public", category: "Annonces pilote", rank: 0 },
  annoncePaiementVirementEmail: { side: "public", category: "Annonces pilote", rank: 1 },
  annoncePaiementConfirmeEmail: { side: "public", category: "Annonces pilote", rank: 2 },
  // Pilotes
  piloteAssignedClientEmail: { side: "public", category: "Pilotes", rank: 0 },
  piloteAssignedPiloteEmail: { side: "public", category: "Pilotes", rank: 1 },
  flightOfferEmail: { side: "public", category: "Pilotes", rank: 2 },
  piloteRouteFeedbackEmail: { side: "public", category: "Pilotes", rank: 3 },
  reservationMessageClientReplyEmail: { side: "public", category: "Pilotes", rank: 4 },
  flightOfferExpiredAdminEmail: { side: "admin", category: "Pilotes", rank: 5 },
  piloteReleasedFlightAdminEmail: { side: "admin", category: "Pilotes", rank: 6 },
  // Messagerie & Contact
  contactAcknowledgmentEmail: { side: "public", category: "Messagerie & Contact", rank: 0 },
  contactReplyEmail: { side: "public", category: "Messagerie & Contact", rank: 1 },
  reservationMessageEmail: { side: "public", category: "Messagerie & Contact", rank: 2 },
  contactNotificationEmail: { side: "admin", category: "Contact", rank: 3 },
  // Newsletter
  newsletterConfirmationEmail: { side: "public", category: "Newsletter", rank: 0 },
  newsletterCampaignEmail: { side: "public", category: "Newsletter", rank: 1 },
  newsletterFromBlocksEmail: { side: "public", category: "Newsletter", rank: 2 },
  // Divers / Post-vol
  customEmail: { side: "public", category: "Divers", rank: 0 },
  satisfactionResultEmail: { side: "admin", category: "Post-vol", rank: 0 },
};

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
}

function extractSubject(html: string): string {
  const m = html.match(/<title>([\s\S]*?)<\/title>/);
  return m ? decodeEntities(m[1]) : "(pas de sujet)";
}

function render(n: number, fn: string, label: string, line: number, build: () => string): Entry {
  const cls = CLASSIFICATION[fn];
  if (!cls) throw new Error(`Pas de classification side/category pour ${fn} — à ajouter dans CLASSIFICATION.`);
  try {
    const html = build();
    return { n, fn, label, line, subject: extractSubject(html), html, error: null, ...cls };
  } catch (e: any) {
    return { n, fn, label, line, subject: "(erreur)", html: "", error: e?.stack ?? String(e), ...cls };
  }
}

const entries: Entry[] = [];

entries.push(render(1, "orderConfirmationEmail", "Confirmation de commande (boutique)", 346, () =>
  T.orderConfirmationEmail({
    orderRef: "FH-2026-0847",
    customerEmail: "sophie.delcourt@example.com",
    customerName: "Sophie Delcourt",
    items: [
      { title: "Vol découverte 30 min", quantity: 1, unit_price: 189, image_url: null },
      { title: "Vol panoramique 60 min", quantity: 2, unit_price: 320, image_url: null },
    ],
    subtotal: 829,
    shippingCost: 0,
    discountAmount: 40,
    total: 789,
    couponCode: "BIENVENUE10",
    shippingAddress: {
      full_name: "Sophie Delcourt",
      email: "sophie.delcourt@example.com",
      line1: "Rue de la Station 12",
      city: "Namur",
      postal_code: "5000",
      country: "Belgique",
    },
    orderDate: "2026-09-10",
    voucherCodes: [
      { code: "FH-ABCD-1234", duration_minutes: 30, product_title: "Vol découverte 30 min" },
      { code: "FH-EFGH-5678", duration_minutes: 60, product_title: "Vol panoramique 60 min", expires_at: "2027-09-10" },
    ],
  })));

entries.push(render(2, "voucherEmail", "Vouchers de vol envoyés après achat", 524, () =>
  T.voucherEmail({
    orderRef: "FH-2026-0847",
    customerName: "Sophie Delcourt",
    codes: [
      { code: "FH-ABCD-1234", duration_minutes: 30, product_title: "Vol découverte 30 min" },
      { code: "FH-EFGH-5678", duration_minutes: 60, product_title: "Vol panoramique 60 min", expires_at: "2027-09-10" },
    ],
  })));

entries.push(render(3, "volSurMesureQuoteEmail", "Vol sur mesure — devis initial (sans paiement)", 634, () =>
  T.volSurMesureQuoteEmail({
    prenom: "Sophie",
    nom: "Delcourt",
    date: "2026-10-04",
    heure: "10:30",
    dureeMin: 75,
    distKm: 210,
    reservationId: "res_9f21ab",
    styleVol: "Panoramique, survol de châteaux",
    stopovers: [{ icao: "EBSP", nom: "Spa-La Sauvenière", taxe: 25 }],
    prixEstime: 540,
    discount: 60,
    prixBillable: 480,
    acompte: 300,
    taxesEscales: 25,
    totalAcompte: 325,
    voucherCode: "FH-EFGH-5678",
  })));

entries.push(render(4, "reservationConfirmationFreeEmail", "Réservation standard — couverte par un voucher", 746, () =>
  T.reservationConfirmationFreeEmail({
    prenom: "Sophie",
    nom: "Delcourt",
    dateStr: "samedi 3 octobre 2026",
    heure: "14:00",
    duree: 30,
    passengers: 2,
    poids_total: 140,
    voucherCode: "FH-ABCD-1234",
    reservationId: "res_9f21ab",
    dateISO: "2026-10-03",
    montant: null,
  })));

entries.push(render(5, "reservationPaymentConfirmationEmail", "Réservation standard — paiement reçu", 812, () =>
  T.reservationPaymentConfirmationEmail({
    prenom: "Sophie",
    nom: "Delcourt",
    dateStr: "samedi 3 octobre 2026",
    heure: "14:00",
    duree: 60,
    passengers: 1,
    reservationId: "res_9f21ab",
    dateISO: "2026-10-03",
    montantPaye: 320,
  })));

entries.push(render(6, "volSurMesureAcompteEmail", "Vol sur mesure — provision reçue", 886, () =>
  T.volSurMesureAcompteEmail({
    prenom: "Sophie",
    nom: "Delcourt",
    dateStr: "dimanche 4 octobre 2026",
    heure: "10:30",
    dureeEstimee: 75,
    voucherCode: "FH-EFGH-5678",
    montantPaye: 325,
    reservationId: "res_9f21ab",
    dateISO: "2026-10-04",
    breakdown: {
      coutVol: 540,
      dureeMin: 75,
      distKm: 210,
      taxesEscales: 25,
      voucherDiscount: 60,
      voucherCode: "FH-EFGH-5678",
      total: 325,
    },
  })));

entries.push(render(7, "reservationDateConfirmeeEmail", "Date de vol confirmée (avant itinéraire)", 1011, () =>
  T.reservationDateConfirmeeEmail({
    prenom: "Sophie",
    dateStr: "samedi 3 octobre 2026",
    duree: 60,
    route: null,
    routeUrl: null,
  })));

entries.push(render(8, "piloteParticipationEmail", "Participation aux frais à régler au pilote (itinéraire validé)", 1057, () =>
  T.piloteParticipationEmail({
    prenom: "Sophie",
    dateStr: "samedi 3 octobre 2026",
    piloteNom: "Julien Verhaegen",
    montant: 145,
    iban: "BE68 5390 0754 7034",
    paylink: "https://payconiq.com/exemple",
    communication: "VOL-3OCT-SOPHIE",
    qrUrl: "https://fly-horizons.com/api/qr/exemple.png",
    trackerUrl: "https://fly-horizons.com/paiement/track/exemple",
  })));

entries.push(render(9, "reservationHeureConfirmeeEmail", "Créneau horaire confirmé (avec itinéraire)", 1078, () =>
  T.reservationHeureConfirmeeEmail({
    prenom: "Sophie",
    dateStr: "samedi 3 octobre 2026",
    heure: "14:00",
    duree: 60,
    route: "Charleroi → Dinant → Namur → Charleroi",
    routeUrl: "https://fly-horizons.com/vol/route/exemple",
    dateISO: "2026-10-03",
  })));

entries.push(render(10, "reservationReportConfirmeeEmail", "Nouvelle date confirmée après un report", 1147, () =>
  T.reservationReportConfirmeeEmail({
    prenom: "Sophie",
    dateStr: "samedi 10 octobre 2026",
    heure: "14:00",
    duree: 60,
    dateISO: "2026-10-10",
  })));

entries.push(render(11, "boardingPassEmail", "Boarding pass (envoi manuel depuis l'admin)", 1188, () =>
  T.boardingPassEmail({
    prenom: "Sophie",
    dateStr: "samedi 3 octobre 2026",
    heure: "14:00",
    duree: 60,
  })));

entries.push(render(12, "contactNotificationEmail", "Contact — notification interne (nouveau message)", 1227, () =>
  T.contactNotificationEmail({
    nom: "Sophie Delcourt",
    email: "sophie.delcourt@example.com",
    sujet: "Question sur un vol sur mesure",
    message: "Bonjour, est-il possible de survoler le château de Bouillon lors d'un vol sur mesure ?\n\nMerci d'avance.",
  })));

entries.push(render(13, "contactAcknowledgmentEmail", "Contact — accusé de réception client", 1258, () =>
  T.contactAcknowledgmentEmail({
    nom: "Sophie Delcourt",
    email: "sophie.delcourt@example.com",
    sujet: "Question sur un vol sur mesure",
    message: "Bonjour, est-il possible de survoler le château de Bouillon lors d'un vol sur mesure ?",
    threadUrl: "https://fly-horizons.com/contact/ticket/exemple",
  })));

entries.push(render(14, "contactReplyEmail", "Contact — réponse admin envoyée au client", 1304, () =>
  T.contactReplyEmail({
    nom: "Sophie Delcourt",
    email: "sophie.delcourt@example.com",
    sujet: "Question sur un vol sur mesure",
    reponse: "Bonjour Sophie, oui c'est tout à fait possible ! Je vous propose d'en discuter lors de la préparation de votre itinéraire.",
    threadUrl: "https://fly-horizons.com/contact/ticket/exemple",
  })));

entries.push(render(15, "reservationMessageEmail", "Messagerie pilote → client (fil de réservation)", 1346, () =>
  T.reservationMessageEmail({
    prenom: "Sophie",
    expediteurNom: "Julien Verhaegen",
    dateStr: "samedi 3 octobre 2026",
    message: "Bonjour Sophie, je vous confirme un rendez-vous à 13h45 au comptoir d'accueil, 15 min avant le décollage.",
    signature: "À samedi,\nJulien",
    threadUrl: "https://fly-horizons.com/account/reservations/exemple/messages",
  })));

entries.push(render(16, "reservationMessageClientReplyEmail", "Messagerie client → pilote (réponse client)", 1390, () =>
  T.reservationMessageClientReplyEmail({
    clientNom: "Sophie Delcourt",
    dateStr: "samedi 3 octobre 2026",
    message: "Parfait, merci ! Nous serons 2 personnes, poids total d'environ 140 kg.",
    adminUrl: "https://fly-horizons.com/pilote/vols/exemple",
  })));

entries.push(render(17, "reservationPaymentInvitationEmail", "Invitation au paiement (réservation admin)", 1427, () =>
  T.reservationPaymentInvitationEmail({
    prenom: "Sophie",
    nom: "Delcourt",
    dateStr: "samedi 3 octobre 2026",
    heure: "14:00",
    duree: 60,
    montant: 320,
    paymentUrl: "https://fly-horizons.com/paiement/exemple",
    voucherCode: null,
    breakdown: { coutVol: 320, dureeMin: 60, total: 320 },
  })));

entries.push(render(18, "annoncePaiementVirementEmail", "Annonce pilote — règlement par virement (itinéraire validé)", 1492, () =>
  T.annoncePaiementVirementEmail({
    prenom: "Sophie",
    nom: "Delcourt",
    dateStr: "samedi 3 octobre 2026",
    heure: "14:00",
    duree: 60,
    montant: 145,
    piloteNom: "Julien Verhaegen",
    paiementUrl: "https://fly-horizons.com/paiement/annonce/exemple",
  })));

entries.push(render(19, "annoncePaiementConfirmeEmail", "Annonce pilote — paiement confirmé", 1552, () =>
  T.annoncePaiementConfirmeEmail({
    prenom: "Sophie",
    nom: "Delcourt",
    dateStr: "samedi 3 octobre 2026",
    heure: "14:00",
    duree: 60,
    piloteNom: "Julien Verhaegen",
    montant: 145,
    receiptUrl: "https://fly-horizons.com/paiement/annonce/exemple/recu",
  })));

entries.push(render(20, "annonceInscriptionPlaceEmail", "Annonce pilote — mode \"à la place\", en attente", 1600, () =>
  T.annonceInscriptionPlaceEmail({
    prenom: "Sophie",
    nom: "Delcourt",
    dateStr: "samedi 3 octobre 2026",
    heure: "14:00",
    duree: 60,
    piloteNom: "Julien Verhaegen",
    passagers: 1,
  })));

entries.push(render(21, "reservationPaymentReminderEmail", "Rappel de paiement — T-72h", 1647, () =>
  T.reservationPaymentReminderEmail({
    prenom: "Sophie",
    nom: "Delcourt",
    dateStr: "samedi 3 octobre 2026",
    heure: "14:00",
    duree: 60,
    montant: 320,
    paymentUrl: "https://fly-horizons.com/paiement/exemple",
    deadlineStr: "jeudi 1 octobre 2026 à 14:00",
    breakdown: { coutVol: 320, dureeMin: 60, total: 320 },
  })));

entries.push(render(22, "reservationAutoAnnuleeEmail", "Annulation automatique — délai de paiement dépassé", 1717, () =>
  T.reservationAutoAnnuleeEmail({
    prenom: "Sophie",
    nom: "Delcourt",
    dateStr: "samedi 3 octobre 2026",
    heure: "14:00",
    duree: 60,
    bookingUrl: "https://fly-horizons.com/reservation",
    source: "auto",
  })));

entries.push(render(23, "flightReminderEmail", "Rappel J-2 avant le vol", 1786, () =>
  T.flightReminderEmail({
    prenom: "Sophie",
    dateStr: "samedi 3 octobre 2026",
    heure: "14:00",
    duree: 60,
    type_resa: "standard",
    accountUrl: "https://fly-horizons.com/account#reservations",
    dateISO: "2026-10-03",
  })));

entries.push(render(24, "postVolEmail", "Post-vol — remerciement + lien enquête", 1839, () =>
  T.postVolEmail({
    prenom: "Sophie",
    dateStr: "samedi 3 octobre 2026",
    duree: 60,
    surveyUrl: "https://fly-horizons.com/satisfaction/exemple",
  })));

entries.push(render(25, "satisfactionResultEmail", "Résultat enquête satisfaction (notification admin)", 1879, () =>
  T.satisfactionResultEmail({
    prenom: "Sophie",
    nom: "Delcourt",
    dateStr: "samedi 3 octobre 2026",
    duree: 60,
    notePreparation: 5,
    notePilote: 5,
    noteVol: 4,
    noteQualitePrix: 4,
    recommandation: "oui_sans_hesiter",
    sourceDecouverte: "instagram",
    commentaire: "Expérience magique, Julien a été très pédagogue pendant le vol. Merci !",
    nbPhotos: 3,
  })));

entries.push(render(26, "customEmail", "Email libre stylisé (rédigé à la main depuis l'admin)", 1942, () =>
  T.customEmail({
    subject: "Un petit mot avant votre vol",
    body: "Bonjour Sophie,\n\nJe voulais vous prévenir que la météo s'annonce idéale pour samedi.\n\nÀ très vite !",
    rescheduleUrl: "https://fly-horizons.com/reservation/report/exemple",
  })));

entries.push(render(27, "routeFeedbackAdminEmail", "Route — retour client à l'admin (validée / modif demandée)", 1987, () =>
  T.routeFeedbackAdminEmail({
    clientPrenom: "Sophie",
    clientNom: "Delcourt",
    clientEmail: "sophie.delcourt@example.com",
    resaId: "res_9f21ab",
    dateStr: "samedi 3 octobre 2026",
    type: "modification_requested",
    feedback: "Serait-il possible de passer au-dessus du lac de l'Eau d'Heure plutôt que de Dinant ?",
    adminUrl: "https://fly-horizons.com/admin/reservations/exemple",
  })));

entries.push(render(28, "rescheduleInviteEmail", "Invitation à reporter un vol", 2017, () =>
  T.rescheduleInviteEmail({
    prenom: "Sophie",
    dateStr: "samedi 3 octobre 2026",
    duree: 60,
    rescheduleUrl: "https://fly-horizons.com/reservation/report/exemple",
  })));

entries.push(render(29, "rescheduleConfirmationEmail", "Confirmation de report", 2052, () =>
  T.rescheduleConfirmationEmail({
    prenom: "Sophie",
    oldDateStr: "samedi 3 octobre 2026",
    newDateStr: "samedi 10 octobre 2026",
    duree: 60,
    accountUrl: "https://fly-horizons.com/account#reservations",
  })));

entries.push(render(30, "slotProposalEmail", "Proposition d'un créneau précis par le pilote", 2092, () =>
  T.slotProposalEmail({
    prenom: "Sophie",
    requestedDateStr: "samedi 3 octobre 2026",
    proposedDateStr: "dimanche 4 octobre 2026",
    proposedHeure: "11:00",
    duree: 60,
    respondUrl: "https://fly-horizons.com/vol/proposition/exemple",
  })));

entries.push(render(31, "routeProposalEmail", "Proposition d'itinéraire (waypoints, carte)", 2144, () =>
  T.routeProposalEmail({
    prenom: "Sophie",
    dateStr: "samedi 3 octobre 2026",
    waypoints: [
      { nom: "Dinant, citadelle" },
      { nom: "Lac de l'Eau d'Heure" },
      { nom: "Namur, citadelle" },
    ],
    adminComment: "Voici le tracé que je vous propose, environ 60 minutes de vol au total.",
    responseUrl: "https://fly-horizons.com/vol/proposition/exemple",
    totalAcompte: 320,
    alreadyPaid: false,
  })));

entries.push(render(32, "paymentLinkEmail", "Lien de paiement après acceptation de l'itinéraire", 2263, () =>
  T.paymentLinkEmail({
    prenom: "Sophie",
    dateStr: "samedi 3 octobre 2026",
    duree: 60,
    acompte: 320,
    paymentUrl: "https://fly-horizons.com/paiement/exemple",
    breakdown: { coutVol: 320, dureeMin: 60, total: 320 },
  })));

entries.push(render(33, "newsletterFromBlocksEmail", "Newsletter — éditeur de blocs (campagne visuelle)", 2372, () =>
  T.newsletterFromBlocksEmail(
    "De nouveaux survols disponibles pour l'automne",
    [
      { id: "1", type: "heading", level: 1, text: "L'automne vu du ciel" },
      { id: "2", type: "text", content: "Les couleurs d'automne sur les Ardennes sont spectaculaires vues d'avion. Voici les prochains créneaux disponibles." },
      { id: "3", type: "separator" },
      { id: "4", type: "callout", text: "Places limitées, réservez vite pour profiter des week-ends encore ensoleillés." },
      { id: "5", type: "button", text: "Voir les disponibilités", url: "https://fly-horizons.com/reservation" },
    ],
    "Sophie",
    "https://fly-horizons.com/newsletter/unsubscribe/exemple",
  )));

entries.push(render(34, "newsletterConfirmationEmail", "Newsletter — confirmation d'inscription", 2393, () =>
  T.newsletterConfirmationEmail("Sophie", "https://fly-horizons.com/newsletter/unsubscribe/exemple")));

entries.push(render(35, "newsletterCampaignEmail", "Newsletter — campagne texte simple (admin)", 2419, () =>
  T.newsletterCampaignEmail(
    "Météo idéale ce week-end",
    "Bonjour,\n\nLe ciel s'annonce dégagé samedi et dimanche, encore quelques créneaux disponibles.\n\nÀ bientôt dans les airs !",
    "Sophie",
    "https://fly-horizons.com/newsletter/unsubscribe/exemple",
  )));

entries.push(render(36, "piloteAssignedClientEmail", "Attribution d'un vol à un pilote — email client", 2446, () =>
  T.piloteAssignedClientEmail({
    prenom: "Sophie",
    dateStr: "samedi 3 octobre 2026",
    duree: 60,
    piloteNom: "Julien Verhaegen",
    piloteUrl: "https://fly-horizons.com/pilotes/julien-verhaegen",
  })));

entries.push(render(37, "piloteAssignedPiloteEmail", "Attribution d'un vol à un pilote — email pilote", 2481, () =>
  T.piloteAssignedPiloteEmail({
    piloteNom: "Julien Verhaegen",
    clientNom: "Sophie Delcourt",
    dateStr: "samedi 3 octobre 2026",
    heure: "14:00",
    duree: 60,
    passagers: 2,
    volsUrl: "https://fly-horizons.com/pilote/vols",
  })));

entries.push(render(38, "piloteRouteFeedbackEmail", "Retour client sur l'itinéraire → notification au pilote", 2518, () =>
  T.piloteRouteFeedbackEmail({
    piloteNom: "Julien Verhaegen",
    clientNom: "Sophie Delcourt",
    dateStr: "samedi 3 octobre 2026",
    type: "validated",
    feedback: null,
    volsUrl: "https://fly-horizons.com/pilote/vols",
  })));

entries.push(render(39, "flightOfferEmail", "Mise en jeu d'un vol à tous les pilotes", 2553, () =>
  T.flightOfferEmail({
    piloteNom: "Julien Verhaegen",
    dateStr: "samedi 3 octobre 2026",
    heure: "14:00",
    duree: 60,
    passagers: 2,
    routeStr: "Charleroi → Dinant → Namur → Charleroi",
    expiresStr: "lundi 5 octobre 2026 à 12:00",
    offreUrl: "https://fly-horizons.com/pilote/offres/exemple",
  })));

entries.push(render(40, "flightOfferExpiredAdminEmail", "Vols sans preneur après 48h (notification admin)", 2587, () =>
  T.flightOfferExpiredAdminEmail({
    offers: [
      { dateStr: "samedi 3 octobre 2026", heure: "14:00" },
      { dateStr: "dimanche 4 octobre 2026", heure: null },
    ],
    volsUrl: "https://fly-horizons.com/admin/vols",
  })));

entries.push(render(41, "piloteReleasedFlightAdminEmail", "Un pilote rend un vol attribué → notification admin", 2615, () =>
  T.piloteReleasedFlightAdminEmail({
    piloteNom: "Julien Verhaegen",
    clientNom: "Sophie Delcourt",
    dateStr: "samedi 3 octobre 2026",
    heure: "14:00",
    volsUrl: "https://fly-horizons.com/admin/vols",
  })));

// ── Build the standalone preview HTML ──────────────────────────────────────

const ok = entries.filter((e) => !e.error);
const failed = entries.filter((e) => e.error);

const payload = JSON.stringify(entries).replace(/<\/script/gi, "<\\/script");

const today = new Date().toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Aperçu des emails — Fly Horizons</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, "Segoe UI", Arial, sans-serif; background: #f5f6f8; color: #1f2937; height: 100vh; overflow: hidden; }
  .app { display: flex; height: 100vh; }
  .sidebar { width: 360px; flex-shrink: 0; background: #fff; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column; }
  .sidebar-head { padding: 14px 16px 10px; border-bottom: 1px solid #eef0f2; }
  .sidebar-head h1 { font-size: 15px; margin: 0 0 4px; }
  .sidebar-head .note { font-size: 11px; color: #6b7280; line-height: 1.5; }
  .sidebar-head .note code { background: #f1f3f5; padding: 1px 4px; border-radius: 4px; }
  .tabs { display: flex; border-bottom: 1px solid #eef0f2; }
  .tab { flex: 1; padding: 10px 8px; text-align: center; font-size: 12.5px; font-weight: 700; cursor: pointer; color: #6b7280; border-bottom: 2px solid transparent; background: #fafbfc; }
  .tab:hover { background: #f3f4f6; }
  .tab.active[data-side="public"] { color: #1d4ed8; border-bottom-color: #1d4ed8; background: #eff6ff; }
  .tab.active[data-side="admin"] { color: #b45309; border-bottom-color: #b45309; background: #fffbeb; }
  .search { padding: 10px 12px; border-bottom: 1px solid #eef0f2; }
  .search input { width: 100%; padding: 7px 10px; border: 1px solid #d1d5db; border-radius: 7px; font-size: 13px; }
  .list { overflow-y: auto; flex: 1; }
  .cat-head { padding: 10px 14px 5px; font-size: 10.5px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.07em; background: #fafbfc; position: sticky; top: 0; }
  .row { padding: 9px 14px; border-bottom: 1px solid #f3f4f6; cursor: pointer; }
  .row:hover { background: #f8fafc; }
  .row.active { background: #eef2ff; border-left: 3px solid #4f46e5; padding-left: 11px; }
  .row .n { font-weight: 700; font-size: 12.5px; color: #111827; }
  .row .n .warn { color: #dc2626; }
  .row .fn { font-family: "Consolas", monospace; font-size: 10.5px; color: #9ca3af; margin-top: 2px; }
  .badge-side { display: inline-block; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 1px 6px; border-radius: 4px; margin-left: 6px; vertical-align: middle; }
  .badge-side.admin { background: #fef3c7; color: #92400e; }
  .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .topbar { padding: 12px 20px; background: #fff; border-bottom: 1px solid #e5e7eb; }
  .topbar .subject { font-size: 14px; font-weight: 700; color: #111827; }
  .topbar .meta { font-size: 11.5px; color: #6b7280; margin-top: 3px; font-family: "Consolas", monospace; }
  .frame-wrap { flex: 1; overflow: hidden; background: #eceef1; }
  iframe { width: 100%; height: 100%; border: 0; background: #fff; }
  .error-box { margin: 20px; padding: 16px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; color: #991b1b; font-family: "Consolas", monospace; font-size: 12px; white-space: pre-wrap; }
</style>
</head>
<body>
<div class="app">
  <div class="sidebar">
    <div class="sidebar-head">
      <h1>Aperçu des emails — Fly Horizons</h1>
      <div class="note">Généré le ${today} à partir de <code>lib/email-templates.ts</code> avec des données d'exemple.<br>Pour régénérer après une modification : <code>npx tsx scripts/generate-email-preview.ts</code></div>
    </div>
    <div class="tabs">
      <div class="tab" data-side="public" id="tabPublic"></div>
      <div class="tab" data-side="admin" id="tabAdmin"></div>
    </div>
    <div class="search"><input type="text" id="search" placeholder="Filtrer par numéro, nom ou libellé..."></div>
    <div class="list" id="list"></div>
  </div>
  <div class="main">
    <div class="topbar">
      <div class="subject" id="subject"></div>
      <div class="meta" id="meta"></div>
    </div>
    <div class="frame-wrap" id="frameWrap"></div>
  </div>
</div>
<script>
const ENTRIES = ${payload};
const PUBLIC_CATEGORIES = ${JSON.stringify(PUBLIC_CATEGORIES)};
const ADMIN_CATEGORIES = ${JSON.stringify(ADMIN_CATEGORIES)};

let activeSide = "public";
let current = null;

function countSide(side) { return ENTRIES.filter(e => e.side === side).length; }

function updateTabs() {
  document.getElementById("tabPublic").textContent = "Public (" + countSide("public") + ")";
  document.getElementById("tabAdmin").textContent = "Admin (" + countSide("admin") + ")";
  document.getElementById("tabPublic").className = "tab" + (activeSide === "public" ? " active" : "");
  document.getElementById("tabAdmin").className = "tab" + (activeSide === "admin" ? " active" : "");
}

function matches(e, f) {
  if (!f) return true;
  const hay = (e.n + " " + e.fn + " " + e.label + " " + e.category).toLowerCase();
  return hay.indexOf(f) !== -1;
}

function renderList(filter) {
  const f = (filter || "").toLowerCase();

  // Si le côté actif n'a aucun résultat mais l'autre en a, on bascule automatiquement.
  if (f) {
    const activeHas = ENTRIES.some(e => e.side === activeSide && matches(e, f));
    const otherSide = activeSide === "public" ? "admin" : "public";
    const otherHas = ENTRIES.some(e => e.side === otherSide && matches(e, f));
    if (!activeHas && otherHas) activeSide = otherSide;
  }
  updateTabs();

  const list = document.getElementById("list");
  list.innerHTML = "";
  const cats = activeSide === "admin" ? ADMIN_CATEGORIES : PUBLIC_CATEGORIES;

  cats.forEach(cat => {
    const items = ENTRIES
      .filter(e => e.side === activeSide && e.category === cat && matches(e, f))
      .sort((a, b) => a.rank - b.rank);
    if (items.length === 0) return;

    const head = document.createElement("div");
    head.className = "cat-head";
    head.textContent = cat;
    list.appendChild(head);

    items.forEach(e => {
      const row = document.createElement("div");
      row.className = "row" + (e.n === current ? " active" : "");
      row.innerHTML = '<div class="n">' + (e.error ? '<span class="warn">⚠ </span>' : '') + '#' + e.n + ' — ' + e.label + '</div><div class="fn">' + e.fn + '</div>';
      row.onclick = () => select(e.n);
      list.appendChild(row);
    });
  });
}

function select(n) {
  current = n;
  const e = ENTRIES.find(x => x.n === n);
  if (!e) return;
  activeSide = e.side;
  document.getElementById("subject").textContent = e.subject;
  document.getElementById("meta").innerHTML = e.fn + "() · lib/email-templates.ts:" + e.line + (e.side === "admin" ? ' <span class="badge-side admin">Admin</span>' : "");
  const wrap = document.getElementById("frameWrap");
  wrap.innerHTML = "";
  if (e.error) {
    const box = document.createElement("div");
    box.className = "error-box";
    box.textContent = "Erreur lors du rendu de cet email :\\n\\n" + e.error;
    wrap.appendChild(box);
  } else {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-same-origin");
    iframe.srcdoc = e.html;
    wrap.appendChild(iframe);
  }
  renderList(document.getElementById("search").value);
}

document.getElementById("tabPublic").addEventListener("click", () => { activeSide = "public"; renderList(document.getElementById("search").value); });
document.getElementById("tabAdmin").addEventListener("click", () => { activeSide = "admin"; renderList(document.getElementById("search").value); });
document.getElementById("search").addEventListener("input", (ev) => renderList(ev.target.value));

renderList("");
const first = ENTRIES.filter(e => e.side === "public").sort((a, b) => PUBLIC_CATEGORIES.indexOf(a.category) - PUBLIC_CATEGORIES.indexOf(b.category) || a.rank - b.rank)[0];
if (first) select(first.n);
</script>
</body>
</html>`;

fs.writeFileSync(path.join(ROOT, "email-preview.html"), html, "utf-8");

console.log(`OK: ${ok.length}/${entries.length} emails rendus.`);
if (failed.length) {
  console.log("Échecs :");
  for (const e of failed) console.log(`  - #${e.n} ${e.fn}: ${e.error?.split("\n")[0]}`);
}
console.log("Écrit : email-preview.html");
