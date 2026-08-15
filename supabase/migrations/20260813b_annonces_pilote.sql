-- Annonces publiées par les pilotes eux-mêmes (chemin 1 de l'espace pilote).
-- Le pilote fixe prix total et sa propre part à la main — voir la validation
-- applicative (0% bloqué, <25% averti) dans lib/annonces-pilote.ts.

create table if not exists annonces_pilote (
  id             uuid primary key default gen_random_uuid(),
  pilote_id      uuid not null references pilotes(id) on delete cascade,
  date_vol       date not null,
  heure_vol      time not null,
  duree          int not null check (duree in (30, 60, 90, 120)),
  places         int not null check (places between 1 and 3),
  prix_total     numeric(8,2) not null check (prix_total > 0),
  part_pilote    numeric(8,2) not null check (part_pilote > 0),
  statut         text not null default 'publiee' check (statut in ('publiee', 'annulee')),
  created_at     timestamptz not null default now()
);

create index if not exists idx_annonces_pilote_pilote  on annonces_pilote(pilote_id);
create index if not exists idx_annonces_pilote_date    on annonces_pilote(date_vol);
create index if not exists idx_annonces_pilote_statut  on annonces_pilote(statut);

alter table annonces_pilote enable row level security;
create policy "service_role annonces_pilote" on annonces_pilote for all using (true);
