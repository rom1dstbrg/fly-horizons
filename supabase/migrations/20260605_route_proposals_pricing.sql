-- Capture la durée et l'acompte au moment de l'envoi de la proposition
-- pour que le mail de paiement reflète les valeurs de la route proposée (pas l'estimé initial du client)
ALTER TABLE route_proposals
  ADD COLUMN IF NOT EXISTS duree    INTEGER,
  ADD COLUMN IF NOT EXISTS acompte  INTEGER;
