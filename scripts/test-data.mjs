// Données de test pour l'espace pilote (drawers, transactions), en base PROD.
// Tout est marqué : annonces titrées « TEST … », clients romainpilot2003+test…@gmail.com.
// Annonces en statut « reservee » : invisibles sur le site public.
//
//   node scripts/test-data.mjs seed    crée les données
//   node scripts/test-data.mjs proposition   crée UNE proposition d'itinéraire en attente (page /vol/proposition/[token])
//   node scripts/test-data.mjs creneau       crée UNE réservation avec un autre créneau proposé (page /reservation/creneau-propose/[token])
//   node scripts/test-data.mjs messages      crée UNE réservation avec 10 messages (page /reservation/messages/[token])
//   node scripts/test-data.mjs ticket        crée UN ticket de contact avec 6 messages (page /contact/ticket/[token]) ; ticket-clean le supprime
//   node scripts/test-data.mjs clean   supprime tout ce qui est marqué TEST
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const PILOTE_ID = "40a131be-fe1d-448f-a543-0b2f71975545";
const EMAIL_LIKE = "romainpilot2003+test%@gmail.com";

function must({ data, error }, what) {
  if (error) throw new Error(`${what} : ${error.message}`);
  return data;
}

async function clean() {
  const annonces = must(await db.from("annonces_pilote").select("id").like("titre", "TEST %"), "annonces");
  const clients = must(await db.from("clients").select("id").like("email", EMAIL_LIKE), "clients");
  const aIds = annonces.map((a) => a.id);
  const cIds = clients.map((c) => c.id);
  if (aIds.length) must(await db.from("reservations").delete().in("annonce_id", aIds).select("id"), "resa (annonces)");
  if (cIds.length) must(await db.from("reservations").delete().in("client_id", cIds).select("id"), "resa (clients)");
  if (aIds.length) must(await db.from("annonces_pilote").delete().in("id", aIds), "annonces");
  if (cIds.length) must(await db.from("clients").delete().in("id", cIds), "clients");
  console.log(`Supprimé : ${aIds.length} annonces, ${cIds.length} clients (et leurs réservations).`);
}

async function seed() {
  await clean();
  const clients = must(await db.from("clients").insert([
    { id: crypto.randomUUID(), prenom: "Julie", nom: "TEST Martin", email: "romainpilot2003+test1@gmail.com", telephone: "+32470000001" },
    { id: crypto.randomUUID(), prenom: "Marc", nom: "TEST Dubois", email: "romainpilot2003+test2@gmail.com", telephone: "+32470000002" },
    { id: crypto.randomUUID(), prenom: "Sophie", nom: "TEST Leroy", email: "romainpilot2003+test3@gmail.com", telephone: "+32470000003" },
  ]).select("id"), "clients");
  const [julie, marc, sophie] = clients.map((c) => c.id);

  // La date du vol vit sur la réservation (l'annonce n'a plus de date depuis les dispos).
  const specs = [
    { date_vol: "2026-09-13", heure_vol: "10:00", titre: "TEST Tour de Bruxelles", duree: 60, places: 2, prix_total: 360, part_pilote: 120 },
    { date_vol: "2026-09-20", heure_vol: "14:00", titre: "TEST Côte belge", duree: 90, places: 3, prix_total: 540, part_pilote: 180 },
    { date_vol: "2026-09-26", heure_vol: "15:00", titre: "TEST Namur", duree: 60, places: 2, prix_total: 360, part_pilote: 120 },
    { date_vol: "2026-10-04", heure_vol: "11:00", titre: "TEST Ardennes", duree: 60, places: 2, prix_total: 360, part_pilote: 120 },
    { date_vol: "2026-10-11", heure_vol: "16:00", titre: "TEST Baptême 30 min", duree: 30, places: 1, prix_total: 180, part_pilote: 60 },
  ];
  const inserted = must(await db.from("annonces_pilote").insert(
    specs.map(({ date_vol, heure_vol, ...a }) => ({ pilote_id: PILOTE_ID, statut: "reservee", mode_vente: "avion", places_reservees: 0, legal_ok: true, ...a })),
  ).select("id"), "annonces");
  const [bxl, cote, namur, ardennes, bapteme] = specs.map((s, i) => ({ ...s, id: inserted[i].id }));

  const resa = (a, r) => ({
    pilote_id: PILOTE_ID, annonce_id: a.id, type_resa: "annonce_pilote",
    date_vol: a.date_vol, heure_vol: a.heure_vol, duree: a.duree,
    pilote_paye: false, pilote_paye_at: null, duree_reelle: null, commentaire: null, ...r,
  });
  must(await db.from("reservations").insert([
    // Vol passé, payé
    resa(bxl, { client_id: julie, passagers: 2, acompte: 240, statut: "vol_effectue", duree_reelle: 65, pilote_paye: true, pilote_paye_at: "2026-09-14T09:00:00Z" }),
    // Vol passé, pas encore payé : à relancer
    resa(cote, { client_id: marc, passagers: 3, acompte: 360, statut: "vol_effectue", duree_reelle: 95 }),
    // Vol d'hier pas encore clôturé : bilan de vol à faire
    resa(namur, { client_id: julie, passagers: 2, acompte: 240, statut: "heure_confirmee" }),
    // À venir : heure confirmée, en attente de paiement
    resa(ardennes, { client_id: marc, passagers: 2, acompte: 240, statut: "heure_confirmee" }),
    // À venir : demande reçue, à traiter
    resa(bapteme, { client_id: sophie, passagers: 1, acompte: 120, statut: "demande_recue", commentaire: "Premier vol, un peu stressée !" }),
  ]), "réservations");
  console.log("Créé : 3 clients, 5 annonces, 5 réservations (TEST).");
}

// Une proposition d'itinéraire en attente, pour voir /vol/proposition/[token] comme le client.
// Client dédié (email +testprop) : `clean` le supprime avec sa réservation, et la proposition part en cascade.
// Attention : accepter/modifier depuis la page envoie de vrais emails (à l'adresse +testprop, donc chez Romain).
async function proposition() {
  const email = "romainpilot2003+testprop@gmail.com";
  const old = must(await db.from("clients").select("id").eq("email", email), "clients");
  if (old.length) {
    must(await db.from("reservations").delete().in("client_id", old.map((c) => c.id)).select("id"), "resa");
    must(await db.from("clients").delete().in("id", old.map((c) => c.id)), "clients");
  }
  const [client] = must(await db.from("clients").insert([
    { id: crypto.randomUUID(), prenom: "Léa", nom: "TEST Proposition", email, telephone: "+32470000009" },
  ]).select("id"), "client");
  const [resa] = must(await db.from("reservations").insert([{
    pilote_id: PILOTE_ID, client_id: client.id, type_resa: "annonce_pilote", annonce_id: null,
    date_vol: "2026-10-03", heure_vol: "10:00", duree: 60, passagers: 2, acompte: 240,
    statut: "heure_confirmee", pilote_paye: false, pilote_paye_at: null, duree_reelle: null, commentaire: null,
  }]).select("id"), "réservation");
  const [prop] = must(await db.from("route_proposals").insert([{
    reservation_id: resa.id, duree: 60, acompte: 240,
    admin_comment: "Bonjour Léa, voici ce que je vous propose : on part vers Waterloo, on longe Bruxelles avec vue sur l'Atomium, puis retour par Louvain-la-Neuve. La météo s'annonce très belle pour cette date.",
    waypoints: [
      { lat: 50.6803, lng: 4.4120, nom: "Waterloo, Butte du Lion" },
      { lat: 50.8949, lng: 4.3415, nom: "Bruxelles, Atomium" },
      { lat: 50.6680, lng: 4.6127, nom: "Louvain-la-Neuve" },
    ],
  }]).select("token"), "proposition");
  console.log(`Proposition créée (TEST). Ouvrir : http://localhost:3000/vol/proposition/${prop.token}`);
}

// Une réservation avec un créneau proposé en attente, pour voir /reservation/creneau-propose/[token].
// Client dédié (+testcreneau) supprimé par `clean`. Accepter envoie un email d'info à l'admin (Romain) ;
// « Je choisis une autre date » redirige vers la page de report (mail de report au client, chez Romain).
async function creneau() {
  const email = "romainpilot2003+testcreneau@gmail.com";
  const old = must(await db.from("clients").select("id").eq("email", email), "clients");
  if (old.length) {
    must(await db.from("reservations").delete().in("client_id", old.map((c) => c.id)).select("id"), "resa");
    must(await db.from("clients").delete().in("id", old.map((c) => c.id)), "clients");
  }
  const [client] = must(await db.from("clients").insert([
    { id: crypto.randomUUID(), prenom: "Léa", nom: "TEST Créneau", email, telephone: "+32470000010" },
  ]).select("id"), "client");
  const token = crypto.randomUUID();
  must(await db.from("reservations").insert([{
    pilote_id: PILOTE_ID, client_id: client.id, type_resa: "annonce_pilote", annonce_id: null,
    date_vol: "2026-10-10", heure_vol: "10:00", duree: 60, passagers: 2, acompte: 240,
    statut: "en_attente", pilote_paye: false, pilote_paye_at: null, duree_reelle: null, commentaire: null,
    slot_proposal_token: token, slot_proposal_date: "2026-10-11", slot_proposal_heure: "10:00",
  }]).select("id"), "réservation");
  console.log(`Créneau proposé créé (TEST). Ouvrir : http://localhost:3000/reservation/creneau-propose/${token}`);
}

// Une réservation avec une conversation de 10 messages, pour voir /reservation/messages/[token] (défilement au dernier message).
// Client dédié (+testmessages) supprimé par `clean`. Répondre depuis la page envoie un vrai email au pilote (chez Romain).
async function messages() {
  const email = "romainpilot2003+testmessages@gmail.com";
  const old = must(await db.from("clients").select("id").eq("email", email), "clients");
  if (old.length) {
    const rs = must(await db.from("reservations").select("id").in("client_id", old.map((c) => c.id)), "resa");
    if (rs.length) must(await db.from("reservation_messages").delete().in("reservation_id", rs.map((r) => r.id)).select("id"), "messages");
    must(await db.from("reservations").delete().in("client_id", old.map((c) => c.id)).select("id"), "resa");
    must(await db.from("clients").delete().in("id", old.map((c) => c.id)), "clients");
  }
  const [client] = must(await db.from("clients").insert([
    { id: crypto.randomUUID(), prenom: "Léa", nom: "TEST Messages", email, telephone: "+32470000011" },
  ]).select("id"), "client");
  const token = crypto.randomUUID();
  const [resa] = must(await db.from("reservations").insert([{
    pilote_id: PILOTE_ID, client_id: client.id, type_resa: "annonce_pilote", annonce_id: null,
    date_vol: "2026-10-17", heure_vol: "10:00", duree: 60, passagers: 2, acompte: 240,
    statut: "heure_confirmee", pilote_paye: false, pilote_paye_at: null, duree_reelle: null, commentaire: null,
    messages_token: token,
  }]).select("id"), "réservation");
  const t = (min) => new Date(Date.parse("2026-10-01T07:00:00Z") + min * 60000).toISOString();
  const rows = [
    ["pilote", "Romain", "Bonjour Léa, votre créneau du samedi 10 octobre est bien noté. Je vous propose de vous retrouver à l'accueil de l'aérodrome vers 9:45.", 0],
    ["pilote", "Romain", "Pensez à votre pièce d'identité.", 1],
    ["client", null, "Super, merci. Est-ce qu'on peut survoler le château de Beloeil ? Mon père y a grandi.", 400],
    ["pilote", "Romain", "Avec plaisir, c'est sur la route. Je regarde la météo la veille et je vous confirme.", 1380],
    ["client", null, "Parfait !", 1400],
    ["client", null, "Et pour les chaussures, des baskets ça va ?", 1401],
    ["pilote", "Romain", "Oui, des baskets c'est très bien. Évitez juste les talons.", 1500],
    ["client", null, "Noté. Mon frère vient aussi, il fait 1m92, ça passe dans l'avion ?", 2900],
    ["pilote", "Romain", "Aucun souci, le DA40 est très spacieux. Il sera à l'aise.", 2950],
    ["client", null, "Génial, à samedi alors !", 3000],
  ].map(([author, author_nom, content, min]) => ({ reservation_id: resa.id, author, author_nom, content, created_at: t(min) }));
  must(await db.from("reservation_messages").insert(rows).select("id"), "messages");
  console.log(`Conversation créée (TEST). Ouvrir : http://localhost:3000/reservation/messages/${token}`);
}

// Un ticket de contact avec 6 messages, pour voir /contact/ticket/[token]. Pas de client : ligne `contacts` (email +testticket),
// supprimée à chaque relance et par `node scripts/test-data.mjs ticket-clean` (le `clean` général ne touche pas aux contacts).
async function ticket(clean = false) {
  const email = "romainpilot2003+testticket@gmail.com";
  const old = must(await db.from("contacts").select("id").eq("email", email), "contacts");
  if (old.length) {
    must(await db.from("contact_messages").delete().in("contact_id", old.map((c) => c.id)).select("id"), "messages");
    must(await db.from("contacts").delete().in("id", old.map((c) => c.id)).select("id"), "contacts");
  }
  if (clean) return console.log("Ticket de test supprimé.");
  const [c] = must(await db.from("contacts").insert([
    { nom: "Léa TEST Ticket", email, sujet: "Question sur un vol pour deux personnes", message: "Bonjour, nous sommes deux, peut-on réserver le même vol ?" },
  ]).select("id, thread_token"), "contact");
  const t = (min) => new Date(Date.parse("2026-10-01T07:00:00Z") + min * 60000).toISOString();
  const rows = [
    ["client", "Bonjour, nous sommes deux, peut-on réserver le même vol ? Mon compagnon pèse 95 kg et moi 62.", 0],
    ["admin", "Bonjour Léa, oui sans problème : le DA40 emporte deux passagers. Le poids total reste largement dans les limites.", 90],
    ["admin", "Dites-moi la date qui vous arrange et je vous propose un créneau.", 91],
    ["client", "Plutôt le samedi 17 octobre, le matin si possible.", 300],
    ["admin", "Parfait, je regarde la météo et je reviens vers vous très vite.", 360],
    ["client", "Merci beaucoup !", 380],
  ].map(([author, content, min]) => ({ contact_id: c.id, author, content, created_at: t(min) }));
  must(await db.from("contact_messages").insert(rows).select("id"), "messages");
  console.log(`Ticket créé (TEST). Ouvrir : http://localhost:3000/contact/ticket/${c.thread_token}`);
}

const cmd = process.argv[2];
if (cmd === "seed") await seed();
else if (cmd === "proposition") await proposition();
else if (cmd === "creneau") await creneau();
else if (cmd === "messages") await messages();
else if (cmd === "ticket") await ticket();
else if (cmd === "ticket-clean") await ticket(true);
else if (cmd === "clean") await clean();
else console.log("usage : node scripts/test-data.mjs seed|proposition|creneau|messages|ticket|ticket-clean|clean");
