-- Vérification des documents pilote (A + B) et déclaration avant vol (C) — 2026-09-27.
--
-- A · Romain vérifie les documents d'un pilote (en ligne, en visio ou en main
--     propre) et note ce qu'il a vu. Sans vérification, le pilote n'est pas
--     « en règle » (lib/pilote/legal.ts) : aucun vol ne peut lui être attribué.
-- B · Le pilote dépose ses documents dans un bucket PRIVÉ ; ils sont supprimés
--     dès que Romain valide ou refuse (on garde la trace, pas les fichiers).
-- C · Le pilote déclare son expérience récente (3 décollages et atterrissages
--     en 90 jours, FCL.060) sur son profil, et confirme avant chaque vol.

alter table pilotes
  add column if not exists medical_classe      text,        -- 'classe1' | 'classe2' | 'lapl'
  add column if not exists recence_date        date,        -- date du 3e atterrissage le plus récent
  add column if not exists docs_status         text not null default 'aucun', -- 'aucun' | 'envoyes' | 'verifies' | 'refuses'
  add column if not exists docs_verified_at    timestamptz,
  add column if not exists docs_note           text;        -- ce que Romain a vu, ou le motif du refus

create table if not exists pilote_documents (
  id          uuid primary key default gen_random_uuid(),
  pilote_id   uuid not null references pilotes(id) on delete cascade,
  type        text not null check (type in ('licence', 'medical', 'autre')),
  path        text not null,
  file_name   text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_pilote_documents_pilote on pilote_documents(pilote_id);
alter table pilote_documents enable row level security;
drop policy if exists "service_role pilote_documents" on pilote_documents;
create policy "service_role pilote_documents" on pilote_documents for all to service_role using (true);

-- Déclaration du pilote avant un vol (C).
alter table reservations
  add column if not exists pilote_declaration_at timestamptz;

-- Bucket privé : aucune lecture publique, accès uniquement via le serveur
-- (service_role) et des URL signées de courte durée.
insert into storage.buckets (id, name, public)
values ('pilote-documents', 'pilote-documents', false)
on conflict (id) do nothing;
