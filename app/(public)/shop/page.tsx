import { createClient } from "@/lib/supabase/server";
import { ShopClient } from "@/components/shop/ShopClient";

export const metadata = {
  title: "Boutique",
  description: "Decouvrez tous nos accessoires aviation premium.",
};

export default async function ShopPage() {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select("*, images:product_images(*)")
    .eq("active", true)
    .order("created_at", { ascending: false });

  // Extraire tous les tags uniques
  const allTags = Array.from(
    new Set((products ?? []).flatMap((p) => p.tags ?? []))
  ).sort();

  return (
    <main className="min-h-screen bg-gradient-navy pt-24 pb-16">
      <div className="container-shop">

        {/* Header page */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            Collection
          </p>
          <h1 className="text-4xl font-bold text-foreground">
            Boutique
          </h1>
          <p className="text-muted-foreground mt-2">
            {products?.length ?? 0} produit{(products?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>

        <ShopClient products={products ?? []} tags={allTags} />

      </div>
    </main>
  );
}