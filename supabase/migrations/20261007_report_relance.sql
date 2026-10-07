-- Relance d'un report resté sans réponse (07/10).
--
-- reschedule_invite_at   : le mail « Votre vol est reporté » (avec le lien pour choisir une
--                          nouvelle date) est parti à cet instant. Point de départ du signal
--                          « Report sans réponse » (orange à 7 jours, rouge à 12 jours).
-- reschedule_reminder_at : le client a reçu l'unique rappel (bouton « Relancer le client »).
--
-- Les deux sont remis à null quand le client choisit sa nouvelle date.
-- À exécuter à la main dans Supabase AVANT le déploiement du code qui lit ces colonnes.
-- Rattrapage des reports déjà envoyés (ex. 28/09) : voir scripts/backfill-report-invite.mjs.

alter table reservations
  add column if not exists reschedule_invite_at timestamptz,
  add column if not exists reschedule_reminder_at timestamptz;
