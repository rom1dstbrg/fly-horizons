-- Enquête de satisfaction plus ciblée
-- Nouveaux axes de notation + recommandation + source de découverte.
-- Les anciens champs (note_globale, note_accueil, points_amelioration) ne sont
-- plus alimentés mais restent en base pour ne pas perdre d'historique.

ALTER TABLE satisfaction_surveys
  ADD COLUMN IF NOT EXISTS note_preparation   smallint,
  ADD COLUMN IF NOT EXISTS note_vol           smallint,
  ADD COLUMN IF NOT EXISTS note_qualite_prix  smallint,
  ADD COLUMN IF NOT EXISTS recommandation     text,
  ADD COLUMN IF NOT EXISTS source_decouverte  text;

-- Anciens axes désormais facultatifs (le formulaire ne les envoie plus)
ALTER TABLE satisfaction_surveys ALTER COLUMN note_globale DROP NOT NULL;
ALTER TABLE satisfaction_surveys ALTER COLUMN note_accueil DROP NOT NULL;
