import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard, StatGrid } from "@/components/admin/ui";
import { SatisfactionClient } from "@/components/admin/SatisfactionClient";

export const metadata = { title: "Satisfaction — Admin" };

export default async function AdminSatisfactionPage() {
  const db = createAdminClient();

  const { data: rows } = await db
    .from("satisfaction_surveys")
    .select(`
      id, note_globale, note_accueil, note_pilote, commentaire, points_amelioration, photos, created_at,
      reservations ( id, date_vol, duree, client_id, clients ( id, prenom, nom, email ) )
    `)
    .order("created_at", { ascending: false });

  const { count: volsEffectues } = await db
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("statut", "vol_effectue");

  const surveys = (rows ?? []).map((r) => {
    const resa = r.reservations as unknown as {
      id: string; date_vol: string; duree: number;
      client_id: string;
      clients: { id: string; prenom: string; nom: string; email: string } | null;
    } | null;
    return {
      id: r.id,
      noteGlobale: r.note_globale as number,
      noteAccueil: r.note_accueil as number,
      notePilote: r.note_pilote as number,
      commentaire: r.commentaire as string | null,
      pointsAmelioration: r.points_amelioration as string | null,
      photos: (r.photos as string[] | null) ?? [],
      createdAt: r.created_at as string,
      dateVol: resa?.date_vol ?? "",
      duree: resa?.duree ?? 0,
      client: resa?.clients ?? null,
      photoUrls: ((r.photos as string[] | null) ?? []).map(
        (path) => db.storage.from("satisfaction-photos").getPublicUrl(path).data.publicUrl
      ),
    };
  });

  const total = surveys.length;
  const avg = (key: "noteGlobale" | "noteAccueil" | "notePilote") =>
    total === 0 ? 0 : Math.round((surveys.reduce((s, x) => s + x[key], 0) / total) * 10) / 10;

  const tauxReponse = volsEffectues && volsEffectues > 0
    ? Math.round((total / volsEffectues) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        domain="clients"
        title="Satisfaction"
        subtitle="Avis clients laissés après un vol effectué"
      />

      <StatGrid cols={5}>
        <StatCard label="Avis reçus" value={total} variant="primary" subtitle={`sur ${volsEffectues ?? 0} vols effectués`} />
        <StatCard label="Note globale" value={total ? `${avg("noteGlobale")}/5` : "—"} variant="gold" />
        <StatCard label="Accueil" value={total ? `${avg("noteAccueil")}/5` : "—"} variant="info" />
        <StatCard label="Pilote" value={total ? `${avg("notePilote")}/5` : "—"} variant="emerald" />
        <StatCard label="Taux de réponse" value={`${tauxReponse}%`} variant="neutral" />
      </StatGrid>

      <SatisfactionClient surveys={surveys} />
    </div>
  );
}
