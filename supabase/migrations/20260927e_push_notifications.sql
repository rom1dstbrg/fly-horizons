-- Notifications push (27/09) : un abonnement par appareil (app ajoutée à
-- l'écran d'accueil), rattaché au compte. Un pilote peut en avoir plusieurs
-- (téléphone, tablette). Supprimé quand le service push répond 404/410.
create table if not exists push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  app           text not null default 'pilote',
  user_agent    text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);
create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);
alter table push_subscriptions enable row level security;

-- Rappels programmés déjà envoyés (48 h avant le vol, paiement pas noté…) :
-- une clé par rappel et par réservation, pour ne jamais l'envoyer deux fois.
create table if not exists push_rappels_envoyes (
  cle         text primary key,
  envoye_at   timestamptz not null default now()
);
alter table push_rappels_envoyes enable row level security;
