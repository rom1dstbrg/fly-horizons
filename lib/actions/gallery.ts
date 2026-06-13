"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";

export async function uploadGalleryImage(formData: FormData) {
  const file = formData.get("file") as File;
  const alt  = (formData.get("alt") as string) || "Photo vol Fly Horizons";

  if (!file || file.size === 0) throw new Error("Fichier manquant");

  const db = createAdminClient();
  const filename = `${crypto.randomUUID()}.webp`;

  const input = Buffer.from(await file.arrayBuffer());
  const optimized = await sharp(input)
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const { error: uploadError } = await db.storage
    .from("gallery")
    .upload(filename, optimized, { contentType: "image/webp", upsert: false });

  if (uploadError) throw uploadError;

  const { data: maxRow } = await db
    .from("gallery_images")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .single();

  await db.from("gallery_images").insert({
    storage_path:  filename,
    alt,
    display_order: (maxRow?.display_order ?? 0) + 1,
  });

  revalidatePath("/galerie");
  revalidatePath("/");
}

export async function deleteGalleryImage(id: string, storagePath: string) {
  const db = createAdminClient();
  await db.storage.from("gallery").remove([storagePath]);
  await db.from("gallery_images").delete().eq("id", id);
  revalidatePath("/galerie");
  revalidatePath("/");
}

export async function updateGalleryAlt(id: string, alt: string) {
  const db = createAdminClient();
  await db.from("gallery_images").update({ alt }).eq("id", id);
  revalidatePath("/galerie");
}

export async function reorderGalleryImages(orderedIds: string[]) {
  const db = createAdminClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      db.from("gallery_images").update({ display_order: index }).eq("id", id)
    )
  );
  revalidatePath("/galerie");
  revalidatePath("/");
  revalidatePath("/admin/galerie");
}
