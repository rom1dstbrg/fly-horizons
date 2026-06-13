-- Table galerie
CREATE TABLE IF NOT EXISTS gallery_images (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  storage_path  text        NOT NULL,
  alt           text        NOT NULL DEFAULT 'Photo vol Fly Horizons',
  display_order integer     NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read gallery_images" ON gallery_images FOR SELECT USING (true);

-- Bucket storage public
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read gallery storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery');

CREATE POLICY "Service role manage gallery storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'gallery');
