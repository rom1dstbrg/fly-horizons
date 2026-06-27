ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS applies_to text
  CHECK (applies_to IN ('voucher', 'physical'))
  DEFAULT NULL;
