-- Préférences de notification du pilote (01/10) : quelles notifications push il veut
-- recevoir. Un objet { clé: true | false } ; une clé absente = activée (comportement
-- d'avant). Écrit depuis Espace pilote > Profil > Notifications. Tant que cette migration
-- n'est pas exécutée, toutes les notifications restent envoyées.
ALTER TABLE pilotes
  ADD COLUMN IF NOT EXISTS notif_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;
