-- La policy "service_role page_views" (USING (true), sans restriction de rôle)
-- exposait page_views en lecture/écriture à n'importe qui via la clé anon publique.
-- On la supprime : RLS reste activée, sans policy = accès refusé pour anon/authenticated.
-- Le service role (utilisé par createAdminClient()) contourne RLS et n'est pas affecté.
DROP POLICY IF EXISTS "service_role page_views" ON page_views;
