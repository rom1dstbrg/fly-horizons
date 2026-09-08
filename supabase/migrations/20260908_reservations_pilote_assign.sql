-- Bloc B · assignation manuelle d'un vol standard à un pilote.
-- Ces colonnes ont été ajoutées à la main dans Supabase pendant le build ;
-- ce fichier ne fait que les versionner (idempotent) pour la trace.

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS pilote_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS part_pilote_pct numeric,
  ADD COLUMN IF NOT EXISTS slot_change_count integer NOT NULL DEFAULT 0;

-- pilote_id existe déjà (20260815c_annonces_reservations_link.sql) : réutilisé pour
-- les vols standard assignés, plus seulement les réservations issues d'une annonce.

COMMENT ON COLUMN reservations.pilote_assigned_at IS 'Date d''attribution du vol au pilote (Bloc B).';
COMMENT ON COLUMN reservations.part_pilote_pct IS 'Part de coûts choisie par le pilote, en % (partage de frais NCO.GEN.104).';
COMMENT ON COLUMN reservations.slot_change_count IS 'Nombre de fois qu''un pilote a proposé un nouveau créneau sur ce vol (garde-fou anti-abus).';
