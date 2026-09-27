-- Qualifications du pilote en liste structurée (27/09) : type, date d'obtention,
-- date d'expiration (calculée par défaut selon le type, modifiable).
-- Remplace le champ texte libre `ratings` (gardé en base, plus affiché).
alter table pilotes
  add column if not exists qualifications jsonb not null default '[]'::jsonb;
