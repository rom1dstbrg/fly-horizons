-- Relance d'une enquête de satisfaction restée sans réponse (07/10).
--
-- satisfaction_invite_at   : le mail « Merci pour votre vol » (avec le lien de l'enquête) est
--                            parti à cet instant. Point de départ du signal « Avis sans réponse »
--                            (orange à 5 jours, rouge à 10 jours). Remis à null quand le client
--                            répond : un vol sans cette date n'a rien à relancer.
-- satisfaction_reminder_at : le client a reçu l'unique rappel (bouton « Relancer le client »).
--
-- À exécuter à la main dans Supabase AVANT le déploiement du code qui lit ces colonnes.
-- Rattrapage des vols déjà effectués sans avis : voir scripts/backfill-satisfaction-invite.mjs.

alter table reservations
  add column if not exists satisfaction_invite_at timestamptz,
  add column if not exists satisfaction_reminder_at timestamptz;
