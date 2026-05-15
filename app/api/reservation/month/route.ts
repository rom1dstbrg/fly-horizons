import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const [{ data: plages }, { data: joursIndiv }, { data: resas }] = await Promise.all([
    supabase.from("disponibilites").select("*").lte("date_debut", fin).gte("date_fin", debut).eq("actif", true),
    supabase.from("disponibilites_jours").select("*").gte("date", debut).lte("date", fin),
    supabase.from("reservations").select("date_vol, heure_vol, duree").gte("date_vol", debut).lte("date_vol", fin).neq("statut", "annulee"),
  ]);

  const resasByDate: Record<string, Array<{ heure_vol: string | null; duree: number }>> = {};
  (resas ?? []).forEach((r) => {
    const k = r.date_vol?.substring(0, 10);
    if (!k) return;
    if (!resasByDate[k]) resasByDate[k] = [];
    resasByDate[k].push(r);
  });

  const joursMap: Record<string, { ferme: boolean; heure_debut: string; heure_fin: string }> = {};
  (joursIndiv ?? []).forEach((j) => { joursMap[j.date] = j; });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysInMonth = new Date(y, m, 0).getDate();
  const available: string[] = [];
  const unavailable: string[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const date = new Date(dateStr + "T12:00:00Z");
    if (date < today) continue;

    const jsDay = date.getDay();
    const resasDuJour = resasByDate[dateStr] ?? [];
    const jourIndiv = joursMap[dateStr];

    if (jourIndiv) {
      if (jourIndiv.ferme || !jourIndiv.heure_debut || !jourIndiv.heure_fin) {
        unavailable.push(dateStr);
      } else if (hasSlot(jourIndiv.heure_debut, jourIndiv.heure_fin, dureeMins, resasDuJour)) {
        available.push(dateStr);
      } else {
        unavailable.push(dateStr);
      }
      continue;
    }

    const plage = (plages ?? []).find((p) => {
      const pDebut = new Date(p.date_debut + "T00:00:00Z");
      const pFin = new Date(p.date_fin + "T23:59:59Z");
      if (date < pDebut || date > pFin) return false;
      return !p.jours || p.jours.includes(jsDay);
    });

    if (plage) {
      if (hasSlot(plage.heure_debut, plage.heure_fin, dureeMins, resasDuJour)) {
        available.push(dateStr);
      } else {
        unavailable.push(dateStr);
      }
    } else {
      unavailable.push(dateStr);
    }
  }

  return NextResponse.json({ available, unavailable });
}
