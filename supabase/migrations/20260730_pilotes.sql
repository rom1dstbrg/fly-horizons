create table pilotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  nom text not null,
  slug text unique not null,
  bio text,
  photo_url text,
  email text not null,
  statut text not null default 'actif' check (statut in ('en_attente','actif','desactive')),
  part_type text not null default 'pourcentage' check (part_type in ('pourcentage','montant')),
  part_valeur numeric not null default 25,
  created_at timestamptz not null default now()
);

-- Romain comme premier pilote (a lier a son user_id existant en le completant manuellement apres coup)
insert into pilotes (nom, slug, email, statut) values ('Romain Destanberg', 'romain', 'info@fly-horizons.com', 'actif');
