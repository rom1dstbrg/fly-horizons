"use client";

import { useState, useTransition } from "react";
import { cancelAnnonce, republishAnnonce, deleteAnnonce, cloturerGroupeAnnonce } from "@/lib/actions/annonces";
import { evaluerPartPilote } from "@/lib/annonces-pilote";
import { AnnonceCard as PublicAnnonceCard } from "@/components/vols/AnnonceCard";
import { Loader2, X, Eye, Users2, Pencil, RotateCcw, ShieldAlert, Trash2, Lock } from "lucide-react";

export interface AnnonceRow {
  id: string;
  titre?: string | null;
  duree: number;
  places: number;
  prix_total: number;
  part_pilote: number;
  mode_vente?: "avion" | "place";
  places_reservees?: number;
  description: string | null;
  images: string[];
  statut: "publiee" | "reservee" | "annulee";
  legal_ok?: boolean;
  route_waypoints?: Array<{ lat: number; lng: number; nom?: string }> | null;
}

export interface AnnonceStats {
  vues: number;
  visiteurs: number;
}

function AnnonceManageCard({
  annonce,
  piloteNom,
  stats,
  onEdit,
}: {
  annonce: AnnonceRow;
  piloteNom: string;
  stats?: AnnonceStats;
  onEdit: (a: AnnonceRow) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [isRepublishPending, startRepublishTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isCloturePending, startClotureTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [clotureError, setClotureError] = useState<string | null>(null);

  const check = evaluerPartPilote(annonce.prix_total, annonce.part_pilote, annonce.places);
  const prixClient = Math.max(0, annonce.prix_total - annonce.part_pilote);
  const aConfirmer = annonce.statut === "publiee" && (check.level === "block" || annonce.legal_ok === false);
  const groupeOuvert = annonce.mode_vente === "place" && annonce.statut === "publiee" && (annonce.places_reservees ?? 0) > 0;

  function handleCloture() {
    setClotureError(null);
    startClotureTransition(async () => {
      const r = await cloturerGroupeAnnonce(annonce.id);
      if (r?.error) setClotureError(r.error);
    });
  }

  const STATUT_LABEL: Record<AnnonceRow["statut"], string> = {
    publiee: "Publiée",
    reservee: "Réservée",
    annulee: "Annulée",
  };

  function handleDelete() {
    setDeleteError(null);
    startDeleteTransition(async () => {
      const r = await deleteAnnonce(annonce.id);
      if (r?.error) setDeleteError(r.error);
    });
  }

  return (
    <div className="bg-card border border-navy/15 rounded-[10px] overflow-hidden flex flex-col">
      <div className={`p-3 pb-0 ${annonce.statut !== "publiee" ? "opacity-60" : ""}`}>
        <PublicAnnonceCard
          newTab
          annonce={{
            id: annonce.id,
            titre: annonce.titre,
            duree: annonce.duree,
            places: annonce.places,
            prix_client:
              annonce.mode_vente === "place"
                ? Math.round((prixClient / Math.max(1, annonce.places)) * 100) / 100
                : prixClient,
            pilote_nom: piloteNom,
            cover_image: annonce.images[0] ?? null,
            mode_vente: annonce.mode_vente,
          }}
        />
      </div>

      <div className="p-4 pt-3 space-y-3 flex-1 flex flex-col">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground bg-secondary px-2 py-0.5 rounded">
            {STATUT_LABEL[annonce.statut]}
          </span>
          {aConfirmer && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
              <ShieldAlert size={11} /> À confirmer
            </span>
          )}
          <span className="ml-auto flex items-center gap-2.5 text-[11px] text-muted-foreground" title="Statistiques de consultation">
            <span className="flex items-center gap-1"><Eye size={12} /> {stats?.vues ?? 0}</span>
            <span className="flex items-center gap-1"><Users2 size={12} /> {stats?.visiteurs ?? 0}</span>
          </span>
        </div>

        {annonce.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{annonce.description}</p>
        )}

        <p className="text-xs text-muted-foreground">
          Prix total {annonce.prix_total.toFixed(2)} € · Votre part {annonce.part_pilote.toFixed(2)} € ({check.pct}%) ·{" "}
          {annonce.mode_vente === "place"
            ? `${annonce.places - (annonce.places_reservees ?? 0)}/${annonce.places} place${annonce.places > 1 ? "s" : ""} dispo`
            : `${annonce.places} place${annonce.places > 1 ? "s" : ""}`}
        </p>

        {groupeOuvert && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-1.5">
            <p className="text-xs text-amber-800 flex items-start gap-1.5">
              <Lock size={12} className="shrink-0 mt-0.5" />
              Groupe pas encore complet — le prix définitif de chaque passager se fige à la
              clôture (part égale entre occupants réels), pas avant.
            </p>
            <button
              onClick={handleCloture}
              disabled={isCloturePending}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-600 text-white text-[11px] font-semibold hover:bg-amber-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isCloturePending ? <Loader2 size={11} className="animate-spin" /> : <Lock size={11} />}
              Clôturer le groupe maintenant
            </button>
            {clotureError && <p className="text-[11px] text-red-700">{clotureError}</p>}
          </div>
        )}

        {deleteError && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-2.5 py-1.5">
            {deleteError}
          </p>
        )}

        <div className="flex items-center gap-1 mt-auto pt-1 border-t border-border">
          {annonce.statut === "publiee" && (
            <>
              <button
                onClick={() => onEdit(annonce)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
              >
                <Pencil size={12} />
                Modifier
              </button>
              <button
                onClick={() => startTransition(async () => { await cancelAnnonce(annonce.id); })}
                disabled={isPending}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                Annuler
              </button>
            </>
          )}
          {annonce.statut !== "publiee" && (
            <button
              onClick={() => startRepublishTransition(async () => { await republishAnnonce(annonce.id); })}
              disabled={isRepublishPending}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer disabled:opacity-50"
            >
              {isRepublishPending ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              Republier
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={isDeletePending}
            title="Supprimer définitivement"
            className="flex items-center gap-1.5 ml-auto px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all cursor-pointer disabled:opacity-50"
          >
            {isDeletePending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

export function AnnoncesList({
  annonces,
  piloteNom,
  stats,
  onEdit,
}: {
  annonces: AnnonceRow[];
  piloteNom: string;
  stats?: Record<string, AnnonceStats>;
  onEdit: (a: AnnonceRow) => void;
}) {
  if (annonces.length === 0) return null;
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 300px))" }}>
      {annonces.map(a => (
        <AnnonceManageCard key={a.id} annonce={a} piloteNom={piloteNom} stats={stats?.[a.id]} onEdit={onEdit} />
      ))}
    </div>
  );
}
