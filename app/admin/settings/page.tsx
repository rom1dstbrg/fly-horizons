import { createAdminClient } from "@/lib/supabase/admin";
import { PrixVolForm } from "@/components/admin/PrixVolForm";
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

  const partPiloteType        =            get("part_pilote_type",        "pourcentage") as "pourcentage" | "montant";
  const partPiloteValeur      = parseFloat(get("part_pilote_valeur",      "25"));
  const acomptePersoHeure     = parseFloat(get("acompte_perso_heure",     "0"));
  const today = new Date().toISOString().slice(0, 10);
  const tarifsActifs   = (tarifAvions ?? []).filter(t => t.actif_depuis <= today);
  const tarifsSorted   = [...tarifsActifs].sort((a, b) => new Date(b.actif_depuis).getTime() - new Date(a.actif_depuis).getTime());
  const coutAvionHeure = tarifsSorted[0]?.prix_heure ?? 0;
  const calendarClosed        =            get("calendar_closed",          "false") === "true";
  const calendarClosedMessage =            get("calendar_closed_message",  "");
  const chatEnabled           =            get("chat_enabled",             "true") === "true";
  const maintenanceMode       =            get("maintenance_mode",         "true") === "true";
  const maintenanceMessage    =            get("maintenance_message",      "");
  const maintenanceReopenDate =            get("maintenance_reopen_date",  "");

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title="Paramètres"
        subtitle="Configuration des vols et de la boutique"
      />

      <PrixVolForm
        coutAvionHeure={coutAvionHeure}
        partType={partPiloteType}
        partValeur={partPiloteValeur}
        acomptePersoHeure={acomptePersoHeure}
      />

      <hr className="border-border" />

      <TarifAvionForm tarifs={tarifAvions ?? []} />

      <hr className="border-border" />

      <SiteSettingsForm
        calendarClosed={calendarClosed}
        calendarClosedMessage={calendarClosedMessage}
        chatEnabled={chatEnabled}
        maintenanceMode={maintenanceMode}
        maintenanceMessage={maintenanceMessage}
        maintenanceReopenDate={maintenanceReopenDate}
      />
    </div>
  );
}
