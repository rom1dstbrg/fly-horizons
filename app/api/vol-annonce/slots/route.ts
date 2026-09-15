import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeEffectiveDay } from "@/lib/dispo-utils";

const MIN_JOURS = 2;
const DEFAULT_HEURE_DEBUT = "06:00";
const DEFAULT_HEURE_FIN = "21:00";

function calcSlots(
  heureDebut: string,
  heureFin: string,
  dureeMins: number,
  reservations: Array<{ heure_vol: string | null; duree: number }>,
): string[] {
  const [hD, mD] = heureDebut.split(":").map(Number);
  const [hF, mF] = heureFin.split(":").map(Number);
  const start = hD * 60 + mD;
  const end = hF * 60 + mF;
  const slots: string[] = [];

  for (let t = start; t + dureeMins <= end; t += 30) {
    const slotEnd = t + dureeMins;
    const isFree = reservations.every((r) => {
      if (!r.heure_vol) return true;
      const [rh, rm] = r.heure_vol.split(":").map(Number);
      const rStart = rh * 60 + rm;
      const rEnd = rStart + r.duree + 30;
      return slotEnd + 30 <= rStart || t >= rEnd;
    });
    if (isFree) slots.push(`${Math.floor(t / 60).toString().padStart(2, "0")}:${(t % 60).toString().padStart(2, "0")}`);
  }
  return slots;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const annonceId = searchParams.get("annonce_id");
  const date = searchParams.get("date");

  if (!annonceId || !date) return NextResponse.json({ error: "Paramètres requis" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Format de date invalide" }, { status: 400 });

  const supabase = createAdminClient();

  const { data: annonce } = await supabase
    .from("annonces_pilote")
    .select("duree, pilote_id, statut")
    .eq("id", annonceId)
    .single();
  if (!annonce || annonce.statut !== "publiee") return NextResponse.json({ slots: [] });

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const minBookable = new Date(todayMidnight);
  minBookable.setDate(minBookable.getDate() + MIN_JOURS);
  if (new Date(date + "T12:00:00Z") < minBookable) return NextResponse.json({ slots: [] });

  const [{ data: reservations }, { data: jourIndiv }, { data: dispos }, { count: plageTotal }, { count: joursTotal }] = await Promise.all([
    supabase.from("reservations").select("heure_vol, duree").eq("pilote_id", annonce.pilote_id).eq("date_vol", date).neq("statut", "annulee"),
    supabase.from("pilote_disponibilites_jours").select("*").eq("pilote_id", annonce.pilote_id).eq("date", date).maybeSingle(),
    supabase.from("pilote_disponibilites").select("*").eq("pilote_id", annonce.pilote_id)
      .lte("date_debut", date).gte("date_fin", date).eq("actif", true),
    supabase.from("pilote_disponibilites").select("id", { count: "exact", head: true }).eq("pilote_id", annonce.pilote_id).eq("actif", true),
    supabase.from("pilote_disponibilites_jours").select("id", { count: "exact", head: true }).eq("pilote_id", annonce.pilote_id),
  ]);
  const hasAnyDispo = (plageTotal ?? 0) > 0 || (joursTotal ?? 0) > 0;

  if (!hasAnyDispo) {
    const slots = calcSlots(DEFAULT_HEURE_DEBUT, DEFAULT_HEURE_FIN, annonce.duree, reservations ?? []);
    return NextResponse.json({ slots: [...new Set(slots)].sort() });
  }

  const effective = computeEffectiveDay(date, dispos ?? [], jourIndiv ? [jourIndiv] : []);

  if (effective.type === "override") {
    if (effective.ferme) return NextResponse.json({ slots: [] });
    const slots = calcSlots(effective.heure_debut, effective.heure_fin, annonce.duree, reservations ?? []);
    return NextResponse.json({ slots: [...new Set(slots)].sort() });
  }
  if (effective.type === "plage") {
    const allSlots: string[] = [];
    for (const w of effective.windows) allSlots.push(...calcSlots(w.heure_debut, w.heure_fin, annonce.duree, reservations ?? []));
    return NextResponse.json({ slots: [...new Set(allSlots)].sort() });
  }
  return NextResponse.json({ slots: [] });
}
