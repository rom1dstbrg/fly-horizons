import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ChatWidget } from "@/components/chat/ChatWidget";
import GalleryClient from "./GalleryClient";

export const metadata: Metadata = {
  title: "Galerie — Fly Horizons",
  description: "Découvrez nos vols en avion léger au-dessus de la Wallonie à travers notre galerie photos.",
};

export const revalidate = 60;

export default async function GaleriePage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("gallery_images")
    .select("storage_path, alt")
    .order("display_order", { ascending: true });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const images = (rows ?? []).map(row => ({
    src: `${supabaseUrl}/storage/v1/object/public/gallery/${row.storage_path}`,
    alt: row.alt,
  }));

  return (
    <main className="min-h-screen bg-[#f5f5f7]">
      <section className="pt-[98px] pb-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

          <div className="mb-10 pt-2 sm:pt-12">
            <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-4">Galerie</p>
            <h1 className="text-4xl sm:text-5xl font-black text-foreground leading-none tracking-tight mb-4">
              Vols en images
            </h1>
            <p className="text-foreground/60 text-sm max-w-lg leading-relaxed">
              Quelques aperçus de nos vols en avion léger au-dessus de la Wallonie.
              Cliquez sur une photo pour l&apos;agrandir.
            </p>
          </div>

          {images.length > 0 ? (
            <GalleryClient images={images} />
          ) : (
            <p className="text-muted-foreground text-sm text-center py-20">Photos bientôt disponibles.</p>
          )}

        </div>
      </section>

      <ChatWidget mobileVisible />
    </main>
  );
}
