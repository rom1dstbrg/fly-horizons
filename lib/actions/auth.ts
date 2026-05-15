"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  revalidatePath("/", "layout");
  redirect(redirectTo ?? "/account");
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
    : process.env.NEXT_PUBLIC_SITE_URL ?? "https://shop.fly-horizons.com";

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

  // Email confirmation disabled — session is returned immediately
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/account");
  }

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