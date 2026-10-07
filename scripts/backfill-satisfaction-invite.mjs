// Rattrapage de satisfaction_invite_at pour les vols effectués avant la migration 20261007b.
// À lancer APRÈS la migration. Par défaut : liste seulement. Rien n'est écrit sans --apply.
//
//   node scripts/backfill-satisfaction-invite.mjs                          liste les vols effectués sans avis ni date d'envoi
//   node scripts/backfill-satisfaction-invite.mjs <id> 2026-10-01 --apply  fixe la date d'envoi d'une réservation
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const [id, date] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const apply = process.argv.includes("--apply");

if (!id) {
  const { data, error } = await db
    .from("reservations")
    .select("id, date_vol, type_resa, satisfaction_invite_at, clients(prenom, nom), satisfaction_surveys(id)")
    .eq("statut", "vol_effectue")
    .neq("type_resa", "perso")
    .is("satisfaction_invite_at", null)
    .order("date_vol", { ascending: false });
  if (error) throw new Error(error.message);
  const sansAvis = (data ?? []).filter((r) => !(r.satisfaction_surveys ?? []).length);
  console.log(sansAvis.length ? sansAvis : "Aucun vol effectué sans avis ni date d'envoi.");
} else {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) throw new Error("Date attendue : AAAA-MM-JJ");
  const at = `${date}T12:00:00Z`;
  if (!apply) {
    console.log(`Simulation : ${id} -> satisfaction_invite_at = ${at} (ajoutez --apply pour écrire)`);
  } else {
    const { error } = await db.from("reservations").update({ satisfaction_invite_at: at }).eq("id", id).eq("statut", "vol_effectue");
    if (error) throw new Error(error.message);
    console.log("OK");
  }
}
