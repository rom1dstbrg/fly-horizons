import { createAdminClient } from "@/lib/supabase/admin";
import { ShippingSettingsForm } from "@/components/admin/ShippingSettingsForm";

export const metadata = { title: "Parametres — Admin" };

export default async function AdminSettingsPage() {
  const adminSupabase = createAdminClient();

  const { data: rates } = await adminSupabase
    .from("shipping_rates")
    .select("*")
    .order("country_name");

  const { data: settings } = await adminSupabase
    .from("settings")
    .select("*");

  const threshold = settings?.find((s) => s.key === "free_shipping_threshold")?.value ?? 50;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Parametres</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configuration de la boutique
        </p>
      </div>

      <ShippingSettingsForm
        rates={rates ?? []}
        freeShippingThreshold={Number(threshold)}
      />
    </div>
  );
}