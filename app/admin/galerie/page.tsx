import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/PageHeader";
import { GalleryManager } from "@/components/admin/GalleryManager";

export const metadata = { title: "Galerie — Admin" };

export default async function AdminGaleriePage() {
  const db = createAdminClient();

  const { data: rows } = await db
    .from("gallery_images")
    .select("id, storage_path, alt, display_order")
    .order("display_order", { ascending: true });

  const images = (rows ?? []).map(row => ({
    ...row,
    publicUrl: db.storage.from("gallery").getPublicUrl(row.storage_path).data.publicUrl,
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Galerie"
        subtitle={`${images.length} photo${images.length > 1 ? "s" : ""}`}
      />
      <GalleryManager images={images} />
    </div>
  );
}
