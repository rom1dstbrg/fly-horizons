import { createAdminClient } from "@/lib/supabase/admin";

// Photo de la fiche pilote rattachée au compte admin (Romain, admin + pilote
// sur le même compte depuis le 14/09). Sert d'avatar aux messages signés
// « admin » dans les fils publics. null si aucune fiche ou aucune photo.
export async function getAdminPilotePhoto(): Promise<string | null> {
  const db = createAdminClient();
  const { data: admins } = await db.from("profiles").select("id").eq("role", "admin");
  const ids = (admins ?? []).map((a) => a.id);
  if (ids.length === 0) return null;
  const { data } = await db
    .from("pilotes")
    .select("photo_url")
    .in("user_id", ids)
    .not("photo_url", "is", null)
    .limit(1)
    .maybeSingle();
  return data?.photo_url ?? null;
}
