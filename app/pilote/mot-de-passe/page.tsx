import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./SetPasswordForm";

// Arrivée depuis l'invitation pilote (premier mot de passe, obligatoire : le
// middleware ferme le reste de l'espace) ou depuis « Mon profil » (changement).
export default async function PiloteSetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const first = !!user?.invited_at && !user.user_metadata?.password_set;
  return <SetPasswordForm first={first} />;
}
