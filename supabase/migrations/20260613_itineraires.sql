CREATE TABLE IF NOT EXISTS itineraires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  waypoints jsonb NOT NULL DEFAULT '[]',
  stopovers jsonb NOT NULL DEFAULT '[]',
  duree_estimee int,
  notes text,
  created_at timestamptz DEFAULT now()
);
