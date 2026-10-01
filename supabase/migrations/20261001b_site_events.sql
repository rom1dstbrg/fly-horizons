-- Événements de parcours sur le site public (01/10) : étapes du formulaire de
-- demande d'un vol (créneau choisi, étape « informations » atteinte), pour la
-- page Admin > Analytiques. Anonyme comme page_views : un identifiant de
-- navigateur aléatoire, aucune donnée personnelle. Conservé 13 mois (cron purge-analytics).
CREATE TABLE IF NOT EXISTS site_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name        TEXT        NOT NULL,
  pathname    TEXT,
  visitor_id  TEXT
);

CREATE INDEX IF NOT EXISTS idx_site_events_created_at ON site_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_events_name       ON site_events(name, created_at DESC);

-- RLS activée sans policy : refus pour anon / authenticated ; le service role
-- (createAdminClient) contourne RLS. Même état final que page_views.
ALTER TABLE site_events ENABLE ROW LEVEL SECURITY;
