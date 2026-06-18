CREATE TABLE IF NOT EXISTS depenses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  montant     NUMERIC(8,2) NOT NULL,
  description TEXT        NOT NULL,
  date        DATE        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_depenses_date ON depenses(date DESC);

ALTER TABLE depenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role depenses" ON depenses FOR ALL USING (true);
