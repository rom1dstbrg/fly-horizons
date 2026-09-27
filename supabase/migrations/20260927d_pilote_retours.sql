-- Retours des pilotes (27/09) : bug, idée ou question envoyés depuis l'espace
-- pilote, lus par Romain dans /admin/retours. Le contexte technique (page,
-- appareil, version déployée, erreurs du navigateur) est joint automatiquement
-- pour que l'export « pour Claude » suffise à corriger un bug.
create table if not exists pilote_retours (
  id           uuid primary key default gen_random_uuid(),
  pilote_id    uuid not null references pilotes(id) on delete cascade,
  type         text not null check (type in ('bug', 'idee', 'question')),
  message      text not null,
  page         text,
  page_titre   text,
  user_agent   text,
  viewport     text,
  app_version  text,
  erreurs      jsonb not null default '[]'::jsonb,
  captures     text[] not null default '{}',
  statut       text not null default 'a_traiter' check (statut in ('a_traiter', 'traite')),
  traite_at    timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists pilote_retours_statut_idx on pilote_retours (statut, created_at desc);

-- Tout passe par le client service_role côté serveur : aucune lecture directe.
alter table pilote_retours enable row level security;

-- Captures d'écran : espace privé, lu par l'admin via des URL signées.
insert into storage.buckets (id, name, public)
values ('pilote-retours', 'pilote-retours', false)
on conflict (id) do nothing;
