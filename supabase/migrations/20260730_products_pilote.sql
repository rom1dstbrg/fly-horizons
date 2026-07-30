alter table products
  add column if not exists pilote_id uuid references pilotes(id),
  add column if not exists part_type text check (part_type in ('pourcentage','montant')),
  add column if not exists part_valeur numeric;
