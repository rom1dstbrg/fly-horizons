-- Remplace le jsonb `annonces_pilote.disponibilites` (20260915, infaisable en
-- pratique : pas de plage horaire, saisie à la main) par le même système que
-- l'admin utilise pour le calendrier standard : plages récurrentes + overrides
-- par jour, avec de vraies heures de début/fin. Scopé par annonce_id (chaque
-- annonce a ses propres dispos, déclarées à la création/modification).
-- Réutilise lib/dispo-utils.ts computeEffectiveDay() tel quel (déjà générique).
--
-- A executer a la main dans Supabase.

alter table annonces_pilote drop column if exists disponibilites;

create table if not exists annonce_disponibilites (
  id           uuid primary key default gen_random_uuid(),
  annonce_id   uuid not null references annonces_pilote(id) on delete cascade,
  date_debut   date not null,
  date_fin     date not null,
  heure_debut  time not null,
  heure_fin    time not null,
  jours        int[] default '{1,2,3,4,5,6,0}',
  actif        boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists idx_annonce_dispo_annonce on annonce_disponibilites(annonce_id);

create table if not exists annonce_disponibilites_jours (
  id           uuid primary key default gen_random_uuid(),
  annonce_id   uuid not null references annonces_pilote(id) on delete cascade,
  date         date not null,
  heure_debut  time,
  heure_fin    time,
  ferme        boolean not null default false,
  note         text,
  created_at   timestamptz not null default now(),
  unique (annonce_id, date)
);
create index if not exists idx_annonce_dispo_jours_annonce on annonce_disponibilites_jours(annonce_id);

alter table annonce_disponibilites enable row level security;
drop policy if exists "service_role annonce_disponibilites" on annonce_disponibilites;
create policy "service_role annonce_disponibilites" on annonce_disponibilites for all using (true);

alter table annonce_disponibilites_jours enable row level security;
drop policy if exists "service_role annonce_disponibilites_jours" on annonce_disponibilites_jours;
create policy "service_role annonce_disponibilites_jours" on annonce_disponibilites_jours for all using (true);
