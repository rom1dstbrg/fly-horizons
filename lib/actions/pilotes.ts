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

    // L'email a-t-il déjà un compte ? Si oui on promeut le compte existant
    // (inviteUserByEmail échouerait). Sinon on invite un nouveau compte.
    const { data: existingUserId } = await supabase.rpc("get_auth_user_id_by_email", { email_input: email });

    let userId: string;
    let promoted = false;

    if (existingUserId) {
      userId = existingUserId as string;
      promoted = true;
    } else {
      const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl()}/auth/callback?next=/pilote/mot-de-passe`,
        data: { full_name: data.nom },
      });
      if (inviteErr || !invited?.user) {
        return { error: inviteErr?.message?.includes("already registered")
          ? "Un compte existe déjà avec cet email"
          : "Erreur lors de l'invitation" };
      }
      userId = invited.user.id;
    }

    const { error: pilError } = await supabase.from("pilotes").insert({
      user_id: userId,
      nom: data.nom.trim(),
      email,
      telephone: data.telephone?.trim() || null,
      iban: data.iban?.trim() || null,
      statut: "actif",
    });

    if (pilError) {
      // Rollback du compte auth seulement s'il vient d'être créé pour ce pilote.
      if (!promoted) await supabase.auth.admin.deleteUser(userId);
      return { error: "Erreur création de la fiche pilote" };
    }

    // Promotion : on garde le nom existant s'il y en a un, on ne l'écrase pas.
    const { data: currentProfile } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
    await supabase
      .from("profiles")
      .update({ role: "pilote", full_name: currentProfile?.full_name?.trim() || data.nom.trim() })
      .eq("id", userId);

    revalidatePath("/admin/pilotes");
    return { success: true, promoted };
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

    // Cascade de désactivation : un pilote inactif ne doit plus « occuper » de créneau.
    // Ses vols futurs encore ouverts redeviennent des demandes à réassigner, et ses
    // annonces publiées sont retirées de la vitrine publique.
    let releasedFlights = 0;
    let unpublishedAnnonces = 0;
    if (!actif) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: released } = await supabase
        .from("reservations")
        .update({ pilote_id: null, pilote_assigned_at: null })
        .eq("pilote_id", id)
        .neq("type_resa", "perso")
        .neq("statut", "vol_effectue")
        .neq("statut", "annulee")
        .gte("date_vol", today)
        .select("id");
      releasedFlights = released?.length ?? 0;

      for (const r of released ?? []) {
        await supabase.from("reservation_history").insert({
          reservation_id: r.id,
          action: "unassign_pilote",
          field: null,
          old_value: null,
          new_value: null,
          author: "admin",
          note: "Pilote retiré automatiquement (compte désactivé), vol à réassigner",
        });
      }

      const { data: unpub } = await supabase
        .from("annonces_pilote")
        .update({ statut: "annulee" })
        .eq("pilote_id", id)
        .eq("statut", "publiee")
        .select("id");
      unpublishedAnnonces = unpub?.length ?? 0;
    }

    revalidatePath("/admin/pilotes");
    revalidatePath("/admin/vols");
    revalidatePath("/pilote/vols");
    revalidatePath("/nos-offres");
    return { success: true, releasedFlights, unpublishedAnnonces };
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
