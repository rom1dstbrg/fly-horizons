import { createAdminClient } from "@/lib/supabase/admin";
import { getAppSettings } from "@/lib/app-settings-server";
import { SettingsClient, type Tarif } from "@/components/admin/SettingsClient";

export const metadata = { title: "Paramètres — Admin" };

export default async function AdminSettingsPage() {
  const [settings, { data: tarifs }] = await Promise.all([
    getAppSettings(),
    createAdminClient().from("avion_tarifs").select("id, prix_heure, actif_depuis, note").order("actif_depuis", { ascending: false }),
  ]);

  // Tarif en vigueur aujourd'hui : le plus récent déjà commencé.
  const today = new Date().toISOString().slice(0, 10);
  const current = (tarifs ?? []).find((t) => t.actif_depuis <= today) ?? null;

  return <SettingsClient settings={settings} tarifs={(tarifs ?? []) as Tarif[]} currentTarifId={current?.id ?? null} />;
}
