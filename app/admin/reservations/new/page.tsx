import { createAdminClient } from "@/lib/supabase/admin";
import { CreateReservationForm } from "@/components/admin/CreateReservationForm";
import { PageHeader } from "@/components/admin/PageHeader";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Nouvelle réservation — Admin" };

export default async function NewReservationPage() {
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
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ChevronLeft size={15} /> Retour aux réservations
        </Link>
        <PageHeader
          domain="vols"
          title="Nouvelle réservation"
          subtitle="Créez une réservation pour un client qui vous a contacté par téléphone ou email."
        />
      </div>

      <CreateReservationForm clients={clients ?? []} prixHeure={prixHeure} />
    </div>
  );
}
