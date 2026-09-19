-- La part pilote (part_pilote) ne doit plus jamais bloquer la publication
-- d'une annonce (décision 2026-09-13, cf. lib/annonces-pilote.ts) : le seuil
-- légal NCO.GEN.104 n'est qu'un avertissement affiché au pilote, il reste
-- seul responsable de sa part réelle. Le code côté serveur ne bloquait déjà
-- plus rien, mais la contrainte SQL d'origine (part_pilote > 0, posée avant
-- cette décision) empêchait toujours l'insertion à part = 0 — bug trouvé en
-- testant réellement une publication à 0.

alter table annonces_pilote
  drop constraint if exists annonces_pilote_part_pilote_check;
alter table annonces_pilote
  add constraint annonces_pilote_part_pilote_check check (part_pilote >= 0);
