-- Méthode de paiement pour les vouchers manuels
-- 'stripe'  = achat boutique (lié à orders)
-- 'cash'    = payé en espèces (compté dans les caisses FH)
-- 'offered' = offert (aucun revenu)
ALTER TABLE voucher_codes
  ADD COLUMN IF NOT EXISTS payment_method TEXT
    CHECK (payment_method IN ('stripe', 'cash', 'offered'))
    DEFAULT 'offered';

-- Rétro-remplissage : vouchers liés à une commande boutique → stripe
UPDATE voucher_codes
  SET payment_method = 'stripe'
  WHERE order_id IS NOT NULL;
