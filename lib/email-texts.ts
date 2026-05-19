export interface EmailField {
  label: string;
  type: "text" | "textarea";
  default: string;
}

export interface EmailSchema {
  label: string;
  trigger: string;
  fields: Record<string, EmailField>;
}

export const EMAIL_SCHEMAS: Record<string, EmailSchema> = {
  resa_voucher: {
    label: "Réservation — voucher",
    trigger: "Réservation créée avec un bon de vol (sans paiement)",
    fields: {
      subject:     { label: "Objet",                   type: "text",     default: "Réservation confirmée — Fly Horizons" },
      supertitle:  { label: "Surtitre",                type: "text",     default: "Réservation" },
      title:       { label: "Titre",                   type: "text",     default: "Réservation confirmée" },
      subtitle:    { label: "Introduction  {prenom}",  type: "text",     default: "Bonjour {prenom}, votre vol est confirmé." },
      callout:     { label: "Encadré",                 type: "textarea", default: "Votre vol est entièrement couvert par votre voucher — aucun paiement supplémentaire requis. Nous vous contacterons rapidement pour confirmer tous les détails." },
      practical_1: { label: "Pratique — lieu",         type: "text",     default: "Aéroport de Charleroi (EBCI), Belgique" },
      practical_2: { label: "Pratique — arrivée",      type: "text",     default: "Présentez-vous 15 minutes avant l'heure du vol" },
      signoff:     { label: "Signature",               type: "text",     default: "À très bientôt à bord — L'équipe Fly Horizons" },
    },
  },
  resa_payment: {
    label: "Réservation — paiement reçu",
    trigger: "Paiement Stripe confirmé (réservation standard)",
    fields: {
      subject:     { label: "Objet",                   type: "text",     default: "Paiement confirmé — Fly Horizons" },
      supertitle:  { label: "Surtitre",                type: "text",     default: "Paiement reçu" },
      title:       { label: "Titre",                   type: "text",     default: "Réservation confirmée" },
      subtitle:    { label: "Introduction  {prenom}",  type: "text",     default: "Bonjour {prenom}, votre paiement a bien été reçu." },
      practical_1: { label: "Pratique — lieu",         type: "text",     default: "Aéroport de Charleroi (EBCI), Belgique" },
      practical_2: { label: "Pratique — arrivée",      type: "text",     default: "Présentez-vous 15 minutes avant l'heure du vol" },
      practical_3: { label: "Pratique — équipement",   type: "text",     default: "Casques audio fournis — aucun équipement nécessaire" },
      signoff:     { label: "Signature",               type: "text",     default: "Nous vous contacterons pour confirmer tous les détails. À très bientôt à bord — L'équipe Fly Horizons" },
      btn:         { label: "Bouton",                  type: "text",     default: "Plan d'accès →" },
    },
  },
  vol_mesure_acompte: {
    label: "Vol sur mesure — acompte",
    trigger: "Paiement d'acompte vol sur mesure confirmé",
    fields: {
      subject:    { label: "Objet",                   type: "text",     default: "Acompte reçu — Vol sur mesure Fly Horizons" },
      supertitle: { label: "Surtitre",                type: "text",     default: "Acompte reçu" },
      title:      { label: "Titre",                   type: "text",     default: "Votre réservation est confirmée" },
      subtitle:   { label: "Introduction  {prenom}",  type: "text",     default: "Bonjour {prenom}, votre acompte a bien été reçu." },
      callout:    { label: "Encadré",                 type: "textarea", default: "Nous vous recontacterons sous 24 h pour affiner votre itinéraire et confirmer la date exacte. Le solde sera réglé après votre vol selon la durée réelle." },
      signoff:    { label: "Signature",               type: "text",     default: "À très bientôt à bord — L'équipe Fly Horizons" },
      btn:        { label: "Bouton",                  type: "text",     default: "Plan d'accès →" },
    },
  },
  date_confirmee: {
    label: "Date de vol confirmée",
    trigger: "Admin confirme la date dans le drawer",
    fields: {
      subject:    { label: "Objet",                   type: "text",     default: "Votre date de vol est confirmée — Fly Horizons" },
      supertitle: { label: "Surtitre",                type: "text",     default: "Fly Horizons" },
      title:      { label: "Titre",                   type: "text",     default: "Date de vol confirmée" },
      subtitle:   { label: "Introduction  {prenom}",  type: "text",     default: "Bonjour {prenom}, votre date est réservée." },
      callout:    { label: "Encadré",                 type: "textarea", default: "Votre date est confirmée. Nous vous recontacterons très prochainement pour vous communiquer votre créneau horaire exact." },
      signoff:    { label: "Signature",               type: "text",     default: "Questions ? Répondez directement à cet email — L'équipe Fly Horizons" },
      btn:        { label: "Bouton (sans route)",     type: "text",     default: "Plan d'accès →" },
    },
  },
  heure_confirmee: {
    label: "Créneau horaire confirmé",
    trigger: "Admin confirme l'heure dans le drawer",
    fields: {
      subject:     { label: "Objet",                   type: "text",     default: "Votre créneau horaire est confirmé — Fly Horizons" },
      supertitle:  { label: "Surtitre",                type: "text",     default: "Fly Horizons" },
      title:       { label: "Titre",                   type: "text",     default: "C'est confirmé — à bientôt !" },
      subtitle:    { label: "Introduction  {prenom}",  type: "text",     default: "Bonjour {prenom}, votre vol est planifié." },
      practical_1: { label: "Pratique — lieu",         type: "text",     default: "Aéroport de Charleroi (EBCI), Belgique" },
      practical_2: { label: "Pratique — arrivée",      type: "text",     default: "Présentez-vous 15 minutes avant l'heure du vol" },
      practical_3: { label: "Pratique — équipement",   type: "text",     default: "Casques audio fournis — aucun équipement nécessaire" },
      signoff:     { label: "Signature",               type: "text",     default: "Beau temps et bon vol ! Rendez-vous à l'aéroport — L'équipe Fly Horizons" },
      btn:         { label: "Bouton",                  type: "text",     default: "Plan d'accès →" },
    },
  },
  post_vol: {
    label: "Post-vol — remerciement",
    trigger: "Admin marque le vol comme effectué",
    fields: {
      subject:       { label: "Objet",                            type: "text",     default: "Merci pour votre vol — Fly Horizons" },
      supertitle:    { label: "Surtitre",                         type: "text",     default: "Fly Horizons" },
      title:         { label: "Titre",                            type: "text",     default: "Merci pour votre vol !" },
      body:          { label: "Corps — {prenom} {date} {durée}",  type: "textarea", default: "Bonjour {prenom},\n\nMerci d'avoir choisi Fly Horizons. Votre vol du {date} ({durée}) est maintenant terminé — nous espérons que vous avez passé un moment inoubliable !" },
      survey_prompt: { label: "Invitation à l'enquête",            type: "textarea", default: "Votre avis nous aide à améliorer constamment la qualité de nos vols. L'enquête prend moins d'une minute — merci d'avance !" },
      btn:           { label: "Bouton",                            type: "text",     default: "Donner mon avis" },
      signoff:       { label: "Signature",                         type: "text",     default: "À bientôt à bord — L'équipe Fly Horizons" },
    },
  },
  route_proposal: {
    label: "Itinéraire proposé",
    trigger: "Confirmation avec route enregistrée, ou 'Renvoyer la route'",
    fields: {
      subject:       { label: "Objet",                    type: "text", default: "Votre itinéraire de vol — Fly Horizons" },
      supertitle:    { label: "Surtitre",                 type: "text", default: "Itinéraire" },
      title:         { label: "Titre",                    type: "text", default: "Votre itinéraire de vol" },
      subtitle:      { label: "Introduction  {prenom}",   type: "text", default: "Bonjour {prenom}, voici l'itinéraire prévu pour votre vol." },
      validity_note: { label: "Note de validité du lien", type: "text", default: "Ce lien est valable jusqu'à 48 h avant votre vol." },
      btn:           { label: "Bouton",                   type: "text", default: "Valider ou modifier l'itinéraire →" },
      signoff:       { label: "Signature",                type: "text", default: "Questions ? Répondez directement à cet email — L'équipe Fly Horizons" },
    },
  },
};

export function resolveTexts(emailId: string, overrides: Record<string, string> = {}): Record<string, string> {
  const schema = EMAIL_SCHEMAS[emailId];
  if (!schema) return {};
  const result: Record<string, string> = {};
  for (const [key, field] of Object.entries(schema.fields)) {
    result[key] = overrides[key] !== undefined ? overrides[key] : field.default;
  }
  return result;
}
