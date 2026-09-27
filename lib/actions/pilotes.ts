"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { reservationAutoAnnuleeEmail, piloteInvitationEmail, piloteAccesEmail } from "@/lib/email-templates";

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

// ── Lien d'activation pilote ───────────────────────────────────────────────
// Supabase génère le lien (generateLink), nous envoyons l'email nous-mêmes via
// Resend : design V2, en français, sans dépendre du SMTP de Supabase.
// « invite » crée le compte s'il n'existe pas, ou renvoie un lien à un compte
// invité pas encore activé ; un compte déjà activé reçoit un lien « recovery ».
// Les deux mènent au choix du mot de passe dans l'espace pilote.

type AdminClient = ReturnType<typeof createAdminClient>;

async function sendActivationLink(
  supabase: AdminClient,
  email: string,
  nom: string,
  mode: "invite" | "recovery",
): Promise<{ userId?: string; error?: string }> {
  const redirectTo = `${siteUrl()}/auth/callback?next=/pilote/mot-de-passe`;
  const { data, error } = mode === "invite"
    ? await supabase.auth.admin.generateLink({ type: "invite", email, options: { redirectTo, data: { full_name: nom } } })
    : await supabase.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
  if (error || !data?.properties?.action_link || !data.user) {
    return { error: error?.message ?? "Lien non généré" };
  }

  const { error: mailErr } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [email],
    replyTo: EMAIL_REPLY_TO,
    subject: "Fly Horizons · Votre accès à l'espace pilote",
    html: piloteInvitationEmail({ nom, url: data.properties.action_link }),
  });
  if (mailErr) return { userId: data.user.id, error: "Email non envoyé" };
  return { userId: data.user.id };
}

// ── Inviter un nouveau pilote ──────────────────────────────────────────────
// Crée le compte auth + envoie notre email d'activation, crée la fiche pilotes,
// et bascule le rôle du profil sur "pilote" (le profil lui-même est créé par le
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
    const nom = data.nom.trim();
    if (!nom || !email) return { error: "Nom et email obligatoires" };

    const { data: existing } = await supabase.from("pilotes").select("id").eq("email", email).maybeSingle();
    if (existing) return { error: "Un pilote existe déjà avec cet email" };

    // L'email a-t-il déjà un compte (client inscrit) ? Si oui on promeut ce
    // compte et on prévient la personne ; sinon on crée le compte par invitation.
    const { data: existingUserId } = await supabase.rpc("get_auth_user_id_by_email", { email_input: email });

    let userId: string;
    let promoted = false;
    let mailFailed = false;

    if (existingUserId) {
      userId = existingUserId as string;
      promoted = true;
    } else {
      const res = await sendActivationLink(supabase, email, nom, "invite");
      if (!res.userId) return { error: "Erreur lors de l'invitation" };
      userId = res.userId;
      mailFailed = !!res.error;
    }

    const { error: pilError } = await supabase.from("pilotes").insert({
      user_id: userId,
      nom,
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
    // Un admin reste admin (il accède déjà à /pilote avec ce rôle).
    const { data: currentProfile } = await supabase.from("profiles").select("full_name, role").eq("id", userId).maybeSingle();
    await supabase
      .from("profiles")
      .update({
        role: currentProfile?.role === "admin" ? "admin" : "pilote",
        full_name: currentProfile?.full_name?.trim() || nom,
      })
      .eq("id", userId);

    if (promoted) {
      const { error: mailErr } = await resend.emails.send({
        from: EMAIL_FROM,
        to: [email],
        replyTo: EMAIL_REPLY_TO,
        subject: "Fly Horizons · Votre espace pilote est ouvert",
        html: piloteAccesEmail({ nom, url: `${siteUrl()}/login?redirectTo=/pilote` }),
      });
      mailFailed = !!mailErr;
    }

    revalidatePath("/admin/pilotes");
    return { success: true, promoted, mailFailed };
  } catch {
    return { error: "Erreur serveur" };
  }
}

// ── Renvoyer le lien d'activation ──────────────────────────────────────────
// Lien expiré, email perdu, pilote qui n'a jamais choisi son mot de passe.

export async function resendPiloteInvitation(id: string) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();

    const { data: pilote } = await supabase.from("pilotes").select("nom, email, user_id").eq("id", id).single();
    if (!pilote?.user_id) return { error: "Pilote introuvable" };

    const { data: authData } = await supabase.auth.admin.getUserById(pilote.user_id);
    const email = authData?.user?.email ?? pilote.email;
    const mode = authData?.user?.email_confirmed_at ? "recovery" : "invite";

    const res = await sendActivationLink(supabase, email, pilote.nom, mode);
    if (res.error) return { error: res.error === "Email non envoyé" ? res.error : "Erreur lors de l'envoi du lien" };
    return { success: true, email };
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
    //  · vols STANDARD assignés (Bloc B) → désassignés, redeviennent des demandes ;
    //  · vols d'ANNONCE en cours et non réglés → annulés + client prévenu (on ne les
    //    réassigne pas : c'est le vol du pilote, pas celui de Romain) ;
    //  · vols d'annonce DÉJÀ réglés → laissés tels quels, signalés à l'admin ;
    //  · annonces publiées / réservées (sans résa payée) → dépubliées.
    let releasedFlights = 0;
    let unpublishedAnnonces = 0;
    let cancelledAnnonceResas = 0;
    let paidOrphans = 0;
    if (!actif) {
      const today = new Date().toISOString().slice(0, 10);

      // 1. Vols standard assignés → désassignés (jamais les annonces).
      const { data: released } = await supabase
        .from("reservations")
        .update({ pilote_id: null, pilote_assigned_at: null })
        .eq("pilote_id", id)
        .eq("type_resa", "standard")
        .neq("statut", "vol_effectue")
        .neq("statut", "annulee")
        .gte("date_vol", today)
        .select("id");
      releasedFlights = released?.length ?? 0;

      for (const r of released ?? []) {
        await supabase.from("reservation_history").insert({
          reservation_id: r.id,
          action: "unassign_pilote",
          author: "admin",
          note: "Pilote retiré automatiquement (compte désactivé), vol à réassigner",
        });
      }

      // 2. Réservations d'annonce en cours de ce pilote.
      const { data: annonceResas } = await supabase
        .from("reservations")
        .select("id, annonce_id, date_vol, heure_vol, duree, pilote_paye, statut, clients(prenom, nom, email)")
        .eq("pilote_id", id)
        .eq("type_resa", "annonce_pilote")
        .not("statut", "in", "(vol_effectue,annulee)")
        .gte("date_vol", today);

      for (const r of annonceResas ?? []) {
        if (r.pilote_paye === true) {
          paidOrphans++;
          await supabase.from("reservation_history").insert({
            reservation_id: r.id,
            action: "field_changed",
            author: "admin",
            note: "Pilote désactivé — vol déjà réglé, à traiter manuellement (remboursement / report).",
          });
          continue;
        }
        // Non réglé → on annule et on prévient le client.
        await supabase.from("reservations").update({ statut: "annulee", payment_token: null }).eq("id", r.id);
        if (r.annonce_id) {
          await supabase.from("annonces_pilote").update({ statut: "annulee" }).eq("id", r.annonce_id);
        }
        cancelledAnnonceResas++;
        await supabase.from("reservation_history").insert({
          reservation_id: r.id,
          action: "field_changed",
          field: "statut",
          new_value: "annulee",
          author: "admin",
          note: "Vol annulé automatiquement : le pilote de l'annonce a été désactivé.",
        });
        const c = Array.isArray(r.clients) ? r.clients[0] : r.clients;
        if (c?.email) {
          const dateStr = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          });
          await resend.emails
            .send({
              from: EMAIL_FROM,
              to: [c.email],
              replyTo: EMAIL_REPLY_TO,
              subject: `Fly Horizons · Vol annulé · ${dateStr}`,
              html: reservationAutoAnnuleeEmail({
                prenom: c.prenom,
                nom: c.nom,
                dateStr,
                heure: (r.heure_vol ?? "-").slice(0, 5),
                duree: r.duree,
                bookingUrl: `${siteUrl()}/nos-offres`,
                source: "admin",
              }),
            })
            .catch(() => {});
        }
      }

      // 3. Annonces encore en vitrine (aucune résa active) → dépubliées.
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
    return { success: true, releasedFlights, unpublishedAnnonces, cancelledAnnonceResas, paidOrphans };
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

    // Fichiers de documents encore en attente : la base les supprime en cascade,
    // pas le stockage.
    const { data: docs } = await supabase.from("pilote_documents").select("path").eq("pilote_id", id);
    if (docs?.length) await supabase.storage.from("pilote-documents").remove(docs.map((d) => d.path));

    const { error } = await supabase.from("pilotes").delete().eq("id", id);
    if (error) return { error: error.message };

    if (pilote.user_id) {
      // On ne supprime le compte auth que s'il a été créé par l'invitation pilote
      // (invited_at posé). Un compte promu (client existant) est rendu à son état
      // de client, et un admin garde son rôle.
      const { data: authData } = await supabase.auth.admin.getUserById(pilote.user_id);
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", pilote.user_id).maybeSingle();

      if (profile?.role === "admin") {
        // rien : l'admin perd juste sa fiche pilote
      } else if (authData?.user?.invited_at) {
        await supabase.auth.admin.deleteUser(pilote.user_id);
      } else {
        await supabase.from("profiles").update({ role: "customer" }).eq("id", pilote.user_id);
      }
    }

    revalidatePath("/admin/pilotes");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}
