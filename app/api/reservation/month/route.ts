import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeEffectiveDay } from "@/lib/dispo-utils";

function hasSlot(
  heureDebut: string,
  heureFin: string,
  dureeMins: number,
  reservations: Array<{ heure_vol: string | null; duree: number }>
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
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const duree = searchParams.get("duree");

  if (!year || !month || !duree)
    return NextResponse.json({ error: "Paramètres requis" }, { status: 400 });

  const dureeMins = parseInt(duree);
  if (isNaN(dureeMins) || dureeMins < 1)
    return NextResponse.json({ error: "Durée invalide" }, { status: 400 });

  const y = parseInt(year);
  const m = parseInt(month);
  const supabase = createAdminClient();

  const debut = `${y}-${String(m).padStart(2, "0")}-01`;
  const fin = `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;

  const [{ data: plages }, { data: joursIndiv }, { data: resas }, { data: minJoursSetting }] = await Promise.all([
    supabase.from("disponibilites").select("*").lte("date_debut", fin).gte("date_fin", debut).eq("actif", true),
    supabase.from("disponibilites_jours").select("*").gte("date", debut).lte("date", fin),
    supabase.from("reservations").select("date_vol, heure_vol, duree").gte("date_vol", debut).lte("date_vol", fin).neq("statut", "annulee"),
    supabase.from("crm_settings").select("value").eq("key", "reservation_min_jours").maybeSingle(),
  ]);
  const minJours = parseInt((minJoursSetting as { value?: string } | null)?.value ?? "2") || 2;

  const resasByDate: Record<string, Array<{ heure_vol: string | null; duree: number }>> = {};
  (resas ?? []).forEach((r) => {
    const k = r.date_vol?.substring(0, 10);
    if (!k) return;
    if (!resasByDate[k]) resasByDate[k] = [];
    resasByDate[k].push(r);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minBookable = new Date(today);
  minBookable.setDate(minBookable.getDate() + minJours);
  const daysInMonth = new Date(y, m, 0).getDate();
  const available: string[] = [];
  const unavailable: string[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const date = new Date(dateStr + "T12:00:00Z");
    if (date < today) continue;                            // passé : masquer
    if (date < minBookable) { unavailable.push(dateStr); continue; } // J+0/J+1 : indisponible

    const resasDuJour = resasByDate[dateStr] ?? [];
    const effective = computeEffectiveDay(dateStr, plages ?? [], joursIndiv ?? []);

    if (effective.type === "override") {
      if (effective.ferme) {
        unavailable.push(dateStr);
      } else if (hasSlot(effective.heure_debut, effective.heure_fin, dureeMins, resasDuJour)) {
        available.push(dateStr);
      } else {
        unavailable.push(dateStr);
      }
      continue;
    }

    if (effective.type === "plage") {
      const fits = effective.windows.some((w) => hasSlot(w.heure_debut, w.heure_fin, dureeMins, resasDuJour));
      if (fits) {
        available.push(dateStr);
      } else {
        unavailable.push(dateStr);
      }
      continue;
    }

    unavailable.push(dateStr);
  }

  return NextResponse.json({ available, unavailable });
}
