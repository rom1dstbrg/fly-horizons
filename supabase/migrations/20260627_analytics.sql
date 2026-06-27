CREATE TABLE IF NOT EXISTS page_views (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pathname   TEXT        NOT NULL,
  referrer   TEXT,
  device     TEXT        CHECK (device IN ('mobile', 'tablet', 'desktop'))
);

CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_pathname   ON page_views(pathname);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role page_views" ON page_views FOR ALL USING (true);
