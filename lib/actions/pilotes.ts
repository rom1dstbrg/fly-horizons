"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Non autorisé");
}

function siteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return raw.startsWith("http://localhost") || raw.startsWith("http://127") ? raw : "https://fly-horizons.com";
}

// ── Inviter un nouveau pilote ──────────────────────────────────────────────
// Crée le compte auth (email d'invitation Supabase), la fiche pilotes, et
// bascule le rôle du profil sur "pilote" (le profil lui-même est créé par le
// trigger existant sur auth.users, en "customer" par défaut).

export async function createPilote(data: {
  nom: string;
  email: string;
  telephone?: string;
  iban?: string;
}) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();

    const email = data.email.trim().toLowerCase();
    if (!data.nom.trim() || !email) return { error: "Nom et email obligatoires" };

    const { data: existing } = await supabase.from("pilotes").select("id").eq("email", email).maybeSingle();
    if (existing) return { error: "Un pilote existe déjà avec cet email" };

    const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl()}/auth/callback?next=/pilote/mot-de-passe`,
      data: { full_name: data.nom },
    });

    if (inviteErr || !invited?.user) {
      return { error: inviteErr?.message?.includes("already registered")
        ? "Un compte existe déjà avec cet email"
        : "Erreur lors de l'invitation" };
    }

    const { error: pilError } = await supabase.from("pilotes").insert({
      user_id: invited.user.id,
      nom: data.nom.trim(),
      email,
      telephone: data.telephone?.trim() || null,
      iban: data.iban?.trim() || null,
      statut: "actif",
    });

    if (pilError) {
      // Rollback du compte auth créé pour éviter un compte orphelin sans fiche pilote
      await supabase.auth.admin.deleteUser(invited.user.id);
      return { error: "Erreur création de la fiche pilote" };
    }

    await supabase.from("profiles").update({ role: "pilote", full_name: data.nom.trim() }).eq("id", invited.user.id);

    revalidatePath("/admin/pilotes");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function togglePiloteActif(id: string, actif: boolean) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();
    const { error } = await supabase.from("pilotes").update({ statut: actif ? "actif" : "inactif" }).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/pilotes");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function updatePilote(id: string, data: { nom: string; telephone?: string; iban?: string }) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();
    if (!data.nom.trim()) return { error: "Le nom est obligatoire" };
    const { error } = await supabase.from("pilotes").update({
      nom: data.nom.trim(),
      telephone: data.telephone?.trim() || null,
      iban: data.iban?.trim() || null,
    }).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/pilotes");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function deletePilote(id: string) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();

    const { data: pilote } = await supabase.from("pilotes").select("user_id").eq("id", id).single();
    if (!pilote) return { error: "Pilote introuvable" };

    const { error } = await supabase.from("pilotes").delete().eq("id", id);
    if (error) return { error: error.message };

    if (pilote.user_id) {
      await supabase.from("profiles").update({ role: "customer" }).eq("id", pilote.user_id);
      await supabase.auth.admin.deleteUser(pilote.user_id);
    }

    revalidatePath("/admin/pilotes");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}
