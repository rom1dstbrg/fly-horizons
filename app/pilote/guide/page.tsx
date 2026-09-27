import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/pilote/studio";
import { GuideHome, type GuideProgress } from "@/components/pilote/guide/GuideHome";
import { piloteLegalStatus, PILOTE_LEGAL_SELECT } from "@/lib/pilote/legal";

export const metadata = { title: "Guide pilote — Espace pilote" };

// Accueil du guide (maquette validée le 27/09) : les premiers pas du pilote, puis
// les fiches rangées en onglets. La progression se lit sur son compte réel.
export default async function PiloteGuidePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { data: pilote } = await admin
    .from("pilotes")
    .select(`id, iban, ${PILOTE_LEGAL_SELECT}`)
    .eq("user_id", user!.id)
    .maybeSingle();

  let progress: GuideProgress = { profil: false, dispos: false, annonce: false, app: false };
  if (pilote) {
    const [plages, jours, annonces, subs] = await Promise.all([
      admin.from("pilote_disponibilites").select("id", { count: "exact", head: true }).eq("pilote_id", pilote.id).eq("actif", true),
      admin.from("pilote_disponibilites_jours").select("id", { count: "exact", head: true }).eq("pilote_id", pilote.id),
      admin.from("annonces_pilote").select("id", { count: "exact", head: true }).eq("pilote_id", pilote.id),
      admin.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
    ]);
    progress = {
      // L'IBAN compte : sans lui, pas d'annonce publiable (le passager vous paie dessus).
      profil: piloteLegalStatus(pilote).ok && !!pilote.iban,
      dispos: (plages.count ?? 0) + (jours.count ?? 0) > 0,
      annonce: (annonces.count ?? 0) > 0,
      app: (subs.count ?? 0) > 0,
    };
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Guide pilote" />
      <GuideHome progress={progress} />
    </div>
  );
}
