-- Espace pilote (v2) : plusieurs pilotes vont voler pour Fly Horizons.
-- Contrairement à la tentative du 30/07 (annulée le 01/08, voir 20260801_remove_pilotes.sql),
-- ce système n'a pas de part fixe %/€ par pilote au niveau du profil : chaque vol
-- déclare sa propre part (colonnes ajoutées plus tard, sur reservations/products).

create table if not exists pilotes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id),
  nom         text not null,
  email       text not null,
  telephone   text,
  iban        text,
  statut      text not null default 'actif' check (statut in ('actif', 'inactif')),
  created_at  timestamptz not null default now()
);

create unique index if not exists pilotes_user_id_idx on pilotes(user_id) where user_id is not null;
create unique index if not exists pilotes_email_idx on pilotes(lower(email));

alter table pilotes enable row level security;
create policy "service_role pilotes" on pilotes for all using (true);

-- profiles.role n'a jamais été créé via une migration trackée (table hors versioning) :
-- on ne connaît pas le nom de sa contrainte CHECK, on la retrouve dynamiquement.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
  alter table public.profiles add constraint profiles_role_check check (role in ('customer', 'admin', 'pilote'));
end $$;
