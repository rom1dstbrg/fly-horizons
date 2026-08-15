"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { evaluerPartPilote } from "@/lib/annonces-pilote";
import sharp from "sharp";

const MAX_IMAGES = 6;
const MAX_PHOTO_SIZE = 12 * 1024 * 1024; // 12 Mo avant compression

async function checkPilote() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "pilote") throw new Error("Non autorisé");

  const admin = createAdminClient();
  const { data: pilote } = await admin.from("pilotes").select("id, statut").eq("user_id", user.id).single();
  if (!pilote) throw new Error("Fiche pilote introuvable");
  if (pilote.statut !== "actif") throw new Error("Compte pilote désactivé");
  return pilote;
}

export async function createAnnonce(data: {
  duree: number;
  places: number;
  prix_total: number;
  part_pilote: number;
  description?: string;
  images?: string[];
}) {
  try {
    const pilote = await checkPilote();

    if (!(data.duree >= 10 && data.duree <= 240)) return { error: "Durée invalide (10 à 240 minutes)" };
    if (!(data.places >= 1 && data.places <= 6)) return { error: "Nombre de places invalide (1 à 6)" };
    const images = (data.images ?? []).slice(0, MAX_IMAGES);

    const check = evaluerPartPilote(data.prix_total, data.part_pilote);
    if (check.level === "block") return { error: check.message };

    const admin = createAdminClient();
    const { error } = await admin.from("annonces_pilote").insert({
      pilote_id: pilote.id,
      duree: data.duree,
      places: data.places,
      prix_total: data.prix_total,
      part_pilote: data.part_pilote,
      description: data.description?.trim() || null,
      images,
    });

    if (error) return { error: "Erreur création de l'annonce" };

    revalidatePath("/pilote/annonces");
    return { success: true, warning: check.level === "warn" ? check.message : null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur serveur" };
  }
}

export async function updateAnnonce(id: string, data: {
  duree: number;
  places: number;
  prix_total: number;
  part_pilote: number;
  description?: string;
  images?: string[];
}) {
  try {
    const pilote = await checkPilote();

    if (!(data.duree >= 10 && data.duree <= 240)) return { error: "Durée invalide (10 à 240 minutes)" };
    if (!(data.places >= 1 && data.places <= 6)) return { error: "Nombre de places invalide (1 à 6)" };
    const images = (data.images ?? []).slice(0, MAX_IMAGES);

    const check = evaluerPartPilote(data.prix_total, data.part_pilote);
    if (check.level === "block") return { error: check.message };

    const admin = createAdminClient();
    const { data: updated, error } = await admin
      .from("annonces_pilote")
      .update({
        duree: data.duree,
        places: data.places,
        prix_total: data.prix_total,
        part_pilote: data.part_pilote,
        description: data.description?.trim() || null,
        images,
      })
      .eq("id", id)
      .eq("pilote_id", pilote.id)
      .select("id")
      .maybeSingle();

    if (error || !updated) return { error: "Erreur mise à jour de l'annonce" };

    revalidatePath("/pilote/annonces");
    return { success: true, warning: check.level === "warn" ? check.message : null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur serveur" };
  }
}

// Republier une annonce annulée/réservée en une nouvelle annonce publiée, sans
// tout ressaisir — duplique les champs, laisse l'ancienne ligne intacte (historique).
export async function republishAnnonce(id: string) {
  try {
    const pilote = await checkPilote();
    const admin = createAdminClient();

    const { data: source } = await admin
      .from("annonces_pilote")
      .select("duree, places, prix_total, part_pilote, description, images")
      .eq("id", id)
      .eq("pilote_id", pilote.id)
      .single();

    if (!source) return { error: "Annonce introuvable" };

    const { error } = await admin.from("annonces_pilote").insert({
      pilote_id: pilote.id,
      duree: source.duree,
      places: source.places,
      prix_total: source.prix_total,
      part_pilote: source.part_pilote,
      description: source.description,
      images: source.images,
    });

    if (error) return { error: "Erreur republication de l'annonce" };

    revalidatePath("/pilote/annonces");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur serveur" };
  }
}

export async function cancelAnnonce(id: string) {
  try {
    const pilote = await checkPilote();
    const admin = createAdminClient();
    const { error } = await admin
      .from("annonces_pilote")
      .update({ statut: "annulee" })
      .eq("id", id)
      .eq("pilote_id", pilote.id);
    if (error) return { error: error.message };
    revalidatePath("/pilote/annonces");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur serveur" };
  }
}

// ── Photos d'annonce ─────────────────────────────────────────────────────
// Uploadées progressivement pendant que le pilote compose son annonce (avant
// même que createAnnonce() soit appelé) — même logique que les photos de
// satisfaction (app/api/satisfaction/photo/route.ts) : compression sharp en
// webp, stockées sous ${pilote.id}/... pour scoper la suppression.

export async function uploadAnnonceImage(formData: FormData) {
  try {
    const pilote = await checkPilote();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: "Fichier manquant" };
    if (file.size > MAX_PHOTO_SIZE) return { error: "Cette photo dépasse 12 Mo" };
    if (!file.type.startsWith("image/")) return { error: "Fichier non pris en charge" };

    const admin = createAdminClient();
    const input = Buffer.from(await file.arrayBuffer());
    const optimized = await sharp(input)
      .rotate()
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const path = `${pilote.id}/${crypto.randomUUID()}.webp`;
    const { error: uploadErr } = await admin.storage
      .from("annonces")
      .upload(path, optimized, { contentType: "image/webp", upsert: false });
    if (uploadErr) return { error: "Erreur lors de l'envoi de la photo" };

    const { data: urlData } = admin.storage.from("annonces").getPublicUrl(path);
    return { success: true, path, url: urlData.publicUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur serveur" };
  }
}

export async function deleteAnnonceImageFile(path: string) {
  try {
    const pilote = await checkPilote();
    if (!path.startsWith(`${pilote.id}/`)) return { error: "Non autorisé" };
    const admin = createAdminClient();
    await admin.storage.from("annonces").remove([path]);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur serveur" };
  }
}
