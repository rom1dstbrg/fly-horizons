"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ReservationsClient } from "@/components/admin/ReservationsClient";
import { DispoPlanner } from "@/components/dispo/DispoPlanner";
import { PilotesDispo } from "@/components/admin/PilotesDispo";
import { Segmented } from "@/components/pilote/studio";
import type { DrawerReservation } from "@/components/admin/reservation-drawer/types";

type Reservation = DrawerReservation;

export function VolsHub({
  resaStd,
  plages,
  joursIndiv,
  dispo,
}: {
  allResas?: Reservation[];
  resaStd: Reservation[];
  plages: unknown[];
  joursIndiv: unknown[];
  dispo: React.ComponentProps<typeof PilotesDispo>;
}) {
  const tab = useSearchParams().get("tab") ?? "reservations";
  // Pilotes : la grille de blocs de 2 h de chaque pilote. Calendrier du site :
  // l'ancien calendrier global.
  const [dispoView, setDispoView] = useState<"pilotes" | "site">("pilotes");

  return (
    <div className="space-y-5">
      <div>
        {tab === "reservations" && (
          <ReservationsClient reservations={resaStd as never} />
        )}
        {tab === "disponibilites" && (
          <div className="space-y-4">
            <Segmented
              value={dispoView}
              onChange={setDispoView}
              items={[{ key: "pilotes", label: "Pilotes" }, { key: "site", label: "Calendrier du site" }]}
            />
            {dispoView === "pilotes"
              ? <PilotesDispo {...dispo} />
              : <DispoPlanner scope="admin" plages={plages as never} joursIndiv={joursIndiv as never} />}
          </div>
        )}
      </div>
    </div>
  );
}
