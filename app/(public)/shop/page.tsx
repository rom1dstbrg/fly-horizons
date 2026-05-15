import { createClient } from "@/lib/supabase/server";
import { ShopClient } from "@/components/shop/ShopClient";

export const metadata = {
  title: "Boutique",
  description: "Decouvrez tous nos accessoires aviation premium.",
};

export default async function ShopPage() {
  const supabase = await createClient();

  const { data: physicalProducts } = await supabase
    .from("products")
    .select("*, images:product_images(*)")
    .eq("active", true)
    .eq("product_type", "physical")
    .order("created_at", { ascending: false });

  const allTags = Array.from(
    new Set((physicalProducts ?? []).flatMap((p) => p.tags ?? []))
  ).sort();

  return (
    <main className="min-h-screen bg-gradient-navy pb-16">
      <div className="container-shop pt-24 pb-0">

        <div className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            Collection
          </p>
          <h1 className="text-4xl font-bold text-foreground">
            Accessoires
          </h1>
          <p className="text-muted-foreground mt-2">
            {physicalProducts?.length ?? 0} produit{(physicalProducts?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>

        {(physicalProducts?.length ?? 0) > 0 ? (
          <ShopClient products={physicalProducts ?? []} tags={allTags} />
        ) : (
          <p className="text-muted-foreground py-12 text-center">
            Aucun accessoire disponible pour le moment.
          </p>
        )}

      </div>
    </main>
  );
}
