-- Vérifie si un email est associé à un compte auth.users existant
-- Utilisé par /api/auth/check-email pour l'auth inline dans les formulaires
CREATE OR REPLACE FUNCTION public.check_email_exists(email_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = lower(trim(email_input))
      AND deleted_at IS NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO service_role;
