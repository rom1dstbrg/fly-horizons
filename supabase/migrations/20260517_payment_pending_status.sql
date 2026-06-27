-- Ajoute 'payment_pending' aux statuts valides des réservations
-- Ce statut est utilisé par /api/reservation/checkout pendant l'attente du paiement Stripe

ALTER TABLE reservations
  DROP CONSTRAINT IF EXISTS reservations_statut_check;

ALTER TABLE reservations
  ADD CONSTRAINT reservations_statut_check CHECK (statut IN (
    'payment_pending',
    'en_attente',
    'date_confirmee',
    'heure_confirmee',
    'facture_envoyee',
    'acompte_recu',
    'vol_effectue',
    'solde',
    'annulee'
  ));
