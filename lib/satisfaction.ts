export const MAX_PHOTOS = 20;

export const RECO_OPTIONS = [
  { value: "oui_sans_hesiter", label: "Oui, sans hésiter" },
  { value: "oui_probablement", label: "Oui, probablement" },
  { value: "pas_sur", label: "Pas sûr" },
  { value: "non", label: "Non" },
] as const;

export const SOURCE_OPTIONS = [
  { value: "bouche_a_oreille", label: "Bouche à oreille" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Recherche Google" },
  { value: "autre", label: "Autre" },
] as const;

export type RecoValue = (typeof RECO_OPTIONS)[number]["value"];
export type SourceValue = (typeof SOURCE_OPTIONS)[number]["value"];

export const RECO_VALUES = RECO_OPTIONS.map((o) => o.value) as RecoValue[];
export const SOURCE_VALUES = SOURCE_OPTIONS.map((o) => o.value) as SourceValue[];

export const recoLabel = (v: string | null): string =>
  RECO_OPTIONS.find((o) => o.value === v)?.label ?? "—";
export const sourceLabel = (v: string | null): string =>
  SOURCE_OPTIONS.find((o) => o.value === v)?.label ?? "—";
