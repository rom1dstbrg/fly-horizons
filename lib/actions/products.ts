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
    revalidatePath("/admin/products");
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
    const stock = parseInt(formData.get("stock") as string, 10);
    const featured = formData.get("featured") === "true";
    const tagsRaw = formData.get("tags") as string;
    const tags = tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

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
        stock: isNaN(stock) ? 0 : stock,
        featured,
        tags,
        active: true,
      })
      .select()
      .single();

    if (error || !product) {
      return { error: error?.message ?? "Erreur creation produit" };
    }

    revalidatePath("/admin/products");
    revalidatePath("/shop");
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
    const stock = parseInt(formData.get("stock") as string, 10);
    const featured = formData.get("featured") === "true";
    const active = formData.get("active") === "true";
    const tagsRaw = formData.get("tags") as string;
    const tags = tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const { error } = await adminSupabase
      .from("products")
      .update({
        title,
        short_description: short_description || null,
        price,
        stock: isNaN(stock) ? 0 : stock,
        featured,
        active,
        tags,
      })
      .eq("id", productId);

    if (error) return { error: error.message };

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/shop");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function deleteProductImage(imageId: string, imageUrl: string) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();

    // Supprimer de la DB
    await adminSupabase
      .from("product_images")
      .delete()
      .eq("id", imageId);

    // Extraire le path depuis l'URL Supabase Storage
    const urlParts = imageUrl.split("/product-images/");
    if (urlParts[1]) {
      await adminSupabase.storage
        .from("product-images")
        .remove([urlParts[1]]);
    }

    revalidatePath("/admin/products");
    return { success: true };
  } catch {
    return { error: "Erreur suppression image" };
  }
}