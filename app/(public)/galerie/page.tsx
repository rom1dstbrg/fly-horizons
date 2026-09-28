import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ChatWidget } from "@/components/chat/ChatWidget";
import GalleryClient from "./GalleryClient";

export const metadata: Metadata = {
  title: "Galerie",
  description: "Découvrez nos vols en avion léger au-dessus de la Wallonie à travers notre galerie photos.",
};

export const revalidate = 60;

export default async function GaleriePage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("gallery_images")
    .select("storage_path, alt, width, height")
    .order("display_order", { ascending: true });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const images = (rows ?? []).map(row => ({
    src:    `${supabaseUrl}/storage/v1/object/public/gallery/${row.storage_path}`,
    alt:    row.alt,
    width:  row.width  as number | null,
    height: row.height as number | null,
  }));

  return (
    <main className="min-h-screen bg-white">
      <section className="pt-page pb-24 sm:pb-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

          {/* En-tête aligné sur les pages refaites (nouvelle DA, 28/09) : écart .pt-page, titres 34/52 */}
          <div className="mb-8 lg:mb-10">
            <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3">Galerie</p>
            <h1 className="text-[34px] lg:text-[52px] font-black text-foreground leading-[1.03] tracking-[-0.02em]">
              Vols en images
            </h1>
            <p className="mt-3 max-w-[460px] text-[15px] leading-[1.7] text-foreground/70">
              Ce que vous voyez depuis le sol, nous le survolons.
              Voici ce que ça donne vu d&apos;en haut.
            </p>
          </div>

          {images.length > 0 ? (
            <GalleryClient images={images} />
          ) : (
            <p className="text-muted-foreground text-sm text-center py-20">Photos bientôt disponibles.</p>
          )}

        </div>
      </section>

      <ChatWidget />
    </main>
  );
}
