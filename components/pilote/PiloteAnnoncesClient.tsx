"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, PlaneTakeoff, Users2 } from "lucide-react";
import { cancelAnnonce, cloturerGroupeAnnonce, deleteAnnonce, republishAnnonce } from "@/lib/actions/annonces";
import { AnnonceCard } from "@/components/vols/AnnonceCard";
import { ConfirmActionDialog, type PendingAction } from "@/components/admin/reservation-drawer/ConfirmActionDialog";
import { Badge, EmptyState, LinkButton, Segmented, Sheet, StatCard, StatGrid } from "@/components/pilote/studio";
import {
  AnnonceSheetContent, annonceInfo,
  type AnnonceAction, type AnnonceRow, type AnnonceStats,
} from "./AnnoncesList";

type View = "vente" | "reservees" | "archives";
const VIEW_STATUT: Record<View, AnnonceRow["statut"]> = { vente: "publiee", reservees: "reservee", archives: "annulee" };
const EMPTY: Record<View, string> = {
  vente: "Aucune annonce en vente.",
  reservees: "Aucune annonce réservée.",
  archives: "Aucune annonce retirée.",
};

// Page « Mes annonces » (maquette validée le 25/09) : les annonces s'affichent
// avec la carte du site public, telle que le client la voit ; un clic ouvre le
// tiroir de gestion.
export function PiloteAnnoncesClient({
  annonces,
  piloteNom,
  stats = {},
  canPublish,
}: {
  annonces: AnnonceRow[];
  piloteNom: string;
  stats?: Record<string, AnnonceStats>;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("vente");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<PendingAction | null>(null);
  const [pending, setPending] = useState<AnnonceAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const open = annonces.find((a) => a.id === openId) ?? null;
  const close = useCallback(() => { setOpenId(null); setError(null); }, []);

  if (annonces.length === 0) {
    return (
      <EmptyState
        icon={PlaneTakeoff}
        title="Aucun vol publié"
        description="Publiez votre premier vol : durée, prix, photos et votre part personnelle."
        action={canPublish && <LinkButton href="/pilote/annonces/nouvelle"><PlaneTakeoff />Publier un vol</LinkButton>}
      />
    );
  }

  const counts = {
    vente: annonces.filter((a) => a.statut === "publiee").length,
    reservees: annonces.filter((a) => a.statut === "reservee").length,
    archives: annonces.filter((a) => a.statut === "annulee").length,
  };
  const enVente = annonces.filter((a) => a.statut === "publiee").map((a) => annonceInfo(a));
  const groupes = enVente.filter((i) => i.groupeOuvert).length;
  const aConfirmer = enVente.filter((i) => i.aConfirmer).length;
  const vues = annonces.reduce((s, a) => s + (stats[a.id]?.vues ?? 0), 0);
  const visiteurs = annonces.reduce((s, a) => s + (stats[a.id]?.visiteurs ?? 0), 0);
  const rows = annonces.filter((a) => a.statut === VIEW_STATUT[view]);

  function run(action: AnnonceAction, a: AnnonceRow) {
    setError(null);
    setPending(action);
    startTransition(async () => {
      const r =
        action === "retirer" ? await cancelAnnonce(a.id)
        : action === "republier" ? await republishAnnonce(a.id)
        : action === "cloturer" ? await cloturerGroupeAnnonce(a.id)
        : await deleteAnnonce(a.id);
      setPending(null);
      setConfirm(null);
      if (r?.error) { setError(r.error); return; }
      if (action === "supprimer") setOpenId(null);
      router.refresh();
    });
  }

  function onAction(action: AnnonceAction) {
    const a = open;
    if (!a) return;
    if (action === "republier") { run(action, a); return; }
    const info = annonceInfo(a);
    const pendingAction: Record<Exclude<AnnonceAction, "republier">, PendingAction> = {
      retirer: {
        title: "Retirer cette annonce de la vente ?",
        consequences: [
          "Elle disparaît du site : plus aucun client ne peut la réserver.",
          "Les réservations déjà faites ne sont pas annulées.",
          "Vous pourrez la remettre en vente depuis l'onglet « Archivées ».",
        ],
        confirmLabel: "Retirer de la vente",
        run: () => run("retirer", a),
      },
      cloturer: {
        title: "Clôturer le groupe maintenant ?",
        consequences: [
          `Le vol part avec les ${info.reservees} passager${info.reservees > 1 ? "s" : ""} déjà inscrit${info.reservees > 1 ? "s" : ""}.`,
          "Le prix de chacun se fige : part égale entre vous et les occupants réels.",
          "L'annonce n'accepte plus de nouvelle réservation.",
        ],
        confirmLabel: "Clôturer le groupe",
        run: () => run("cloturer", a),
      },
      supprimer: {
        title: "Supprimer définitivement cette annonce ?",
        description: "L'annonce et ses photos sont effacées. Impossible si une réservation a déjà été faite dessus : retirez-la de la vente à la place.",
        confirmLabel: "Supprimer",
        danger: true,
        run: () => run("supprimer", a),
      },
    };
    setConfirm(pendingAction[action]);
  }

  return (
    <>
      <StatGrid>
        <StatCard label="En vente" value={counts.vente} hint={groupes > 0 ? `dont ${groupes} groupe${groupes > 1 ? "s" : ""} ouvert${groupes > 1 ? "s" : ""}` : ""} />
        <StatCard label="À confirmer" value={aConfirmer} tone={aConfirmer > 0 ? "warn" : undefined} hint={aConfirmer > 0 ? "à vérifier dans l'annonce" : "tout est en règle"} />
        <StatCard label="Vues" value={vues.toLocaleString("fr-BE")} hint="depuis la publication" />
        <StatCard label="Visiteurs" value={visiteurs.toLocaleString("fr-BE")} hint="personnes différentes" />
      </StatGrid>

      <Segmented
        value={view}
        onChange={setView}
        className="max-sm:w-full"
        items={[
          { key: "vente", label: "En vente", count: counts.vente },
          { key: "reservees", label: "Réservées", count: counts.reservees },
          { key: "archives", label: "Archivées", count: counts.archives },
        ]}
      />

      {rows.length === 0 ? (
        <p className="rounded-[20px] border border-dashed border-st-line-strong py-10 text-center text-sm text-st-muted">{EMPTY[view]}</p>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-5 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {rows.map((a) => {
            const info = annonceInfo(a);
            const s = stats[a.id];
            return (
              <div key={a.id} className="min-w-0">
                <div className={a.statut === "annulee" ? "opacity-60" : undefined}>
                  <AnnonceCard
                    onClick={() => { setError(null); setOpenId(a.id); }}
                    annonce={{
                      id: a.id,
                      titre: a.titre,
                      duree: a.duree,
                      places: a.places,
                      prix_client: info.prixClient,
                      pilote_nom: piloteNom,
                      cover_image: a.images[0] ?? null,
                      mode_vente: a.mode_vente,
                    }}
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2 px-0.5">
                  <Badge tone={info.badge.tone}>{info.badge.label}</Badge>
                  <span className="flex items-center gap-2.5 text-xs text-st-muted" title="Vues · visiteurs">
                    <span className="st-num flex items-center gap-1"><Eye size={13} />{s?.vues ?? 0}</span>
                    <span className="st-num flex items-center gap-1"><Users2 size={13} />{s?.visiteurs ?? 0}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Sheet value={open} onClose={close}>
        {(a) => (
          <AnnonceSheetContent
            annonce={a}
            stats={stats[a.id]}
            error={error}
            pending={confirm ? null : pending}
            onClose={close}
            onAction={onAction}
          />
        )}
      </Sheet>

      <ConfirmActionDialog
        action={confirm}
        isPending={isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm?.run()}
      />
    </>
  );
}
