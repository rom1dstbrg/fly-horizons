"use client";

import { useTransition } from "react";
import { cancelAnnonce, republishAnnonce } from "@/lib/actions/annonces";
import { evaluerPartPilote } from "@/lib/annonces-pilote";
import { Loader2, X, Users, Clock, Pencil, RotateCcw } from "lucide-react";

export interface AnnonceRow {
  id: string;
  duree: number;
  places: number;
  prix_total: number;
  part_pilote: number;
  description: string | null;
  images: string[];
  statut: "publiee" | "reservee" | "annulee";
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

function AnnonceCard({ annonce, onEdit }: { annonce: AnnonceRow; onEdit: (a: AnnonceRow) => void }) {
  const [isPending, startTransition] = useTransition();
  const [isRepublishPending, startRepublishTransition] = useTransition();
  const check = evaluerPartPilote(annonce.prix_total, annonce.part_pilote);
  const prixClient = Math.max(0, annonce.prix_total - annonce.part_pilote);
  const coverUrl = annonce.images[0] ? `${SUPABASE_URL}/storage/v1/object/public/annonces/${annonce.images[0]}` : null;

  const STATUT_LABEL: Record<AnnonceRow["statut"], string> = {
    publiee: "Publiée",
    reservee: "Réservée",
    annulee: "Annulée",
  };

  return (
    <div className={`bg-card rounded-xl border border-border p-4 flex flex-wrap items-center gap-4 ${annonce.statut !== "publiee" ? "opacity-60" : ""}`}>
      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground bg-secondary px-2 py-0.5 rounded">
            {STATUT_LABEL[annonce.statut]}
          </span>
          {annonce.description && (
            <span className="text-xs text-muted-foreground truncate max-w-[220px]">{annonce.description}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock size={11} /> {annonce.duree} min</span>
          <span className="flex items-center gap-1"><Users size={11} /> {annonce.places} place{annonce.places > 1 ? "s" : ""}</span>
          <span>Prix total {annonce.prix_total.toFixed(2)} € · Votre part {annonce.part_pilote.toFixed(2)} € ({check.pct}%) · Prix client {prixClient.toFixed(2)} €</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {annonce.statut === "publiee" && (
          <>
            <button
              onClick={() => onEdit(annonce)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
            >
              <Pencil size={12} />
              Modifier
            </button>
            <button
              onClick={() => startTransition(async () => { await cancelAnnonce(annonce.id); })}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all cursor-pointer disabled:opacity-50"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer disabled:opacity-50"
          >
            {isRepublishPending ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
            Republier
          </button>
        )}
      </div>
    </div>
  );
}

export function AnnoncesList({ annonces, onEdit }: { annonces: AnnonceRow[]; onEdit: (a: AnnonceRow) => void }) {
  if (annonces.length === 0) return null;
  return (
    <div className="space-y-3">
      {annonces.map(a => <AnnonceCard key={a.id} annonce={a} onEdit={onEdit} />)}
    </div>
  );
}
