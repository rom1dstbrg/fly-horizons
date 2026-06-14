-- Rendre l'email nullable dans clients (réservations hors-site sans email connu)
ALTER TABLE clients ALTER COLUMN email DROP NOT NULL;

-- Supprimer la contrainte de durée (30/60/90/120) pour autoriser les durées libres hors-site
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_duree_check;
