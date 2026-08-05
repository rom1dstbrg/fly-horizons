-- Négociation de créneau : l'admin propose une date/heure alternative précise,
-- le client accepte (le créneau est appliqué) ou refuse (redirigé vers le report libre existant).
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS slot_proposal_token uuid,
  ADD COLUMN IF NOT EXISTS slot_proposal_date date,
  ADD COLUMN IF NOT EXISTS slot_proposal_heure text;

CREATE UNIQUE INDEX IF NOT EXISTS reservations_slot_proposal_token_idx
  ON reservations (slot_proposal_token) WHERE slot_proposal_token IS NOT NULL;

-- Paiement en espèces prévu : coché par l'admin, empêche l'envoi automatique du
-- lien de paiement en ligne quand le client accepte l'itinéraire proposé.
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS cash_payment boolean NOT NULL DEFAULT false;
