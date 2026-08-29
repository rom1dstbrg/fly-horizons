// Calcul du créneau effectif d'un jour à partir des plages récurrentes et des
// overrides ponctuels — utilisé par l'API publique (month, slots) ET par la
// grille admin, pour garantir que ce que l'admin voit correspond exactement
// à ce que le tunnel de réservation calcule.

export interface DispoPlage {
  id: string;
  date_debut: string;
  date_fin: string;
  heure_debut: string;
  heure_fin: string;
  jours: number[] | null;
  actif: boolean;
}

export interface DispoJourIndiv {
  id: string;
  date: string;
  ferme: boolean;
  heure_debut: string | null;
  heure_fin: string | null;
}

export type EffectiveDay =
  | { type: "none" }
  | { type: "override"; ferme: true; sourceId: string }
  | { type: "override"; ferme: false; heure_debut: string; heure_fin: string; sourceId: string }
  | { type: "plage"; windows: { heure_debut: string; heure_fin: string; sourceId: string }[] };

// Priorité : override du jour précis > union de toutes les plages actives qui
// couvrent cette date et ce jour de semaine > rien.
export function computeEffectiveDay(
  dateStr: string,
  plages: DispoPlage[],
  joursIndiv: DispoJourIndiv[]
): EffectiveDay {
  const override = joursIndiv.find((j) => j.date === dateStr);
  if (override) {
    if (override.ferme || !override.heure_debut || !override.heure_fin) {
      return { type: "override", ferme: true, sourceId: override.id };
    }
    return {
      type: "override",
      ferme: false,
      heure_debut: override.heure_debut,
      heure_fin: override.heure_fin,
      sourceId: override.id,
    };
  }

  const date = new Date(dateStr + "T12:00:00Z");
  const jsDay = date.getDay();

  const matching = plages.filter((p) => {
    if (!p.actif) return false;
    const pDebut = new Date(p.date_debut + "T00:00:00Z");
    const pFin = new Date(p.date_fin + "T23:59:59Z");
    if (date < pDebut || date > pFin) return false;
    return !p.jours || p.jours.includes(jsDay);
  });

  if (matching.length === 0) return { type: "none" };
  return {
    type: "plage",
    windows: matching.map((p) => ({
      heure_debut: p.heure_debut,
      heure_fin: p.heure_fin,
      sourceId: p.id,
    })),
  };
}
