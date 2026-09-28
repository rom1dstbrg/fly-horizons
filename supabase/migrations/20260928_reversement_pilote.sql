-- Reversement au pilote (28/09, décision 18) : un vol standard déjà réglé à
-- Fly Horizons peut être confié à un pilote. Romain lui fait un virement une
-- fois le vol effectué ; on trace ici le montant viré et sa date, saisis dans
-- /admin/transactions. Les deux colonnes restent null tant que rien n'est viré.
alter table reservations
  add column if not exists reversement_pilote    numeric(10,2),
  add column if not exists reversement_pilote_at timestamptz;

notify pgrst, 'reload schema';
