import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { departsPossibles, type ResaHoraire } from "@/lib/pilote-creneaux";

const MIN_JOURS = 2; // même règle J-2 que le flow classique (app/api/vol-annonce/submit)

// Jours du mois où au moins un bloc est réservable chez le pilote de l'annonce
// (lib/pilote-creneaux.ts). Rien de coché = fermé.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const annonceId = searchParams.get("annonce_id");
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  if (!annonceId || !year || !month) {
    return NextResponse.json({ error: "Paramètres requis" }, { status: 400 });
  }

  const y = parseInt(year);
  const m = parseInt(month);
  const supabase = createAdminClient();

  const { data: annonce } = await supabase
    .from("annonces_pilote")
    .select("duree, pilote_id, statut, mode_vente")
    .eq("id", annonceId)
    .single();
  if (!annonce || annonce.statut !== "publiee") return NextResponse.json({ available: [], unavailable: [] });

  const debut = `${y}-${String(m).padStart(2, "0")}-01`;
  const fin = `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;

  // Dispos et conflits scopés au PILOTE (un seul calendrier, partagé par toutes
  // ses annonces ; il ne peut pas être à deux endroits en même temps). En mode
  // « place », les autres passagers de la même annonce partagent le vol.
  let resasQuery = supabase.from("reservations").select("date_vol, heure_vol, duree")
    .eq("pilote_id", annonce.pilote_id).gte("date_vol", debut).lte("date_vol", fin).neq("statut", "annulee");
  if (annonce.mode_vente === "place") resasQuery = resasQuery.neq("annonce_id", annonceId);

  const [{ data: creneaux }, { data: resas }] = await Promise.all([
    supabase.from("pilote_creneaux").select("date, heure")
      .eq("pilote_id", annonce.pilote_id).gte("date", debut).lte("date", fin),
    resasQuery,
  ]);

  const ouvertsByDate: Record<string, number[]> = {};
  (creneaux ?? []).forEach((c) => { (ouvertsByDate[c.date] ??= []).push(c.heure); });
  const resasByDate: Record<string, ResaHoraire[]> = {};
  (resas ?? []).forEach((r) => {
    const k = r.date_vol?.substring(0, 10);
    if (k) (resasByDate[k] ??= []).push(r);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minBookable = new Date(today);
  minBookable.setDate(minBookable.getDate() + MIN_JOURS);
  const daysInMonth = new Date(y, m, 0).getDate();
  const available: string[] = [];
  const unavailable: string[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const date = new Date(dateStr + "T12:00:00Z");
    if (date < today) continue;
    const ouverts = ouvertsByDate[dateStr];
    if (date >= minBookable && ouverts && departsPossibles(ouverts, annonce.duree, resasByDate[dateStr] ?? []).length) {
      available.push(dateStr);
    } else {
      unavailable.push(dateStr);
    }
  }

  return NextResponse.json({ available, unavailable });
}
