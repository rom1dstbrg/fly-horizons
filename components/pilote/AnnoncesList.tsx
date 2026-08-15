"use client";

import { useTransition } from "react";
import { cancelAnnonce } from "@/lib/actions/annonces";
import { evaluerPartPilote } from "@/lib/annonces-pilote";
import { Loader2, X, Users, Clock } from "lucide-react";

export interface AnnonceRow {
  id: string;
  date_vol: string;
  heure_vol: string;
  duree: number;
  places: number;
  prix_total: number;
  part_pilote: number;
  statut: "publiee" | "annulee";
}

function AnnonceCard({ annonce }: { annonce: AnnonceRow }) {
  const [isPending, startTransition] = useTransition();
  const check = evaluerPartPilote(annonce.prix_total, annonce.part_pilote);
  const dateStr = new Date(annonce.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
  const prixClient = Math.max(0, annonce.prix_total - annonce.part_pilote);

  return (
    <div className={`bg-card rounded-xl border border-border p-4 flex flex-wrap items-center gap-4 ${annonce.statut === "annulee" ? "opacity-50" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground capitalize">{dateStr}</span>
          <span className="text-sm text-muted-foreground">à {annonce.heure_vol.slice(0, 5)}</span>
          {annonce.statut === "annulee" && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground bg-secondary px-2 py-0.5 rounded">Annulée</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock size={11} /> {annonce.duree} min</span>
          <span className="flex items-center gap-1"><Users size={11} /> {annonce.places} place{annonce.places > 1 ? "s" : ""}</span>
          <span>Prix total {annonce.prix_total.toFixed(2)} € · Votre part {annonce.part_pilote.toFixed(2)} € ({check.pct}%) · Prix client {prixClient.toFixed(2)} €</span>
        </div>
      </div>
      {annonce.statut === "publiee" && (
        <button
          onClick={() => startTransition(async () => { await cancelAnnonce(annonce.id); })}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all cursor-pointer disabled:opacity-50"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
          Annuler
        </button>
      )}
    </div>
  );
}

export function AnnoncesList({ annonces }: { annonces: AnnonceRow[] }) {
  if (annonces.length === 0) return null;
  return (
    <div className="space-y-3">
      {annonces.map(a => <AnnonceCard key={a.id} annonce={a} />)}
    </div>
  );
}
