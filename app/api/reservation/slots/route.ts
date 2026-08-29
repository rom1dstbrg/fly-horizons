import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeEffectiveDay } from "@/lib/dispo-utils";

function calcSlots(
  heureDebut: string,
  heureFin: string,
  dureeMins: number,
  reservations: Array<{ heure_vol: string | null; duree: number }>
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
    if (isFree) {
      slots.push(
        `${Math.floor(t / 60).toString().padStart(2, "0")}:${(t % 60).toString().padStart(2, "0")}`
      );
    }
  }
  return slots;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const date = searchParams.get("date");
  const duree = searchParams.get("duree");

  if (!date || !duree)
    return NextResponse.json({ error: "Paramètres requis" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ error: "Format de date invalide" }, { status: 400 });

  const dureeMins = parseInt(duree);
  if (isNaN(dureeMins) || dureeMins < 1)
    return NextResponse.json({ error: "Durée invalide" }, { status: 400 });

  const supabase = createAdminClient();

  const { data: minJoursSetting } = await supabase
    .from("crm_settings").select("value").eq("key", "reservation_min_jours").maybeSingle();
  const minJours = parseInt((minJoursSetting as { value?: string } | null)?.value ?? "2") || 2;

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const minBookable = new Date(todayMidnight);
  minBookable.setDate(minBookable.getDate() + minJours);
  if (new Date(date + "T12:00:00Z") < minBookable) {
    return NextResponse.json({ slots: [] });
  }
  const { data: reservations } = await supabase
    .from("reservations")
    .select("heure_vol, duree")
    .eq("date_vol", date)
    .neq("statut", "annulee");

  const { data: jourIndiv } = await supabase
    .from("disponibilites_jours")
    .select("*")
    .eq("date", date)
    .maybeSingle();

  const { data: dispos } = await supabase
    .from("disponibilites")
    .select("*")
    .lte("date_debut", date)
    .gte("date_fin", date)
    .eq("actif", true);

  const effective = computeEffectiveDay(date, dispos ?? [], jourIndiv ? [jourIndiv] : []);

  if (effective.type === "override") {
    if (effective.ferme) return NextResponse.json({ slots: [] });
    const slots = calcSlots(effective.heure_debut, effective.heure_fin, dureeMins, reservations ?? []);
    return NextResponse.json({ slots: [...new Set(slots)].sort() });
  }

  if (effective.type === "plage") {
    const allSlots: string[] = [];
    for (const w of effective.windows) {
      allSlots.push(...calcSlots(w.heure_debut, w.heure_fin, dureeMins, reservations ?? []));
    }
    return NextResponse.json({ slots: [...new Set(allSlots)].sort() });
  }

  return NextResponse.json({ slots: [] });
}
