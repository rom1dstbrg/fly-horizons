-- Les dispos ne sont pas par annonce mais par PILOTE — un seul calendrier
-- réel, partagé par toutes ses annonces (comme le calendrier admin est un
-- seul calendrier partagé par tous les produits). Remplace les tables
-- annonce_disponibilites* (20260915b), jamais utilisées en prod.
--
-- A executer a la main dans Supabase.

drop table if exists annonce_disponibilites;
drop table if exists annonce_disponibilites_jours;

create table if not exists pilote_disponibilites (
  id           uuid primary key default gen_random_uuid(),
  pilote_id    uuid not null references pilotes(id) on delete cascade,
  date_debut   date not null,
  date_fin     date not null,
  heure_debut  time not null,
  heure_fin    time not null,
  jours        int[] default '{1,2,3,4,5,6,0}',
  actif        boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists idx_pilote_dispo_pilote on pilote_disponibilites(pilote_id);

create table if not exists pilote_disponibilites_jours (
  id           uuid primary key default gen_random_uuid(),
  pilote_id    uuid not null references pilotes(id) on delete cascade,
  date         date not null,
  heure_debut  time,
  heure_fin    time,
  ferme        boolean not null default false,
  note         text,
  created_at   timestamptz not null default now(),
  unique (pilote_id, date)
);
create index if not exists idx_pilote_dispo_jours_pilote on pilote_disponibilites_jours(pilote_id);

alter table pilote_disponibilites enable row level security;
drop policy if exists "service_role pilote_disponibilites" on pilote_disponibilites;
create policy "service_role pilote_disponibilites" on pilote_disponibilites for all using (true);

alter table pilote_disponibilites_jours enable row level security;
drop policy if exists "service_role pilote_disponibilites_jours" on pilote_disponibilites_jours;
create policy "service_role pilote_disponibilites_jours" on pilote_disponibilites_jours for all using (true);
