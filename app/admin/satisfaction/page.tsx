import { createAdminClient } from "@/lib/supabase/admin";
import { SatisfactionClient } from "@/components/admin/SatisfactionClient";
import { NO_PILOTE_KEY, computeSatisfaction, isWatch, type Survey } from "@/lib/satisfaction-stats";

export const metadata = { title: "Satisfaction — Admin" };

type Db = ReturnType<typeof createAdminClient>;
type Row = Record<string, unknown>;

const COLS = "id, note_preparation, note_pilote, note_vol, note_qualite_prix, recommandation, source_decouverte, commentaire, photos, created_at";
const RESA = "reservations ( id, date_vol, duree, pilote_id, pilotes ( nom ), clients ( id, prenom, nom, email ) )";

// Lit les avis avec la colonne « comme annoncé » ; si elle n'existe pas encore (migration
// 20261001c pas exécutée), relit sans elle.
async function loadSurveys(db: Db): Promise<Row[]> {
  const first = await db.from("satisfaction_surveys").select(`${COLS}, comme_annonce, ${RESA}`).order("created_at", { ascending: false });
  if (!first.error) return (first.data ?? []) as unknown as Row[];
  const second = await db.from("satisfaction_surveys").select(`${COLS}, ${RESA}`).order("created_at", { ascending: false });
  return (second.data ?? []) as unknown as Row[];
}

// Vols effectués par pilote (dénominateur du taux de réponse), lus par tranches de 1000.
async function loadVols(db: Db): Promise<Record<string, { nom: string | null; vols: number }>> {
  const out: Record<string, { nom: string | null; vols: number }> = {};
  for (let page = 0; page < 30; page++) {
    const { data } = await db.from("reservations").select("pilote_id, pilotes ( nom )").eq("statut", "vol_effectue")
      .order("id").range(page * 1000, page * 1000 + 999);
    if (!data?.length) break;
    for (const r of data as unknown as { pilote_id: string | null; pilotes: { nom: string } | { nom: string }[] | null }[]) {
      const key = r.pilote_id ?? NO_PILOTE_KEY;
      const nom = (Array.isArray(r.pilotes) ? r.pilotes[0]?.nom : r.pilotes?.nom) ?? null;
      out[key] = { nom: out[key]?.nom ?? nom, vols: (out[key]?.vols ?? 0) + 1 };
    }
    if (data.length < 1000) break;
  }
  return out;
}

export default async function AdminSatisfactionPage() {
  const db = createAdminClient();
  const [rows, volsByPilote] = await Promise.all([loadSurveys(db), loadVols(db)]);

  const surveys: Survey[] = rows.map((r) => {
    const resa = r.reservations as {
      id: string; date_vol: string; duree: number; pilote_id: string | null;
      pilotes: { nom: string } | { nom: string }[] | null;
      clients: { id: string; prenom: string; nom: string; email: string } | { id: string; prenom: string; nom: string; email: string }[] | null;
    } | null;
    const n = (k: string) => (r[k] as number | null) ?? 0;
    const moyenne = Math.round(((n("note_preparation") + n("note_pilote") + n("note_vol") + n("note_qualite_prix")) / 4) * 10) / 10;
    const photos = (r.photos as string[] | null) ?? [];
    const base = {
      moyenne,
      recommandation: (r.recommandation as string | null) ?? null,
      commeAnnonce: (r.comme_annonce as string | null | undefined) ?? null,
    };
    return {
      id: r.id as string,
      reservationId: resa?.id ?? "",
      notePreparation: n("note_preparation"),
      notePilote: n("note_pilote"),
      noteVol: n("note_vol"),
      noteQualitePrix: n("note_qualite_prix"),
      ...base,
      sourceDecouverte: (r.source_decouverte as string | null) ?? null,
      commentaire: (r.commentaire as string | null) ?? null,
      photos,
      photoUrls: photos.map((path) => db.storage.from("satisfaction-photos").getPublicUrl(path).data.publicUrl),
      createdAt: r.created_at as string,
      dateVol: resa?.date_vol ?? "",
      duree: resa?.duree ?? 0,
      piloteKey: resa?.pilote_id ?? NO_PILOTE_KEY,
      piloteNom: (Array.isArray(resa?.pilotes) ? resa?.pilotes[0]?.nom : resa?.pilotes?.nom) ?? null,
      client: (Array.isArray(resa?.clients) ? resa?.clients[0] : resa?.clients) ?? null,
      watch: isWatch(base),
    };
  });

  return <SatisfactionClient surveys={surveys} data={computeSatisfaction({ surveys, volsByPilote })} />;
}
