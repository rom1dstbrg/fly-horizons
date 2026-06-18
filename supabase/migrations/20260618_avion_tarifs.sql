-- Historique des tarifs avion (coût école, distinct du prix client)
CREATE TABLE IF NOT EXISTS avion_tarifs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  prix_heure   NUMERIC(8,2) NOT NULL,
  actif_depuis DATE        NOT NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_avion_tarifs_actif_depuis
  ON avion_tarifs(actif_depuis DESC);

ALTER TABLE avion_tarifs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role avion_tarifs" ON avion_tarifs FOR ALL USING (true);

-- Tarif initial : 256 €/h (DA40, tarif école actuel)
INSERT INTO avion_tarifs (prix_heure, actif_depuis, note)
VALUES (256, '2025-01-01', 'DA40 — tarif initial');
