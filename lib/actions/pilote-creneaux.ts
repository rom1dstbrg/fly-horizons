"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isBloc } from "@/lib/pilote-creneaux";

// Disponibilités du pilote en blocs de 2 h (lib/pilote-creneaux.ts) : un seul
// calendrier, partagé par toutes ses annonces. Le pilote coche la grille puis
// enregistre tout d'un coup : une seule action pour tous les changements.
// Chaque écriture filtre sur le pilote connecté.

async function checkPilote() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "pilote" && profile?.role !== "admin") throw new Error("Non autorisé");

  const db = createAdminClient();
  const { data: pilote } = await db.from("pilotes").select("id, visites_vues").eq("user_id", user.id).single();
  if (!pilote) throw new Error("Fiche pilote introuvable");
  return { piloteId: pilote.id as string, visitesVues: (pilote.visites_vues ?? []) as string[], db };
}

export interface CreneauResa {
  date: string;
  heure_vol: string | null;
  duree: number | null;
  prenom: string | null;
}

export interface PiloteCreneauxState {
  /** Blocs ouverts à partir de `depuis`, en clés "YYYY-MM-DD|9". */
  ouverts: string[];
  reservations: CreneauResa[];
  visiteVue: boolean;
}

export async function getPiloteCreneaux(depuis: string): Promise<PiloteCreneauxState> {
  const { piloteId, visitesVues, db } = await checkPilote();
  const [{ data: creneaux }, { data: resas }] = await Promise.all([
    db.from("pilote_creneaux").select("date, heure").eq("pilote_id", piloteId).gte("date", depuis),
    db.from("reservations").select("date_vol, heure_vol, duree, clients(prenom)")
      .eq("pilote_id", piloteId).gte("date_vol", depuis).neq("statut", "annulee"),
  ]);
  return {
    ouverts: (creneaux ?? []).map((c) => `${c.date}|${c.heure}`),
    reservations: (resas ?? []).map((r) => {
      const client = Array.isArray(r.clients) ? r.clients[0] : r.clients;
      return { date: String(r.date_vol).slice(0, 10), heure_vol: r.heure_vol, duree: r.duree, prenom: client?.prenom ?? null };
    }),
    visiteVue: visitesVues.includes("disponibilites"),
  };
}

const MAX_CHANGES = 3000;

function parseKeys(keys: string[]) {
  return keys.map((k) => {
    const [date, h] = k.split("|");
    const heure = Number(h);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !isBloc(heure)) throw new Error("Créneau invalide");
    return { date, heure };
  });
}

export async function savePiloteCreneaux(ajouts: string[], retraits: string[]) {
  try {
    if (ajouts.length + retraits.length > MAX_CHANGES) return { error: "Trop de changements d'un coup" };
    const { piloteId, db } = await checkPilote();
    const add = parseKeys(ajouts);
    const del = parseKeys(retraits);

    if (add.length) {
      const { error } = await db.from("pilote_creneaux")
        .upsert(add.map((c) => ({ ...c, pilote_id: piloteId })), { onConflict: "pilote_id,date,heure", ignoreDuplicates: true });
      if (error) return { error: error.message };
    }
    if (del.length) {
      // Un DELETE par paquet de 60 jours : (date = d1 et heure dans (…)) ou (date = d2 …),
      // pour garder l'URL de la requête courte.
      const byDate = new Map<string, number[]>();
      del.forEach(({ date, heure }) => byDate.set(date, [...(byDate.get(date) ?? []), heure]));
      const groups = [...byDate].map(([d, hs]) => `and(date.eq.${d},heure.in.(${hs.join(",")}))`);
      for (let i = 0; i < groups.length; i += 60) {
        const { error } = await db.from("pilote_creneaux").delete().eq("pilote_id", piloteId).or(groups.slice(i, i + 60).join(","));
        if (error) return { error: error.message };
      }
    }
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error && e.message === "Créneau invalide" ? e.message : "Erreur serveur" };
  }
}

/** Visite guidée vue (Terminer ou Passer) : elle ne revient plus, même sur un autre appareil. */
export async function markVisiteVue(page: string) {
  try {
    const { piloteId, visitesVues, db } = await checkPilote();
    if (visitesVues.includes(page)) return { success: true };
    await db.from("pilotes").update({ visites_vues: [...visitesVues, page] }).eq("id", piloteId);
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}
