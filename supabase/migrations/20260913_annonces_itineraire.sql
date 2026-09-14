-- Annonces pilote : itinéraire indicatif (tracé sur carte), affiché au client
-- mais sans impact sur le calcul du prix/durée (saisis à la main dans les deux
-- cas). Même colonne/format que products.route_waypoints (20260831).
--
-- A executer a la main dans Supabase.

alter table annonces_pilote add column if not exists route_waypoints jsonb;

comment on column annonces_pilote.route_waypoints is
  'Tracé indicatif [{lat,lng,nom?}] dessiné par le pilote, affiché sur la page publique. NULL/vide = vol à durée fixe, sans itinéraire.';
