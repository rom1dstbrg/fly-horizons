-- Ajoute 'demande_recue' aux statuts valides des réservations
-- Utilisé par /api/reservation/checkout (vols payants) : le client envoie une demande,
-- Romain confirme et déclenche l'envoi du lien de paiement lui-même — plus de paiement
-- Stripe immédiat à la soumission du formulaire public.

ALTER TABLE reservations
  DROP CONSTRAINT IF EXISTS reservations_statut_check;

ALTER TABLE reservations
  ADD CONSTRAINT reservations_statut_check CHECK (statut IN (
    'demande_recue',
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
