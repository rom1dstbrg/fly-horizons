"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import {
  sendContactNotificationEmail,
  sendContactAcknowledgmentEmail,
  sendContactReplyEmail,
} from "@/lib/email-service";

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

export async function submitContact(formData: FormData) {
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0].trim() ??
    headerStore.get("x-real-ip") ??
    "unknown";

  const { allowed } = rateLimit(`contact:${ip}`, 3, 60_000);
  if (!allowed) {
    return { error: "Trop de messages envoyés. Veuillez patienter une minute." };
  }

  const nom     = (formData.get("nom")     as string)?.trim();
  const email   = (formData.get("email")   as string)?.trim();
  const sujet   = (formData.get("sujet")   as string)?.trim();
  const message = (formData.get("message") as string)?.trim();

  if (!nom || !email || !sujet || !message)
    return { error: "Tous les champs sont requis." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("contacts").insert({ nom, email, sujet, message });
  if (error) return { error: "Impossible d'envoyer le message. Réessayez." };

  await Promise.allSettled([
    sendContactNotificationEmail({ nom, email, sujet, message }),
    sendContactAcknowledgmentEmail({ nom, email, sujet }),
  ]);

  return { success: true };
}

export async function updateContactStatut(id: string, statut: string) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();
    const { error } = await supabase.from("contacts").update({ statut }).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/contacts");
    return { success: true };
  } catch {
    return { error: "Non autorise" };
  }
}

export async function replyContact(
  id: string,
  reponse: string,
  email: string,
  nom: string,
  sujet: string,
) {
  try {
    await checkAdmin();
    if (!reponse.trim()) return { error: "La réponse ne peut pas être vide." };
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("contacts")
      .update({ statut: "repondu", reponse })
      .eq("id", id);
    if (error) return { error: error.message };
    await sendContactReplyEmail({ nom, email, sujet, reponse });
    revalidatePath("/admin/contacts");
    return { success: true };
  } catch {
    return { error: "Non autorise" };
  }
}

export async function deleteContact(id: string) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();
    await supabase.from("contacts").delete().eq("id", id);
    revalidatePath("/admin/contacts");
    return { success: true };
  } catch {
    return { error: "Non autorise" };
  }
}
