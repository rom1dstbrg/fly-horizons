-- Ajoute 'reserved' aux statuts valides des vouchers
-- Ce statut est utilisé pour le claim atomique pendant le checkout Stripe
-- (évite qu'un même voucher soit utilisé par deux sessions simultanées)

ALTER TABLE voucher_codes
  DROP CONSTRAINT voucher_codes_status_check;

ALTER TABLE voucher_codes
  ADD CONSTRAINT voucher_codes_status_check CHECK (
    status = ANY (ARRAY['unused'::text, 'used'::text, 'expired'::text, 'reserved'::text])
  );
