"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReservationDrawer } from "@/components/admin/reservation-drawer/ReservationDrawer";
import { ROUTE_STATUS_CONFIG, type DrawerReservation, type Waypoint } from "@/components/admin/reservation-drawer/types";
import { AdminBadge, getResaBadge, EmptyState } from "@/components/admin/ui";
import { Plane, Eye, Scale } from "lucide-react";

type Reservation = DrawerReservation;

// Route "Ville → Ville" : tracé final confirmé, sinon itinéraire fixe de l'offre achetée.
function routeCities(r: Reservation): string | null {
  const wps: Waypoint[] | null | undefined =
    r.final_waypoints?.length ? r.final_waypoints : r.products?.route_waypoints;
  if (!wps || wps.length === 0) return null;
  return wps.map((w) => w.nom?.trim() || "?").join(" → ");
}

// Dernier statut de proposition de route, pour le badge de la colonne Route.
function routeStatus(r: Reservation): string | null {
  const props = r.route_proposals ?? [];
  if (props.length > 0) {
    return [...props].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))[0]?.status ?? null;
  }
  return r.route_status ?? null;
}

export function PiloteVolsClient({ reservations: initial }: { reservations: Reservation[] }) {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>(initial);
  const [drawer, setDrawer] = useState<Reservation | null>(null);

  function handleStatusChange(id: string, newStatut: string) {
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, statut: newStatut } : r)));
    setDrawer((prev) => (prev?.id === id ? { ...prev, statut: newStatut } : prev));
  }

  function handleFieldsChange(id: string, fields: Partial<Reservation>) {
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, ...fields } : r)));
    setDrawer((prev) => (prev?.id === id ? { ...prev, ...fields } : prev));
  }

  if (reservations.length === 0) {
    return (
      <EmptyState
        icon={Plane}
        title="Aucun vol pour l'instant"
        description="Les vols qui vous sont attribués et les demandes de vos annonces apparaîtront ici."
      />
    );
  }

  const th = "text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide";

  return (
    <>
      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className={th}>Date</th>
                <th className={th}>Client</th>
                <th className={th}>Route</th>
                <th className={`${th} text-center`}>Durée</th>
                <th className={th}>Statut</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => {
                const statut = getResaBadge(r);
                const client = r.clients;
                const dateStr = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const cities = routeCities(r);
                const rStatus = routeStatus(r);
                const rConf = rStatus ? ROUTE_STATUS_CONFIG[rStatus] : null;

                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap cursor-pointer" onClick={() => setDrawer(r)}>
                      <span className="text-sm text-foreground font-medium capitalize">{dateStr}</span>
                      {r.heure_vol && <span className="text-xs text-muted-foreground"> · {r.heure_vol.slice(0, 5)}</span>}
                    </td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => setDrawer(r)}>
                      <span className="font-semibold text-foreground text-sm whitespace-nowrap">
                        {client ? `${client.prenom} ${client.nom}` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 cursor-pointer align-middle" onClick={() => setDrawer(r)}>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {cities ? (
                          <span className="text-xs text-foreground">{cities}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        {rConf && (
                          <span className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-semibold border ${rConf.color}`}>
                            {rConf.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap cursor-pointer" onClick={() => setDrawer(r)}>
                      <span className="text-sm text-foreground">{r.duree} min</span>
                    </td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => setDrawer(r)}>
                      <AdminBadge variant={statut.variant} label={statut.label} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDrawer(r)}
                          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors cursor-pointer"
                        >
                          <Eye size={13} /> Voir
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/pilote/mass-balance?resa=${r.id}`)}
                          title="Masse & centrage (poids préremplis)"
                          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors cursor-pointer"
                        >
                          <Scale size={13} /> M&amp;B
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
