import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AddressBook } from "@/components/account/AddressBook";

export const metadata: Metadata = { title: "Mes adresses — Fly Horizons" };

export default async function AdressesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: addresses } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Adresses de livraison</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {(addresses ?? []).length === 0
            ? "Aucune adresse enregistrée"
            : `${addresses!.length} adresse${addresses!.length !== 1 ? "s" : ""}`}
        </p>
      </div>
      <div className="card-premium p-6">
        <AddressBook addresses={addresses ?? []} />
      </div>
    </div>
  );
}
