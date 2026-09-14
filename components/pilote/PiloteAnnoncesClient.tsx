"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnnonceForm } from "./AnnonceForm";
import { AnnoncesList, type AnnonceRow, type AnnonceStats } from "./AnnoncesList";
import { EmptyState } from "@/components/admin/ui";
import { PiloteAlert, PiloteModal } from "./ui";
import { Plane, PlaneTakeoff, Clock, Route, ArrowRight } from "lucide-react";

type NewType = "duree" | "itineraire";

function TypeChooser({ onChoose }: { onChoose: (type: NewType) => void }) {
  const options: Array<{ type: NewType; icon: typeof Clock; title: string; desc: string }> = [
    { type: "duree", icon: Clock, title: "Vol à durée fixe", desc: "Une durée en minutes, sans itinéraire précis — le plus simple." },
    { type: "itineraire", icon: Route, title: "Vol avec itinéraire", desc: "Vous tracez la route sur une carte, affichée au client sur l'annonce." },
  ];
  return (
    <div className="space-y-2.5">
      <p className="text-sm text-muted-foreground">Quel type de vol souhaitez-vous publier ?</p>
      {options.map(({ type, icon: Icon, title, desc }) => (
        <button
          key={type}
          type="button"
          onClick={() => onChoose(type)}
          className="w-full flex items-center gap-3.5 text-left rounded-lg border border-border p-4 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
            <Icon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
          <ArrowRight size={14} className="text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
        </button>
      ))}
    </div>
  );
}

export function PiloteAnnoncesClient({
  annonces,
  piloteNom,
  stats,
  publishGate = null,
}: {
  annonces: AnnonceRow[];
  piloteNom: string;
  stats?: Record<string, AnnonceStats>;
  publishGate?: string | null;
}) {
  const router = useRouter();
  const [showChooser, setShowChooser] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState<NewType>("duree");
  const [editing, setEditing] = useState<AnnonceRow | undefined>(undefined);

  function handleDone() {
    setShowForm(false);
    setEditing(undefined);
    router.refresh();
  }

  function openCreate() {
    setShowChooser(true);
  }

  function chooseType(type: NewType) {
    setEditing(undefined);
    setNewType(type);
    setShowChooser(false);
    setShowForm(true);
  }

  function openEdit(a: AnnonceRow) {
    setEditing(a);
    setShowForm(true);
  }

  function closeModal() {
    setShowChooser(false);
    setShowForm(false);
    setEditing(undefined);
  }

  return (
    <div className="space-y-4">
      {publishGate && (
        <PiloteAlert tone="warn">
          {publishGate}{" "}
          <a href="/pilote/profil" className="font-semibold underline underline-offset-2">
            Ouvrir mon profil
          </a>
        </PiloteAlert>
      )}

      <div className="flex justify-end">
        <button
          onClick={openCreate}
          disabled={!!publishGate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-[#e6a800] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlaneTakeoff size={14} />
          Publier un vol
        </button>
      </div>

      {showChooser && !publishGate && (
        <PiloteModal title="Publier un vol" onClose={closeModal}>
          <TypeChooser onChoose={chooseType} />
        </PiloteModal>
      )}

      {showForm && !publishGate && (
        <PiloteModal title={editing ? "Modifier l'annonce" : "Publier un vol"} onClose={closeModal}>
          <AnnonceForm
            key={editing?.id ?? "new"}
            onDone={handleDone}
            onCancel={closeModal}
            editing={editing}
            initialHasRoute={!editing && newType === "itineraire"}
          />
        </PiloteModal>
      )}

      {annonces.length === 0 ? (
        <EmptyState
          icon={Plane}
          title="Aucun vol publié"
          description="Publiez votre premier vol : durée, prix, photos et votre part personnelle."
          action={
            !publishGate && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-[#e6a800] transition-colors cursor-pointer"
              >
                <PlaneTakeoff size={14} />
                Publier un vol
              </button>
            )
          }
        />
      ) : (
        <AnnoncesList annonces={annonces} piloteNom={piloteNom} stats={stats} onEdit={openEdit} />
      )}
    </div>
  );
}
