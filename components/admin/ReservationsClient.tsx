"use client";

import { useState } from "react";
import { deleteReservationStandard } from "@/lib/actions/delete";
import { ReservationDrawer } from "@/components/admin/reservation-drawer/ReservationDrawer";
import type { DrawerReservation, Waypoint } from "@/components/admin/reservation-drawer/types";
import { AdminBadge, getResaBadge, PageToolbar, FilterChip, EmptyState } from "@/components/admin/ui";
import { AdminRowActions } from "@/components/admin/ui/AdminRowActions";
import { CalendarCheck } from "lucide-react";

const FILTERS = ["Tous", "En attente", "Confirmées", "Effectuées", "Annulées"] as const;
const FILTER_MAP: Record<string, string[] | null> = {
  "Tous":       null,
  "En attente": ["payment_pending", "en_attente", "demande_recue"],
  "Confirmées": ["date_confirmee", "heure_confirmee"],
  "Effectuées": ["vol_effectue"],
  "Annulées":   ["annulee"],
};

type Reservation = DrawerReservation;

// Route affichée sous forme "Ville → Ville → Ville" — priorité au tracé final confirmé
// (final_waypoints), puis à l'itinéraire fixe de l'offre achetée (produits avec route),
// sinon aucune route à afficher (durée libre, pas encore tracée).
function routeCities(r: Reservation): string | null {
  const wps: Waypoint[] | null | undefined =
    r.final_waypoints?.length ? r.final_waypoints : r.products?.route_waypoints;
  if (!wps || wps.length === 0) return null;
  return wps.map(w => w.nom?.trim() || "?").join(" → ");
}

function ReservationRow({
  reservation: r,
  onOpen,
  onDelete,
}: {
  reservation: Reservation;
  onOpen: () => void;
  onDelete: () => Promise<{ error?: string } | void>;
}) {
  const statut = getResaBadge(r);
  const client = r.clients;
  const dateStr = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    day: "numeric", month: "short", year: "numeric",
  });
  const route = routeCities(r);

  return (
    <tr className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
      <td className="px-4 py-3 cursor-pointer whitespace-nowrap" onClick={onOpen}>
        <span className="text-sm text-foreground font-medium capitalize">{dateStr}</span>
        {r.heure_vol && <span className="text-xs text-muted-foreground"> · {r.heure_vol.slice(0, 5)}</span>}
      </td>
      <td className="px-4 py-3 cursor-pointer" onClick={onOpen}>
        <span className="font-semibold text-foreground text-sm whitespace-nowrap">
          {client ? `${client.prenom} ${client.nom}` : "—"}
        </span>
        {r.voucher_code && (
          <p className="text-[10px] text-emerald-600 font-mono font-semibold">{r.voucher_code}</p>
        )}
      </td>
      <td className="px-4 py-3 cursor-pointer" onClick={onOpen}>
        {route ? (
          <span className="text-xs text-foreground truncate block max-w-[280px]" title={route}>{route}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-center cursor-pointer whitespace-nowrap" onClick={onOpen}>
        <span className="text-sm text-foreground">{r.duree} min</span>
      </td>
      <td className="px-4 py-3 cursor-pointer" onClick={onOpen}>
        <div className="flex flex-col items-start gap-1">
          <AdminBadge variant={statut.variant} label={statut.label} />
          {r.remboursement != null && r.remboursement > 0 && (
            <span className="text-[10px] font-semibold text-red-500">Remboursé −{r.remboursement} €</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <AdminRowActions onView={onOpen} onDelete={onDelete} />
        </div>
      </td>
    </tr>
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

  function handleFieldsChange(id: string, fields: Partial<Reservation>) {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, ...fields } : r));
    setDrawer(prev => prev?.id === id ? { ...prev, ...fields } : prev);
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
    })
    // Plus lointain dans le futur en premier, vols déjà passés en dernier
    .sort((a, b) => `${b.date_vol}${b.heure_vol ?? ""}`.localeCompare(`${a.date_vol}${a.heure_vol ?? ""}`));

  function countFor(f: typeof FILTERS[number]) {
    const values = FILTER_MAP[f];
    const base = values === null ? reservations : reservations.filter(r => values.includes(r.statut));
    if (!searchTerm) return base.length;
    return base.filter(r => {
      const name = `${r.clients?.prenom ?? ""} ${r.clients?.nom ?? ""}`.toLowerCase();
      const email = (r.clients?.email ?? "").toLowerCase();
      return name.includes(searchTerm) || email.includes(searchTerm);
    }).length;
  }

  return (
    <>
      <div className="space-y-4">
        <PageToolbar
          search={{ value: search, onChange: setSearch, placeholder: "Rechercher par nom ou email…" }}
          filters={
            <div className="flex flex-wrap gap-2">
              {FILTERS.map(f => (
                <FilterChip
                  key={f}
                  label={f}
                  active={filter === f}
                  count={countFor(f)}
                  onClick={() => setFilter(f)}
                />
              ))}
            </div>
          }
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title={`Aucune réservation${filter !== "Tous" ? ` "${filter.toLowerCase()}"` : ""}`}
            description="Aucune réservation ne correspond à ces critères."
          />
        ) : (
          <div className="card-premium overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Route</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Durée</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Statut</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <ReservationRow
                      key={r.id}
                      reservation={r}
                      onOpen={() => setDrawer(r)}
                      onDelete={() => handleDelete(r.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ReservationDrawer
        reservation={drawer}
        onClose={() => setDrawer(null)}
        onStatusChange={handleStatusChange}
        onFieldsChange={handleFieldsChange}
      />
    </>
  );
}
