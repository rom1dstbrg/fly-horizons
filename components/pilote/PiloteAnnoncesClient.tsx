"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnnonceForm } from "./AnnonceForm";
import { AnnoncesList, type AnnonceRow, type AnnonceStats } from "./AnnoncesList";
import { EmptyState } from "@/components/admin/ui";
import { PiloteAlert, PiloteModal } from "./ui";
import { Plane, PlaneTakeoff } from "lucide-react";

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
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AnnonceRow | undefined>(undefined);

  function handleDone() {
    setShowForm(false);
    setEditing(undefined);
    router.refresh();
  }

  function openCreate() {
    setEditing(undefined);
    setShowForm(true);
  }

  function openEdit(a: AnnonceRow) {
    setEditing(a);
    setShowForm(true);
  }

  function closeModal() {
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

      {showForm && !publishGate && (
        <PiloteModal title={editing ? "Modifier l'annonce" : "Publier un vol"} onClose={closeModal} wide>
          <AnnonceForm
            key={editing?.id ?? "new"}
            onDone={handleDone}
            onCancel={closeModal}
            editing={editing}
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
