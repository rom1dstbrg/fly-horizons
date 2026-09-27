-- Disponibilités pilote en grille de blocs de 2 h (décision 27/09/2026).
-- Une ligne = un bloc ouvert (date + heure de début : 7, 9, 11, 13, 15, 17 ou 19).
-- Pas de ligne = fermé : un pilote qui n'a rien coché n'est pas réservable.
-- Remplace pilote_disponibilites / pilote_disponibilites_jours (plages +
-- exceptions), vides en prod au 27/09 (vérifié) : aucune conversion.
--
-- A executer a la main dans Supabase.

create table if not exists pilote_creneaux (
  pilote_id  uuid not null references pilotes(id) on delete cascade,
  date       date not null,
  heure      smallint not null check (heure in (7, 9, 11, 13, 15, 17, 19)),
  created_at timestamptz not null default now(),
  primary key (pilote_id, date, heure)
);

-- RLS sans policy : lu et écrit seulement par le serveur (clé service_role,
-- qui ignore la RLS). Une policy « using (true) » ouvrirait la table à la clé anon.
alter table pilote_creneaux enable row level security;

drop table if exists pilote_disponibilites;
drop table if exists pilote_disponibilites_jours;

-- Visites guidées déjà vues (clé de page, ex. 'disponibilites') : une visite ne
-- revient pas, même sur un autre appareil.
alter table pilotes add column if not exists visites_vues text[] not null default '{}';

notify pgrst, 'reload schema';
