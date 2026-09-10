-- Espace pilote · messagerie pilote <-> client (fil de ticket rattache a la
-- reservation). Remplace le "Composer un email..." one-shot du drawer cote pilote.
-- Meme patron que contact_messages / /contact/ticket/[token] (20260629).
--
-- A executer a la main dans Supabase.

create table if not exists reservation_messages (
  id             uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  author         text not null check (author in ('client', 'pilote', 'admin')),
  author_nom     text,                       -- nom affiche (pilote / admin)
  content        text not null,
  created_at     timestamptz not null default now()
);
create index if not exists reservation_messages_resa_idx
  on reservation_messages(reservation_id, created_at);
alter table reservation_messages enable row level security;
create policy "service_role reservation_messages" on reservation_messages for all using (true);

-- Jeton stable pour l'URL publique du fil (survit a tout le parcours).
alter table reservations
  add column if not exists messages_token uuid not null default gen_random_uuid();
create unique index if not exists reservations_messages_token_idx
  on reservations(messages_token);

-- Signature perso du pilote, ajoutee en bas des emails aux clients.
alter table pilotes add column if not exists signature text;

comment on column reservations.messages_token is
  'Jeton public du fil de messages de la reservation (/reservation/messages/[token]).';
comment on column pilotes.signature is
  'Signature libre ajoutee en bas des emails du pilote au client. Vide = signature par defaut.';
