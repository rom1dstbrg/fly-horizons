import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { blocsNecessaires, departsPossibles, heureVol } from "@/lib/pilote-creneaux";

const MIN_JOURS = 2;

// Blocs de 2 h réservables un jour donné chez le pilote de l'annonce
// (lib/pilote-creneaux.ts). `slots` = heures de début ("09:00"), `blocs` = nombre
// de blocs qu'occupe le vol (le client affiche « 9 h – 11 h »).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const annonceId = searchParams.get("annonce_id");
  const date = searchParams.get("date");

  if (!annonceId || !date) return NextResponse.json({ error: "Paramètres requis" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Format de date invalide" }, { status: 400 });

  const supabase = createAdminClient();

  const { data: annonce } = await supabase
    .from("annonces_pilote")
    .select("duree, pilote_id, statut, mode_vente")
    .eq("id", annonceId)
    .single();
  if (!annonce || annonce.statut !== "publiee") return NextResponse.json({ slots: [] });
  const blocs = blocsNecessaires(annonce.duree);

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const minBookable = new Date(todayMidnight);
  minBookable.setDate(minBookable.getDate() + MIN_JOURS);
  if (new Date(date + "T12:00:00Z") < minBookable) return NextResponse.json({ slots: [], blocs });

  // Conflits scopés au pilote ; en mode « place », les autres passagers de la
  // même annonce partagent le vol (même règle que submit).
  let resasQuery = supabase.from("reservations").select("heure_vol, duree")
    .eq("pilote_id", annonce.pilote_id).eq("date_vol", date).neq("statut", "annulee");
  if (annonce.mode_vente === "place") resasQuery = resasQuery.neq("annonce_id", annonceId);

  const [{ data: creneaux }, { data: reservations }] = await Promise.all([
    supabase.from("pilote_creneaux").select("heure").eq("pilote_id", annonce.pilote_id).eq("date", date),
    resasQuery,
  ]);

  const departs = departsPossibles((creneaux ?? []).map((c) => c.heure), annonce.duree, reservations ?? []);
  return NextResponse.json({ slots: departs.map(heureVol), blocs });
}
