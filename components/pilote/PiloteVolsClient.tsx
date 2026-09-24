"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plane, Scale } from "lucide-react";
import { ReservationDrawer } from "@/components/admin/reservation-drawer/ReservationDrawer";
import type { DrawerReservation, Waypoint } from "@/components/admin/reservation-drawer/types";
import {
  Button, DateTile, EmptyState, Segmented, StatCard, StatGrid,
  Table, TableCell, TableHeaderCell, TableRow, TableSearch,
} from "@/components/pilote/studio";
import { AnnonceTag, ResaBadge, RouteStatusBadge } from "@/components/pilote/ResaBadge";

type Reservation = DrawerReservation;

// Route « Ville → Ville » : tracé final confirmé, sinon itinéraire fixe de l'offre achetée.
function routeCities(r: Reservation): string | null {
  const wps: Waypoint[] | null | undefined = r.final_waypoints?.length ? r.final_waypoints : r.products?.route_waypoints;
  if (!wps || wps.length === 0) return null;
  return wps.map((w) => w.nom?.trim() || "?").join(" → ");
}

// Dernier statut de proposition de route.
function routeStatus(r: Reservation): string | null {
  const props = r.route_proposals ?? [];
  if (props.length > 0) {
    return [...props].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))[0]?.status ?? null;
  }
  return r.route_status ?? null;
}

const TODAY = new Date().toISOString().slice(0, 10);
const MONTH = TODAY.slice(0, 7);
const isPast = (r: Reservation) => r.statut === "vol_effectue" || r.statut === "annulee" || r.date_vol < TODAY;
const monthLabel = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("fr-BE", { month: "short", year: "numeric", timeZone: "Europe/Brussels" });

export function PiloteVolsClient({ reservations: initial }: { reservations: Reservation[] }) {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>(initial);
  const [drawer, setDrawer] = useState<Reservation | null>(null);
  const [view, setView] = useState<"avenir" | "passes">("avenir");
  const [query, setQuery] = useState("");

  function handleStatusChange(id: string, newStatut: string) {
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, statut: newStatut } : r)));
    setDrawer((prev) => (prev?.id === id ? { ...prev, statut: newStatut } : prev));
  }

  function handleFieldsChange(id: string, fields: Partial<Reservation>) {
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, ...fields } : r)));
    setDrawer((prev) => (prev?.id === id ? { ...prev, ...fields } : prev));
  }

  const aVenir = reservations.filter((r) => !isPast(r));
  const passes = reservations.filter(isPast).reverse();

  // 4 chiffres utiles au maximum (règle Studio).
  const stats = useMemo(() => {
    const aConfirmer = aVenir.filter((r) => r.statut === "demande_recue" || r.statut === "en_attente").length;
    const aRegler = aVenir.filter(
      (r) => r.type_resa === "annonce_pilote" && r.pilote_paye !== true && r.statut !== "demande_recue",
    ).length;
    const effectuesMois = reservations.filter((r) => r.statut === "vol_effectue" && r.date_vol.startsWith(MONTH));
    const minutes = effectuesMois.reduce((s, r) => s + (r.duree ?? 0), 0);
    const dans7j = aVenir.filter((r) => {
      const d = new Date(r.date_vol + "T12:00:00Z");
      const diff = (d.getTime() - new Date(TODAY + "T12:00:00Z").getTime()) / 86400000;
      return diff <= 7;
    }).length;
    return { aConfirmer, aRegler, minutes, nEffectues: effectuesMois.length, dans7j };
  }, [aVenir, reservations]);

  if (reservations.length === 0) {
    return (
      <EmptyState
        icon={Plane}
        title="Aucun vol pour l'instant"
        description="Les vols qui vous sont attribués et les demandes de vos annonces apparaîtront ici."
      />
    );
  }

  const needle = query.trim().toLowerCase();
  const rows = (view === "avenir" ? aVenir : passes).filter((r) => {
    if (!needle) return true;
    const hay = `${r.clients?.prenom ?? ""} ${r.clients?.nom ?? ""} ${routeCities(r) ?? ""}`.toLowerCase();
    return hay.includes(needle);
  });
  const heures = (stats.minutes / 60).toLocaleString("fr-BE", { maximumFractionDigits: 1 });

  return (
    <>
      <StatGrid>
        <StatCard label="À venir" value={aVenir.length} hint={stats.dans7j > 0 ? `dont ${stats.dans7j} dans les 7 jours` : "rien dans les 7 jours"} />
        <StatCard label="À confirmer" value={stats.aConfirmer} tone={stats.aConfirmer > 0 ? "warn" : undefined} hint="demande ou heure" />
        <StatCard label="À régler" value={stats.aRegler} tone={stats.aRegler > 0 ? "bad" : undefined} hint="par le client" />
        <StatCard label="Heures ce mois" value={`${heures} h`} hint={`${stats.nEffectues} vol${stats.nEffectues > 1 ? "s" : ""} effectué${stats.nEffectues > 1 ? "s" : ""}`} />
      </StatGrid>

      <Table
        toolbar={
          <>
            <Segmented
              value={view}
              onChange={setView}
              items={[
                { key: "avenir", label: "À venir", count: aVenir.length },
                { key: "passes", label: "Passés", count: passes.length },
              ]}
            />
            <TableSearch value={query} onChange={setQuery} placeholder="Client, route…" className="max-sm:w-full" />
          </>
        }
      >
        <thead>
          <tr>
            <TableHeaderCell>Date</TableHeaderCell>
            <TableHeaderCell>Client</TableHeaderCell>
            <TableHeaderCell>Route</TableHeaderCell>
            <TableHeaderCell align="right">Durée</TableHeaderCell>
            <TableHeaderCell>Statut</TableHeaderCell>
            <TableHeaderCell />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-10 text-center text-sm text-st-muted">
                {needle ? "Aucun vol ne correspond." : view === "avenir" ? "Aucun vol à venir." : "Aucun vol passé."}
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const cities = routeCities(r);
              const client = r.clients ? `${r.clients.prenom} ${r.clients.nom}`.trim() : "—";
              const pax = r.passagers ?? null;
              return (
                <TableRow key={r.id} onClick={() => setDrawer(r)} selected={drawer?.id === r.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <DateTile date={r.date_vol} today={r.date_vol === TODAY} />
                      <div className="min-w-0">
                        <p className="font-[550] capitalize">{monthLabel(r.date_vol)}</p>
                        <p className="text-xs text-st-muted">{r.heure_vol ? r.heure_vol.slice(0, 5) : "heure à fixer"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="flex items-center justify-end gap-1.5 font-[550] sm:justify-start">
                      <span className="truncate">{client}</span>
                      {r.type_resa === "annonce_pilote" && <AnnonceTag />}
                    </p>
                    {pax != null && (
                      <p className="text-xs text-st-muted">
                        {pax} pax{r.poids_total != null ? ` · ${r.poids_total} kg` : ""}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="max-w-[280px] truncate text-st-text-2 max-sm:max-w-none">{cities ?? <span className="text-st-muted">À tracer</span>}</p>
                    <RouteStatusBadge status={routeStatus(r)} />
                  </TableCell>
                  <TableCell align="right">{r.duree} min</TableCell>
                  <TableCell>
                    <ResaBadge reservation={r} />
                  </TableCell>
                  <TableCell align="right">
                    {r.statut !== "annulee" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        title="Masse & centrage (poids préremplis)"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/pilote/mass-balance?resa=${r.id}`);
                        }}
                      >
                        <Scale />
                        M&amp;B
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </tbody>
      </Table>

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
