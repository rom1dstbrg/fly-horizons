import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeEffectiveDay } from "@/lib/dispo-utils";

const MIN_JOURS = 2; // même règle J-2 que le flow classique (app/api/vol-annonce/submit)
// Pilote qui n'a rien configuré = aucune contrainte (comportement historique) —
// fenêtre large par défaut, plutôt que de rendre l'annonce injoignable.
const DEFAULT_HEURE_DEBUT = "06:00";
const DEFAULT_HEURE_FIN = "21:00";

function hasSlot(
  heureDebut: string,
  heureFin: string,
  dureeMins: number,
  reservations: Array<{ heure_vol: string | null; duree: number }>,
): boolean {
  const [hD, mD] = heureDebut.split(":").map(Number);
  const [hF, mF] = heureFin.split(":").map(Number);
  const start = hD * 60 + mD;
  const end = hF * 60 + mF;

  for (let t = start; t + dureeMins <= end; t += 30) {
    const slotEnd = t + dureeMins;
    const free = reservations.every((r) => {
      if (!r.heure_vol) return true;
      const [rh, rm] = r.heure_vol.split(":").map(Number);
      const rStart = rh * 60 + rm;
      const rEnd = rStart + r.duree + 30;
      return slotEnd + 30 <= rStart || t >= rEnd;
    });
    if (free) return true;
  }
  return false;
}

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
    .select("duree, pilote_id, statut")
    .eq("id", annonceId)
    .single();
  if (!annonce || annonce.statut !== "publiee") return NextResponse.json({ available: [], unavailable: [] });

  const debut = `${y}-${String(m).padStart(2, "0")}-01`;
  const fin = `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;

  // Dispos scopées au PILOTE (un seul calendrier, partagé par toutes ses
  // annonces) — pas à l'annonce.
  const [{ data: plages }, { data: joursIndiv }, { data: resas }, { count: plageTotal }, { count: joursTotal }] = await Promise.all([
    supabase.from("pilote_disponibilites").select("*").eq("pilote_id", annonce.pilote_id)
      .lte("date_debut", fin).gte("date_fin", debut).eq("actif", true),
    supabase.from("pilote_disponibilites_jours").select("*").eq("pilote_id", annonce.pilote_id)
      .gte("date", debut).lte("date", fin),
    // Conflits scopés au pilote (tous ses vols, pas juste ceux de cette annonce) —
    // il ne peut pas être à deux endroits en même temps.
    supabase.from("reservations").select("date_vol, heure_vol, duree")
      .eq("pilote_id", annonce.pilote_id).gte("date_vol", debut).lte("date_vol", fin).neq("statut", "annulee"),
    supabase.from("pilote_disponibilites").select("id", { count: "exact", head: true }).eq("pilote_id", annonce.pilote_id).eq("actif", true),
    supabase.from("pilote_disponibilites_jours").select("id", { count: "exact", head: true }).eq("pilote_id", annonce.pilote_id),
  ]);
  const hasAnyDispo = (plageTotal ?? 0) > 0 || (joursTotal ?? 0) > 0;

  const resasByDate: Record<string, Array<{ heure_vol: string | null; duree: number }>> = {};
  (resas ?? []).forEach((r) => {
    const k = r.date_vol?.substring(0, 10);
    if (!k) return;
    (resasByDate[k] ??= []).push(r);
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
    if (date < minBookable) { unavailable.push(dateStr); continue; }

    const resasDuJour = resasByDate[dateStr] ?? [];

    if (!hasAnyDispo) {
      if (hasSlot(DEFAULT_HEURE_DEBUT, DEFAULT_HEURE_FIN, annonce.duree, resasDuJour)) available.push(dateStr);
      else unavailable.push(dateStr);
      continue;
    }

    const effective = computeEffectiveDay(dateStr, plages ?? [], joursIndiv ?? []);

    if (effective.type === "override") {
      if (effective.ferme) { unavailable.push(dateStr); continue; }
      if (hasSlot(effective.heure_debut, effective.heure_fin, annonce.duree, resasDuJour)) available.push(dateStr);
      else unavailable.push(dateStr);
      continue;
    }
    if (effective.type === "plage") {
      const fits = effective.windows.some((w) => hasSlot(w.heure_debut, w.heure_fin, annonce.duree, resasDuJour));
      if (fits) available.push(dateStr);
      else unavailable.push(dateStr);
      continue;
    }
    unavailable.push(dateStr);
  }

  return NextResponse.json({ available, unavailable });
}
