-- Rappels du bilan de vol (27/09) : appel horaire de /api/cron/bilan-vol.
-- Vercel Hobby limite ses crons à un passage par jour, trop peu pour un rappel
-- « 8 h après le vol » : c'est Supabase (pg_cron + pg_net) qui appelle la route.
--
-- À exécuter à la main dans Supabase, APRÈS le déploiement de la route.
-- Remplacer <CRON_SECRET> par la valeur de la variable CRON_SECRET de Vercel
-- (ne jamais commiter la vraie valeur ici).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('bilan-vol')
where exists (select 1 from cron.job where jobname = 'bilan-vol');

select cron.schedule(
  'bilan-vol',
  '5 * * * *',
  $$
  select net.http_get(
    url := 'https://fly-horizons.com/api/cron/bilan-vol',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  );
  $$
);
