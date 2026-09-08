-- Bloc D · modèle A — le pilote encaisse en direct (virement / QR SEPA / Payconiq).
-- Fly Horizons n'encaisse rien sur ces vols ; l'app garde une trace informative.
-- À coller à la main dans Supabase.

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS montant_pilote numeric,       -- montant convenu par le pilote
  ADD COLUMN IF NOT EXISTS pilote_paye boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pilote_paye_at timestamptz;
-- part_pilote_pct : déjà ajouté par 20260908_reservations_pilote_assign.sql

ALTER TABLE pilotes
  ADD COLUMN IF NOT EXISTS paylink text;                 -- lien Payconiq / Revolut « demander de l'argent », optionnel

COMMENT ON COLUMN reservations.montant_pilote IS 'Participation aux frais convenue par le pilote (modèle A), réglée en direct au pilote.';
COMMENT ON COLUMN reservations.pilote_paye IS 'Le client a réglé le pilote (info déclarative, aucun flux réel dans l''app).';
COMMENT ON COLUMN pilotes.paylink IS 'Lien de paiement personnel du pilote (Payconiq/Revolut), affiché au client à côté de l''IBAN.';
