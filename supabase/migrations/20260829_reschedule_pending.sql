ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reschedule_pending boolean NOT NULL DEFAULT false;
