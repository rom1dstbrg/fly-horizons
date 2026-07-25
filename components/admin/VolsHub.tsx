"use client";

import { useSearchParams } from "next/navigation";
import { ReservationsClient } from "@/components/admin/ReservationsClient";
import { VolsPersoClient } from "@/components/admin/VolsPersoClient";
import { DispoClient } from "@/components/admin/DispoClient";
import { StopoversAdmin } from "@/components/admin/StopoversAdmin";
import { StatCard, StatGrid, PageTabs } from "@/components/admin/ui";
import { CalendarCheck, Route, Clock } from "lucide-react";
import type { DrawerReservation } from "@/components/admin/reservation-drawer/types";

type Reservation = DrawerReservation;

const TABS = [
  { key: "reservations",   label: "Réservations",  icon: CalendarCheck },
  { key: "sur-mesure",     label: "Sur mesure",    icon: Route },
  { key: "disponibilites", label: "Disponibilités", icon: Clock },
];

export function VolsHub({
  resaStd,
  resaPerso,
  plages,
  joursIndiv,
  statsStd,
  statsPerso,
}: {
  allResas?: Reservation[];
  resaStd: Reservation[];
  resaPerso: Reservation[];
  plages: unknown[];
  joursIndiv: unknown[];
  statsStd: Record<string, number>;
  statsPerso: Record<string, number>;
}) {
  const tab = useSearchParams().get("tab") ?? "reservations";

  const confirmedCount = statsStd.heure_confirmee + statsPerso.heure_confirmee;

  return (
    <div className="space-y-5">
      <StatGrid cols={5}>
        <StatCard label="Pmt. en ligne"  value={statsStd.payment_pending}                                              variant="orange"  />
        <StatCard label="À encaisser"    value={statsStd.en_attente + statsPerso.en_attente}                           variant="warning" />
        <StatCard label="Planification"  value={(statsStd.date_confirmee ?? 0) + (statsPerso.date_confirmee ?? 0)}     variant="info"    />
        <StatCard label="Confirmés"      value={confirmedCount}                                                        variant="success" />
        <StatCard label="Effectués"      value={(statsStd.vol_effectue ?? 0) + (statsPerso.vol_effectue ?? 0)}         variant="purple"  />
      </StatGrid>

      <PageTabs tabs={TABS} defaultTab="reservations" basePath="/admin/vols" />

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
