-- Ajout du champ "points à améliorer" dans les enquêtes de satisfaction
ALTER TABLE satisfaction_surveys
  ADD COLUMN IF NOT EXISTS points_amelioration TEXT;
