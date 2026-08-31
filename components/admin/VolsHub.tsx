"use client";

import { useSearchParams } from "next/navigation";
import { ReservationsClient } from "@/components/admin/ReservationsClient";
import { VolsPersoClient } from "@/components/admin/VolsPersoClient";
import { DispoClient } from "@/components/admin/DispoClient";
import { StopoversAdmin } from "@/components/admin/StopoversAdmin";
import type { DrawerReservation } from "@/components/admin/reservation-drawer/types";

type Reservation = DrawerReservation;

export function VolsHub({
  resaStd,
  resaPerso,
  plages,
  joursIndiv,
}: {
  allResas?: Reservation[];
  resaStd: Reservation[];
  resaPerso: Reservation[];
  plages: unknown[];
  joursIndiv: unknown[];
}) {
  const tab = useSearchParams().get("tab") ?? "reservations";

  return (
    <div className="space-y-5">
      <div>
        {tab === "reservations" && (
          <ReservationsClient reservations={resaStd as never} />
        )}
        {tab === "sur-mesure" && (
          <div className="space-y-4">
            <StopoversAdmin />
            <VolsPersoClient reservations={resaPerso as never} />
          </div>
        )}
        {tab === "disponibilites" && (
          <DispoClient plages={plages as never} joursIndiv={joursIndiv as never} />
        )}
      </div>
    </div>
  );
}
