"use client";

import { useState } from "react";
import { ReservationDrawer } from "@/components/admin/reservation-drawer/ReservationDrawer";
import type { DrawerReservation } from "@/components/admin/reservation-drawer/types";
import { AdminBadge, getResaBadge, EmptyState } from "@/components/admin/ui";
import { Plane } from "lucide-react";

type Reservation = DrawerReservation;

function VolCard({ reservation: r, onOpen }: { reservation: Reservation; onOpen: () => void }) {
  const statut = getResaBadge(r);
  const client = r.clients;
  const dateStr = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="card-premium p-4 hover:border-primary/30 transition-colors cursor-pointer" onClick={onOpen}>
      <div className="flex items-center gap-2 flex-wrap">
        <p className="font-semibold text-foreground text-sm">
          {client ? `${client.prenom} ${client.nom}` : "—"}
        </p>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-navy/8 text-navy border border-navy/20">
          {r.duree} min
        </span>
        <AdminBadge variant={statut.variant} label={statut.label} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1">
        <p className="text-xs text-muted-foreground capitalize">
          {dateStr}{r.heure_vol ? ` · ${r.heure_vol.slice(0, 5)}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          {r.passagers} pax{r.poids_total ? ` · ${r.poids_total} kg` : ""}
        </p>
        {r.acompte != null && (
          <p className="text-xs text-muted-foreground">Montant : {r.acompte} €</p>
        )}
      </div>
    </div>
  );
}

export function PiloteVolsClient({ reservations: initial }: { reservations: Reservation[] }) {
  const [reservations, setReservations] = useState<Reservation[]>(initial);
  const [drawer, setDrawer] = useState<Reservation | null>(null);

  function handleStatusChange(id: string, newStatut: string) {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, statut: newStatut } : r));
    setDrawer(prev => prev?.id === id ? { ...prev, statut: newStatut } : prev);
  }

  function handleFieldsChange(id: string, fields: Partial<Reservation>) {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, ...fields } : r));
    setDrawer(prev => prev?.id === id ? { ...prev, ...fields } : prev);
  }

  if (reservations.length === 0) {
    return (
      <EmptyState
        icon={Plane}
        title="Aucune demande pour l'instant"
        description="Les demandes de vos annonces publiées apparaîtront ici."
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        {reservations.map(r => (
          <VolCard key={r.id} reservation={r} onOpen={() => setDrawer(r)} />
        ))}
      </div>

      <ReservationDrawer
        reservation={drawer}
        onClose={() => setDrawer(null)}
        onStatusChange={handleStatusChange}
        onFieldsChange={handleFieldsChange}
        viewerRole="pilote"
      />
    </>
  );
}
