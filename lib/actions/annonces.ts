"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { evaluerPartPilote } from "@/lib/annonces-pilote";
import { finalizeAnnonceGroupPricing } from "@/lib/annonces-pilote-server";
import { piloteLegalStatus } from "@/lib/pilote/legal";
import sharp from "sharp";

const MAX_IMAGES = 6;
const MAX_PHOTO_SIZE = 12 * 1024 * 1024; // 12 Mo avant compression

/** IBAN plausible : 2 lettres pays + 2 chiffres + 11 à 30 alphanum. */
function isProbablyIban(v: string | null | undefined): boolean {
  if (!v) return false;
  const s = v.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s);
}

async function checkPilote() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  // isAdmin passe aussi : un compte admin peut avoir sa propre fiche pilote
  // (cas de Romain, admin + pilote sur le même compte depuis le 14/09).
  if (profile?.role !== "pilote" && profile?.role !== "admin") throw new Error("Non autorisé");

  const admin = createAdminClient();
  const { data: pilote } = await admin
    .from("pilotes")
    .select(
      "id, statut, iban, licence_numero, licence_expiration, medical_expiration, conditions_accepted_at",
    )
    .eq("user_id", user.id)
    .single();
  if (!pilote) throw new Error("Fiche pilote introuvable");
  if (pilote.statut !== "actif") throw new Error("Compte pilote désactivé");
  return pilote;
}

/**
 * Garde-fous communs à la publication / modification d'une annonce :
 * informations légales à jour (décision 2026-09-06 « déclaratif mais bloquant »)
 * + IBAN valide (le règlement se fait par virement direct au pilote).
 */
function checkPublicationGates(pilote: Awaited<ReturnType<typeof checkPilote>>): string | null {
  if (!piloteLegalStatus(pilote).ok) {
    return "Complétez vos informations légales (numéro de licence, expirations licence et médical, charte pilote) dans votre profil avant de publier une annonce.";
  }
  if (!isProbablyIban(pilote.iban)) {
    return "Ajoutez un IBAN valide dans votre profil avant de publier une annonce : c'est là que le client vous règlera par virement.";
  }
  return null;
}

type RouteWaypoint = { lat: number; lng: number; nom?: string };

export async function createAnnonce(data: {
  titre?: string;
  duree: number;
  places: number;
  prix_total: number;
  part_pilote: number;
  mode_vente?: "avion" | "place";
  description?: string;
  images?: string[];
  legal_ok?: boolean;
  route_waypoints?: RouteWaypoint[];
}) {
  try {
    const pilote = await checkPilote();

    if (!(data.duree >= 10 && data.duree <= 240)) return { error: "Durée invalide (10 à 240 minutes)" };
    if (!(data.places >= 1 && data.places <= 6)) return { error: "Nombre de places invalide (1 à 6)" };
    if (!(data.prix_total > 0) || !(data.part_pilote >= 0)) {
      return { error: "Indiquez un prix total et votre part." };
    }
    if (!data.legal_ok) {
      return { error: "Vous devez confirmer que vous réalisez ce vol et partagez vos frais pour publier." };
    }
    const gate = checkPublicationGates(pilote);
    if (gate) return { error: gate };
    const modeVente = data.mode_vente === "place" ? "place" : "avion";
    const images = (data.images ?? []).slice(0, MAX_IMAGES);

    // Le minimum légal (part égale, pilote compris) n'est plus bloquant à la
    // publication — le pilote reste seul responsable de sa part réelle
    // (NCO.GEN.104). On calcule quand même le niveau pour l'avertissement
    // affiché dans le formulaire et le badge « À confirmer » du dashboard.
    const check = evaluerPartPilote(data.prix_total, data.part_pilote, data.places);

    const admin = createAdminClient();
    const { error } = await admin.from("annonces_pilote").insert({
      pilote_id: pilote.id,
      titre: data.titre?.trim() || null,
      duree: data.duree,
      places: data.places,
      prix_total: data.prix_total,
      part_pilote: data.part_pilote,
      mode_vente: modeVente,
      description: data.description?.trim() || null,
      images,
      legal_ok: true,
      legal_ok_at: new Date().toISOString(),
      route_waypoints: data.route_waypoints?.length ? data.route_waypoints : null,
    });

    if (error) return { error: "Erreur création de l'annonce" };

    revalidatePath("/pilote/annonces");
    return { success: true, warning: check.level !== "ok" ? check.message : null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur serveur" };
  }
}

export async function updateAnnonce(id: string, data: {
  titre?: string;
  duree: number;
  places: number;
  prix_total: number;
  part_pilote: number;
  mode_vente?: "avion" | "place";
  description?: string;
  images?: string[];
  legal_ok?: boolean;
  route_waypoints?: RouteWaypoint[];
}) {
  try {
    const pilote = await checkPilote();

    if (!(data.duree >= 10 && data.duree <= 240)) return { error: "Durée invalide (10 à 240 minutes)" };
    if (!(data.places >= 1 && data.places <= 6)) return { error: "Nombre de places invalide (1 à 6)" };
    if (!(data.prix_total > 0) || !(data.part_pilote >= 0)) {
      return { error: "Indiquez un prix total et votre part." };
    }
    if (!data.legal_ok) {
      return { error: "Vous devez confirmer que vous réalisez ce vol et partagez vos frais pour publier." };
    }
    const gate = checkPublicationGates(pilote);
    if (gate) return { error: gate };
    const modeVente = data.mode_vente === "place" ? "place" : "avion";
    const images = (data.images ?? []).slice(0, MAX_IMAGES);

    const check = evaluerPartPilote(data.prix_total, data.part_pilote, data.places);

    const admin = createAdminClient();
    const { data: updated, error } = await admin
      .from("annonces_pilote")
      .update({
        titre: data.titre?.trim() || null,
        duree: data.duree,
        places: data.places,
        prix_total: data.prix_total,
        part_pilote: data.part_pilote,
        mode_vente: modeVente,
        description: data.description?.trim() || null,
        images,
        legal_ok: true,
        legal_ok_at: new Date().toISOString(),
        route_waypoints: data.route_waypoints?.length ? data.route_waypoints : null,
      })
      .eq("id", id)
      .eq("pilote_id", pilote.id)
      .select("id")
      .maybeSingle();

    if (error || !updated) return { error: "Erreur mise à jour de l'annonce" };

    revalidatePath("/pilote/annonces");
    return { success: true, warning: check.level !== "ok" ? check.message : null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur serveur" };
  }
}

// Republier une annonce annulée/réservée en une nouvelle annonce publiée, sans
// tout ressaisir — duplique les champs, laisse l'ancienne ligne intacte (historique).
export async function republishAnnonce(id: string) {
  try {
    const pilote = await checkPilote();
    const gate = checkPublicationGates(pilote);
    if (gate) return { error: gate };
    const admin = createAdminClient();

    const { data: source } = await admin
      .from("annonces_pilote")
      .select("titre, duree, places, prix_total, part_pilote, mode_vente, description, images, legal_ok, legal_ok_at, route_waypoints")
      .eq("id", id)
      .eq("pilote_id", pilote.id)
      .single();

    if (!source) return { error: "Annonce introuvable" };

    const { error } = await admin.from("annonces_pilote").insert({
      pilote_id: pilote.id,
      titre: source.titre,
      duree: source.duree,
      places: source.places,
      prix_total: source.prix_total,
      part_pilote: source.part_pilote,
      mode_vente: source.mode_vente ?? "avion",
      description: source.description,
      images: source.images,
      route_waypoints: source.route_waypoints,
      // On reporte l'attestation de la source. Si elle n'était pas attestée
      // (annonce d'avant le garde-fou), la copie reste « à confirmer » : le
      // pilote devra l'éditer, ce qui repasse par la case à cocher.
      legal_ok: source.legal_ok ?? false,
      legal_ok_at: source.legal_ok_at ?? null,
    });

    if (error) return { error: "Erreur republication de l'annonce" };

    revalidatePath("/pilote/annonces");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur serveur" };
  }
}

/**
 * Suppression définitive — seulement si aucune réservation n'a jamais été
 * faite sur cette annonce (même annulée, pour garder l'historique). Sinon,
 * redirige vers « Annuler » qui conserve la ligne.
 */
export async function deleteAnnonce(id: string) {
  try {
    const pilote = await checkPilote();
    const admin = createAdminClient();

    const { count } = await admin
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("annonce_id", id);
    if ((count ?? 0) > 0) {
      return { error: "Des réservations existent sur cette annonce : utilisez « Annuler » plutôt que « Supprimer »." };
    }

    const { data: annonce } = await admin
      .from("annonces_pilote")
      .select("images")
      .eq("id", id)
      .eq("pilote_id", pilote.id)
      .maybeSingle();
    if (!annonce) return { error: "Annonce introuvable" };

    if (annonce.images?.length) {
      await admin.storage.from("annonces").remove(annonce.images);
    }

    const { error } = await admin
      .from("annonces_pilote")
      .delete()
      .eq("id", id)
      .eq("pilote_id", pilote.id);
    if (error) return { error: error.message };

    revalidatePath("/pilote/annonces");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur serveur" };
  }
}

/**
 * Mode « à la place » uniquement : le pilote clôture le groupe avant qu'il
 * soit complet (sinon ça se fait automatiquement). Fige le prix définitif de
 * chaque réservation déjà inscrite, à parts égales entre les occupants réels
 * (décision 2026-09-13 — pas sur la capacité max déclarée à la publication).
 */
export async function cloturerGroupeAnnonce(id: string) {
  try {
    const pilote = await checkPilote();
    const admin = createAdminClient();

    const { data: annonce } = await admin
      .from("annonces_pilote")
      .select("id, statut, mode_vente, places_reservees, prix_total, part_pilote")
      .eq("id", id)
      .eq("pilote_id", pilote.id)
      .maybeSingle();
    if (!annonce) return { error: "Annonce introuvable" };
    if (annonce.mode_vente !== "place") return { error: "Cette annonce n'est pas en mode « à la place »" };
    if (annonce.statut !== "publiee") return { error: "Cette annonce n'est plus ouverte" };
    if (!annonce.places_reservees) return { error: "Aucune réservation sur cette annonce pour l'instant" };

    const { error } = await admin
      .from("annonces_pilote")
      .update({ statut: "reservee" })
      .eq("id", id)
      .eq("statut", "publiee");
    if (error) return { error: error.message };

    await finalizeAnnonceGroupPricing(admin, id, annonce.prix_total, annonce.part_pilote);

    revalidatePath("/pilote/annonces");
    revalidatePath("/pilote/vols");
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
