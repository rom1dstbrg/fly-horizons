// Rattrapage de reschedule_invite_at pour les reports envoyés avant la migration 20261007.
// À lancer APRÈS la migration. Par défaut : liste seulement. Rien n'est écrit sans --apply.
//
//   node scripts/backfill-report-invite.mjs                          liste les reports en cours sans date d'envoi
//   node scripts/backfill-report-invite.mjs <id> 2026-09-28 --apply  fixe la date d'envoi d'une réservation
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
    .select("id, date_vol, statut, reschedule_invite_at, clients(prenom, nom)")
    .not("reschedule_token", "is", null)
    .is("reschedule_invite_at", null);
  if (error) throw new Error(error.message);
  console.log(data?.length ? data : "Aucun report en cours sans date d'envoi.");
} else {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) throw new Error("Date attendue : AAAA-MM-JJ");
  const at = `${date}T12:00:00Z`;
  if (!apply) {
    console.log(`Simulation : ${id} -> reschedule_invite_at = ${at} (ajoutez --apply pour écrire)`);
  } else {
    const { error } = await db.from("reservations").update({ reschedule_invite_at: at }).eq("id", id).not("reschedule_token", "is", null);
    if (error) throw new Error(error.message);
    console.log("OK");
  }
}
