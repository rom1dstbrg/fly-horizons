import { createAdminClient } from "@/lib/supabase/admin";
import { ShippingSettingsForm } from "@/components/admin/ShippingSettingsForm";
import { PrixVolForm } from "@/components/admin/PrixVolForm";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata = { title: "Parametres — Admin" };

export default async function AdminSettingsPage() {
  const adminSupabase = createAdminClient();

  const [
    { data: rates },
    { data: shopSettings },
    { data: crmSettings },
  ] = await Promise.all([
    adminSupabase.from("shipping_rates").select("*").order("country_name"),
    adminSupabase.from("settings").select("*"),
    adminSupabase.from("crm_settings").select("*"),
  ]);

  const threshold = shopSettings?.find((s) => s.key === "free_shipping_threshold")?.value ?? 50;
  const prixHeure = parseFloat(crmSettings?.find((s) => s.key === "prix_heure")?.value ?? "254");
  const acomptePersoHeure = parseFloat(crmSettings?.find((s) => s.key === "acompte_perso_heure")?.value ?? "0");

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title="Paramètres"
        subtitle="Configuration de la boutique et des vols"
      />

      <PrixVolForm prixHeure={prixHeure} acomptePersoHeure={acomptePersoHeure} />

      <ShippingSettingsForm
        rates={rates ?? []}
        freeShippingThreshold={Number(threshold)}
      />
    </div>
  );
}