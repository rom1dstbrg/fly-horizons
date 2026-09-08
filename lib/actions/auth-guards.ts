import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Gardes d'autorisation partagés par les server actions réservation.
// Avant : chaque fichier (reservations.ts, reservation-edit.ts) portait sa
// propre copie de checkAdminOrOwningPilote, et aucune ne vérifiait que le
// pilote était encore actif — un pilote désactivé gardait la main sur ses vols.

/** Contexte de l'acteur : admin, ou pilote actif (avec sa fiche). */
export type ReservationActor =
  | { role: "admin" }
  | { role: "pilote"; piloteId: string; piloteNom: string };

/** Lève si l'utilisateur courant n'est pas admin. */
export async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Non autorisé");
}

/**
 * Autorise uniquement le pilote **actif** courant, agissant sur sa propre fiche
 * (profil, acceptation de la charte). L'admin passe par /admin/pilotes.
 */
export async function requireSelfActivePilote(): Promise<{ piloteId: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "pilote") throw new Error("Non autorisé");

  const { data: pilote } = await createAdminClient()
    .from("pilotes")
    .select("id, statut")
    .eq("user_id", user.id)
    .single();
  if (!pilote || pilote.statut !== "actif") throw new Error("Non autorisé");

  return { piloteId: pilote.id };
}

/**
 * Autorise l'admin, ou n'importe quel pilote **actif** (sans lien à une
 * réservation précise). Utilisé par les outils transverses ouverts aux pilotes :
 * masse & centrage, proxy METAR. Retourne le contexte de l'acteur.
 */
export async function requireAdminOrActivePilote(): Promise<ReservationActor> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "admin") return { role: "admin" };
  if (profile?.role !== "pilote") throw new Error("Non autorisé");

  const { data: pilote } = await createAdminClient()
    .from("pilotes")
    .select("id, nom, statut")
    .eq("user_id", user.id)
    .single();
  if (!pilote || pilote.statut !== "actif") throw new Error("Non autorisé");

  return { role: "pilote", piloteId: pilote.id, piloteNom: pilote.nom };
}

/**
 * Autorise l'admin, ou le pilote **actif** propriétaire de la réservation.
 * Un pilote dont le statut n'est plus 'actif' est refusé, même sur ses propres vols.
 * Retourne le contexte de l'acteur (utile pour l'historique : author = `pilote:<nom>`).
 */
export async function requireAdminOrOwningPilote(reservationId: string): Promise<ReservationActor> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "admin") return { role: "admin" };
  if (profile?.role !== "pilote") throw new Error("Non autorisé");

  const admin = createAdminClient();
  const { data: pilote } = await admin
    .from("pilotes")
    .select("id, nom, statut")
    .eq("user_id", user.id)
    .single();
  if (!pilote || pilote.statut !== "actif") throw new Error("Non autorisé");

  const { data: resa } = await admin
    .from("reservations")
    .select("pilote_id")
    .eq("id", reservationId)
    .single();
  if (!resa || resa.pilote_id !== pilote.id) throw new Error("Non autorisé");

  return { role: "pilote", piloteId: pilote.id, piloteNom: pilote.nom };
}
