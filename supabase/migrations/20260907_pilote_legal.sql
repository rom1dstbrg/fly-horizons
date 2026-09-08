-- Bloc A · espace pilote
--
-- item 5 — infos légales déclaratives du pilote + charte pilote signée.
--   legal_ok n'est PAS stocké : il est recalculé côté app (lib/pilote/legal.ts)
--   à chaque lecture, pour ne pas laisser un flag se désynchroniser en silence
--   des dates d'expiration.
--
-- item 7 — promouvoir un compte client existant en pilote.
--   supabase.auth.admin.inviteUserByEmail échoue si l'email a déjà un compte ;
--   on récupère alors l'id auth pour relier la fiche pilote au compte existant.

alter table pilotes
  add column if not exists licence_numero         text,
  add column if not exists licence_expiration     date,
  add column if not exists medical_expiration     date,
  add column if not exists ratings                text,
  add column if not exists conditions_accepted_at timestamptz,
  add column if not exists conditions_version     text,
  add column if not exists bio                    text,
  add column if not exists photo_url              text;

create or replace function public.get_auth_user_id_by_email(email_input text)
returns uuid
language sql
security definer
set search_path = auth, public
as $$
  select id
  from auth.users
  where email = lower(trim(email_input))
    and deleted_at is null
  limit 1;
$$;

grant execute on function public.get_auth_user_id_by_email(text) to service_role;
