"use client";

import { useState } from "react";
import { deleteReservationStandard } from "@/lib/actions/delete";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ReservationDrawer, type DrawerReservation } from "@/components/admin/ReservationDrawer";
import { MapPin } from "lucide-react";

const STATUT_CONFIG: Record<string, { label: string; color: string }> = {
  payment_pending: { label: "Paiement en att.", color: "bg-orange-100 text-orange-700 border-orange-200" },
  en_attente:      { label: "En attente",       color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  date_confirmee:  { label: "Date confirmée",   color: "bg-blue-100 text-blue-700 border-blue-200" },
  heure_confirmee: { label: "Heure confirmée",  color: "bg-green-100 text-green-700 border-green-200" },
  vol_effectue:    { label: "Vol effectué",     color: "bg-purple-100 text-purple-700 border-purple-200" },
  annulee:         { label: "Annulée",          color: "bg-red-100 text-red-700 border-red-200" },
};

const FILTERS = ["Tous", "En attente", "Confirmées", "Effectuées", "Annulées"] as const;
const FILTER_MAP: Record<string, string[] | null> = {
  "Tous":       null,
  "En attente": ["payment_pending", "en_attente"],
  "Confirmées": ["date_confirmee", "heure_confirmee"],
  "Effectuées": ["vol_effectue"],
  "Annulées":   ["annulee"],
};

type Reservation = DrawerReservation;

function ReservationCard({
  reservation: r,
  onOpen,
  onDelete,
}: {
  reservation: Reservation;
  onOpen: () => void;
  onDelete: () => Promise<{ error?: string } | void>;
}) {
  const statut = STATUT_CONFIG[r.statut] ?? STATUT_CONFIG.en_attente;
  const client = r.clients;
  const dateStr = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div
      className="card-premium p-4 cursor-pointer hover:border-primary/30 transition-colors group"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground text-sm">
              {client ? `${client.prenom} ${client.nom}` : "—"}
            </p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statut.color}`}>
              {statut.label}
            </span>
            {r.route_status === "modification_requested" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200">
                Modif. demandée
              </span>
            )}
            {r.route_status === "validated" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200">
                Route ✓
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1">
            <p className="text-xs text-muted-foreground capitalize">
              {dateStr}{r.heure_vol ? ` · ${r.heure_vol.slice(0, 5)}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {r.duree} min · {r.passagers} pax{r.poids_total ? ` · ${r.poids_total} kg` : ""}
            </p>
            {r.voucher_code && (
              <p className="text-xs text-emerald-600 font-mono font-semibold">{r.voucher_code}</p>
            )}
            {r.route && (
              <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                <MapPin size={10} />
                Route définie
              </span>
            )}
          </div>
          {client && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {client.email}{client.telephone ? ` · ${client.telephone}` : ""}
            </p>
          )}
        </div>

        <div
          className="flex items-center gap-1 shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <DeleteButton
            onDelete={onDelete}
            confirmMessage="Supprimer cette réservation ?"
          />
        </div>
      </div>
    </div>
  );
}

export function ReservationsClient({ reservations: initial }: { reservations: Reservation[] }) {
  const [reservations, setReservations] = useState<Reservation[]>(initial);
  const [filter, setFilter] = useState<typeof FILTERS[number]>("Tous");
  const [drawer, setDrawer] = useState<Reservation | null>(null);

  function handleStatusChange(id: string, newStatut: string) {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, statut: newStatut } : r));
    setDrawer(prev => prev?.id === id ? { ...prev, statut: newStatut } : prev);
  }

  async function handleDelete(id: string) {
    const result = await deleteReservationStandard(id);
    if (!result?.error) setReservations(prev => prev.filter(r => r.id !== id));
    return result;
  }

  const filtered = filter === "Tous"
    ? reservations
    : reservations.filter(r => (FILTER_MAP[filter] ?? []).includes(r.statut));

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(f => {
            const values = FILTER_MAP[f];
            const count = values === null
              ? reservations.length
              : reservations.filter(r => values.includes(r.statut)).length;
            return (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  filter === f
                    ? "bg-[#113356] text-white border-[#113356]"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}>
                {f}
                <span className="ml-1.5 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Aucune réservation {filter !== "Tous" ? `"${filter.toLowerCase()}"` : ""} pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <ReservationCard
                key={r.id}
                reservation={r}
                onOpen={() => setDrawer(r)}
                onDelete={() => handleDelete(r.id)}
              />
            ))}
          </div>
        )}
      </div>

      <ReservationDrawer
        reservation={drawer}
        onClose={() => setDrawer(null)}
        onStatusChange={handleStatusChange}
      />
    </>
  );
}
