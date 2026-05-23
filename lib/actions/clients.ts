"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { customEmail } from "@/lib/email-templates";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Non autorisé");
}

export async function sendEmailToClient(clientId: string, subject: string, body: string) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();
    const { data: client } = await supabase
      .from("clients")
      .select("email, prenom, nom")
      .eq("id", clientId)
      .single();
    if (!client) return { error: "Client introuvable" };
    const { error: emailError } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [client.email],
      replyTo: EMAIL_REPLY_TO,
      subject,
      html: customEmail({ subject, body }),
    });
    if (emailError) return { error: `Email non envoyé — ${(emailError as { message?: string }).message ?? ""}` };
    return { success: true };
  } catch (err) {
    console.error("sendEmailToClient:", err);
    return { error: "Erreur envoi email" };
  }
}

export async function updateClient(id: string, fields: {
  prenom?: string;
  nom?: string;
  telephone?: string | null;
}) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();
    await supabase.from("clients").update(fields).eq("id", id);
    revalidatePath("/admin/clients");
    revalidatePath(`/admin/clients/${id}`);
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}
