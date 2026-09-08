-- Garde-fou légal sur la publication d'une annonce pilote.
-- Le pilote doit attester, à chaque création / modification, qu'il réalise
-- réellement le vol et partage ses frais (il ne fait pas de transport à titre
-- onéreux). On garde une trace horodatée, comme pour la charte pilote.
--
-- Les annonces déjà en base gardent legal_ok = false : elles restent visibles
-- (le public ne filtre pas là-dessus) mais apparaissent « à confirmer » dans
-- l'espace pilote tant que le pilote ne les a pas ré-enregistrées.

alter table annonces_pilote
  add column if not exists legal_ok    boolean not null default false,
  add column if not exists legal_ok_at timestamptz;
