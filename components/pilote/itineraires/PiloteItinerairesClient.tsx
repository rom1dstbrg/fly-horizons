"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Navigation, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteItineraire, type Itineraire } from "@/lib/actions/itineraires";
import { Button, ButtonLabel, EmptyState, PageHeader } from "@/components/pilote/studio";
import { ConfirmActionDialog, type PendingAction } from "@/components/admin/reservation-drawer/ConfirmActionDialog";
import { applyFilter, FilterBar, ItinerairePreview, ItineraireRows, type DureeFilter } from "./ItineraireParts";
import { ItineraireEditor } from "./ItineraireEditor";

// Page « Itinéraires » du pilote (maquette validée le 27/09) : liste filtrable
// à gauche, aperçu à droite (au téléphone, l'aperçu passe sous la liste).
// Chaque pilote ne voit que ses propres itinéraires.

export function PiloteItinerairesClient({ items }: { items: Itineraire[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<DureeFilter>({ min: "", max: "", q: "" });
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  // undefined = éditeur fermé, null = nouvel itinéraire.
  const [editing, setEditing] = useState<Itineraire | null | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isPending, startTransition] = useTransition();

  const shown = useMemo(
    () => [...applyFilter(items, filter)].sort((a, b) => (a.duree_estimee ?? 9999) - (b.duree_estimee ?? 9999)),
    [items, filter],
  );
  const selected = shown.find((i) => i.id === selectedId) ?? shown[0] ?? null;

  function askDelete(it: Itineraire) {
    setPendingAction({
      title: `Supprimer « ${it.nom} » ?`,
      consequences: ["Les annonces et réservations où vous l'avez déjà chargé gardent leur route."],
      confirmLabel: "Supprimer",
      danger: true,
      run: () => startTransition(async () => {
        await deleteItineraire(it.id);
        setPendingAction(null);
        router.refresh();
      }),
    });
  }

  const newButton = (
    <Button onClick={() => setEditing(null)}>
      <Plus /> <ButtonLabel full="Nouvel itinéraire" short="Nouveau" />
    </Button>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Itinéraires" actions={items.length > 0 && newButton} />

      {items.length === 0 ? (
        <EmptyState
          icon={Navigation}
          title="Aucun itinéraire enregistré"
          description="Enregistrez vos routes habituelles pour les recharger en un clic dans une annonce ou une réservation."
          action={newButton}
        />
      ) : (
        <div className="overflow-hidden rounded-[20px] border border-st-line bg-white shadow-st-sm lg:grid lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col border-st-line max-lg:border-b lg:border-r">
            <FilterBar filter={filter} onChange={setFilter} total={items.length} shown={shown.length} />
            {shown.length === 0 ? (
              <p className="px-4 py-10 text-center text-[13px] text-st-text-2">Aucun itinéraire ne correspond à ce filtre.</p>
            ) : (
              <div className="max-h-[320px] overflow-y-auto lg:max-h-[640px]">
                <ItineraireRows items={shown} selectedId={selected?.id ?? null} onSelect={setSelectedId} showUses />
              </div>
            )}
          </div>
          {selected && (
            <ItinerairePreview
              itin={selected}
              actions={
                <>
                  <Button variant="secondary" size="sm" onClick={() => askDelete(selected)} aria-label="Supprimer">
                    <Trash2 /> <span className="max-sm:hidden">Supprimer</span>
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setEditing(selected)}>
                    <Pencil /> Modifier
                  </Button>
                </>
              }
            />
          )}
        </div>
      )}

      {editing !== undefined && (
        <ItineraireEditor
          key={editing?.id ?? "new"}
          itin={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); router.refresh(); }}
        />
      )}

      <ConfirmActionDialog
        action={pendingAction}
        isPending={isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => pendingAction?.run()}
      />
    </div>
  );
}
