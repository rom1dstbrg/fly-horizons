import Link from "next/link";
import { AlertTriangle, PlaneTakeoff } from "lucide-react";
import { PiloteAnnoncesClient } from "@/components/pilote/PiloteAnnoncesClient";
import { Button, ButtonLabel, LinkButton, PageHeader } from "@/components/pilote/studio";
import { ANNONCE_COLUMNS, loadPiloteForAnnonces } from "@/lib/pilote/annonces-page";

export const metadata = { title: "Mes annonces — Espace pilote" };

export default async function PiloteAnnoncesPage() {
  const { admin, pilote, publishGate } = await loadPiloteForAnnonces();

  const { data: annonces } = pilote
    ? await admin
        .from("annonces_pilote")
        .select(ANNONCE_COLUMNS)
        .eq("pilote_id", pilote.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Stats de consultation (vues + visiteurs uniques) — réutilise le tracking
  // analytique déjà en place (page_views), pas de colonne/compteur dédié.
  const stats: Record<string, { vues: number; visiteurs: number }> = {};
  const ids = (annonces ?? []).map(a => a.id);
  if (ids.length > 0) {
    const paths = ids.map(id => `/vol/annonce/${id}`);
    const { data: views } = await admin
      .from("page_views")
      .select("pathname, visitor_id")
      .in("pathname", paths);
    const uniques: Record<string, Set<string>> = {};
    for (const v of views ?? []) {
      const id = v.pathname.split("/").pop();
      if (!id) continue;
      stats[id] ??= { vues: 0, visiteurs: 0 };
      stats[id].vues += 1;
      if (v.visitor_id) (uniques[id] ??= new Set()).add(v.visitor_id);
    }
    for (const id of Object.keys(stats)) stats[id].visiteurs = uniques[id]?.size ?? 0;
  }

  const publishLabel = <><PlaneTakeoff /><ButtonLabel full="Publier un vol" short="Publier" /></>;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mes annonces"
        actions={
          publishGate
            ? <Button disabled>{publishLabel}</Button>
            : <LinkButton href="/pilote/annonces/nouvelle">{publishLabel}</LinkButton>
        }
      />
      {publishGate && (
        <div className="flex items-start gap-2.5 rounded-[14px] bg-st-warn-soft px-4 py-3 text-[13px] text-st-warn">
          <AlertTriangle size={16} className="mt-px shrink-0" />
          <p>
            {publishGate}{" "}
            <Link href="/pilote/profil" className="font-semibold underline underline-offset-2">Ouvrir mon profil</Link>
          </p>
        </div>
      )}
      <PiloteAnnoncesClient
        annonces={(annonces ?? []) as never}
        piloteNom={pilote?.nom ?? ""}
        stats={stats}
        canPublish={!publishGate}
      />
    </div>
  );
}
