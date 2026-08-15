-- FIX SÉCURITÉ CRITIQUE — RLS effectivement désactivée sur la majorité des tables.
--
-- Cause : les policies "service_role X" créées dans les migrations précédentes
-- utilisent `for all using (true)` SANS clause `to service_role`. En Postgres,
-- une policy sans `to` s'applique à PUBLIC (tous les rôles, y compris `anon` —
-- la clé publique embarquée côté client). Elles n'ont donc jamais restreint
-- l'accès à service_role malgré leur nom : n'importe qui muni de la seule clé
-- anon pouvait lire/écrire directement ces tables via l'API REST Supabase,
-- en contournant toute la logique applicative (checkAdmin, checkPilote, etc).
--
-- Vérifié en clair (clé anon uniquement, aucune session) le 15/08 :
--   - clients        → noms/emails clients réels retournés
--   - crm_settings   → tous les settings retournés
--   - contact_messages / coupons → jamais eu de RLS du tout (tables créées
--     hors migration trackée), donc également grand ouvertes
--
-- service_role bypass RLS nativement chez Supabase (attribut BYPASSRLS) : ces
-- policies n'ont donc jamais été nécessaires au fonctionnement de l'app, qui
-- passe systématiquement par createAdminClient() (vérifié table par table).
-- Les supprimer purement et simplement referme l'accès à anon/authenticated
-- sans rien casser côté app.

drop policy if exists "service_role clients"              on clients;
drop policy if exists "service_role reservations"         on reservations;
drop policy if exists "service_role disponibilites"       on disponibilites;
drop policy if exists "service_role disponibilites_jours" on disponibilites_jours;
drop policy if exists "service_role avions"               on avions;
drop policy if exists "service_role aerodromes"           on aerodromes;
drop policy if exists "service_role messages"              on messages;
drop policy if exists "service_role depenses"              on depenses;
drop policy if exists "service_role newsletter"             on newsletter_subscribers;
drop policy if exists "service_role page_views"             on page_views;
drop policy if exists "service_role pilotes"               on pilotes;
drop policy if exists "service_role annonces_pilote"        on annonces_pilote;

-- contact_messages, coupons : n'ont jamais eu RLS activé du tout (tables créées
-- directement en base, hors migration trackée) — entièrement publiques jusqu'ici.
alter table contact_messages enable row level security;
alter table coupons          enable row level security;

-- crm_settings : lecture publique nécessaire (maintenance_mode, chat_enabled,
-- tarifs affichés côté site — voir /api/site-settings et middleware.ts), mais
-- l'écriture doit rester réservée à service_role (déjà le cas côté app :
-- settings.ts passe toujours par checkAdmin() + createAdminClient()).
drop policy if exists "service_role crm_settings" on crm_settings;
create policy "public_read crm_settings" on crm_settings
  for select using (true);

-- avion_tarifs : lu directement depuis le navigateur par le drawer admin
-- (components/admin/reservation-drawer/hooks/useBilanVol.ts, bilan de vol)
-- avec la session de l'admin connecté — donc rôle `authenticated`, pas
-- `service_role`. On restreint la lecture aux seuls profils admin.
drop policy if exists "service_role avion_tarifs" on avion_tarifs;
create policy "admin_read avion_tarifs" on avion_tarifs
  for select to authenticated using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- reservations : le tracker temps réel client (ReservationTracker.tsx) s'abonne
-- via postgres_changes sur sa propre réservation avec la session utilisateur
-- (rôle authenticated) — Supabase Realtime applique la RLS de la table pour
-- autoriser l'abonnement. Sans policy SELECT dédiée, la suppression ci-dessus
-- couperait silencieusement le suivi en direct pour les clients connectés.
-- La fonction est SECURITY DEFINER pour pouvoir lire `clients` en interne
-- (la table clients elle-même reste fermée à authenticated).
create or replace function public.owns_reservation(p_client_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from clients
    where clients.id = p_client_id
    and lower(clients.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create policy "own_reservation_select" on reservations
  for select to authenticated
  using (owns_reservation(client_id));

-- Storage : mêmes policies "manage" jamais restreintes à service_role —
-- n'importe qui pouvait uploader/écraser/supprimer des fichiers dans les
-- buckets publics gallery et satisfaction-photos. Les uploads applicatifs
-- passent déjà systématiquement par createAdminClient() (lib/actions/gallery.ts,
-- app/api/satisfaction/photo/route.ts), donc aucune policy de remplacement
-- n'est nécessaire — service_role bypass RLS nativement.
drop policy if exists "Service role manage gallery storage" on storage.objects;
drop policy if exists "Service role manage satisfaction photos" on storage.objects;
