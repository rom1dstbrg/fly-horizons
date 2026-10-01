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

// « Le vol s'est-il passé comme annoncé ? » (heure, itinéraire, durée) : repère les
// retards et les itinéraires non respectés. Colonne `comme_annonce` (migration 20261001c).
export const COMME_ANNONCE_OPTIONS = [
  { value: "oui", label: "Oui, tout à fait" },
  { value: "presque", label: "Presque" },
  { value: "non", label: "Non" },
] as const;

export type CommeAnnonceValue = (typeof COMME_ANNONCE_OPTIONS)[number]["value"];
export const COMME_ANNONCE_VALUES = COMME_ANNONCE_OPTIONS.map((o) => o.value) as CommeAnnonceValue[];
export const commeAnnonceLabel = (v: string | null): string =>
  COMME_ANNONCE_OPTIONS.find((o) => o.value === v)?.label ?? "—";

// Les quatre notes, de la plus liée au pilote à la plus liée au prix. Les colonnes
// gardent leurs anciens noms (`note_preparation`, `note_qualite_prix`) ; seuls les
// libellés ont changé : le client verse une participation aux frais au pilote.
export const AXES = [
  { key: "notePilote", label: "Le pilote" },
  { key: "noteVol", label: "Le vol" },
  { key: "notePreparation", label: "Avant le vol" },
  { key: "noteQualitePrix", label: "La participation aux frais" },
] as const;
export type AxeKey = (typeof AXES)[number]["key"];
