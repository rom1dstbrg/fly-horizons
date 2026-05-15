-- ============================================================
--  FLY HORIZONS — Migration CRM → Supabase Shop
--  À coller dans Supabase SQL Editor → Run
--  Ajoute toutes les tables du CRM fly-horizons.com
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
--  CLIENTS
-- ============================================================
create table if not exists clients (
  id          text primary key,
  nom         text not null,
  prenom      text not null,
  email       text not null,
  telephone   text,
  created_at  timestamptz default now()
);

create sequence if not exists client_seq start 1;

create or replace function next_client_id()
returns text language plpgsql as $$
declare
  seq_val int;
  new_id  text;
begin
  seq_val := nextval('client_seq');
  new_id  := 'FH-' || lpad(seq_val::text, 4, '0');
  while exists (select 1 from clients where id = new_id) loop
    seq_val := nextval('client_seq');
    new_id  := 'FH-' || lpad(seq_val::text, 4, '0');
  end loop;
  return new_id;
end;
$$;

-- ============================================================
--  RESERVATIONS
-- ============================================================
create table if not exists reservations (
  id                  uuid primary key default uuid_generate_v4(),
  client_id           text references clients(id) on delete cascade,
  date_vol            date not null,
  heure_vol           time,
  duree               int not null check (duree in (30, 60, 90, 120)),
  passagers           int not null default 1,
  commentaire         text,
  statut              text not null default 'en_attente'
                      check (statut in (
                        'en_attente',
                        'date_confirmee',
                        'heure_confirmee',
                        'facture_envoyee',
                        'acompte_recu',
                        'vol_effectue',
                        'solde',
                        'annulee'
                      )),
  acompte             numeric(8,2),
  paye                numeric(8,2) default 0,
  remboursement       numeric(8,2) default 0,
  duree_reelle        numeric(6,2),
  langue              text default 'fr',
  date_confirmee_at   timestamptz default null,
  heure_confirmee_at  timestamptz default null,
  facture_envoyee_at  timestamptz default null,
  waypoints           jsonb,
  created_at          timestamptz default now()
);

-- ============================================================
--  DISPONIBILITES (créneaux récurrents)
-- ============================================================
create table if not exists disponibilites (
  id           uuid primary key default uuid_generate_v4(),
  date_debut   date not null,
  date_fin     date not null,
  heure_debut  time not null,
  heure_fin    time not null,
  jours        int[] default '{1,2,3,4,5,6,0}',
  actif        boolean default true,
  created_at   timestamptz default now()
);

-- ============================================================
--  DISPONIBILITES_JOURS (overrides par jour)
-- ============================================================
create table if not exists disponibilites_jours (
  id           uuid primary key default uuid_generate_v4(),
  date         date unique not null,
  heure_debut  time,
  heure_fin    time,
  ferme        boolean default false,
  note         text,
  created_at   timestamptz default now()
);

-- ============================================================
--  AVIONS
-- ============================================================
create table if not exists avions (
  id             text primary key,
  nom            text not null,
  vitesse_kts    numeric(6,2) not null,
  prix_heure     numeric(8,2) not null,
  places         int default 4,
  payload_kg     int default 350,
  billing_type   text default 'flight',
  block_before   int default 0,
  block_after    int default 0,
  photo_url      text,
  description    text,
  actif          boolean default true,
  created_at     timestamptz default now()
);

-- ============================================================
--  AERODROMES
-- ============================================================
create table if not exists aerodromes (
  id          uuid primary key default uuid_generate_v4(),
  icao        text unique,
  city        text not null,
  lat         numeric(10,6),
  lng         numeric(10,6),
  actif       boolean default true,
  created_at  timestamptz default now()
);

-- ============================================================
--  MESSAGES (formulaire contact)
-- ============================================================
create table if not exists messages (
  id          uuid primary key default uuid_generate_v4(),
  nom         text not null,
  prenom      text,
  email       text not null,
  telephone   text,
  sujet       text,
  message     text not null,
  langue      text default 'fr',
  statut      text not null default 'en_attente'
              check (statut in ('en_attente','en_cours','traite','archive')),
  created_at  timestamptz default now()
);

-- ============================================================
--  SETTINGS CRM (prix, templates, IBAN, etc.)
-- ============================================================
create table if not exists crm_settings (
  key   text primary key,
  value text not null
);

insert into crm_settings (key, value) values
  ('prix_heure',             '254'),
  ('acompte_30',             '160'),
  ('acompte_60',             '300'),
  ('acompte_90',             '440'),
  ('acompte_120',            '580'),
  ('acompte_perso_heure',    '300'),
  ('email_contact',          'info@fly-horizons.com'),
  ('adresse',                'Rue des Fusillés, 6041 Gosselies'),
  ('iban',                   'BE97 3636 4333 4049'),
  ('site_url',               'https://fly-horizons.com'),
  ('tplConfirmResaSubject',  'Demande de réservation reçue — Fly Horizons'),
  ('tplConfirmResaBody',     E'Bonjour {{prenom}},\n\nNous avons bien reçu votre demande de réservation pour le {{date}}.\n\nNous vous recontacterons rapidement afin de confirmer la disponibilité et organiser votre vol.\n\nÀ très bientôt à bord !'),
  ('tplConfirmDateSubject',  'Confirmation de réservation — Fly Horizons'),
  ('tplConfirmDateBody',     E'Bonjour {{prenom}},\n\nNous avons le plaisir de vous confirmer votre réservation.\n\nDate : {{date}}\nDurée : {{duree}} minutes\n\nÀ très bientôt à bord !'),
  ('tplConfirmHeureSubject', E'Confirmation de l''heure de vol — Fly Horizons'),
  ('tplConfirmHeureBody',    E'Bonjour {{prenom}},\n\nNous avons le plaisir de vous confirmer l''heure de votre vol.\n\nDate : {{date}}\nHeure : {{heure}}\nDurée : {{duree}} minutes\n\nMerci d''arriver 30 minutes avant l''heure prévue.\n\nÀ très bientôt à bord !'),
  ('tplContactSubject',      'Re: {{sujet}} — Fly Horizons'),
  ('signature_nom',          'Fly Horizons'),
  ('signature_site',         'fly-horizons.com'),
  ('signature_email',        'info@fly-horizons.com')
on conflict (key) do nothing;

-- ============================================================
--  RLS
-- ============================================================
alter table clients             enable row level security;
alter table reservations        enable row level security;
alter table disponibilites      enable row level security;
alter table disponibilites_jours enable row level security;
alter table avions              enable row level security;
alter table aerodromes          enable row level security;
alter table messages            enable row level security;
alter table crm_settings        enable row level security;

-- Accès total via service_role (Netlify Functions)
create policy "service_role clients"             on clients             for all using (true);
create policy "service_role reservations"        on reservations        for all using (true);
create policy "service_role disponibilites"      on disponibilites      for all using (true);
create policy "service_role disponibilites_jours" on disponibilites_jours for all using (true);
create policy "service_role avions"              on avions              for all using (true);
create policy "service_role aerodromes"          on aerodromes          for all using (true);
create policy "service_role messages"            on messages            for all using (true);
create policy "service_role crm_settings"        on crm_settings        for all using (true);

-- ============================================================
--  INDEX
-- ============================================================
create index if not exists idx_reservations_date     on reservations(date_vol);
create index if not exists idx_reservations_client   on reservations(client_id);
create index if not exists idx_reservations_statut   on reservations(statut);
create index if not exists idx_disponibilites_dates  on disponibilites(date_debut, date_fin);
create index if not exists idx_dispo_jours_date      on disponibilites_jours(date);
create index if not exists idx_messages_statut       on messages(statut);
create index if not exists idx_messages_date         on messages(created_at desc);
