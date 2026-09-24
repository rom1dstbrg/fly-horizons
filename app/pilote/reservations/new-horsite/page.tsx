import { createAdminClient } from "@/lib/supabase/admin";
import { CreateHorSiteForm } from "@/components/admin/CreateHorSiteForm";
import { PageHeader } from "@/components/pilote/studio";

export const metadata = { title: "Vol hors-site — Espace pilote" };

export default async function NewHorSitePage() {
  const supabase = createAdminClient();

  const [{ data: clients }, { data: settings }] = await Promise.all([
    supabase.from("clients").select("id, prenom, nom, email, telephone").order("nom"),
    supabase.from("crm_settings").select("key, value").in("key", ["prix_heure"]),
  ]);

  const prixHeure = parseFloat(
    settings?.find(s => s.key === "prix_heure")?.value ?? "254"
  );

  return (
    <div className="mx-auto w-full max-w-lg space-y-5">
      <PageHeader title="Vol hors site" back={{ href: "/pilote/vols", label: "Mes vols" }} />
      <CreateHorSiteForm clients={clients ?? []} prixHeure={prixHeure} />
    </div>
  );
}
