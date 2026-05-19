"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateVoucherCode } from "@/lib/vouchers";

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
}

export async function markVoucherUsed(voucherId: string) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("voucher_codes")
      .update({ status: "used", used_at: new Date().toISOString() })
      .eq("id", voucherId)
      .eq("status", "unused");
    if (error) return { error: error.message };
    revalidatePath("/admin/vouchers");
    revalidatePath("/admin/boutique");
    return { success: true };
  } catch {
    return { error: "Non autorise" };
  }
}

export async function markVoucherUnused(voucherId: string) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("voucher_codes")
      .update({ status: "unused", used_at: null })
      .eq("id", voucherId);
    if (error) return { error: error.message };
    revalidatePath("/admin/vouchers");
    revalidatePath("/admin/boutique");
    return { success: true };
  } catch {
    return { error: "Non autorise" };
  }
}

export async function createManualVoucher(formData: FormData) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();

    const duration = parseInt(formData.get("duration_minutes") as string);
    const prix = formData.get("prix") ? parseFloat(formData.get("prix") as string) : null;
    const productTitle = (formData.get("product_title") as string)?.trim() || "Voucher vol";
    const recipientEmail = (formData.get("recipient_email") as string)?.trim() || null;
    const recipientName = (formData.get("recipient_name") as string)?.trim() || null;
    const expiresAt = (formData.get("expires_at") as string) || null;

    if (!duration || duration <= 0) return { error: "Durée invalide." };

    const code = generateVoucherCode();
    const expiresAtISO = expiresAt ? new Date(expiresAt).toISOString() : null;

    const { error } = await adminSupabase.from("voucher_codes").insert({
      code,
      duration_minutes: duration,
      prix,
      product_title: productTitle,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      status: "unused",
      expires_at: expiresAtISO,
    });

    if (error) return { error: error.message };
    revalidatePath("/admin/vouchers");
    revalidatePath("/admin/boutique");
    return { success: true, code };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function updateVoucher(voucherId: string, data: {
  duration_minutes?: number;
  prix?: number | null;
  product_title?: string;
  recipient_email?: string | null;
  recipient_name?: string | null;
  expires_at?: string | null;
  status?: string;
}) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();
    const update: Record<string, unknown> = { ...data };
    if (data.expires_at) update.expires_at = new Date(data.expires_at).toISOString();
    const { error } = await adminSupabase
      .from("voucher_codes")
      .update(update)
      .eq("id", voucherId);
    if (error) return { error: error.message };
    revalidatePath("/admin/vouchers");
    revalidatePath("/admin/boutique");
    return { success: true };
  } catch {
    return { error: "Non autorise" };
  }
}

export async function deleteVoucher(voucherId: string) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("voucher_codes")
      .delete()
      .eq("id", voucherId);
    if (error) return { error: error.message };
    revalidatePath("/admin/vouchers");
    revalidatePath("/admin/boutique");
    return { success: true };
  } catch {
    return { error: "Non autorise" };
  }
}
