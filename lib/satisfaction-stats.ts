// Statistiques de la page Admin > Satisfaction (01/10), ventilées par pilote : le vol
// est lié à un pilote, donc chaque avis aussi. Module pur : reçoit les avis et le
// nombre de vols effectués par pilote, renvoie tout ce que la page affiche, y compris
// les phrases d'interprétation. Aucune requête ici.

import type { Rich } from "@/lib/analytics-stats";
import { AXES, type AxeKey } from "@/lib/satisfaction";

export const NO_PILOTE_KEY = "none";
export const NO_PILOTE_LABEL = "Non renseigné";

export interface Survey {
  id: string;
  reservationId: string;
  notePreparation: number;
  notePilote: number;
  noteVol: number;
  noteQualitePrix: number;
  moyenne: number;
  recommandation: string | null;
  sourceDecouverte: string | null;
  commeAnnonce: string | null;
  commentaire: string | null;
  photos: string[];
  photoUrls: string[];
  createdAt: string;
  dateVol: string;
  duree: number;
  /** Identifiant du pilote du vol, ou "none" pour un ancien vol sans pilote. */
  piloteKey: string;
  piloteNom: string | null;
  client: { id: string; prenom: string; nom: string; email: string } | null;
  /** À regarder : note moyenne de 3 ou moins, « non » à la recommandation, ou vol pas comme annoncé. */
  watch: boolean;
}

/** « Julien Verhaegen » → « Julien V. » */
export function shortName(nom: string | null): string {
  if (!nom) return NO_PILOTE_LABEL;
  const [first, ...rest] = nom.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0].toUpperCase()}.` : first;
}

export const firstName = (nom: string | null) => (nom ? nom.trim().split(/\s+/)[0] : "");

export function isWatch(s: Pick<Survey, "moyenne" | "recommandation" | "commeAnnonce">): boolean {
  return s.moyenne <= 3 || s.recommandation === "non" || s.commeAnnonce === "non";
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
const fr = (n: number) => n.toLocaleString("fr-BE");
const dec = (n: number) => n.toLocaleString("fr-BE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const isReco = (r: string | null) => r === "oui_sans_hesiter" || r === "oui_probablement";

export interface PiloteRow {
  key: string;
  nom: string;
  vols: number;
  avis: number;
  notePilote: number;
  noteVol: number;
  /** Part de « oui » à « comme annoncé » parmi ceux qui ont répondu ; null si personne n'a répondu. */
  commeAnnoncePct: number | null;
  recoPct: number;
  watch: number;
  /** Note du pilote sous 4 avec au moins 3 avis. */
  low: boolean;
}

export interface SatisfactionData {
  total: number;
  vols: number;
  tauxReponse: number;
  moyenne: number;
  recoPct: number;
  watch: number;
  axes: { key: AxeKey; label: string; value: number }[];
  pilotes: PiloteRow[];
  brief: { lead: Rich; points: Rich[] };
}

export function computeSatisfaction(args: {
  surveys: Survey[];
  /** Vols effectués par pilote (clé = identifiant, ou "none") et nom d'affichage. */
  volsByPilote: Record<string, { nom: string | null; vols: number }>;
}): SatisfactionData {
  const { surveys, volsByPilote } = args;
  const total = surveys.length;
  const vols = Object.values(volsByPilote).reduce((n, p) => n + p.vols, 0);
  const tauxReponse = vols ? Math.round((total / vols) * 100) : 0;
  const moyenne = avg(surveys.map((s) => s.moyenne));
  const recoPct = total ? Math.round((surveys.filter((s) => isReco(s.recommandation)).length / total) * 100) : 0;
  const watch = surveys.filter((s) => s.watch).length;

  const axes = AXES.map((a) => ({ key: a.key, label: a.label, value: avg(surveys.map((s) => s[a.key])) }));

  // Une ligne par pilote ayant des vols ou des avis
  const keys = new Set([...Object.keys(volsByPilote), ...surveys.map((s) => s.piloteKey)]);
  const pilotes: PiloteRow[] = [...keys].map((key) => {
    const mine = surveys.filter((s) => s.piloteKey === key);
    const nom = volsByPilote[key]?.nom ?? mine[0]?.piloteNom ?? null;
    const answered = mine.filter((s) => s.commeAnnonce);
    const notePilote = avg(mine.map((s) => s.notePilote));
    return {
      key,
      nom: key === NO_PILOTE_KEY ? NO_PILOTE_LABEL : shortName(nom),
      vols: Math.max(volsByPilote[key]?.vols ?? 0, mine.length),
      avis: mine.length,
      notePilote,
      noteVol: avg(mine.map((s) => s.noteVol)),
      commeAnnoncePct: answered.length ? Math.round((answered.filter((s) => s.commeAnnonce === "oui").length / answered.length) * 100) : null,
      recoPct: mine.length ? Math.round((mine.filter((s) => isReco(s.recommandation)).length / mine.length) * 100) : 0,
      watch: mine.filter((s) => s.watch).length,
      low: mine.length >= 3 && notePilote < 4,
    };
  }).sort((a, b) => (a.key === NO_PILOTE_KEY ? 1 : b.key === NO_PILOTE_KEY ? -1 : b.avis - a.avis || a.nom.localeCompare(b.nom)));

  // ── Synthèse
  const lead: Rich = [];
  const points: Rich[] = [];
  if (total === 0) {
    lead.push("Aucun avis reçu pour l'instant. Le lien du formulaire part dans l'email envoyé au client quand le pilote marque le vol effectué.");
  } else {
    lead.push({ b: `${fr(total)} client${total > 1 ? "s ont" : " a"}` }, ` donné son avis`);
    if (vols > 0) lead.push(` sur ${fr(vols)} vol${vols > 1 ? "s" : ""} effectué${vols > 1 ? "s" : ""}, soit `, { b: `${tauxReponse} %` }, " de réponses");
    lead.push(". La note moyenne est de ", { b: `${dec(moyenne)} sur 5` }, " et ", { b: `${recoPct} %` }, ` recommandent Fly Horizons.`);

    if (total >= 3) {
      const sorted = [...axes].sort((a, b) => b.value - a.value);
      const best = sorted[0], worst = sorted[sorted.length - 1];
      if (best.value > worst.value) {
        points.push(["Le point fort est ", { b: best.label.toLowerCase() }, ` (${dec(best.value)}) ; le plus bas est `, { b: worst.label.toLowerCase() }, ` (${dec(worst.value)}).`]);
      }
    }
    const flagged = [...pilotes].filter((p) => p.watch > 0 && p.avis >= 2).sort((a, b) => b.watch / b.avis - a.watch / a.avis || b.watch - a.watch)[0];
    if (flagged && watch > 0) {
      points.push([{ b: flagged.nom }, ` a ${flagged.watch} avis sur ${flagged.avis} à surveiller.`]);
    } else if (watch === 0 && total >= 3) {
      points.push(["Aucun avis à surveiller."]);
    }
    const answered = surveys.filter((s) => s.commeAnnonce);
    if (answered.length >= 5) {
      const pct = Math.round((answered.filter((s) => s.commeAnnonce === "oui").length / answered.length) * 100);
      points.push(["Le vol s'est passé ", { b: "comme annoncé" }, ` pour ${pct} % des clients qui ont répondu.`]);
    }
  }

  return { total, vols, tauxReponse, moyenne, recoPct, watch, axes, pilotes, brief: { lead, points } };
}
