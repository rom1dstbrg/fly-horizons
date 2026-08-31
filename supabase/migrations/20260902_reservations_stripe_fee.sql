ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS stripe_fee numeric;
