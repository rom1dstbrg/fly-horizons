"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { revalidatePath } from "next/cache";
import { newsletterConfirmationEmail, newsletterCampaignEmail, newsletterFromBlocksEmail, type NewsletterBlock } from "@/lib/email-templates";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Non autorisé");
}

// ─── Actions ───────────────────────────────────────────────────────────────

export async function getNewsletterStats() {
  await checkAdmin();
  const supabase = createAdminClient();

  const [{ count: totalCount }, { count: activeCount }, { data: recent }] = await Promise.all([
    supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
    supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("newsletter_subscribers").select("id, email, prenom, subscribed_at, unsubscribed_at, active")
      .order("subscribed_at", { ascending: false }),
  ]);

  return {
    total: totalCount ?? 0,
    active: activeCount ?? 0,
    subscribers: recent ?? [],
  };
}

export type SendResult = { sent?: number; failed?: number; error?: string } | null;

export async function sendNewsletter(_prev: SendResult, formData: FormData): Promise<SendResult> {
  await checkAdmin();

  const subject = (formData.get("subject") as string)?.trim();
  const body    = (formData.get("body") as string)?.trim();

  if (!subject || !body) return { error: "Sujet et contenu requis." };

  const supabase = createAdminClient();
  const { data: subscribers } = await supabase
    .from("newsletter_subscribers")
    .select("email, prenom, unsubscribe_token")
    .eq("active", true);

  if (!subscribers?.length) return { error: "Aucun abonné actif." };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";
  let sent = 0;
  let failed = 0;

  for (const sub of subscribers) {
    const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?token=${sub.unsubscribe_token}`;
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [sub.email],
      subject,
      html: newsletterCampaignEmail(subject, body, sub.prenom, unsubscribeUrl),
    });
    if (error) failed++;
    else sent++;
  }

  revalidatePath("/admin/newsletter");
  return { sent, failed };
}

export async function sendNewsletterBlocks(_prev: SendResult, formData: FormData): Promise<SendResult> {
  await checkAdmin();

  const subject   = (formData.get("subject") as string)?.trim();
  const blocksRaw = formData.get("blocks") as string;

  if (!subject) return { error: "Sujet requis." };

  let blocks: NewsletterBlock[];
  try {
    blocks = JSON.parse(blocksRaw);
  } catch {
    return { error: "Contenu invalide." };
  }
  if (!blocks.length) return { error: "Ajoutez au moins un bloc." };

  const supabase = createAdminClient();
  const { data: subscribers } = await supabase
    .from("newsletter_subscribers")
    .select("email, prenom, unsubscribe_token")
    .eq("active", true);

  if (!subscribers?.length) return { error: "Aucun abonné actif." };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";
  let sent = 0, failed = 0;

  for (const sub of subscribers) {
    const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?token=${sub.unsubscribe_token}`;
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [sub.email],
      subject,
      html: newsletterFromBlocksEmail(subject, blocks, sub.prenom, unsubscribeUrl),
    });
    if (error) failed++;
    else sent++;
  }

  revalidatePath("/admin/newsletter");
  return { sent, failed };
}

// ─── Templates ─────────────────────────────────────────────────────────────

export type NewsletterTemplate = {
  id: string;
  name: string;
  subject: string;
  blocks: NewsletterBlock[];
  created_at: string;
  updated_at: string;
};

export async function getNewsletterTemplates(): Promise<NewsletterTemplate[]> {
  await checkAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("newsletter_templates")
    .select("id, name, subject, blocks, created_at, updated_at")
    .order("updated_at", { ascending: false });
  return (data ?? []) as NewsletterTemplate[];
}

export type TemplateResult = { id?: string; error?: string } | null;

export async function saveNewsletterTemplate(_prev: TemplateResult, formData: FormData): Promise<TemplateResult> {
  await checkAdmin();
  const name    = (formData.get("name")    as string)?.trim();
  const subject = (formData.get("subject") as string)?.trim() ?? "";
  const blocksRaw = formData.get("blocks") as string;

  if (!name) return { error: "Nom requis." };

  let blocks: NewsletterBlock[];
  try { blocks = JSON.parse(blocksRaw); }
  catch { blocks = []; }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("newsletter_templates")
    .insert({ name, subject, blocks })
    .select("id")
    .single();

  if (error) return { error: "Erreur lors de l'enregistrement." };

  revalidatePath("/admin/newsletter");
  return { id: data.id };
}

export async function updateNewsletterTemplate(_prev: TemplateResult, formData: FormData): Promise<TemplateResult> {
  await checkAdmin();
  const id      = (formData.get("id")      as string)?.trim();
  const name    = (formData.get("name")    as string)?.trim();
  const subject = (formData.get("subject") as string)?.trim() ?? "";
  const blocksRaw = formData.get("blocks") as string;

  if (!id || !name) return { error: "Données manquantes." };

  let blocks: NewsletterBlock[];
  try { blocks = JSON.parse(blocksRaw); }
  catch { blocks = []; }

  const supabase = createAdminClient();
  await supabase
    .from("newsletter_templates")
    .update({ name, subject, blocks, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/admin/newsletter");
  return { id };
}

export async function deleteNewsletterTemplate(id: string): Promise<void> {
  await checkAdmin();
  const supabase = createAdminClient();
  await supabase.from("newsletter_templates").delete().eq("id", id);
  revalidatePath("/admin/newsletter");
}

export type AddResult = { ok?: boolean; error?: string } | null;

export async function addSubscriberFromAdmin(_prev: AddResult, formData: FormData): Promise<AddResult> {
  await checkAdmin();

  const email  = (formData.get("email") as string)?.toLowerCase().trim();
  const prenom = (formData.get("prenom") as string)?.trim() || null;

  if (!email || !email.includes("@") || !email.includes(".")) return { error: "Email invalide." };

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("newsletter_subscribers")
    .select("id, active")
    .eq("email", email)
    .maybeSingle();

  if (existing?.active) return { error: "Cet email est déjà abonné." };

  if (existing) {
    await supabase
      .from("newsletter_subscribers")
      .update({ active: true, unsubscribed_at: null, subscribed_at: new Date().toISOString(), prenom })
      .eq("id", existing.id);
  } else {
    await supabase.from("newsletter_subscribers").insert({ email, prenom });
  }

  revalidatePath("/admin/newsletter");
  return { ok: true };
}

export async function deleteSubscriber(id: string) {
  await checkAdmin();
  const supabase = createAdminClient();
  await supabase.from("newsletter_subscribers").delete().eq("id", id);
  revalidatePath("/admin/newsletter");
}

export async function unsubscribeSubscriber(id: string) {
  await checkAdmin();
  const supabase = createAdminClient();
  await supabase
    .from("newsletter_subscribers")
    .update({ active: false, unsubscribed_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/newsletter");
}

export async function resubscribeSubscriber(id: string) {
  await checkAdmin();
  const supabase = createAdminClient();
  await supabase
    .from("newsletter_subscribers")
    .update({ active: true, unsubscribed_at: null, subscribed_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/newsletter");
}

export async function subscribeFromAccount(): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Non connecté" };

  const email = user.email.toLowerCase();
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("newsletter_subscribers")
    .select("id, active")
    .eq("email", email)
    .maybeSingle();

  if (existing?.active) return { ok: true };

  if (existing) {
    await admin
      .from("newsletter_subscribers")
      .update({ active: true, unsubscribed_at: null, subscribed_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await admin.from("newsletter_subscribers").insert({ email });
  }

  const { data: sub } = await admin
    .from("newsletter_subscribers")
    .select("unsubscribe_token")
    .eq("email", email)
    .maybeSingle();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";
  const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?token=${sub?.unsubscribe_token ?? ""}`;

  await resend.emails.send({
    from: EMAIL_FROM,
    to: [email],
    subject: "Bienvenue dans la newsletter Fly Horizons",
    html: newsletterConfirmationEmail(null, unsubscribeUrl),
  });

  revalidatePath("/account");
  return { ok: true };
}

export async function unsubscribeFromAccount(): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Non connecté" };

  const admin = createAdminClient();
  await admin
    .from("newsletter_subscribers")
    .update({ active: false, unsubscribed_at: new Date().toISOString() })
    .eq("email", user.email.toLowerCase());

  revalidatePath("/account");
  return { ok: true };
}
