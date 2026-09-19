"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSelfActivePilote } from "./auth-guards";
import { CHARTE_VERSION } from "@/lib/pilote/charte";
import sharp from "sharp";

const MAX_PHOTO_SIZE = 12 * 1024 * 1024; // 12 Mo avant compression

// Bloc A · items 5 & 6 — le pilote gère lui-même sa fiche et accepte la charte.

export type PiloteProfilInput = {
  bio?: string | null;
  photo_url?: string | null;
  telephone?: string | null;
  signature?: string | null;
  iban?: string | null;
  licence_numero?: string | null;
  licence_expiration?: string | null; // 'YYYY-MM-DD' ou ''
  medical_expiration?: string | null;
  ratings?: string | null;
};

const clean = (v: string | null | undefined) => {
  const s = (v ?? "").trim();
  return s === "" ? null : s;
};

// Rejette une date qui n'est pas au format 'YYYY-MM-DD' (les <input type="date">
// renvoient déjà ce format ; on garde le garde-fou pour les appels directs).
const cleanDate = (v: string | null | undefined) => {
  const s = clean(v);
  if (s && !/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error("Date invalide");
  return s;
};

export async function updateMyPiloteProfile(input: PiloteProfilInput) {
  try {
    const { piloteId } = await requireSelfActivePilote();
    const db = createAdminClient();

    const { error } = await db
      .from("pilotes")
      .update({
        bio: clean(input.bio),
        photo_url: clean(input.photo_url),
        telephone: clean(input.telephone),
        signature: clean(input.signature),
        iban: clean(input.iban),
        licence_numero: clean(input.licence_numero),
        licence_expiration: cleanDate(input.licence_expiration),
        medical_expiration: cleanDate(input.medical_expiration),
        ratings: clean(input.ratings),
      })
      .eq("id", piloteId);

    if (error) return { error: error.message };
    revalidatePath("/pilote/profil");
    revalidatePath("/pilote");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error && e.message === "Date invalide" ? "Date invalide" : "Erreur serveur" };
  }
}

// Photo de profil : uploadée directement (au lieu d'un lien externe), stockée
// dans le même bucket public que les photos d'annonces. Nom fixe par pilote
// (upsert) : un nouvel envoi remplace l'ancienne photo, pas d'accumulation.
export async function uploadPiloteProfilPhoto(formData: FormData) {
  try {
    const { piloteId } = await requireSelfActivePilote();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: "Fichier manquant" };
    if (file.size > MAX_PHOTO_SIZE) return { error: "Cette photo dépasse 12 Mo" };
    if (!file.type.startsWith("image/")) return { error: "Fichier non pris en charge" };

    const admin = createAdminClient();
    const input = Buffer.from(await file.arrayBuffer());
    const optimized = await sharp(input)
      .rotate()
      .resize({ width: 800, height: 800, fit: "cover" })
      .webp({ quality: 85 })
      .toBuffer();

    const path = `profil/${piloteId}.webp`;
    const { error: uploadErr } = await admin.storage
      .from("annonces")
      .upload(path, optimized, { contentType: "image/webp", upsert: true });
    if (uploadErr) return { error: "Erreur lors de l'envoi de la photo" };

    const { data: urlData } = admin.storage.from("annonces").getPublicUrl(path);
    // Contourne le cache CDN/navigateur sur un remplacement au même chemin.
    const url = `${urlData.publicUrl}?v=${Date.now()}`;

    const { error } = await admin.from("pilotes").update({ photo_url: url }).eq("id", piloteId);
    if (error) return { error: error.message };

    revalidatePath("/pilote/profil");
    revalidatePath("/pilote");
    return { success: true, url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur serveur" };
  }
}

export async function acceptCharte() {
  try {
    const { piloteId } = await requireSelfActivePilote();
    const db = createAdminClient();

    const { error } = await db
      .from("pilotes")
      .update({
        conditions_accepted_at: new Date().toISOString(),
        conditions_version: CHARTE_VERSION,
      })
      .eq("id", piloteId);

    if (error) return { error: error.message };
    revalidatePath("/pilote");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}
