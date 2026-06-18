"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateVoucherCode } from "@/lib/vouchers";
import { sendVoucherEmail } from "@/lib/email-service";
import { generateVoucherPDFBuffer } from "@/lib/pdf/voucher-pdf";

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
    revalidatePath("/admin/boutique");
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
    revalidatePath("/admin/boutique");
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
    const paymentMethod = (formData.get("payment_method") as string) || "offered";

    if (!duration || duration <= 0) return { error: "Durée invalide." };

    const code = generateVoucherCode();
    const expiresAtISO = expiresAt ? new Date(expiresAt).toISOString() : null;

    const { data: inserted, error } = await adminSupabase.from("voucher_codes").insert({
      code,
      duration_minutes: duration,
      prix,
      product_title: productTitle,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      status: "unused",
      expires_at: expiresAtISO,
      payment_method: paymentMethod,
    }).select("id").single();

    if (error || !inserted) return { error: error?.message ?? "Erreur insertion" };
    revalidatePath("/admin/boutique");
    revalidatePath("/admin/boutique");
    return { success: true, code, id: inserted.id as string };
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
  payment_method?: string;
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
    revalidatePath("/admin/boutique");
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
    revalidatePath("/admin/boutique");
    revalidatePath("/admin/boutique");
    return { success: true };
  } catch {
    return { error: "Non autorise" };
  }
}

export async function resendVoucherEmail(voucherId: string) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();
    const { data: voucher } = await adminSupabase
      .from("voucher_codes")
      .select("code, duration_minutes, product_title, recipient_email, recipient_name, expires_at")
      .eq("id", voucherId)
      .maybeSingle();

    if (!voucher) return { error: "Voucher introuvable" };
    if (!voucher.recipient_email) return { error: "Aucun email destinataire renseigné" };

    // Générer le PDF bon cadeau
    const expiresAt = voucher.expires_at
      ? new Date(voucher.expires_at)
      : (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d; })();

    let pdfAttachments: Array<{ filename: string; content: Buffer }> = [];
    try {
      const pdfBuffer = await generateVoucherPDFBuffer({
        code: voucher.code,
        duration_minutes: voucher.duration_minutes,
        product_title: voucher.product_title,
        expiresAt,
      });
      pdfAttachments = [{
        filename: `bon-vol-${voucher.code.slice(0, 8).toLowerCase()}.pdf`,
        content: pdfBuffer,
      }];
    } catch (err) {
      console.error("PDF generation failed for voucher", voucher.code, err);
    }

    await sendVoucherEmail({
      to: voucher.recipient_email,
      orderRef: voucher.code,
      customerName: voucher.recipient_name ?? undefined,
      codes: [{
        code: voucher.code,
        duration_minutes: voucher.duration_minutes,
        product_title: voucher.product_title,
        expires_at: voucher.expires_at ?? null,
      }],
      attachments: pdfAttachments,
    });

    return { success: true };
  } catch {
    return { error: "Erreur envoi email" };
  }
}
