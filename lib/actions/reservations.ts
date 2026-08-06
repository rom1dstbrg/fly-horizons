"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { reservationDateConfirmeeEmail, reservationHeureConfirmeeEmail, reservationPaymentInvitationEmail, reservationConfirmationFreeEmail, reservationPaymentConfirmationEmail, volSurMesureAcompteEmail, postVolEmail, customEmail, rescheduleInviteEmail, rescheduleConfirmationEmail, reservationAutoAnnuleeEmail, slotProposalEmail } from "@/lib/email-templates";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { makeRescheduleToken, parseRescheduleToken } from "@/lib/reschedule-token";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Non autorisé");
}

const VALID_STATUTS_STD = ["demande_recue", "en_attente", "acompte_recu", "heure_confirmee", "vol_effectue", "annulee", "payment_pending"] as const;
const VALID_STATUTS_PERSO = ["en_attente", "acompte_recu", "date_confirmee", "heure_confirmee", "solde", "vol_effectue", "annulee", "payment_pending"] as const;

export async function updateStatutReservation(
  id: string,
  statut: string,
  routePayload?: { waypoints: Array<{ lat: number; lng: number; nom?: string }>; comment?: string } | null
) {
  try {
    await checkAdmin();
    if (!(VALID_STATUTS_STD as readonly string[]).includes(statut)) return { error: "Statut invalide" };
    const supabase = createAdminClient();
    const hasFreshRoute = !!routePayload?.waypoints?.length;

    // For heure_confirmee, route is required on standard reservations — sauf si routePayload
    // est fourni : dans ce cas la route est envoyée dans le même geste (voir plus bas).
    if (statut === "heure_confirmee" && !hasFreshRoute) {
      const { data: check } = await supabase
        .from("reservations")
        .select("route, type_resa")
        .eq("id", id)
        .single();
      if (check?.type_resa === "standard" && !check?.route?.trim()) {
        // final_waypoints seul ne suffit pas : c'est un brouillon (bouton "Sauvegarder"),
        // pas une preuve que le client a reçu la route. Il faut au moins un envoi ("Envoyer au client").
        const { count } = await supabase
          .from("route_proposals")
          .select("*", { count: "exact", head: true })
          .eq("reservation_id", id);
        if (!count) return { error: "Route requise avant de confirmer l'heure : tracez-la sur la carte, elle sera envoyée avec la confirmation" };
      }
    }

    const extra: Record<string, unknown> = {};
    if (statut === "heure_confirmee") extra.heure_confirmee_at = new Date().toISOString();
    const { error: updateErr } = await supabase.from("reservations").update({ statut, ...extra }).eq("id", id);
    if (updateErr) return { error: "Erreur mise à jour réservation" };

    // Libérer le voucher réservé si on annule (ex. demande déclinée) — sinon le code
    // reste bloqué en "reserved" indéfiniment alors que le vol n'aura jamais lieu.
    if (statut === "annulee") {
      const { data: resaData } = await supabase
        .from("reservations")
        .select("voucher_code")
        .eq("id", id)
        .single();
      if (resaData?.voucher_code) {
        await supabase
          .from("voucher_codes")
          .update({ status: "unused" })
          .eq("code", resaData.voucher_code)
          .eq("status", "reserved");
      }
    }

    // Le statut est déjà mis à jour en base à ce stade : un échec d'envoi d'email
    // ci-dessous ne doit jamais faire remonter "Erreur serveur" (ce qui laisserait
    // croire que rien n'a changé), seulement signaler emailError.
    let emailError = false;

    if (["acompte_recu", "heure_confirmee", "vol_effectue", "annulee"].includes(statut)) {
      const { data: resa } = await supabase
        .from("reservations")
        .select("*, clients(*)")
        .eq("id", id)
        .single();
      if (resa) {
        const client = resa.clients as unknown as { prenom: string; nom: string; email: string };
        const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
        const siteUrl = rawUrl.startsWith("http://localhost") || rawUrl.startsWith("http://127")
          ? rawUrl
          : "https://fly-horizons.com";
        const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
          weekday: "long", day: "numeric", month: "long", year: "numeric",
        });

        try {
          if (statut === "acompte_recu") {
            await resend.emails.send({
              from: EMAIL_FROM,
              to: [client.email],
              replyTo: EMAIL_REPLY_TO,
              subject: "Paiement confirmé · Fly Horizons",
              html: reservationPaymentConfirmationEmail({
                prenom: client.prenom,
                nom: client.nom,
                dateStr,
                heure: (resa.heure_vol ?? "-").slice(0, 5),
                duree: resa.duree,
                passengers: resa.passagers,
                poids_total: resa.poids_total,
                voucherCode: resa.voucher_code,
                montantPaye: resa.paye ?? resa.acompte ?? 0,
                reservationId: id,
                dateISO: resa.date_vol,
              }),
            });
          } else if (statut === "heure_confirmee") {
            let routeUrl: string | null = null;
            if (hasFreshRoute && routePayload) {
              // Route tracée/modifiée dans le drawer mais jamais envoyée (ou changée depuis) :
              // on l'envoie ici, dans le même email que la confirmation — un seul geste, un seul email.
              const { data: proposal } = await supabase
                .from("route_proposals")
                .insert({
                  reservation_id: id,
                  waypoints: routePayload.waypoints,
                  admin_comment: routePayload.comment ?? "",
                  duree: resa.duree ?? null,
                  acompte: resa.acompte ?? null,
                })
                .select("token")
                .single();
              if (proposal?.token) {
                routeUrl = `${siteUrl}/vol/proposition/${proposal.token}`;
                await supabase.from("reservation_history").insert({
                  reservation_id: id,
                  action: "route_proposal_sent",
                  new_value: `${routePayload.waypoints.length} points`,
                  note: routePayload.comment || "Envoyée avec la confirmation de créneau",
                  author: "admin",
                });
              }
            } else {
              // Chercher la dernière route_proposal déjà envoyée (nouveau système carte)
              const { data: proposal } = await supabase
                .from("route_proposals")
                .select("token")
                .eq("reservation_id", id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              if (proposal?.token) {
                routeUrl = `${siteUrl}/vol/proposition/${proposal.token}`;
              } else if (resa.route?.trim()) {
                // Fallback ancien système texte
                const routeToken = resa.route_token ?? crypto.randomUUID();
                await supabase
                  .from("reservations")
                  .update({ route_token: routeToken, route_status: "sent", route_responded_at: null, route_feedback: null })
                  .eq("id", id);
                routeUrl = `${siteUrl}/vol/itineraire/${routeToken}`;
              }
            }
            await resend.emails.send({
              from: EMAIL_FROM,
              to: [client.email],
              replyTo: EMAIL_REPLY_TO,
              subject: "Fly Horizons · Votre créneau horaire est confirmé",
              html: reservationHeureConfirmeeEmail({ prenom: client.prenom, dateStr, heure: resa.heure_vol, duree: resa.duree, route: resa.route, routeUrl, dateISO: resa.date_vol }),
            });
          } else if (statut === "vol_effectue") {
            await resend.emails.send({
              from: EMAIL_FROM,
              to: [client.email],
              replyTo: EMAIL_REPLY_TO,
              subject: "Merci pour votre vol · Fly Horizons",
              html: postVolEmail({
                prenom: client.prenom,
                dateStr,
                duree: resa.duree,
                surveyUrl: `${siteUrl}/satisfaction/${id}`,
              }),
            });
          } else {
            // annulee
            await resend.emails.send({
              from: EMAIL_FROM,
              to: [client.email],
              replyTo: EMAIL_REPLY_TO,
              subject: `Fly Horizons · Réservation annulée · ${dateStr}`,
              html: reservationAutoAnnuleeEmail({
                prenom: client.prenom,
                nom: client.nom,
                dateStr,
                heure: (resa.heure_vol ?? "-").slice(0, 5),
                duree: resa.duree,
                bookingUrl: "https://fly-horizons.com/reservation",
                source: "admin",
              }),
            });
          }
        } catch (e) {
          console.error(`[updateStatutReservation] Erreur email (${statut}):`, e);
          emailError = true;
        }
      }
    }

    revalidatePath("/admin/vols");
    return { success: true, emailError };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function updateStatutReservationPerso(id: string, statut: string) {
  try {
    await checkAdmin();
    if (!(VALID_STATUTS_PERSO as readonly string[]).includes(statut)) return { error: "Statut invalide" };
    const supabase = createAdminClient();

    const extra: Record<string, string> = {};
    if (statut === "date_confirmee") extra.date_confirmee_at = new Date().toISOString();
    if (statut === "heure_confirmee") extra.heure_confirmee_at = new Date().toISOString();
    const { error: updateErrPerso } = await supabase.from("reservations").update({ statut, ...extra }).eq("id", id);
    if (updateErrPerso) return { error: "Erreur mise à jour réservation" };

    // Libérer le voucher réservé si on annule — le webhook session.expired ne le fait plus
    // pour les perso (pour permettre les nouvelles tentatives de paiement jusqu'à J-4).
    if (statut === "annulee") {
      const { data: resaData } = await supabase
        .from("reservations")
        .select("voucher_code")
        .eq("id", id)
        .single();
      if (resaData?.voucher_code) {
        await supabase
          .from("voucher_codes")
          .update({ status: "unused" })
          .eq("code", resaData.voucher_code)
          .eq("status", "reserved");
      }
    }

    // Le statut est déjà mis à jour en base à ce stade : un échec d'envoi d'email
    // ci-dessous ne doit jamais faire remonter "Erreur serveur" (ce qui laisserait
    // croire que rien n'a changé), seulement signaler emailError.
    let emailError = false;

    if (["acompte_recu", "date_confirmee", "heure_confirmee", "vol_effectue", "annulee"].includes(statut)) {
      const { data: resa } = await supabase
        .from("reservations")
        .select("*, clients(*)")
        .eq("id", id)
        .single();
      if (resa) {
        const client = resa.clients as unknown as { prenom: string; nom: string; email: string };
        const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
        const siteUrl = rawUrl.startsWith("http://localhost") || rawUrl.startsWith("http://127")
          ? rawUrl
          : "https://fly-horizons.com";
        const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
          weekday: "long", day: "numeric", month: "long", year: "numeric",
        });

        try {
          if (statut === "acompte_recu") {
            await resend.emails.send({
              from: EMAIL_FROM,
              to: [client.email],
              replyTo: EMAIL_REPLY_TO,
              subject: "Provision reçue · Vol sur mesure Fly Horizons",
              html: volSurMesureAcompteEmail({
                prenom: client.prenom,
                nom: client.nom,
                dateStr,
                heure: (resa.heure_vol ?? "-").slice(0, 5),
                dureeEstimee: resa.duree,
                voucherCode: resa.voucher_code,
                montantPaye: resa.paye ?? resa.acompte ?? 0,
                reservationId: id,
                dateISO: resa.date_vol,
              }),
            });
          } else if (statut === "date_confirmee") {
            await resend.emails.send({
              from: EMAIL_FROM,
              to: [client.email],
              replyTo: EMAIL_REPLY_TO,
              subject: "Fly Horizons · Votre date de vol est confirmée",
              html: reservationDateConfirmeeEmail({ prenom: client.prenom, dateStr, duree: resa.duree }),
            });
          } else if (statut === "heure_confirmee") {
            await resend.emails.send({
              from: EMAIL_FROM,
              to: [client.email],
              replyTo: EMAIL_REPLY_TO,
              subject: "Fly Horizons · Votre créneau horaire est confirmé",
              html: reservationHeureConfirmeeEmail({ prenom: client.prenom, dateStr, heure: resa.heure_vol, duree: resa.duree, dateISO: resa.date_vol }),
            });
          } else if (statut === "vol_effectue") {
            await resend.emails.send({
              from: EMAIL_FROM,
              to: [client.email],
              replyTo: EMAIL_REPLY_TO,
              subject: "Merci pour votre vol · Fly Horizons",
              html: postVolEmail({
                prenom: client.prenom,
                dateStr,
                duree: resa.duree,
                surveyUrl: `${siteUrl}/satisfaction/${id}`,
              }),
            });
          } else {
            // annulee
            await resend.emails.send({
              from: EMAIL_FROM,
              to: [client.email],
              replyTo: EMAIL_REPLY_TO,
              subject: `Fly Horizons · Réservation annulée · ${dateStr}`,
              html: reservationAutoAnnuleeEmail({
                prenom: client.prenom,
                nom: client.nom,
                dateStr,
                heure: (resa.heure_vol ?? "-").slice(0, 5),
                duree: resa.duree,
                bookingUrl: "https://fly-horizons.com/vol-sur-mesure",
                source: "admin",
              }),
            });
          }
        } catch (e) {
          console.error(`[updateStatutReservationPerso] Erreur email (${statut}):`, e);
          emailError = true;
        }
      }
    }

    revalidatePath("/admin/vols");
    return { success: true, emailError };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function createAdminReservation(data: {
  client_id?: string;
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string;
  date_vol: string;
  heure_vol: string;
  duree: number;
  passagers: number;
  poids_total?: number | null;
  voucher_code?: string;
  envoyer_paiement: boolean;
  montant_override?: number | null;
  send_email?: boolean;
}) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();

    // Resolve or create client
    let clientId = data.client_id;
    if (!clientId) {
      if (!data.prenom || !data.nom || !data.email) {
        return { error: "Prénom, nom et email obligatoires pour un nouveau client" };
      }
      const { data: newId } = await supabase.rpc("next_client_id");
      if (!newId) return { error: "Erreur génération ID client" };
      const { error: cliErr } = await supabase.from("clients").insert({
        id: newId,
        prenom: data.prenom,
        nom: data.nom,
        email: data.email,
        telephone: data.telephone || null,
      });
      if (cliErr) return { error: "Erreur création client" };
      clientId = newId;
    }

    const { data: client } = await supabase.from("clients").select("*").eq("id", clientId).single();
    if (!client) return { error: "Client introuvable" };

    // Calculate price
    const { data: settings } = await supabase
      .from("crm_settings")
      .select("key, value")
      .in("key", ["prix_heure"]);
    const prixHeure = parseFloat(settings?.find(s => s.key === "prix_heure")?.value ?? "254");

    let voucherDuration = 0;
    let voucherId: string | null = null;
    if (data.voucher_code) {
      const { data: claimed } = await supabase
        .from("voucher_codes")
        .update({ status: "reserved" })
        .eq("code", data.voucher_code.toUpperCase().trim())
        .eq("status", "unused")
        .select("id, duration_minutes")
        .maybeSingle();
      if (!claimed) return { error: "Code voucher invalide ou déjà utilisé" };
      voucherDuration = claimed.duration_minutes ?? 0;
      voucherId = claimed.id;
    }

    const billableMins = Math.max(0, data.duree - voucherDuration);
    const montant = data.montant_override != null
      ? data.montant_override
      : Math.round((prixHeure / 60) * billableMins);

    const paymentToken = data.envoyer_paiement && montant > 0
      ? crypto.randomUUID()
      : null;
    const statut = data.envoyer_paiement && montant > 0 ? "payment_pending" : "en_attente";

    const { data: resa, error: resaErr } = await supabase
      .from("reservations")
      .insert({
        client_id: clientId,
        date_vol: data.date_vol,
        heure_vol: data.heure_vol,
        duree: data.duree,
        passagers: data.passagers,
        poids_total: data.poids_total || null,
        statut,
        type_resa: "standard",
        voucher_code: data.voucher_code?.toUpperCase().trim() || null,
        payment_token: paymentToken,
        acompte: montant > 0 ? montant : null,
      })
      .select()
      .single();

    if (resaErr) {
      if (voucherId) {
        await supabase.from("voucher_codes").update({ status: "unused" }).eq("id", voucherId).eq("status", "reserved");
      }
      return { error: "Erreur création réservation" };
    }

    if (voucherId && !paymentToken) {
      // Pas de paiement requis — marquer directement "used"
      // Si paymentToken existe, le voucher reste "reserved" ; le webhook Stripe le passera à "used"
      await supabase.from("voucher_codes").update({ status: "used", used_at: new Date().toISOString() }).eq("id", voucherId);
    }

    const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const siteUrl = rawUrl.startsWith("http://localhost") || rawUrl.startsWith("http://127")
      ? rawUrl
      : "https://fly-horizons.com";
    const dateStr = new Date(data.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    // La réservation existe déjà en base à ce stade : un échec d'envoi ne doit pas
    // renvoyer une erreur générique (l'admin recréerait sinon un doublon en retentant).
    let emailError = false;
    if (data.send_email !== false) {
      try {
        if (paymentToken && montant > 0) {
          const paymentUrl = `${siteUrl}/api/reservation/pay/${paymentToken}`;
          await resend.emails.send({
            from: EMAIL_FROM,
            to: [client.email],
            replyTo: EMAIL_REPLY_TO,
            subject: "Votre réservation : lien de paiement Fly Horizons",
            html: reservationPaymentInvitationEmail({
              prenom: client.prenom,
              nom: client.nom,
              dateStr,
              heure: data.heure_vol,
              duree: data.duree,
              montant,
              paymentUrl,
              voucherCode: data.voucher_code || null,
            }),
          });
        } else {
          await resend.emails.send({
            from: EMAIL_FROM,
            to: [client.email],
            replyTo: EMAIL_REPLY_TO,
            subject: "Votre réservation est enregistrée · Fly Horizons",
            html: reservationConfirmationFreeEmail({
              prenom: client.prenom,
              nom: client.nom,
              dateStr,
              heure: data.heure_vol,
              duree: data.duree,
              passengers: data.passagers,
              poids_total: data.poids_total ?? null,
              voucherCode: data.voucher_code?.toUpperCase().trim() || null,
              reservationId: resa.id,
            }),
          });
        }
      } catch (e) {
        console.error("[createAdminReservation] Erreur email:", e);
        emailError = true;
      }
    }

    revalidatePath("/admin/vols");
    revalidatePath("/admin/clients");
    return { success: true, reservationId: resa.id, emailError };
  } catch (e) {
    console.error("createAdminReservation error:", e);
    return { error: "Erreur serveur" };
  }
}

export async function createAdminVolMesure(data: {
  client_id?: string;
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string;
  date_vol: string;
  heure_vol: string;
  duree: number;
  passagers: number;
  poids_total?: number | null;
  distance_km?: number | null;
  commentaire?: string;
  taxes_escales?: number | null;
  waypoints?: { lat: number; lng: number; nom: string }[];
  stopovers?: { icao: string; nom: string; taxe: number }[];
  montant_override?: number | null;
  envoyer_paiement: boolean;
  send_email: boolean;
}) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();

    let clientId = data.client_id;
    if (!clientId) {
      if (!data.prenom || !data.nom || !data.email) {
        return { error: "Prénom, nom et email obligatoires pour un nouveau client" };
      }
      const { data: newId } = await supabase.rpc("next_client_id");
      if (!newId) return { error: "Erreur génération ID client" };
      const { error: cliErr } = await supabase.from("clients").insert({
        id: newId, prenom: data.prenom, nom: data.nom,
        email: data.email, telephone: data.telephone || null,
      });
      if (cliErr) return { error: "Erreur création client" };
      clientId = newId;
    }

    const { data: client } = await supabase.from("clients").select("*").eq("id", clientId).single();
    if (!client) return { error: "Client introuvable" };

    const { data: settings } = await supabase
      .from("crm_settings").select("key, value").in("key", ["prix_heure", "acompte_perso_heure"]);
    const prixHeure  = parseFloat(settings?.find(s => s.key === "prix_heure")?.value  ?? "254");
    const acompteH   = parseFloat(settings?.find(s => s.key === "acompte_perso_heure")?.value ?? "300");

    const acompteBase = Math.round((acompteH / 60) * data.duree);
    const taxes       = data.taxes_escales ?? 0;
    const montant     = data.montant_override != null
      ? data.montant_override
      : acompteBase + taxes;

    const paymentToken = data.envoyer_paiement && montant > 0 ? crypto.randomUUID() : null;
    const statut       = data.envoyer_paiement && montant > 0 ? "payment_pending" : "en_attente";

    const rawUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const siteUrl = rawUrl.startsWith("http://localhost") || rawUrl.startsWith("http://127")
      ? rawUrl : "https://fly-horizons.com";

    const { data: resa, error: resaErr } = await supabase
      .from("reservations")
      .insert({
        client_id:    clientId,
        date_vol:     data.date_vol,
        heure_vol:    data.heure_vol,
        duree:        data.duree,
        passagers:    data.passagers,
        poids_total:  data.poids_total  || null,
        commentaire:  data.commentaire  || null,
        distance_km:  data.distance_km  || null,
        taxes_escales: taxes > 0 ? taxes : null,
        waypoints:    data.waypoints?.length ? data.waypoints   : null,
        stopovers:    data.stopovers?.length  ? data.stopovers  : null,
        statut,
        type_resa:    "perso",
        acompte:      montant > 0 ? montant : null,
        payment_token: paymentToken,
      })
      .select()
      .single();

    if (resaErr) return { error: "Erreur création réservation" };

    const dateStr = new Date(data.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    // La réservation existe déjà en base à ce stade : un échec d'envoi ne doit pas
    // renvoyer une erreur générique (l'admin recréerait sinon un doublon en retentant).
    let emailError = false;
    if (data.send_email) {
      try {
        if (paymentToken && montant > 0) {
          const paymentUrl = `${siteUrl}/api/reservation/pay/${paymentToken}`;
          await resend.emails.send({
            from: EMAIL_FROM, to: [client.email], replyTo: EMAIL_REPLY_TO,
            subject: "Votre vol sur mesure : lien de paiement Fly Horizons",
            html: reservationPaymentInvitationEmail({
              prenom: client.prenom, nom: client.nom, dateStr,
              heure: data.heure_vol, duree: data.duree,
              montant, paymentUrl, voucherCode: null,
            }),
          });
        } else {
          await resend.emails.send({
            from: EMAIL_FROM, to: [client.email], replyTo: EMAIL_REPLY_TO,
            subject: "Votre vol sur mesure est enregistré · Fly Horizons",
            html: reservationConfirmationFreeEmail({
              prenom: client.prenom, nom: client.nom, dateStr,
              heure: data.heure_vol, duree: data.duree,
              passengers: data.passagers, poids_total: data.poids_total ?? null,
              voucherCode: null, reservationId: resa.id,
            }),
          });
        }
      } catch (e) {
        console.error("[createAdminVolMesure] Erreur email:", e);
        emailError = true;
      }
    }

    revalidatePath("/admin/vols");
    revalidatePath("/admin/clients");
    return { success: true, reservationId: resa.id, emailError };
  } catch (e) {
    console.error("createAdminVolMesure error:", e);
    return { error: "Erreur serveur" };
  }
}

export async function createHorSiteReservation(data: {
  client_id?: string;
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string;
  type_resa: "standard" | "perso";
  date_vol: string;
  heure_vol?: string;
  duree: number;
  passagers: number;
  poids_total?: number | null;
  commentaire?: string;
  prix_du: number;
  montant_recu: number;
}) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();

    if (!data.duree || data.duree <= 0) return { error: "Durée invalide" };
    if (data.montant_recu < 0) return { error: "Montant reçu invalide" };

    let clientId = data.client_id;
    if (!clientId) {
      if (!data.prenom || !data.nom) {
        return { error: "Prénom et nom obligatoires pour un nouveau client" };
      }
      const { data: newId } = await supabase.rpc("next_client_id");
      if (!newId) return { error: "Erreur génération ID client" };
      const { error: cliErr } = await supabase.from("clients").insert({
        id: newId,
        prenom: data.prenom,
        nom: data.nom,
        email: data.email || null,
        telephone: data.telephone || null,
      });
      if (cliErr) return { error: "Erreur création client" };
      clientId = newId;
    }

    const { error: resaErr } = await supabase.from("reservations").insert({
      client_id: clientId,
      date_vol: data.date_vol,
      heure_vol: data.heure_vol || null,
      duree: data.duree,
      duree_reelle: data.duree,
      passagers: data.passagers,
      poids_total: data.poids_total || null,
      commentaire: data.commentaire || null,
      statut: "vol_effectue",
      type_resa: data.type_resa,
      acompte: data.prix_du > 0 ? data.prix_du : null,
      paye: data.montant_recu > 0 ? data.montant_recu : null,
      payment_status: "paid",
    });

    if (resaErr) {
      console.error("createHorSiteReservation DB error:", resaErr);
      return { error: "Erreur création réservation" };
    }

    revalidatePath("/admin/vols");
    revalidatePath("/admin/clients");
    return { success: true };
  } catch (e) {
    console.error("createHorSiteReservation error:", e);
    return { error: "Erreur serveur" };
  }
}

export async function recordCashPayment(id: string, montant: number) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("reservations")
      .update({ paye: montant, payment_status: "paid", statut: "acompte_recu" })
      .eq("id", id);
    if (error) return { error: error.message };

    let emailError = false;
    const { data: resa } = await supabase
      .from("reservations")
      .select("*, clients(*)")
      .eq("id", id)
      .single();
    if (resa) {
      const client = resa.clients as unknown as { prenom: string; nom: string; email: string };
      const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });
      try {
        if (resa.type_resa === "perso") {
          await resend.emails.send({
            from: EMAIL_FROM,
            to: [client.email],
            replyTo: EMAIL_REPLY_TO,
            subject: "Provision reçue · Vol sur mesure Fly Horizons",
            html: volSurMesureAcompteEmail({
              prenom: client.prenom,
              nom: client.nom,
              dateStr,
              heure: (resa.heure_vol ?? "-").slice(0, 5),
              dureeEstimee: resa.duree,
              voucherCode: resa.voucher_code,
              montantPaye: montant,
              reservationId: id,
              dateISO: resa.date_vol,
            }),
          });
        } else {
          await resend.emails.send({
            from: EMAIL_FROM,
            to: [client.email],
            replyTo: EMAIL_REPLY_TO,
            subject: "Paiement confirmé · Fly Horizons",
            html: reservationPaymentConfirmationEmail({
              prenom: client.prenom,
              nom: client.nom,
              dateStr,
              heure: (resa.heure_vol ?? "-").slice(0, 5),
              duree: resa.duree,
              passengers: resa.passagers,
              poids_total: resa.poids_total,
              voucherCode: resa.voucher_code,
              montantPaye: montant,
              reservationId: id,
              dateISO: resa.date_vol,
            }),
          });
        }
      } catch (e) {
        console.error("[recordCashPayment] Erreur email:", e);
        emailError = true;
      }
    }

    revalidatePath("/admin/vols");
    revalidatePath("/admin");
    return { success: true, emailError };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function setAvionReserve(id: string, reserved: boolean) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("reservations")
      .update({ avion_reserve: reserved })
      .eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/vols");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function sendCustomEmail(id: string, subject: string, body: string, withReschedule = false) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();
    const { data: resa } = await supabase
      .from("reservations")
      .select("*, clients(*)")
      .eq("id", id)
      .single();
    if (!resa) return { error: "Réservation introuvable" };
    const client = resa.clients as { email: string; prenom: string; nom: string };

    let rescheduleUrl: string | null = null;
    if (withReschedule) {
      const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
      const siteUrl = rawUrl.startsWith("http://localhost") || rawUrl.startsWith("http://127")
        ? rawUrl : "https://fly-horizons.com";
      const uuid = crypto.randomUUID();
      await supabase.from("reservations").update({ reschedule_token: uuid }).eq("id", id);
      rescheduleUrl = `${siteUrl}/reservation/reporter/${makeRescheduleToken(uuid)}`;
    }

    const { error: emailError } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [client.email],
      replyTo: EMAIL_REPLY_TO,
      subject,
      html: customEmail({ subject, body, rescheduleUrl }),
    });
    if (emailError) {
      console.error("sendCustomEmail error:", emailError);
      return { error: `Email non envoyé — ${(emailError as { message?: string }).message ?? JSON.stringify(emailError)}` };
    }
    return { success: true };
  } catch (err) {
    console.error("sendCustomEmail exception:", err);
    return { error: "Erreur envoi email" };
  }
}

// ── Envoyer le lien de paiement depuis en_attente (admin) ────────────────────────

export async function sendPaymentLinkAdmin(id: string) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();

    const { data: resa } = await supabase
      .from("reservations")
      .select("*, clients(*)")
      .eq("id", id)
      .single();

    if (!resa) return { error: "Réservation introuvable" };
    const client = resa.clients as { prenom: string; nom: string; email: string } | null;
    if (!client?.email) return { error: "Email client introuvable" };

    let paymentToken = resa.payment_token as string | null;
    if (!paymentToken) {
      paymentToken = crypto.randomUUID();
      await supabase.from("reservations").update({ payment_token: paymentToken }).eq("id", id);
    }

    const { error: statusErr } = await supabase.from("reservations").update({ statut: "payment_pending" }).eq("id", id);
    if (statusErr) return { error: "Erreur mise à jour statut" };

    const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const siteUrl = rawUrl.startsWith("http://localhost") || rawUrl.startsWith("http://127")
      ? rawUrl
      : "https://fly-horizons.com";
    const paymentUrl = `${siteUrl}/api/reservation/pay/${paymentToken}`;
    const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    // Le statut est déjà "payment_pending" en base à ce stade : un échec d'envoi
    // ne doit pas renvoyer une erreur générique, l'admin a déjà un bouton "Renvoyer"
    // pour ce statut — on signale juste emailError pour qu'il sache qu'il faut l'utiliser.
    let emailError = false;
    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: [client.email],
        replyTo: EMAIL_REPLY_TO,
        subject: "Votre réservation : lien de paiement Fly Horizons",
        html: reservationPaymentInvitationEmail({
          prenom: client.prenom,
          nom: client.nom,
          dateStr,
          heure: resa.heure_vol ?? "-",
          duree: resa.duree,
          montant: resa.acompte ?? 0,
          paymentUrl,
          voucherCode: resa.voucher_code ?? null,
        }),
      });
    } catch (e) {
      console.error("[sendPaymentLinkAdmin] Erreur email:", e);
      emailError = true;
    }

    revalidatePath("/admin/vols");
    return { success: true, emailError };
  } catch {
    return { error: "Erreur serveur" };
  }
}

// ── Renvoyer le lien de paiement (admin) ──────────────────────────────────────────

export async function resendPaymentLinkAdmin(id: string) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();

    const { data: resa } = await supabase
      .from("reservations")
      .select("*, clients(*)")
      .eq("id", id)
      .single();

    if (!resa?.payment_token) return { error: "Pas de lien de paiement pour cette réservation" };

    const client = resa.clients as { prenom: string; nom: string; email: string } | null;
    if (!client?.email) return { error: "Email client introuvable" };

    const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const siteUrl = rawUrl.startsWith("http://localhost") || rawUrl.startsWith("http://127")
      ? rawUrl
      : "https://fly-horizons.com";

    const paymentUrl = `${siteUrl}/api/reservation/pay/${resa.payment_token}`;
    const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    // Deadline = vol - 48h
    const heure = (resa.heure_vol ?? "00:00").slice(0, 5);
    const flightTime = new Date(`${resa.date_vol}T${heure}:00+02:00`).getTime();
    const deadlineStr = new Date(flightTime - 48 * 60 * 60 * 1000).toLocaleString("fr-BE", {
      timeZone: "Europe/Brussels",
      weekday: "long", day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    await resend.emails.send({
      from: EMAIL_FROM,
      to: [client.email],
      replyTo: EMAIL_REPLY_TO,
      subject: "Votre réservation : lien de paiement Fly Horizons",
      html: reservationPaymentInvitationEmail({
        prenom: client.prenom,
        nom: client.nom,
        dateStr,
        heure: resa.heure_vol ?? "-",
        duree: resa.duree,
        montant: resa.acompte ?? 0,
        paymentUrl,
        voucherCode: resa.voucher_code ?? null,
      }),
    });

    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

// ── Report de vol : générer un lien et envoyer l'email (admin) ────────────────

export async function sendRescheduleInvite(id: string) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();

    const { data: resa } = await supabase
      .from("reservations")
      .select("*, clients(*)")
      .eq("id", id)
      .single();

    if (!resa) return { error: "Réservation introuvable" };
    if (["annulee", "vol_effectue"].includes(resa.statut)) {
      return { error: "Impossible de reporter ce vol" };
    }

    const client = resa.clients as { prenom: string; nom: string; email: string } | null;
    if (!client?.email) return { error: "Email client introuvable" };

    const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const siteUrl = rawUrl.startsWith("http://localhost") || rawUrl.startsWith("http://127")
      ? rawUrl : "https://fly-horizons.com";

    const uuid = crypto.randomUUID();
    await supabase.from("reservations").update({ reschedule_token: uuid }).eq("id", id);

    const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    // Le token de report est déjà en base à ce stade : un échec d'envoi ne doit pas
    // remonter une erreur générique.
    let emailError = false;
    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: [client.email],
        replyTo: EMAIL_REPLY_TO,
        subject: "Fly Horizons · Votre vol est reporté",
        html: rescheduleInviteEmail({
          prenom: client.prenom,
          dateStr,
          duree: resa.duree,
          rescheduleUrl: `${siteUrl}/reservation/reporter/${makeRescheduleToken(uuid)}`,
        }),
      });
    } catch (e) {
      console.error("[sendRescheduleInvite] Erreur email:", e);
      emailError = true;
    }

    revalidatePath("/admin/vols");
    return { success: true, emailError };
  } catch (e) {
    console.error("sendRescheduleInvite error:", e);
    return { error: "Erreur serveur" };
  }
}

// â"€â"€ Report de vol : traitement du choix de date par le client (public) â"€â"€â"€â"€â"€â"€â"€â"€

export async function rescheduleReservation(token: string, newDate: string, newHeure: string) {
  try {
    const supabase = createAdminClient();

    const parsed = parseRescheduleToken(token);
    if (!parsed) return { error: "Lien invalide ou expiré" };
    if (Date.now() > parsed.exp) return { error: "Ce lien a expiré (valable 30 jours)" };

    const { data: resa } = await supabase
      .from("reservations")
      .select("*, clients(*)")
      .eq("reschedule_token", parsed.t)
      .single();

    if (!resa) return { error: "Lien invalide ou expiré" };
    if (["annulee", "vol_effectue"].includes(resa.statut)) {
      return { error: "Ce vol ne peut plus être reporté" };
    }

    // Valider que la nouvelle date est au moins J+2
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + 2);
    const pickedDate = new Date(newDate + "T12:00:00Z");
    if (pickedDate < minDate) return { error: "La date doit être au moins 48 h à l'avance" };
    if (!newHeure) return { error: "Veuillez sélectionner un créneau horaire" };

    // ── Vérification de disponibilité du nouveau créneau ────────────────────
    const { data: conflicts } = await supabase
      .from("reservations")
      .select("id, heure_vol, duree")
      .eq("date_vol", newDate)
      .neq("statut", "annulee")
      .neq("id", resa.id);

    const [nh, nm] = newHeure.split(":").map(Number);
    const newStart = nh * 60 + nm;
    const newEnd   = newStart + resa.duree;

    const taken = (conflicts ?? []).some(r => {
      if (!r.heure_vol) return false;
      const [rh, rm] = r.heure_vol.split(":").map(Number);
      const rStart = rh * 60 + rm;
      const rEnd   = rStart + r.duree + 30;
      return newEnd + 30 > rStart && newStart < rEnd;
    });

    if (taken) return { error: "Ce créneau est déjà pris. Veuillez en choisir un autre." };

    const client = resa.clients as { prenom: string; nom: string; email: string } | null;
    if (!client?.email) return { error: "Email client introuvable" };

    const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const siteUrl = rawUrl.startsWith("http://localhost") || rawUrl.startsWith("http://127")
      ? rawUrl : "https://fly-horizons.com";

    const oldDateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const newDateStr = new Date(newDate + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const newDateTimeStr = `${newDateStr} à ${newHeure}`;

    const newStatut = resa.type_resa === "perso"
      ? (["acompte_recu", "solde", "vol_effectue"].includes(resa.statut) ? "acompte_recu" : "en_attente")
      : "en_attente";

    await supabase.from("reservations").update({
      date_vol: newDate,
      heure_vol: newHeure,
      statut: newStatut,
      reschedule_token: null,
    }).eq("id", resa.id);

    // Email de confirmation au client
    await resend.emails.send({
      from: EMAIL_FROM,
      to: [client.email],
      replyTo: EMAIL_REPLY_TO,
      subject: "Fly Horizons · Votre report est confirmé",
      html: rescheduleConfirmationEmail({
        prenom: client.prenom,
        oldDateStr,
        newDateStr: newDateTimeStr,
        duree: resa.duree,
        accountUrl: `${siteUrl}/account#reservations`,
      }),
    });

    // Notification admin
    await resend.emails.send({
      from: EMAIL_FROM,
      to: ["info@fly-horizons.com"],
      replyTo: EMAIL_REPLY_TO,
      subject: `Report vol · ${client.prenom} ${client.nom} : ${newDateTimeStr}`,
      html: customEmail({
        subject: `Report vol · ${client.prenom} ${client.nom}`,
        body: `${client.prenom} ${client.nom} a reporté son vol.\n\nAncienne date : ${oldDateStr}\nNouvelle date : ${newDateTimeStr}\nDurée : ${resa.duree} min`,
      }),
    });

    revalidatePath("/admin/vols");
    revalidatePath("/account");
    return { success: true, newDateStr: newDateTimeStr };
  } catch (e) {
    console.error("rescheduleReservation error:", e);
    return { error: "Erreur serveur" };
  }
}

// â"€â"€ Report de vol : générer un token depuis le compte client â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export async function generateClientRescheduleToken(reservationId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié" };

    const adminSupa = createAdminClient();
    const { data: client } = await adminSupa
      .from("clients")
      .select("id")
      .eq("email", user.email!)
      .maybeSingle();

    if (!client) return { error: "Client introuvable" };

    const { data: resa } = await adminSupa
      .from("reservations")
      .select("id, date_vol, heure_vol, statut")
      .eq("id", reservationId)
      .eq("client_id", client.id)
      .single();

    if (!resa) return { error: "Réservation introuvable" };
    if (["annulee", "vol_effectue", "payment_pending"].includes(resa.statut)) {
      return { error: "Ce vol ne peut pas être reporté" };
    }

    // Règle 48h pour le client — utilise l'heure réelle du vol en heure Brussels
    const { brusselsTimestamp } = await import("@/lib/utils");
    const flightMs = brusselsTimestamp(resa.date_vol, resa.heure_vol);
    const diffH = (flightMs - Date.now()) / (1000 * 60 * 60);
    if (diffH < 48) return { error: "Le délai de 48 h est dépassé" };

    const uuid = crypto.randomUUID();
    await adminSupa.from("reservations").update({ reschedule_token: uuid }).eq("id", reservationId);

    return { success: true, token: makeRescheduleToken(uuid) };
  } catch (e) {
    console.error("generateClientRescheduleToken error:", e);
    return { error: "Erreur serveur" };
  }
}

// ── Proposer un créneau précis au client (admin) ────────────────────────────
// Le client reçoit un lien pour accepter ce créneau exact, ou refuser et choisir
// lui-même une autre date (bascule sur le report libre existant, generateClientRescheduleToken).

export async function proposeSlot(id: string, date: string, heure: string) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();

    const { data: resa } = await supabase
      .from("reservations")
      .select("*, clients(*)")
      .eq("id", id)
      .single();

    if (!resa) return { error: "Réservation introuvable" };
    if (["annulee", "vol_effectue"].includes(resa.statut)) {
      return { error: "Impossible de proposer un créneau pour cette réservation" };
    }

    const client = resa.clients as { prenom: string; nom: string; email: string } | null;
    if (!client?.email) return { error: "Email client introuvable" };

    // Vérification de disponibilité du créneau proposé
    const { data: conflicts } = await supabase
      .from("reservations")
      .select("id, heure_vol, duree")
      .eq("date_vol", date)
      .neq("statut", "annulee")
      .neq("id", id);

    const [nh, nm] = heure.split(":").map(Number);
    const newStart = nh * 60 + nm;
    const newEnd = newStart + resa.duree;
    const taken = (conflicts ?? []).some(r => {
      if (!r.heure_vol) return false;
      const [rh, rm] = r.heure_vol.split(":").map(Number);
      const rStart = rh * 60 + rm;
      const rEnd = rStart + r.duree + 30;
      return newEnd + 30 > rStart && newStart < rEnd;
    });
    if (taken) return { error: "Ce créneau est déjà pris par une autre réservation" };

    const token = crypto.randomUUID();
    await supabase.from("reservations").update({
      slot_proposal_token: token,
      slot_proposal_date: date,
      slot_proposal_heure: heure,
    }).eq("id", id);

    const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const siteUrl = rawUrl.startsWith("http://localhost") || rawUrl.startsWith("http://127")
      ? rawUrl : "https://fly-horizons.com";

    const requestedDateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const proposedDateStr = new Date(date + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    // Le token est déjà en base à ce stade : un échec d'envoi ne doit pas remonter
    // une erreur générique, l'admin peut relancer depuis le même bouton.
    let emailError = false;
    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: [client.email],
        replyTo: EMAIL_REPLY_TO,
        subject: "Fly Horizons · Je vous propose un autre créneau",
        html: slotProposalEmail({
          prenom: client.prenom,
          requestedDateStr,
          proposedDateStr,
          proposedHeure: heure,
          duree: resa.duree,
          respondUrl: `${siteUrl}/reservation/creneau-propose/${token}`,
        }),
      });
    } catch (e) {
      console.error("[proposeSlot] Erreur email:", e);
      emailError = true;
    }

    await supabase.from("reservation_history").insert({
      reservation_id: id,
      action: "field_changed",
      field: "slot_proposal",
      new_value: `${date} à ${heure}`,
      author: "admin",
      note: "Créneau proposé au client",
    });

    revalidatePath("/admin/vols");
    return { success: true, emailError, token };
  } catch (e) {
    console.error("proposeSlot error:", e);
    return { error: "Erreur serveur" };
  }
}

// ── Réponse du client à un créneau proposé (public, sans checkAdmin) ────────

export async function respondToSlotProposal(token: string, action: "accept" | "decline") {
  try {
    const supabase = createAdminClient();

    const { data: resa } = await supabase
      .from("reservations")
      .select("*, clients(*)")
      .eq("slot_proposal_token", token)
      .single();

    if (!resa) return { error: "Lien invalide ou déjà traité" };

    if (action === "accept") {
      // Revérifier la disponibilité au moment de l'acceptation (le créneau a pu être pris entre-temps)
      const { data: conflicts } = await supabase
        .from("reservations")
        .select("id, heure_vol, duree")
        .eq("date_vol", resa.slot_proposal_date)
        .neq("statut", "annulee")
        .neq("id", resa.id);

      const [nh, nm] = (resa.slot_proposal_heure as string).split(":").map(Number);
      const newStart = nh * 60 + nm;
      const newEnd = newStart + resa.duree;
      const taken = (conflicts ?? []).some(r => {
        if (!r.heure_vol) return false;
        const [rh, rm] = r.heure_vol.split(":").map(Number);
        const rStart = rh * 60 + rm;
        const rEnd = rStart + r.duree + 30;
        return newEnd + 30 > rStart && newStart < rEnd;
      });
      if (taken) return { error: "Ce créneau vient d'être pris. Contactez-nous pour en choisir un autre." };

      const { data: updated } = await supabase
        .from("reservations")
        .update({
          date_vol: resa.slot_proposal_date,
          heure_vol: resa.slot_proposal_heure,
          slot_proposal_token: null,
          slot_proposal_date: null,
          slot_proposal_heure: null,
        })
        .eq("id", resa.id)
        .eq("slot_proposal_token", token)
        .select("id")
        .maybeSingle();

      if (!updated) return { error: "Ce créneau a déjà été traité" };

      await supabase.from("reservation_history").insert({
        reservation_id: resa.id,
        action: "client_response",
        field: "slot_proposal",
        new_value: "accepted",
        author: "client",
      });

      // Notification admin
      const client = resa.clients as { prenom: string; nom: string; email: string } | null;
      await resend.emails.send({
        from: EMAIL_FROM,
        to: [EMAIL_REPLY_TO],
        subject: `[Créneau accepté] ${client?.prenom ?? ""} ${client?.nom ?? ""}`,
        html: customEmail({
          subject: "Créneau accepté",
          body: `${client?.prenom ?? ""} ${client?.nom ?? ""} a accepté le créneau proposé : ${resa.slot_proposal_date} à ${resa.slot_proposal_heure}.`,
        }),
      });

      revalidatePath("/admin/vols");
      return { success: true };
    }

    // action === "decline" — le client choisit lui-même une autre date (report libre existant)
    const rescheduleUuid = crypto.randomUUID();
    const { data: declined } = await supabase
      .from("reservations")
      .update({
        slot_proposal_token: null,
        slot_proposal_date: null,
        slot_proposal_heure: null,
        reschedule_token: rescheduleUuid,
      })
      .eq("id", resa.id)
      .eq("slot_proposal_token", token)
      .select("id")
      .maybeSingle();

    if (!declined) return { error: "Ce créneau a déjà été traité" };

    await supabase.from("reservation_history").insert({
      reservation_id: resa.id,
      action: "client_response",
      field: "slot_proposal",
      new_value: "declined",
      author: "client",
      note: "Le client choisit une autre date lui-même",
    });

    revalidatePath("/admin/vols");
    return { success: true, redirectUrl: `/reservation/reporter/${makeRescheduleToken(rescheduleUuid)}` };
  } catch (e) {
    console.error("respondToSlotProposal error:", e);
    return { error: "Erreur serveur" };
  }
}

// ── Paiement en espèces prévu (admin) ────────────────────────────────────────
// Coché : l'acceptation d'un itinéraire par le client n'envoie pas de lien de
// paiement en ligne automatique (respondToRouteProposal, lib/actions/reservation-edit.ts).

export async function setCashPayment(id: string, cashPayment: boolean) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();
    const { error } = await supabase.from("reservations").update({ cash_payment: cashPayment }).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/vols");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

