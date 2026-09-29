// Données de test pour l'espace pilote (drawers, transactions), en base PROD.
// Tout est marqué : annonces titrées « TEST … », clients romainpilot2003+test…@gmail.com.
// Annonces en statut « reservee » : invisibles sur le site public.
//
//   node scripts/test-data.mjs seed    crée les données
//   node scripts/test-data.mjs proposition   crée UNE proposition d'itinéraire en attente (page /vol/proposition/[token])
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
    pilote_id: PILOTE_ID, client_id: client.id, type_resa: "perso", annonce_id: null,
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

const cmd = process.argv[2];
if (cmd === "seed") await seed();
else if (cmd === "proposition") await proposition();
else if (cmd === "clean") await clean();
else console.log("usage : node scripts/test-data.mjs seed|proposition|clean");
