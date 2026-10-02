-- route_proposals.acompte était un entier : depuis le partage des frais « à parts égales »
-- (ex. 170,66 €), l'insertion d'une proposition de route échouait (22P02) et la route
-- n'était jamais envoyée au client, sans message d'erreur côté confirmation de créneau.
ALTER TABLE route_proposals
  ALTER COLUMN acompte TYPE numeric(10,2) USING acompte::numeric(10,2);
