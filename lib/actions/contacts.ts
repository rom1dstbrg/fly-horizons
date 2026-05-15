"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  sendContactNotificationEmail,
  sendContactAcknowledgmentEmail,
  sendContactReplyEmail,
} from "@/lib/email-service";

export async function submitContact(formData: FormData) {
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
  const supabase = createAdminClient();
  const { error } = await supabase.from("contacts").update({ statut }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/contacts");
  return { success: true };
}

export async function replyContact(
  id: string,
  reponse: string,
  email: string,
  nom: string,
  sujet: string,
) {
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
}

export async function deleteContact(id: string) {
  const supabase = createAdminClient();
  await supabase.from("contacts").delete().eq("id", id);
  revalidatePath("/admin/contacts");
}
