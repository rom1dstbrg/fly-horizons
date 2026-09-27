"use server";

import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireSelfActivePilote } from "./auth-guards";
import { MAX_CAPTURES, RETOUR_BUCKET, type ClientError, type RetourType } from "@/lib/pilote-retours";

// Retours des pilotes (27/09) : envoi depuis l'espace pilote, suivi dans
// /admin/retours. Les captures sont envoyées une par une (limite de taille des
// server actions), puis le retour est créé avec leurs chemins.

const MAX_RAW = 9 * 1024 * 1024;

export async function uploadRetourCapture(formData: FormData): Promise<{ path: string } | { error: string }> {
  try {
    const { piloteId } = await requireSelfActivePilote();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: "Fichier manquant" };
    if (file.size > MAX_RAW) return { error: "Cette image dépasse 9 Mo" };
    if (!file.type.startsWith("image/")) return { error: "Seules les images sont acceptées" };

    // Pleine résolution utile pour lire un message d'erreur : 2400 px, WebP 85.
    const out = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: 2400, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    const path = `${piloteId}/${crypto.randomUUID()}.webp`;
    const { error } = await createAdminClient().storage
      .from(RETOUR_BUCKET)
      .upload(path, out, { contentType: "image/webp", upsert: false });
    if (error) return { error: "La capture n'a pas pu être envoyée" };
    return { path };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur serveur" };
  }
}

export async function createRetour(data: {
  type: RetourType;
  message: string;
  page: string;
  pageTitre: string;
  userAgent: string;
  viewport: string;
  erreurs: ClientError[];
  captures: string[];
}): Promise<{ success: true } | { error: string }> {
  try {
    const { piloteId } = await requireSelfActivePilote();
    const message = data.message.trim();
    if (!["bug", "idee", "question"].includes(data.type)) return { error: "Type inconnu" };
    if (message.length < 3) return { error: "Décrivez le problème en quelques mots." };
    // Seulement des captures envoyées par ce pilote.
    const captures = data.captures.filter((p) => p.startsWith(`${piloteId}/`)).slice(0, MAX_CAPTURES);
    const sha = process.env.VERCEL_GIT_COMMIT_SHA;
    const appVersion = sha ? `${sha.slice(0, 7)} (${process.env.VERCEL_ENV ?? "vercel"})` : "local";

    const { error } = await createAdminClient().from("pilote_retours").insert({
      pilote_id: piloteId,
      type: data.type,
      message: message.slice(0, 5000),
      page: data.page.slice(0, 500),
      page_titre: data.pageTitre.slice(0, 200),
      user_agent: data.userAgent.slice(0, 400),
      viewport: data.viewport.slice(0, 40),
      app_version: appVersion,
      erreurs: data.erreurs.slice(-10).map((e) => ({ ...e, message: e.message.slice(0, 500), stack: e.stack?.slice(0, 2000) })),
      captures,
    });
    if (error) return { error: "Le message n'a pas pu être envoyé. Réessayez dans un instant." };
    revalidatePath("/admin/retours");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur serveur" };
  }
}

export async function setRetourStatut(id: string, traite: boolean): Promise<{ success: true } | { error: string }> {
  await requireAdmin();
  const { error } = await createAdminClient()
    .from("pilote_retours")
    .update({ statut: traite ? "traite" : "a_traiter", traite_at: traite ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/retours");
  revalidatePath(`/admin/retours/${id}`);
  return { success: true };
}
