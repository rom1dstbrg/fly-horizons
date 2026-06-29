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
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { contactNotificationEmail } from "@/lib/email-templates";

const SITE_URL = "https://fly-horizons.com";

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
  const { data: contact, error } = await supabase
    .from("contacts")
    .insert({ nom, email, sujet, message })
    .select("id, thread_token")
    .single();
  if (error || !contact) return { error: "Impossible d'envoyer le message. Réessayez." };

  await supabase.from("contact_messages").insert({
    contact_id: contact.id,
    author: "client",
    content: message,
  });

  const threadUrl = `${SITE_URL}/contact/ticket/${contact.thread_token}`;

  await Promise.allSettled([
    sendContactNotificationEmail({ nom, email, sujet, message }),
    sendContactAcknowledgmentEmail({ nom, email, sujet, message, threadUrl }),
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

    const { data: contact } = await supabase
      .from("contacts")
      .select("thread_token")
      .eq("id", id)
      .single();
    if (!contact) return { error: "Ticket introuvable." };

    await supabase.from("contact_messages").insert({
      contact_id: id,
      author: "admin",
      content: reponse,
    });

    await supabase
      .from("contacts")
      .update({ statut: "repondu", reponse })
      .eq("id", id);

    const threadUrl = `${SITE_URL}/contact/ticket/${contact.thread_token}`;
    await sendContactReplyEmail({ nom, email, sujet, reponse, threadUrl });

    revalidatePath("/admin/contacts");
    return { success: true };
  } catch {
    return { error: "Non autorise" };
  }
}

export async function submitClientReply(token: string, content: string) {
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0].trim() ??
    headerStore.get("x-real-ip") ??
    "unknown";

  const { allowed } = rateLimit(`contact-reply:${ip}`, 5, 60_000);
  if (!allowed) return { error: "Trop de messages. Veuillez patienter." };

  if (!content.trim()) return { error: "Le message ne peut pas être vide." };

  const supabase = createAdminClient();
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, nom, email, sujet, statut")
    .eq("thread_token", token)
    .single();

  if (!contact) return { error: "Lien invalide." };

  await supabase.from("contact_messages").insert({
    contact_id: contact.id,
    author: "client",
    content: content.trim(),
  });

  await supabase
    .from("contacts")
    .update({ statut: "nouveau" })
    .eq("id", contact.id);

  await resend.emails.send({
    from: EMAIL_FROM,
    to: ["info@fly-horizons.com"],
    replyTo: EMAIL_REPLY_TO,
    subject: `Réponse client · ${contact.sujet} · ${contact.nom}`,
    html: contactNotificationEmail({
      nom: contact.nom,
      email: contact.email,
      sujet: `Re: ${contact.sujet}`,
      message: content.trim(),
    }),
  });

  return { success: true };
}

export async function getContactMessages(contactId: string) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("contact_messages")
      .select("id, author, content, created_at")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: true });
    return { messages: data ?? [] };
  } catch {
    return { messages: [] };
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
