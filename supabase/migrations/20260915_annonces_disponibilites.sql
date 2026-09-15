-- Annonces pilote : dispos déclarées par le pilote (plage de dates + jours de
-- semaine, et/ou dates précises ponctuelles) — contraint la date/heure que le
-- client peut demander sur la page publique de l'annonce. NULL/vide = aucune
-- contrainte (comportement historique, n'importe quelle date acceptée).
--
-- A executer a la main dans Supabase.

alter table annonces_pilote add column if not exists disponibilites jsonb;

comment on column annonces_pilote.disponibilites is
  'Dispos du pilote : {plage:{debut,fin,jours:[0-6]}, dates:[...]}. NULL/vide = aucune contrainte.';
