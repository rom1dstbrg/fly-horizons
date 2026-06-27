-- Limites d'utilisation sur les coupons
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS max_uses INTEGER,           -- NULL = illimité
  ADD COLUMN IF NOT EXISTS max_uses_per_user INTEGER,  -- NULL = illimité par utilisateur
  ADD COLUMN IF NOT EXISTS usage_count INTEGER NOT NULL DEFAULT 0;
