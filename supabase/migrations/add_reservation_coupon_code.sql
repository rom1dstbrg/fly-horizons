-- Store applied coupon code on reservations so increment_coupon_usage
-- can be deferred to the Stripe webhook (checkout.session.completed).
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS coupon_code text;
