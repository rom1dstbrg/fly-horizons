-- Rappel pilote (pas client) : un vol issu d'une annonce a eu lieu depuis
-- quelques jours et n'est toujours pas marqué payé. Demande de Romain le
-- 19/09 après un test réel du flow annonce — rien ne le relançait, il fallait
-- s'en souvenir tout seul. Colonne pour envoyer le rappel une seule fois par
-- réservation (cron quotidien, cf. app/api/cron/pilote-payment-checkin).

alter table reservations
  add column if not exists payment_checkin_sent_at timestamptz;
