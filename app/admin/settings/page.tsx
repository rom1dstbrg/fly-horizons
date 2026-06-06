import { createAdminClient } from "@/lib/supabase/admin";
import { PrixVolForm } from "@/components/admin/PrixVolForm";
import { OperationalSettingsForm } from "@/components/admin/OperationalSettingsForm";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata = { title: "Parametres — Admin" };

export default async function AdminSettingsPage() {
  const db = createAdminClient();

  const { data: crmSettings } = await db.from("crm_settings").select("*");

  function get(key: string, fallback: string) {
    return crmSettings?.find(s => s.key === key)?.value ?? fallback;
  }

  const prixHeure             = parseFloat(get("prix_heure",              "254"));
  const acomptePersoHeure     = parseFloat(get("acompte_perso_heure",     "0"));
  const welcomeCode           =            get("welcome_code",             "WELCOME2026");
  const welcomeDiscountType   =            get("welcome_discount_type",    "percentage") as "percentage" | "fixed";
  const welcomeDiscountValue  = parseFloat(get("welcome_discount_value",   "10"));

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title="Paramètres"
        subtitle="Configuration des vols et de la boutique"
      />

      <PrixVolForm prixHeure={prixHeure} acomptePersoHeure={acomptePersoHeure} />

      <OperationalSettingsForm
        welcomeCode={welcomeCode}
        welcomeDiscountType={welcomeDiscountType}
        welcomeDiscountValue={welcomeDiscountValue}
      />
    </div>
  );
}
