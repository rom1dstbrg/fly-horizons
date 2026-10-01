"use client";

import { useSearchParams } from "next/navigation";
import { AdminVolsClient } from "@/components/admin/AdminVolsClient";
import { PilotesDispo } from "@/components/admin/PilotesDispo";
import type { DrawerReservation } from "@/components/admin/reservation-drawer/types";

type Reservation = DrawerReservation;

export function VolsHub({
  resaStd,
  dispo,
}: {
  allResas?: Reservation[];
  resaStd: Reservation[];
  dispo: React.ComponentProps<typeof PilotesDispo>;
}) {
  const tab = useSearchParams().get("tab") ?? "reservations";
  return (
    <div className="space-y-5">
      <div>
        {tab === "reservations" && (
          <AdminVolsClient reservations={resaStd as never} />
        )}
        {tab === "disponibilites" && (
          <PilotesDispo {...dispo} />
        )}
      </div>
    </div>
  );
}
