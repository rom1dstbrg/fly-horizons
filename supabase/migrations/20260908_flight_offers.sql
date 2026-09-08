-- Bloc C · mise en jeu automatique d'un vol à tous les pilotes (« premier arrivé »).
-- À coller à la main dans Supabase.

CREATE TABLE IF NOT EXISTS flight_offers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  created_by     uuid,
  statut         text NOT NULL DEFAULT 'ouverte'
                   CHECK (statut IN ('ouverte','pourvue','annulee','expiree')),
  claim_token    text NOT NULL UNIQUE,
  sent_to        integer NOT NULL DEFAULT 0,   -- nb de pilotes contactés (info admin)
  expires_at     timestamptz NOT NULL,
  claimed_by     uuid REFERENCES pilotes(id),
  claimed_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Une seule offre « ouverte » par réservation à la fois ; on peut re-proposer
-- après expiration/annulation.
CREATE UNIQUE INDEX IF NOT EXISTS flight_offers_one_open_per_resa
  ON flight_offers (reservation_id) WHERE statut = 'ouverte';

ALTER TABLE flight_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service role only" ON flight_offers;
CREATE POLICY "service role only" ON flight_offers FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS flight_offer_refusals (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id   uuid NOT NULL REFERENCES flight_offers(id) ON DELETE CASCADE,
  pilote_id  uuid NOT NULL REFERENCES pilotes(id) ON DELETE CASCADE,
  refused_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offer_id, pilote_id)
);

ALTER TABLE flight_offer_refusals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service role only" ON flight_offer_refusals;
CREATE POLICY "service role only" ON flight_offer_refusals FOR ALL USING (true) WITH CHECK (true);

-- La protection réelle est 100% applicative (server actions), comme les autres
-- tables pilote — les policies USING(true) laissent passer le service role.
