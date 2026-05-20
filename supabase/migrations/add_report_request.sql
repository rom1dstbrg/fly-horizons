-- Migration : demande de report de date self-service
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS report_requested_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS report_reason TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS report_suggested_date DATE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS report_suggested_heure TEXT;
