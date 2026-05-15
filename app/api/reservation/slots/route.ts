import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const dureeMins = parseInt(duree);
  if (isNaN(dureeMins) || dureeMins < 1)
    return NextResponse.json({ error: "Durée invalide" }, { status: 400 });

  const supabase = createAdminClient();
  const jsDay = new Date(date + "T12:00:00Z").getDay();

  const { data: reservations } = await supabase
    .from("reservations")
    .select("heure_vol, duree")
    .eq("date_vol", date)
    .neq("statut", "annulee");

  // Priorité 1 : override individuel
  const { data: jourIndiv } = await supabase
    .from("disponibilites_jours")
    .select("*")
    .eq("date", date)
    .maybeSingle();

  if (jourIndiv) {
    if (jourIndiv.ferme || !jourIndiv.heure_debut || !jourIndiv.heure_fin) {
      return NextResponse.json({ slots: [] });
    }
    const slots = calcSlots(jourIndiv.heure_debut, jourIndiv.heure_fin, dureeMins, reservations ?? []);
    return NextResponse.json({ slots: [...new Set(slots)].sort() });
  }

  // Priorité 2 : plages générales
  const { data: dispos } = await supabase
    .from("disponibilites")
    .select("*")
    .lte("date_debut", date)
    .gte("date_fin", date)
    .eq("actif", true);

  const disposDuJour = (dispos ?? []).filter(
    (d) => !d.jours || d.jours.includes(jsDay)
  );

  if (!disposDuJour.length) return NextResponse.json({ slots: [] });

  const allSlots: string[] = [];
  for (const dispo of disposDuJour) {
    allSlots.push(...calcSlots(dispo.heure_debut, dispo.heure_fin, dureeMins, reservations ?? []));
  }

  return NextResponse.json({ slots: [...new Set(allSlots)].sort() });
}
