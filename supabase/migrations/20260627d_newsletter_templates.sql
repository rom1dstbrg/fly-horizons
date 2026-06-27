create table if not exists newsletter_templates (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  subject    text        not null default '',
  blocks     jsonb       not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table newsletter_templates enable row level security;

-- Accessible uniquement via service_role (admin client)
create policy "service_role only" on newsletter_templates
  using (false)
  with check (false);
