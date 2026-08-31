import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/ProductForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Nouveau produit — Admin" };

export default async function NewProductPage() {
  const adminSupabase = createAdminClient();
  const [{ data: setting }, { data: stopovers }] = await Promise.all([
    adminSupabase.from("crm_settings").select("value").eq("key", "prix_heure").maybeSingle(),
    adminSupabase.from("stopovers").select("id, icao, nom, taxe, lat, lng").eq("actif", true).order("nom"),
  ]);
  const prixHeure = setting?.value ? parseFloat(setting.value) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/boutique?tab=produits"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
        >
          <ChevronLeft size={16} />
          Retour aux produits
        </Link>
        <PageHeader domain="boutique" title="Nouveau produit" />
      </div>
      <ProductForm prixHeure={prixHeure} stopovers={stopovers ?? []} />
    </div>
  );
}