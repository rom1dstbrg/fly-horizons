import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PackShopGrid from "@/components/shop/PackTabs";

export const metadata = { robots: "noindex" };

export default async function TestVolsPage() {
  const supabase = await createClient();

  const { data: packs } = await supabase
    .from("products")
    .select("*, images:product_images(*)")
    .eq("active", true)
    .eq("product_type", "voucher")
    .order("voucher_duration_minutes", { ascending: true });

  return (
    <main className="min-h-screen bg-white pt-[80px]">
      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

          {/* En-tête */}
          <div className="mb-10">
            <p className="text-xs font-bold text-[#F2B705] uppercase tracking-[3px] mb-3">
              Au départ de Charleroi (EBCI)
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0b2238]">
              Nos vols
            </h2>
          </div>

          <PackShopGrid packs={packs ?? []} />

          <p className="mt-10 text-sm text-muted-foreground">
            Vous avez un itinéraire précis en tête ?{" "}
            <Link href="/vol-sur-mesure" className="text-[#113356] font-semibold hover:underline inline-flex items-center gap-1">
              Créez un vol sur mesure <ArrowRight size={13} />
            </Link>
          </p>

        </div>
      </section>
    </main>
  );
}
