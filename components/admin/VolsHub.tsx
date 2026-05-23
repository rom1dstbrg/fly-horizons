"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { updateStatutReservation } from "@/lib/actions/reservations";
import { KanbanPipeline } from "@/components/admin/KanbanPipeline";
import { ReservationCalendar } from "@/components/admin/ReservationCalendar";
import { ReservationDrawer, type DrawerReservation } from "@/components/admin/ReservationDrawer";
import { ReservationsClient } from "@/components/admin/ReservationsClient";
import { VolsPersoClient } from "@/components/admin/VolsPersoClient";
import { DispoClient } from "@/components/admin/DispoClient";
import { StopoversAdmin } from "@/components/admin/StopoversAdmin";
import { Layers, CalendarDays, CalendarCheck, Route, Clock, Plane } from "lucide-react";

type Reservation = DrawerReservation;

const TABS = [
  { key: "pipeline",       label: "Pipeline",      icon: Layers },
  { key: "calendrier",     label: "Calendrier",    icon: CalendarDays },
  { key: "reservations",   label: "Réservations",  icon: CalendarCheck },
  { key: "sur-mesure",     label: "Sur mesure",    icon: Route },
  { key: "disponibilites", label: "Disponibilités", icon: Clock },
];

export function VolsHub({
  allResas,
  resaStd,
  resaPerso,
  plages,
  joursIndiv,
  statsStd,
  statsPerso,
}: {
  allResas: Reservation[];
  resaStd: Reservation[];
  resaPerso: Reservation[];
  plages: unknown[];
  joursIndiv: unknown[];
  statsStd: Record<string, number>;
  statsPerso: Record<string, number>;
}) {
  const router = useRouter();
  const tab = useSearchParams().get("tab") ?? "pipeline";
  const [localResas, setLocalResas] = useState<Reservation[]>(allResas);
  const [drawer, setDrawer] = useState<Reservation | null>(null);

  function changeTab(key: string) {
    const url = key === "pipeline" ? "/admin/vols" : `/admin/vols?tab=${key}`;
    router.replace(url, { scroll: false });
  }

  const openDrawer = useCallback((r: Reservation) => setDrawer(r), []);
  const closeDrawer = useCallback(() => setDrawer(null), []);

  const handleCardMove = useCallback((id: string, newStatut: string, prevStatut: string) => {
    setLocalResas(prev => prev.map(r => r.id === id ? { ...r, statut: newStatut } : r));
    updateStatutReservation(id, newStatut).then(result => {
      if (result.error) {
        setLocalResas(prev => prev.map(r => r.id === id ? { ...r, statut: prevStatut } : r));
      }
    });
  }, []);

  const onStatusChange = useCallback((id: string, newStatut: string) => {
    setDrawer(prev => prev?.id === id ? { ...prev, statut: newStatut } : prev);
    setLocalResas(prev => prev.map(r => r.id === id ? { ...r, statut: newStatut } : r));
  }, []);

  // Stats bar
  const urgentCount = statsStd.payment_pending + statsStd.en_attente + statsPerso.en_attente;
  const confirmedCount = statsStd.heure_confirmee + statsPerso.heure_confirmee;

  return (
    <div className="space-y-5">
      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Pmt. att.",   value: statsStd.payment_pending, color: "text-orange-500" },
          { label: "En attente",  value: statsStd.en_attente + statsPerso.en_attente, color: "text-yellow-600" },
          { label: "Planification", value: (statsStd.date_confirmee ?? 0) + (statsPerso.date_confirmee ?? 0), color: "text-blue-600" },
          { label: "Confirmés",   value: confirmedCount, color: "text-green-600" },
          { label: "Effectués",   value: (statsStd.vol_effectue ?? 0) + (statsPerso.vol_effectue ?? 0), color: "text-purple-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card rounded-xl border border-border p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} className={isActive ? "text-navy" : ""} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {tab === "pipeline" && (
          <KanbanPipeline reservations={localResas} onCardClick={openDrawer} onCardMove={handleCardMove} />
        )}
        {tab === "calendrier" && (
          <ReservationCalendar reservations={localResas} onCardClick={openDrawer} />
        )}
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

      {/* Drawer */}
      <ReservationDrawer
        reservation={drawer}
        onClose={closeDrawer}
        onStatusChange={onStatusChange}
      />
    </div>
  );
}
