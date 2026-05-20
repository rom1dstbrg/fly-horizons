-- Migration : demande de report de date self-service
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS report_requested_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS report_reason TEXT;
