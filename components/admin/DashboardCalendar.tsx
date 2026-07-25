"use client";

import { useState } from "react";
import { ReservationCalendar } from "@/components/admin/ReservationCalendar";
import { ReservationDrawer } from "@/components/admin/reservation-drawer/ReservationDrawer";
import type { DrawerReservation } from "@/components/admin/reservation-drawer/types";

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
        onFieldsChange={(id, fields) => {
          setDrawer(prev => prev?.id === id ? { ...prev, ...fields } : prev);
        }}
      />
    </>
  );
}
