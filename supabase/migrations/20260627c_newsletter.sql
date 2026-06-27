CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT        NOT NULL,
  prenom            TEXT,
  unsubscribe_token TEXT        NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  subscribed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at   TIMESTAMPTZ,
  active            BOOLEAN     NOT NULL DEFAULT true,
  CONSTRAINT newsletter_subscribers_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email  ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_token  ON newsletter_subscribers(unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscribers(active) WHERE active = true;

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role newsletter" ON newsletter_subscribers FOR ALL USING (true);
