-- Signaux de supervision des réservations (01/10) : demande sans réponse,
-- paiement en attente, « le client dit avoir payé ».
--
-- paiement_demande_at        : première fois que le lien de paiement part au client.
--                              Sert de point de départ au signal « paiement en attente »
--                              (orange à 3 jours, rouge à 5 jours).
-- client_paiement_declare_at : le client a cliqué « J'ai effectué le virement » sur la
--                              page de paiement. Le pilote doit alors confirmer ou non
--                              la réception (orange à 36 h, rouge à 48 h).
--
-- À exécuter à la main dans Supabase AVANT le déploiement du code qui lit ces colonnes.

alter table reservations
  add column if not exists paiement_demande_at timestamptz,
  add column if not exists client_paiement_declare_at timestamptz;

-- Rattrapage : les liens déjà envoyés prennent la date de confirmation, à défaut de création.
update reservations
set paiement_demande_at = coalesce(heure_confirmee_at, date_confirmee_at, created_at)
where payment_token is not null
  and paiement_demande_at is null;

-- Relances push toutes les heures (Vercel Hobby = 1 passage par jour).
-- Remplacer <CRON_SECRET> par la valeur de la variable CRON_SECRET de Vercel
-- (ne jamais commiter la vraie valeur ici). À exécuter APRÈS le déploiement de la route.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('signaux-reservations')
where exists (select 1 from cron.job where jobname = 'signaux-reservations');

select cron.schedule(
  'signaux-reservations',
  '10 * * * *',
  $$
  select net.http_get(
    url := 'https://fly-horizons.com/api/cron/signaux',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  );
  $$
);
