"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Route, X, PlaneTakeoff } from "lucide-react";

const RouteMapReadOnly = dynamic(
  () => import("@/components/maps/RouteMapReadOnly"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-[#f5f5f7] flex items-center justify-center rounded-lg">
        <p className="text-sm text-muted-foreground animate-pulse">Chargement de la carte…</p>
      </div>
    ),
  }
);

type Waypoint = { lat: number; lng: number; nom?: string };

export function VolItineraryCard({ waypoints }: { waypoints: Waypoint[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-border overflow-hidden bg-card px-4 py-3 flex items-center justify-between gap-2 hover:bg-secondary/50 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Route size={14} className="text-primary" />
          <span className="text-xs font-bold text-foreground uppercase tracking-[1.5px]">Itinéraire de ce vol</span>
        </span>
        <span className="text-xs font-semibold text-primary">Voir la carte</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card rounded-2xl overflow-hidden w-full max-w-3xl max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <Route size={15} className="text-primary" />
                Itinéraire de ce vol
              </p>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-full hover:bg-secondary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="h-[380px] shrink-0">
              <RouteMapReadOnly waypoints={waypoints} height="380px" />
            </div>
            <div className="p-5 overflow-y-auto">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <PlaneTakeoff size={13} className="text-primary shrink-0" />
                  <span className="font-semibold">Aérodrome de Charleroi (EBCI)</span>
                  <span className="text-muted-foreground text-xs">Départ</span>
                </div>
                {waypoints.map((w, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-foreground pl-1">
                    <span className="w-4 h-4 rounded-full bg-primary text-[#0b2238] text-[10px] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span>{w.nom || `Point ${i + 1}`}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <PlaneTakeoff size={13} className="text-primary shrink-0" />
                  <span className="font-semibold">Aérodrome de Charleroi (EBCI)</span>
                  <span className="text-muted-foreground text-xs">Retour</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
