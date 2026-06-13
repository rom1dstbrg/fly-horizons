import { createAdminClient } from "@/lib/supabase/admin";
import { getItineraires } from "@/lib/actions/itineraires";
import { AdminVolMesureFlow } from "@/components/admin/AdminVolMesureFlow";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Nouveau vol sur mesure — Admin" };

export default async function NewVolMesurePage() {
  const supabase = createAdminClient();

  const [{ data: clients }, { data: settings }, { data: stopovers }, itineraires] = await Promise.all([
    supabase.from("clients").select("id, prenom, nom, email, telephone").order("nom"),
    supabase.from("crm_settings").select("key, value").in("key", ["prix_heure", "acompte_perso_heure"]),
    supabase.from("stopovers").select("id, icao, nom, taxe, lat, lng").eq("actif", true).order("nom"),
    getItineraires(),
  ]);

  const prixHeure = parseFloat(settings?.find(s => s.key === "prix_heure")?.value ?? "254");
  const acompteH  = parseFloat(settings?.find(s => s.key === "acompte_perso_heure")?.value ?? String(prixHeure));

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/admin/vols?tab=sur-mesure"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={15} /> Retour
        </Link>
        <h1 className="text-xl font-black text-foreground">Nouveau vol sur mesure</h1>
      </div>

      <AdminVolMesureFlow
        clients={clients ?? []}
        stopovers={stopovers ?? []}
        prixHeure={prixHeure}
        acompteH={acompteH}
        itineraires={itineraires}
      />
    </div>
  );
}
