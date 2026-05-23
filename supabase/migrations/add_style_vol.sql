-- Ajoute la colonne style_vol à la table reservations
-- Valeurs possibles : 'rapide' (itinéraire direct) ou 'vues' (parcours pittoresque)
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS style_vol TEXT CHECK (style_vol IN ('rapide', 'vues'));
