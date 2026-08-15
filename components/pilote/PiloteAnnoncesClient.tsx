"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnnonceForm } from "./AnnonceForm";
import { AnnoncesList, type AnnonceRow } from "./AnnoncesList";
import { EmptyState } from "@/components/admin/ui";
import { Plane, PlaneTakeoff } from "lucide-react";

export function PiloteAnnoncesClient({ annonces }: { annonces: AnnonceRow[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(annonces.length === 0);
  const [editing, setEditing] = useState<AnnonceRow | undefined>(undefined);

  function handleDone() {
    setShowForm(false);
    setEditing(undefined);
    router.refresh();
  }

  function openCreate() {
    setEditing(undefined);
    setShowForm(v => !v);
  }

  function openEdit(a: AnnonceRow) {
    setEditing(a);
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-[#e6a800] transition-colors cursor-pointer"
        >
          <PlaneTakeoff size={14} />
          {showForm ? "Fermer" : "Publier un vol"}
        </button>
      </div>

      {showForm && <AnnonceForm key={editing?.id ?? "new"} onDone={handleDone} editing={editing} />}

      {annonces.length === 0 ? (
        <EmptyState
          icon={Plane}
          title="Aucun vol publié"
          description="Publiez votre premier vol : durée, prix, photos et votre part personnelle."
        />
      ) : (
        <AnnoncesList annonces={annonces} onEdit={openEdit} />
      )}
    </div>
  );
}
