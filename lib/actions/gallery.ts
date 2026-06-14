"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import sharp from "sharp";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Non autorisé");
}

export async function uploadGalleryImage(formData: FormData) {
  await checkAdmin();
  const file = formData.get("file") as File;
  const alt  = (formData.get("alt") as string) || "Photo vol Fly Horizons";

  if (!file || file.size === 0) throw new Error("Fichier manquant");

  const db = createAdminClient();
  const filename = `${crypto.randomUUID()}.webp`;

  const input = Buffer.from(await file.arrayBuffer());
  const optimized = await sharp(input)
    .rotate()
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  // Dimensions réelles après traitement Sharp
  const { width: imgWidth, height: imgHeight } = await sharp(optimized).metadata();

  const { error: uploadError } = await db.storage
    .from("gallery")
    .upload(filename, optimized, { contentType: "image/webp", upsert: false });

  if (uploadError) throw uploadError;

  // Décaler toutes les images existantes pour que la nouvelle apparaisse en premier
  const { data: existing } = await db.from("gallery_images").select("id, display_order");
  if (existing && existing.length > 0) {
    await Promise.all(
      existing.map(img =>
        db.from("gallery_images").update({ display_order: img.display_order + 1 }).eq("id", img.id)
      )
    );
  }

  let { error: insertError } = await db.from("gallery_images").insert({
    storage_path: filename,
    alt,
    display_order: 0,
    width:  imgWidth  ?? null,
    height: imgHeight ?? null,
  });

  // Fallback si les colonnes width/height n'existent pas encore en DB
  if (insertError?.message?.includes("width") || insertError?.message?.includes("height")) {
    ({ error: insertError } = await db.from("gallery_images").insert({
      storage_path: filename,
      alt,
      display_order: 0,
    }));
  }

  if (insertError) throw new Error(`Erreur DB insert: ${insertError.message}`);

  revalidatePath("/galerie");
  revalidatePath("/");
}

export async function deleteGalleryImage(id: string, storagePath: string) {
  await checkAdmin();
  const db = createAdminClient();
  await db.storage.from("gallery").remove([storagePath]);
  await db.from("gallery_images").delete().eq("id", id);
  revalidatePath("/galerie");
  revalidatePath("/");
}

export async function deleteGalleryImages(items: { id: string; storage_path: string }[]) {
  await checkAdmin();
  if (items.length === 0) return;
  const db = createAdminClient();
  await db.storage.from("gallery").remove(items.map(i => i.storage_path));
  await db.from("gallery_images").delete().in("id", items.map(i => i.id));
  revalidatePath("/galerie");
  revalidatePath("/");
  revalidatePath("/admin/galerie");
}

export async function updateGalleryAlt(id: string, alt: string) {
  await checkAdmin();
  const db = createAdminClient();
  await db.from("gallery_images").update({ alt }).eq("id", id);
  revalidatePath("/galerie");
}

export async function reorderGalleryImages(orderedIds: string[]) {
  await checkAdmin();
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
