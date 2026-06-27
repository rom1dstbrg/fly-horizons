ALTER TABLE page_views ADD COLUMN IF NOT EXISTS visitor_id TEXT;
CREATE INDEX IF NOT EXISTS idx_page_views_visitor_id ON page_views(visitor_id);
