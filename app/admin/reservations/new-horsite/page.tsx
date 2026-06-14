import { createAdminClient } from "@/lib/supabase/admin";
import { CreateHorSiteForm } from "@/components/admin/CreateHorSiteForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Vol hors-site — Admin" };

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
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/vols"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft size={15} /> Retour aux réservations
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Vol hors-site</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Enregistrez un vol effectué en dehors du site (Messenger, téléphone, sur place…) pour garder votre historique et votre CA à jour.
        </p>
      </div>

      <CreateHorSiteForm clients={clients ?? []} prixHeure={prixHeure} />
    </div>
  );
}
