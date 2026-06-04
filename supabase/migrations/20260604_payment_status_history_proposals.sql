-- ── 1. Statut de paiement manuel sur les réservations ─────────────────────────
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS payment_status TEXT
    CHECK (payment_status IN ('paid', 'unpaid', 'partial', 'refunded'))
    DEFAULT 'unpaid';

-- Rétro-remplissage : toute réservation avec paye > 0 ou statut avancé → paid
UPDATE reservations
  SET payment_status = 'paid'
  WHERE (paye IS NOT NULL AND paye > 0)
     OR statut IN ('en_attente', 'acompte_recu', 'date_confirmee', 'heure_confirmee',
                   'facture_envoyee', 'vol_effectue', 'solde')
  AND payment_status = 'unpaid';

-- ── 2. Route finale du pilote (séparée des waypoints client) ───────────────────
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS final_waypoints JSONB;

-- ── 3. Historique complet des actions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservation_history (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID        NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  action         TEXT        NOT NULL,
  field          TEXT,
  old_value      TEXT,
  new_value      TEXT,
  author         TEXT        NOT NULL DEFAULT 'admin',
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservation_history_resa_id
  ON reservation_history(reservation_id);

CREATE INDEX IF NOT EXISTS idx_reservation_history_created_at
  ON reservation_history(created_at DESC);

-- ── 4. Propositions de route multi-rounds ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS route_proposals (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID        NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  waypoints      JSONB       NOT NULL,
  admin_comment  TEXT,
  token          UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status         TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'accepted', 'modification_requested')),
  client_comment TEXT,
  responded_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_proposals_resa_id
  ON route_proposals(reservation_id);

CREATE INDEX IF NOT EXISTS idx_route_proposals_token
  ON route_proposals(token);
