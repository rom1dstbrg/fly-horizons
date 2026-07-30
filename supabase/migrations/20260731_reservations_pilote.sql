alter table reservations
  add column if not exists product_id uuid references products(id),
  add column if not exists pilote_id uuid references pilotes(id);
