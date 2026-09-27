// Disponibilités pilote en blocs de 2 h (décision 27/09/2026) : le pilote coche
// des blocs, le passager réserve un bloc entier (l'heure exacte se cale ensuite
// avec le pilote). Rien de coché = fermé. Un vol de plus de 2 h demande des
// blocs ouverts qui se suivent. Même calcul pour la grille du pilote et pour
// les routes publiques (app/api/vol-annonce/*), pour que ce que le pilote voit
// soit exactement ce que le passager peut réserver.

export const BLOCS = [7, 9, 11, 13, 15, 17, 19] as const;
export const BLOC_H = 2;

export type ResaHoraire = { heure_vol: string | null; duree: number | null };

export const isBloc = (h: number) => (BLOCS as readonly number[]).includes(h);

export function blocsNecessaires(dureeMin: number) {
  return Math.max(1, Math.ceil(dureeMin / (BLOC_H * 60)));
}

/** "09:00" pour le bloc de 9 h (format de reservations.heure_vol). */
export const heureVol = (bloc: number) => `${String(bloc).padStart(2, "0")}:00`;

/** "9 h – 11 h" (ou "9 h – 13 h" pour un vol sur deux blocs). */
export const plageLabel = (debut: number, nbBlocs = 1) => `${debut} h – ${debut + nbBlocs * BLOC_H} h`;

/** Blocs touchés par des vols existants : un vol à 10 h 30 d'une heure occupe 9 h et 11 h. */
export function blocsOccupes(resas: ResaHoraire[]): Map<number, number> {
  const occ = new Map<number, number>(); // bloc → index de la première résa qui l'occupe
  resas.forEach((r, i) => {
    if (!r.heure_vol) return;
    const [h, m] = r.heure_vol.split(":").map(Number);
    const start = h * 60 + m;
    const end = start + (r.duree ?? 60);
    for (const b of BLOCS) {
      if (start < (b + BLOC_H) * 60 && end > b * 60 && !occ.has(b)) occ.set(b, i);
    }
  });
  return occ;
}

/** Heures de départ réservables un jour donné : les blocs nécessaires sont ouverts et libres. */
export function departsPossibles(ouverts: Iterable<number>, dureeMin: number, resas: ResaHoraire[]): number[] {
  const open = new Set(ouverts);
  const occ = blocsOccupes(resas);
  const n = blocsNecessaires(dureeMin);
  return BLOCS.filter((b) =>
    Array.from({ length: n }, (_, k) => b + k * BLOC_H).every((x) => open.has(x) && !occ.has(x)),
  );
}

// Dates "YYYY-MM-DD" calculées en UTC : pas de décalage d'un jour au passage à l'heure d'été.
export function addDaysIso(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const fmtShort = new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "short", timeZone: "UTC" });
/** "28 sept." */
export const fmtIso = (iso: string) => fmtShort.format(new Date(`${iso}T00:00:00Z`));
