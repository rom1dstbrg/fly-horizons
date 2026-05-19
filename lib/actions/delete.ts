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
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Non autorise");
}

export async function deleteProduct(productId: string) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();

    // Supprimer les images du storage
    const { data: images } = await adminSupabase
      .from("product_images")
      .select("url")
      .eq("product_id", productId);

    if (images && images.length > 0) {
      const paths = images
        .map((img) => {
          const parts = img.url.split("/product-images/");
          return parts[1] ?? null;
        })
        .filter(Boolean) as string[];

      if (paths.length > 0) {
        await adminSupabase.storage.from("product-images").remove(paths);
      }
    }

    // Supprimer le produit (cascade supprime images + order_items)
    const { error } = await adminSupabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) return { error: error.message };

    revalidatePath("/admin/products");
    revalidatePath("/admin/boutique");
    revalidatePath("/shop");
    redirect("/admin/products");
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    return { error: "Erreur suppression produit" };
  }
}

export async function deleteOrder(orderId: string) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (error) return { error: error.message };

    revalidatePath("/admin/orders");
    revalidatePath("/admin/boutique");
    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Erreur suppression commande" };
  }
}

export async function deleteReservationPerso(resaId: string) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("reservations")
      .delete()
      .eq("id", resaId);
    if (error) return { error: error.message };
    revalidatePath("/admin/vols-sur-mesure");
    revalidatePath("/admin/vols");
    return { success: true };
  } catch {
    return { error: "Erreur suppression" };
  }
}

export async function deleteClient(clientId: string) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();
    // Supprime d'abord les réservations associées (au cas où pas de cascade FK)
    await adminSupabase.from("reservations").delete().eq("client_id", clientId);
    const { error } = await adminSupabase.from("clients").delete().eq("id", clientId);
    if (error) return { error: error.message };
    revalidatePath("/admin/clients");
    revalidatePath("/admin/reservations");
    revalidatePath("/admin/vols");
    return { success: true };
  } catch {
    return { error: "Erreur suppression client" };
  }
}

export async function deleteReservationStandard(resaId: string) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("reservations")
      .delete()
      .eq("id", resaId);
    if (error) return { error: error.message };
    revalidatePath("/admin/reservations");
    revalidatePath("/admin/vols");
    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Erreur suppression" };
  }
}

export async function deleteCoupon(couponId: string) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
      .from("coupons")
      .delete()
      .eq("id", couponId);

    if (error) return { error: error.message };

    revalidatePath("/admin/coupons");
    revalidatePath("/admin/boutique");
    return { success: true };
  } catch {
    return { error: "Erreur suppression coupon" };
  }
}