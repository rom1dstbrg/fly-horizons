"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// -----------------------------------------------
// LOGIN
// -----------------------------------------------
export async function login(formData: FormData) {
  const supabase = await createClient();

  const email    = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = formData.get("redirectTo") as string | null;

  if (!email || !password) {
    return { error: "Email et mot de passe requis." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Email ou mot de passe incorrect." };
  }

  // Prevent open redirect — only allow same-origin relative paths
  const safeRedirect = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
    ? redirectTo
    : "/account";

  revalidatePath("/", "layout");
  redirect(safeRedirect);
}

// -----------------------------------------------
// REGISTER
// -----------------------------------------------
export async function register(formData: FormData) {
  const supabase = await createClient();

  const email     = formData.get("email") as string;
  const password  = formData.get("password") as string;
  const full_name = formData.get("full_name") as string;

  if (!email || !password || !full_name) {
    return { error: "Tous les champs sont requis." };
  }

  if (password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  }

  const siteUrl = process.env.NODE_ENV === "development"
    ? `http://localhost:${process.env.PORT ?? 3000}`
    : "https://fly-horizons.com";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name },
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    console.error("[register] Supabase signUp error:", error.message, error.code);
    if (
      error.message.includes("already registered") ||
      error.message.includes("User already registered")
    ) {
      return { error: "Un compte existe déjà avec cet email." };
    }
    return { error: `Erreur lors de la création du compte. (${error.message})` };
  }

  // Create CRM client record (best-effort, non-blocking)
  if (data.user) {
    const adminSupabase = createAdminClient();
    const { data: existing } = await adminSupabase
      .from("clients")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (!existing) {
      const parts = full_name.trim().split(/\s+/);
      const prenom = parts[0] ?? full_name;
      const nom = parts.slice(1).join(" ") || prenom;
      const { data: newId } = await adminSupabase.rpc("next_client_id");
      if (newId) {
        await adminSupabase.from("clients").insert({
          id: newId,
          prenom,
          nom,
          email,
          telephone: null,
        });
      }
    }
  }

  // Email confirmation disabled — session is returned immediately
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/account");
  }

  return { success: true };
}

// -----------------------------------------------
// UPDATE PROFILE
// -----------------------------------------------
export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const full_name = (formData.get("full_name") as string)?.trim();
  const phone     = (formData.get("phone") as string)?.trim() || null;

  // Update profiles table
  await supabase
    .from("profiles")
    .update({ ...(full_name ? { full_name } : {}), phone })
    .eq("id", user.id);

  // Sync auth user_metadata
  if (full_name) {
    await supabase.auth.updateUser({ data: { full_name } });
  }

  // Sync clients table (CRM)
  const adminSupabase = createAdminClient();
  const { data: existingClient } = await adminSupabase
    .from("clients")
    .select("id")
    .eq("email", user.email!)
    .maybeSingle();

  if (existingClient) {
    const parts = (full_name ?? "").split(/\s+/).filter(Boolean);
    const prenom = parts[0] ?? "";
    const nom    = parts.slice(1).join(" ") || prenom;
    await adminSupabase
      .from("clients")
      .update({ ...(full_name ? { prenom, nom } : {}), telephone: phone })
      .eq("id", existingClient.id);
  }

  revalidatePath("/account");
  return { success: true };
}

// -----------------------------------------------
// CHANGE PASSWORD
// -----------------------------------------------
export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const password = formData.get("password") as string;
  const confirm  = formData.get("confirm") as string;

  if (!password || password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  }
  if (password !== confirm) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  return { success: true };
}

// -----------------------------------------------
// LOGOUT
// -----------------------------------------------
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}