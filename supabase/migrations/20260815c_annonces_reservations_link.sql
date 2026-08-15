-- Relie les réservations issues d'une annonce pilote (marketplace type Wingly) à
-- l'annonce et au pilote concernés. `reservations.pilote_id` avait déjà existé une
-- fois (20260731_reservations_pilote.sql) puis avait été supprimé quand le projet
-- pilote avait été abandonné (20260801_remove_pilotes.sql) — on le réintroduit
-- proprement ici, avec annonce_id en plus.

alter table reservations
  add column if not exists pilote_id  uuid references pilotes(id),
  add column if not exists annonce_id uuid references annonces_pilote(id);

create index if not exists idx_reservations_pilote_id  on reservations(pilote_id);
create index if not exists idx_reservations_annonce_id on reservations(annonce_id);

-- type_resa n'a jamais été créé via une migration trackée (colonne ajoutée hors
-- version control, comme profiles.role) : on ne connaît pas le nom exact de sa
-- contrainte CHECK si elle existe, on la retrouve dynamiquement (même pattern
-- que 20260813_pilotes_espace.sql pour profiles.role).
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.reservations'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%type_resa%'
  loop
    execute format('alter table public.reservations drop constraint %I', c.conname);
  end loop;
  alter table public.reservations
    add constraint reservations_type_resa_check
    check (type_resa in ('standard', 'perso', 'annonce_pilote'));
end $$;

-- annonces_pilote.statut : ajoute 'reservee' (réservation payée, annonce fermée)
-- aux valeurs 'publiee'/'annulee' existantes.
alter table annonces_pilote
  drop constraint if exists annonces_pilote_statut_check;
alter table annonces_pilote
  add constraint annonces_pilote_statut_check
  check (statut in ('publiee', 'reservee', 'annulee'));
