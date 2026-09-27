import { createAdminClient } from "@/lib/supabase/admin";
import { RetoursClient } from "@/components/admin/RetoursClient";
import type { PiloteRetour } from "@/lib/pilote-retours";

export const metadata = { title: "Retours pilotes — Admin" };

export default async function RetoursPage() {
  const { data } = await createAdminClient()
    .from("pilote_retours")
    .select("*, pilotes(nom, email, photo_url)")
    .order("created_at", { ascending: false });
  return <RetoursClient retours={(data ?? []) as PiloteRetour[]} />;
}
