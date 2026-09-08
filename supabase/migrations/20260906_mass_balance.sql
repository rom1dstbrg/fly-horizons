-- ============================================================
--  Feuilles de masse & centrage + performances DA40
--  Une feuille = un calcul M&B enregistré, éventuellement lié à
--  une réservation. `inputs` = saisie complète, `computed` =
--  snapshot du résultat calculé (pour un PDF fidèle dans le temps).
--  À coller dans Supabase SQL Editor → Run.
-- ============================================================

create table if not exists mass_balance_sheets (
  id             uuid primary key default uuid_generate_v4(),
  reservation_id uuid references reservations(id) on delete set null,
  aircraft_reg   text not null,
  flight_date    date,
  label          text,
  inputs         jsonb not null,
  computed       jsonb not null,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table mass_balance_sheets enable row level security;

create policy "service_role mass_balance_sheets"
  on mass_balance_sheets for all using (true);

create index if not exists idx_mb_reservation on mass_balance_sheets(reservation_id);
create index if not exists idx_mb_created     on mass_balance_sheets(created_at desc);
