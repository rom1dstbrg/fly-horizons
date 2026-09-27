"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireSelfActivePilote } from "./auth-guards";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import {
  piloteDocumentsEnvoyesAdminEmail, piloteDocumentsVerifiesEmail, piloteDocumentsRefusesEmail,
} from "@/lib/email-templates";

// Documents du pilote (licence, certificat médical) — décision 27/09.
// Bucket PRIVÉ « pilote-documents » : le pilote envoie ses fichiers directement
// au stockage via une URL signée (pas de passage par la fonction Vercel, limitée
// à 4,5 Mo), Romain les consulte via des URL signées de 10 min, puis les
// fichiers sont SUPPRIMÉS dès qu'il valide ou refuse. On garde la trace
// (docs_status, docs_verified_at, docs_note), jamais les fichiers.

const BUCKET = "pilote-documents";
const MAX_SIZE = 15 * 1024 * 1024;
const TYPES = ["licence", "medical", "autre"] as const;
type DocType = (typeof TYPES)[number];
const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

function siteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return raw.startsWith("http://localhost") || raw.startsWith("http://127") ? raw : "https://fly-horizons.com";
}

export interface PiloteDocument {
  id: string;
  type: DocType;
  file_name: string | null;
  created_at: string;
}

// ── Côté pilote ─────────────────────────────────────────────────

/** Étape 1 : URL signée pour envoyer un fichier directement au stockage. */
export async function createMyDocumentUpload(input: { type: string; contentType: string; size: number }) {
  try {
    const { piloteId } = await requireSelfActivePilote();
    if (!TYPES.includes(input.type as DocType)) return { error: "Type de document invalide" };
    const ext = EXT[input.contentType];
    if (!ext) return { error: "Format non pris en charge (PDF, JPG, PNG ou HEIC)" };
    if (input.size > MAX_SIZE) return { error: "Ce fichier dépasse 15 Mo" };

    const db = createAdminClient();
    const { data: pilote } = await db.from("pilotes").select("docs_status").eq("id", piloteId).single();
    if (pilote?.docs_status === "envoyes") return { error: "Vos documents sont en cours de vérification" };

    const path = `${piloteId}/${input.type}-${Date.now()}.${ext}`;
    const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return { error: "Envoi impossible pour le moment" };
    return { path: data.path, token: data.token };
  } catch {
    return { error: "Erreur serveur" };
  }
}

/** Étape 2 : le fichier est arrivé, on l'enregistre. */
export async function confirmMyDocumentUpload(input: { type: string; path: string; fileName: string }) {
  try {
    const { piloteId } = await requireSelfActivePilote();
    if (!TYPES.includes(input.type as DocType)) return { error: "Type de document invalide" };
    if (!input.path.startsWith(`${piloteId}/`)) return { error: "Chemin invalide" };

    const db = createAdminClient();
    const name = input.path.slice(piloteId.length + 1);
    const { data: found } = await db.storage.from(BUCKET).list(piloteId, { search: name });
    if (!found?.some((f) => f.name === name)) return { error: "Fichier introuvable, recommencez l'envoi" };

    const { error } = await db.from("pilote_documents").insert({
      pilote_id: piloteId,
      type: input.type,
      path: input.path,
      file_name: input.fileName.slice(0, 200),
    });
    if (error) return { error: error.message };
    revalidatePath("/pilote/profil");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function deleteMyDocument(id: string) {
  try {
    const { piloteId } = await requireSelfActivePilote();
    const db = createAdminClient();
    const { data: doc } = await db.from("pilote_documents").select("path").eq("id", id).eq("pilote_id", piloteId).single();
    if (!doc) return { error: "Document introuvable" };
    const { data: pilote } = await db.from("pilotes").select("docs_status").eq("id", piloteId).single();
    if (pilote?.docs_status === "envoyes") return { error: "Vos documents sont en cours de vérification" };
    await db.storage.from(BUCKET).remove([doc.path]);
    await db.from("pilote_documents").delete().eq("id", id);
    revalidatePath("/pilote/profil");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

/** Le pilote soumet ses documents : Romain est prévenu. */
export async function submitMyDocuments() {
  try {
    const { piloteId } = await requireSelfActivePilote();
    const db = createAdminClient();
    const { data: docs } = await db.from("pilote_documents").select("type").eq("pilote_id", piloteId);
    const types = new Set((docs ?? []).map((d) => d.type));
    if (!types.has("licence") || !types.has("medical")) {
      return { error: "Ajoutez au moins votre licence (avec la page SEP) et votre certificat médical." };
    }

    const { data: pilote, error } = await db
      .from("pilotes")
      .update({ docs_status: "envoyes", docs_note: null })
      .eq("id", piloteId)
      .select("nom")
      .single();
    if (error) return { error: error.message };

    await resend.emails
      .send({
        from: EMAIL_FROM,
        to: [EMAIL_REPLY_TO],
        subject: `Documents pilote à vérifier · ${pilote?.nom ?? ""}`,
        html: piloteDocumentsEnvoyesAdminEmail({
          piloteNom: pilote?.nom ?? "Un pilote",
          nbDocuments: docs?.length ?? 0,
          url: `${siteUrl()}/admin/pilotes`,
        }),
      })
      .catch(() => {});

    revalidatePath("/pilote/profil");
    revalidatePath("/pilote");
    revalidatePath("/admin/pilotes");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

// ── Côté admin ──────────────────────────────────────────────────

/** Documents d'un pilote avec des liens de lecture valables 10 minutes. */
export async function getPiloteDocumentsForReview(piloteId: string) {
  try {
    await requireAdmin();
    const db = createAdminClient();
    const { data: docs } = await db.from("pilote_documents").select("id, type, path, file_name, created_at").eq("pilote_id", piloteId).order("created_at");
    const withUrls = await Promise.all(
      (docs ?? []).map(async (d) => {
        const { data } = await db.storage.from(BUCKET).createSignedUrl(d.path, 600);
        return { id: d.id, type: d.type as DocType, file_name: d.file_name, created_at: d.created_at, url: data?.signedUrl ?? null };
      }),
    );
    return { documents: withUrls };
  } catch {
    return { error: "Erreur serveur" };
  }
}

async function purgeDocuments(db: ReturnType<typeof createAdminClient>, piloteId: string) {
  const { data: docs } = await db.from("pilote_documents").select("path").eq("pilote_id", piloteId);
  const paths = (docs ?? []).map((d) => d.path);
  if (paths.length) await db.storage.from(BUCKET).remove(paths);
  await db.from("pilote_documents").delete().eq("pilote_id", piloteId);
}

/**
 * Valide les documents (ou une vérification faite en visio / en main propre,
 * sans fichier) : trace de ce qui a été vu, puis suppression des fichiers.
 */
export async function verifyPiloteDocuments(piloteId: string, note: string) {
  try {
    await requireAdmin();
    if (!note.trim()) return { error: "Notez ce que vous avez vérifié" };
    const db = createAdminClient();
    const { data: pilote, error } = await db
      .from("pilotes")
      .update({ docs_status: "verifies", docs_verified_at: new Date().toISOString(), docs_note: note.trim() })
      .eq("id", piloteId)
      .select("nom, email")
      .single();
    if (error) return { error: error.message };
    await purgeDocuments(db, piloteId);

    if (pilote?.email) {
      await resend.emails
        .send({
          from: EMAIL_FROM,
          to: [pilote.email],
          replyTo: EMAIL_REPLY_TO,
          subject: "Fly Horizons · Vos documents sont vérifiés",
          html: piloteDocumentsVerifiesEmail({ nom: pilote.nom, url: `${siteUrl()}/pilote/profil` }),
        })
        .catch(() => {});
    }
    revalidatePath("/admin/pilotes");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function refusePiloteDocuments(piloteId: string, motif: string) {
  try {
    await requireAdmin();
    if (!motif.trim()) return { error: "Indiquez le motif du refus" };
    const db = createAdminClient();
    const { data: pilote, error } = await db
      .from("pilotes")
      .update({ docs_status: "refuses", docs_verified_at: null, docs_note: motif.trim() })
      .eq("id", piloteId)
      .select("nom, email")
      .single();
    if (error) return { error: error.message };
    await purgeDocuments(db, piloteId);

    if (pilote?.email) {
      await resend.emails
        .send({
          from: EMAIL_FROM,
          to: [pilote.email],
          replyTo: EMAIL_REPLY_TO,
          subject: "Fly Horizons · Documents à renvoyer",
          html: piloteDocumentsRefusesEmail({ nom: pilote.nom, motif: motif.trim(), url: `${siteUrl()}/pilote/profil` }),
        })
        .catch(() => {});
    }
    revalidatePath("/admin/pilotes");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}
