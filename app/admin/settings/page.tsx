import { createAdminClient } from "@/lib/supabase/admin";
import { PrixVolForm } from "@/components/admin/PrixVolForm";
import { OperationalSettingsForm } from "@/components/admin/OperationalSettingsForm";
import { SiteSettingsForm } from "@/components/admin/SiteSettingsForm";
import { TarifAvionForm } from "@/components/admin/TarifAvionForm";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata = { title: "Parametres — Admin" };

export default async function AdminSettingsPage() {
  const db = createAdminClient();

  const [{ data: crmSettings }, { data: tarifAvions }] = await Promise.all([
    db.from("crm_settings").select("*"),
    db.from("avion_tarifs").select("*").order("actif_depuis", { ascending: false }),
  ]);

  function get(key: string, fallback: string) {
    return crmSettings?.find(s => s.key === key)?.value ?? fallback;
  }

  const prixHeure             = parseFloat(get("prix_heure",              "254"));
  const acomptePersoHeure     = parseFloat(get("acompte_perso_heure",     "0"));
  const welcomeCode           =            get("welcome_code",             "WELCOME2026");
  const welcomeDiscountType   =            get("welcome_discount_type",    "percentage") as "percentage" | "fixed";
  const welcomeDiscountValue  = parseFloat(get("welcome_discount_value",   "10"));
  const calendarClosed        =            get("calendar_closed",          "false") === "true";
  const calendarClosedMessage =            get("calendar_closed_message",  "");
  const chatEnabled           =            get("chat_enabled",             "true") === "true";

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title="Paramètres"
        subtitle="Configuration des vols et de la boutique"
      />

      <PrixVolForm prixHeure={prixHeure} acomptePersoHeure={acomptePersoHeure} />

      <hr className="border-border" />

      <TarifAvionForm tarifs={tarifAvions ?? []} />

      <hr className="border-border" />

      <OperationalSettingsForm
        welcomeCode={welcomeCode}
        welcomeDiscountType={welcomeDiscountType}
        welcomeDiscountValue={welcomeDiscountValue}
      />

      <SiteSettingsForm
        calendarClosed={calendarClosed}
        calendarClosedMessage={calendarClosedMessage}
        chatEnabled={chatEnabled}
      />
    </div>
  );
}
