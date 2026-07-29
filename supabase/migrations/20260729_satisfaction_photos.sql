-- Photos client dans l'enquête de satisfaction
ALTER TABLE satisfaction_surveys
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}';

-- Bucket storage public pour les photos partagées par les clients
INSERT INTO storage.buckets (id, name, public)
VALUES ('satisfaction-photos', 'satisfaction-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read satisfaction photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'satisfaction-photos');

CREATE POLICY "Service role manage satisfaction photos"
  ON storage.objects FOR ALL
  USING (bucket_id = 'satisfaction-photos');
