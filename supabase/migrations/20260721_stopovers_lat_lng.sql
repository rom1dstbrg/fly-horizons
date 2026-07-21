-- Crée la table stopovers si elle n'existe pas (idempotent)
create table if not exists stopovers (
  id         uuid primary key default uuid_generate_v4(),
  icao       text not null,
  nom        text not null,
  taxe       int  not null default 0,
  actif      boolean default true,
  lat        double precision,
  lng        double precision,
  created_at timestamptz default now()
);

-- Ajoute les colonnes lat/lng si elles manquent (idempotent)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'stopovers' and column_name = 'lat'
  ) then
    alter table stopovers add column lat double precision;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'stopovers' and column_name = 'lng'
  ) then
    alter table stopovers add column lng double precision;
  end if;
end $$;
