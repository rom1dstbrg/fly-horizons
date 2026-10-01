-- Enquête de satisfaction : « Le vol s'est-il passé comme annoncé ? » (01/10).
-- Repère les retards et les itinéraires non respectés, pour la page Admin > Satisfaction
-- (ventilée par pilote). Valeurs : 'oui' | 'presque' | 'non'. Facultatif en base : les
-- anciens avis restent sans réponse. Le code fonctionne aussi tant que cette migration
-- n'est pas exécutée (la colonne est alors simplement ignorée).
ALTER TABLE satisfaction_surveys
  ADD COLUMN IF NOT EXISTS comme_annonce text;
