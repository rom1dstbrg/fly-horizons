"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorise");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Non autorise");
  return user;
}

export async function toggleProductActive(productId: string, active: boolean) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("products")
      .update({ active })
      .eq("id", productId);

    if (error) return { error: error.message };
    revalidatePath("/admin/boutique");
    return { success: true };
  } catch {
    return { error: "Non autorise" };
  }
}

export async function createProduct(formData: FormData) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();

    const title = formData.get("title") as string;
    const short_description = formData.get("short_description") as string;
    const price = parseFloat(formData.get("price") as string);
    const voucherDurationRaw = formData.get("voucher_duration_minutes");
    const voucher_duration_minutes = voucherDurationRaw
      ? parseInt(voucherDurationRaw as string, 10)
      : null;

    if (!title || isNaN(price)) {
      return { error: "Titre et prix requis." };
    }

    const { data: product, error } = await adminSupabase
      .from("products")
      .insert({
        title,
        slug: "",
        short_description: short_description || null,
        price,
        active: true,
        product_type: "voucher",
        voucher_duration_minutes,
      })
      .select()
      .single();

    if (error || !product) {
      return { error: error?.message ?? "Erreur creation produit" };
    }

    revalidatePath("/admin/boutique");
    redirect(`/admin/products/${product.id}`);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    return { error: "Erreur serveur" };
  }
}

export async function updateProduct(productId: string, formData: FormData) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();

    const title = formData.get("title") as string;
    const short_description = formData.get("short_description") as string;
    const price = parseFloat(formData.get("price") as string);
    const active = formData.get("active") === "true";
    const voucherDurationRaw = formData.get("voucher_duration_minutes");
    const voucher_duration_minutes = voucherDurationRaw
      ? parseInt(voucherDurationRaw as string, 10)
      : null;

    const { error } = await adminSupabase
      .from("products")
      .update({
        title,
        short_description: short_description || null,
        price,
        active,
        product_type: "voucher",
        voucher_duration_minutes,
      })
      .eq("id", productId);

    if (error) return { error: error.message };

    revalidatePath("/admin/boutique");
    revalidatePath(`/admin/products/${productId}`);
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function reorderProductImages(images: { id: string; position: number }[]) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();

    await Promise.all(
      images.map(({ id, position }) =>
        adminSupabase.from("product_images").update({ position }).eq("id", id)
      )
    );

    return { success: true };
  } catch {
    return { error: "Erreur reorder images" };
  }
}

export async function deleteProductImage(imageId: string, imageUrl: string) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();

    await adminSupabase
      .from("product_images")
      .delete()
      .eq("id", imageId);

    const urlParts = imageUrl.split("/product-images/");
    if (urlParts[1]) {
      await adminSupabase.storage
        .from("product-images")
        .remove([urlParts[1]]);
    }

    revalidatePath("/admin/boutique");
    return { success: true };
  } catch {
    return { error: "Erreur suppression image" };
  }
}
