"use client";

import { useState } from "react";
import { deleteReservationStandard } from "@/lib/actions/delete";
import { ReservationDrawer, type DrawerReservation } from "@/components/admin/ReservationDrawer";
import { AdminBadge, STATUT_RESA } from "@/components/admin/ui/AdminBadge";
import { AdminRowActions } from "@/components/admin/ui/AdminRowActions";
import { MapPin, Search, X } from "lucide-react";

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
  const statut = STATUT_RESA[r.statut] ?? { label: r.statut, variant: "secondary" as const };
  const client = r.clients;
  const dateStr = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="card-premium p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        {/* Infos — cliquables */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={onOpen}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground text-sm">
              {client ? `${client.prenom} ${client.nom}` : "—"}
            </p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-navy/8 text-navy border border-navy/20">
              {r.duree} min
            </span>
            <AdminBadge variant={statut.variant} label={statut.label} />
            {r.remboursement != null && r.remboursement > 0 && (
              <AdminBadge variant="secondary" label={`Remboursé −${r.remboursement} €`} />
            )}
            {r.route_status === "modification_requested" && (
              <AdminBadge variant="danger" label="Modif. demandée" />
            )}
            {r.route_status === "validated" && (
              <AdminBadge variant="success" label="Route ✓" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1">
            <p className="text-xs text-muted-foreground capitalize">
              {dateStr}{r.heure_vol ? ` · ${r.heure_vol.slice(0, 5)}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {r.passagers} pax{r.poids_total ? ` · ${r.poids_total} kg` : ""}
            </p>
            {r.voucher_code && (
              <p className="text-xs text-emerald-600 font-mono font-semibold">{r.voucher_code}</p>
            )}
            {r.route && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin size={10} />Route définie
              </span>
            )}
          </div>
          {client && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {client.email}{client.telephone ? ` · ${client.telephone}` : ""}
            </p>
          )}
        </div>

        {/* Actions */}
        <div onClick={e => e.stopPropagation()} className="shrink-0">
          <AdminRowActions
            onView={onOpen}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
}

export function ReservationsClient({ reservations: initial }: { reservations: Reservation[] }) {
  const [reservations, setReservations] = useState<Reservation[]>(initial);
  const [filter, setFilter] = useState<typeof FILTERS[number]>("Tous");
  const [search, setSearch] = useState("");
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

  const searchTerm = search.trim().toLowerCase();
  const filtered = reservations
    .filter(r => filter === "Tous" || (FILTER_MAP[filter] ?? []).includes(r.statut))
    .filter(r => {
      if (!searchTerm) return true;
      const name = `${r.clients?.prenom ?? ""} ${r.clients?.nom ?? ""}`.toLowerCase();
      const email = (r.clients?.email ?? "").toLowerCase();
      return name.includes(searchTerm) || email.includes(searchTerm);
    });

  return (
    <>
      <div className="space-y-4">
        {/* Recherche */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="w-full h-9 pl-9 pr-8 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-navy/30 placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map(f => {
            const values = FILTER_MAP[f];
            const base = values === null ? reservations : reservations.filter(r => values.includes(r.statut));
            const count = searchTerm
              ? base.filter(r => {
                  const name = `${r.clients?.prenom ?? ""} ${r.clients?.nom ?? ""}`.toLowerCase();
                  const email = (r.clients?.email ?? "").toLowerCase();
                  return name.includes(searchTerm) || email.includes(searchTerm);
                }).length
              : base.length;
            return (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                  filter === f
                    ? "bg-navy text-white border-navy"
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
            Aucune réservation{filter !== "Tous" ? ` "${filter.toLowerCase()}"` : ""} pour le moment.
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
