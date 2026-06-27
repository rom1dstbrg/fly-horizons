-- Add payment_token to reservations for deferred Stripe checkout
alter table reservations add column if not exists payment_token uuid unique;
create index if not exists idx_reservations_payment_token on reservations(payment_token);
