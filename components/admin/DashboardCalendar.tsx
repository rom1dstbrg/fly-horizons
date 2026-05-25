"use client";

import { useState } from "react";
import { ReservationCalendar } from "@/components/admin/ReservationCalendar";
import { ReservationDrawer, type DrawerReservation } from "@/components/admin/ReservationDrawer";

export function DashboardCalendar({
  reservations,
}: {
  reservations: DrawerReservation[];
}) {
  const [drawer, setDrawer] = useState<DrawerReservation | null>(null);

  return (
    <>
      <ReservationCalendar
        reservations={reservations}
        onCardClick={setDrawer}
      />
      <ReservationDrawer
        reservation={drawer}
        onClose={() => setDrawer(null)}
        onStatusChange={(id, newStatut) => {
          // Optimistic update in the calendar view — page refreshes on next navigation
          setDrawer(prev => prev?.id === id ? { ...prev, statut: newStatut } : prev);
        }}
      />
    </>
  );
}
