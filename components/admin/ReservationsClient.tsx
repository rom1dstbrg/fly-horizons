"use client";

import { useState } from "react";
import { deleteReservationStandard } from "@/lib/actions/delete";
import { ReservationDrawer } from "@/components/admin/reservation-drawer/ReservationDrawer";
import type { DrawerReservation } from "@/components/admin/reservation-drawer/types";
import { AdminBadge, getResaBadge, PageToolbar, FilterChip, EmptyState } from "@/components/admin/ui";
import type { BadgeVariant } from "@/components/admin/ui/AdminBadge";
import { AdminRowActions } from "@/components/admin/ui/AdminRowActions";
import { MapPin, CalendarCheck } from "lucide-react";

// Badge de statut de la proposition de route la plus récente (système carte, route_proposals) —
// prioritaire sur route_status (ancien système texte, gardé en repli pour les résas historiques).
const PROPOSAL_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  pending:                 { label: "Proposition envoyée", variant: "info"    },
  accepted:                { label: "Route acceptée ✓",    variant: "emerald" },
  modification_requested:  { label: "Modif. demandée",      variant: "warning" },
};

const FILTERS = ["Tous", "En attente", "Confirmées", "Effectuées", "Annulées"] as const;
const FILTER_MAP: Record<string, string[] | null> = {
  "Tous":       null,
  "En attente": ["payment_pending", "en_attente", "demande_recue"],
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
  const statut = getResaBadge(r);
  const client = r.clients;
  const dateStr = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
  const latestProposal = r.route_proposals
    ?.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  return (
    <div className="card-premium p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
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
            {latestProposal && PROPOSAL_BADGE[latestProposal.status] ? (
              <AdminBadge
                variant={PROPOSAL_BADGE[latestProposal.status].variant}
                label={PROPOSAL_BADGE[latestProposal.status].label}
              />
            ) : (
              <>
                {r.route_status === "modification_requested" && (
                  <AdminBadge variant="danger" label="Modif. demandée" />
                )}
                {r.route_status === "validated" && (
                  <AdminBadge variant="success" label="Route ✓" />
                )}
              </>
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
        </div>

        <div onClick={e => e.stopPropagation()} className="shrink-0">
          <AdminRowActions onView={onOpen} onDelete={onDelete} />
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
        onFieldsChange={handleFieldsChange}
      />
    </>
  );
}
