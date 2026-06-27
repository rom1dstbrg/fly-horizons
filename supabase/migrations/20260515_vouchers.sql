-- 1. Colonnes voucher sur products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'physical',
  ADD COLUMN IF NOT EXISTS voucher_duration_minutes INTEGER;

-- 2. Table voucher_codes
CREATE TABLE IF NOT EXISTS voucher_codes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 TEXT UNIQUE NOT NULL,
  order_id             UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_item_id        UUID REFERENCES order_items(id) ON DELETE SET NULL,
  product_id           UUID REFERENCES products(id) ON DELETE SET NULL,
  duration_minutes     INTEGER NOT NULL,
  product_title        TEXT NOT NULL,
  recipient_email      TEXT,
  recipient_name       TEXT,
  status               TEXT NOT NULL DEFAULT 'unused',  -- 'unused' | 'used' | 'expired'
  used_at              TIMESTAMPTZ,
  expires_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_voucher_codes_code     ON voucher_codes(code);
CREATE INDEX IF NOT EXISTS idx_voucher_codes_status   ON voucher_codes(status);
CREATE INDEX IF NOT EXISTS idx_voucher_codes_order_id ON voucher_codes(order_id);

-- 4. RLS (admin uniquement — l'API /api/vouchers/validate utilise service_role)
ALTER TABLE voucher_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_voucher_codes" ON voucher_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
