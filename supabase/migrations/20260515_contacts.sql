create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  email text not null,
  sujet text not null,
  message text not null,
  statut text not null default 'nouveau',
  reponse text,
  created_at timestamptz default now()
);
