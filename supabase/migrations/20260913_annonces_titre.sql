-- Titre libre de l'annonce pilote (absent jusqu'ici, le pilote n'avait aucun
-- moyen de nommer son vol). Affiché en priorité sur la card publique et dans
-- la liste "Mes annonces" ; à défaut, on retombe sur le libellé générique
-- "Vol partagé avec {pilote}".
--
-- A executer a la main dans Supabase.

alter table annonces_pilote add column if not exists titre text;

comment on column annonces_pilote.titre is
  'Titre libre choisi par le pilote (ex. "Coucher de soleil sur la Wallonie"). Optionnel.';
