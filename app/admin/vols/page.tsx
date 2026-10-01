import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { VolsHub } from "@/components/admin/VolsHub";
import { PageHeader } from "@/components/admin/PageHeader";
import { addDaysIso } from "@/lib/pilote-creneaux";

// Disponibilités des pilotes : semaine en cours + 11 suivantes.
const DISPO_WEEKS = 12;

export const metadata = { title: "Activité Vols — Admin" };

export default async function VolsPage() {
  const db = createAdminClient();

  // Aujourd'hui et le lundi de la semaine, à l'heure de Bruxelles (comme /pilote/disponibilites).
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date());
  const monday = addDaysIso(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));
  const dispoEnd = addDaysIso(monday, DISPO_WEEKS * 7 - 1);

  const [
    { data: rawStd },
    { data: plages },
    { data: joursIndiv },
    { data: pilotes },
    { data: creneaux },
    { data: resasPilotes },
  ] = await Promise.all([
    db.from("reservations").select("*, clients(*), pilotes(nom), route_proposals(status, created_at), products(route_waypoints)").neq("type_resa", "perso").order("date_vol", { ascending: true }),
    db.from("disponibilites").select("*").order("date_debut", { ascending: true }),
    db.from("disponibilites_jours").select("*").order("date", { ascending: true }),
    db.from("pilotes").select("id, nom, photo_url").eq("statut", "actif").order("nom", { ascending: true }),
    db.from("pilote_creneaux").select("pilote_id, date, heure").gte("date", monday).lte("date", dispoEnd),
    db.from("reservations").select("pilote_id, date_vol, heure_vol, duree, clients(prenom)")
      .not("pilote_id", "is", null).gte("date_vol", monday).lte("date_vol", dispoEnd).neq("statut", "annulee"),
  ]);

  const ouverts: Record<string, string[]> = {};
  for (const c of creneaux ?? []) (ouverts[c.pilote_id] ??= []).push(`${c.date}|${c.heure}`);
  const dispoResas = (resasPilotes ?? []).map((r) => {
    const client = Array.isArray(r.clients) ? r.clients[0] : r.clients;
    return { pilote_id: r.pilote_id as string, date: String(r.date_vol).slice(0, 10), heure_vol: r.heure_vol, duree: r.duree, prenom: client?.prenom ?? null };
  });

  const resaStd   = rawStd   ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        domain="vols"
        title="Activité Vols"
        subtitle="Pipeline, calendrier et gestion de toutes les réservations"
      />

      <Suspense fallback={null}>
        <VolsHub
          resaStd={resaStd as never}
          plages={plages ?? []}
          joursIndiv={joursIndiv ?? []}
          dispo={{ monday, today, weeks: DISPO_WEEKS, pilotes: pilotes ?? [], ouverts, reservations: dispoResas }}
        />
      </Suspense>
    </div>
  );
}
