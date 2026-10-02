"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plane, Scale } from "lucide-react";
import { ReservationDrawer } from "@/components/admin/reservation-drawer/ReservationDrawer";
import type { DrawerReservation, Waypoint } from "@/components/admin/reservation-drawer/types";
import {
  Button, DateTile, EmptyState, Segmented, Select, StatCard, StatGrid,
  Table, TableCell, TableHeaderCell, TableRow, TableSearch,
} from "@/components/pilote/studio";
import { ResaBadge, RouteStatusText } from "@/components/pilote/ResaBadge";
import { getSignals, topSignal, type SignalKind } from "@/lib/reservation-signals";
import { cn } from "@/lib/utils";

// Page Réservations de l'admin (01/10) : la liste « Mes vols » du pilote, avec en
// plus ce dont l'admin a besoin pour superviser tous les pilotes : colonne Pilote
// (filtre, regroupement), colonne Signal (ce qui traîne : voir
// lib/reservation-signals.ts), coordonnées du client, stats qui filtrent d'un clic.

type Reservation = DrawerReservation;
type Filtre = "tous" | "sans_reponse" | "client_dit_paye" | "paiement" | "sans_heure";

function routeCities(r: Reservation): string | null {
  const wps: Waypoint[] | null | undefined = r.final_waypoints?.length ? r.final_waypoints : r.products?.route_waypoints;
  if (!wps || wps.length === 0) return null;
  return wps.map((w) => w.nom?.trim() || "?").join(" → ");
}

function routeStatus(r: Reservation): string | null {
  const props = r.route_proposals ?? [];
  if (props.length > 0) {
    return [...props].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))[0]?.status ?? null;
  }
  return r.route_status ?? null;
}

const TODAY = new Date().toISOString().slice(0, 10);
const isPast = (r: Reservation) => r.statut === "vol_effectue" || r.statut === "annulee" || r.date_vol < TODAY;
const monthLabel = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("fr-BE", { month: "short", year: "numeric", timeZone: "Europe/Brussels" });

// « Paiement » regroupe l'attente d'un virement et la confirmation à donner par le pilote.
const MATCH: Record<Exclude<Filtre, "tous">, SignalKind[]> = {
  sans_reponse: ["sans_reponse"],
  client_dit_paye: ["client_dit_paye"],
  paiement: ["paiement_attente", "client_dit_paye"],
  sans_heure: ["sans_heure"],
};

const initiales = (nom: string) => nom.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

export function AdminVolsClient({ reservations: initial }: { reservations: Reservation[] }) {
  const router = useRouter();
  const openId = useSearchParams().get("ouvrir");
  const [reservations, setReservations] = useState<Reservation[]>(initial);
  const [drawer, setDrawer] = useState<Reservation | null>(() => initial.find((r) => r.id === openId) ?? null);
  // Clic sur une notification app ouverte : la page est déjà montée, seule `openId` change.
  // Ajustement d'état pendant le rendu (pas d'effet) quand `openId` change.
  const [lastOpenId, setLastOpenId] = useState(openId);
  if (openId !== lastOpenId) {
    setLastOpenId(openId);
    // Un vol arrivé depuis l'ouverture de la page n'est pas dans l'état local : on prend les données fraîches.
    const found = openId ? reservations.find((r) => r.id === openId) ?? initial.find((r) => r.id === openId) : undefined;
    if (found && !reservations.some((r) => r.id === openId)) setReservations(initial);
    if (found) setDrawer(found);
  }
  const [view, setView] = useState<"tout" | "avenir" | "passes">("tout");
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [pilote, setPilote] = useState("");
  const [groupe, setGroupe] = useState<"date" | "pilote">("date");
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

  const piloteNoms = useMemo(
    () => [...new Set(reservations.map((r) => r.pilotes?.nom).filter((n): n is string => !!n))].sort(),
    [reservations],
  );

  // Signaux calculés une fois par rendu.
  const signalsById = useMemo(() => {
    const m = new Map<string, ReturnType<typeof getSignals>>();
    for (const r of reservations) m.set(r.id, getSignals(r));
    return m;
  }, [reservations]);
  const count = (kinds: SignalKind[]) =>
    reservations.filter((r) => signalsById.get(r.id)?.some((s) => kinds.includes(s.kind))).length;
  const nSansReponse = count(MATCH.sans_reponse);
  const nPaiement = count(MATCH.paiement);
  const nSansHeure = count(MATCH.sans_heure);
  const nRouges = reservations.filter((r) => signalsById.get(r.id)?.some((s) => s.level === "bad")).length;
  const dans7j = aVenir.filter((r) => (new Date(r.date_vol + "T12:00:00Z").getTime() - new Date(TODAY + "T12:00:00Z").getTime()) / 86400000 <= 7).length;

  if (reservations.length === 0) {
    return (
      <EmptyState
        icon={Plane}
        title="Aucune réservation pour l'instant"
        description="Les demandes des passagers sur les annonces des pilotes apparaîtront ici."
      />
    );
  }

  const needle = query.trim().toLowerCase();
  const base = view === "tout" ? [...aVenir, ...passes] : view === "avenir" ? aVenir : passes;
  let rows = base.filter((r) => {
    if (pilote && r.pilotes?.nom !== pilote) return false;
    if (filtre !== "tous" && !signalsById.get(r.id)?.some((s) => MATCH[filtre].includes(s.kind))) return false;
    if (!needle) return true;
    const hay = `${r.clients?.prenom ?? ""} ${r.clients?.nom ?? ""} ${r.clients?.email ?? ""} ${r.pilotes?.nom ?? ""} ${routeCities(r) ?? ""}`.toLowerCase();
    return hay.includes(needle);
  });
  if (groupe === "pilote") {
    rows = [...rows].sort((a, b) => (a.pilotes?.nom ?? "~").localeCompare(b.pilotes?.nom ?? "~"));
  }

  function toggle(f: Filtre) {
    setFiltre((cur) => (cur === f ? "tous" : f));
  }
  const stat = (f: Filtre, props: Parameters<typeof StatCard>[0]) => (
    <button
      type="button"
      onClick={() => toggle(f)}
      aria-pressed={filtre === f}
      className="cursor-pointer rounded-[20px] text-left outline-none focus-visible:ring-4 focus-visible:ring-st-ink-soft"
    >
      <StatCard {...props} className={cn(props.className, filtre === f && "ring-2 ring-st-ink")} />
    </button>
  );

  return (
    <div className="space-y-5">
      <StatGrid>
        {stat("sans_reponse", {
          label: "Sans réponse",
          value: nSansReponse,
          tone: nSansReponse > 0 ? "bad" : undefined,
          hint: "demande > 36 h",
        })}
        {stat("paiement", {
          label: "Paiement",
          value: nPaiement,
          tone: nPaiement > 0 ? "warn" : undefined,
          hint: "attendu ou à confirmer",
        })}
        {stat("sans_heure", {
          label: "Sans heure",
          value: nSansHeure,
          tone: nSansHeure > 0 ? "warn" : undefined,
          hint: "vol dans moins de 48 h",
        })}
        <StatCard
          label="À venir"
          value={aVenir.length}
          hint={nRouges > 0 ? `${nRouges} à traiter d'urgence` : `${dans7j} dans les 7 jours`}
        />
      </StatGrid>

      <Table
        toolbar={
          <>
            <Segmented
              value={view}
              onChange={setView}
              items={[
                { key: "tout", label: "Tout", count: reservations.length },
                { key: "avenir", label: "À venir", count: aVenir.length },
                { key: "passes", label: "Passés", count: passes.length },
              ]}
            />
            <div className="flex min-w-0 flex-wrap items-center gap-2 max-sm:w-full">
              <Select aria-label="Pilote" className="h-[34px] w-auto max-sm:flex-1" value={pilote} onChange={(e) => setPilote(e.target.value)}>
                <option value="">Tous les pilotes</option>
                {piloteNoms.map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
              <Select aria-label="Regroupement" className="h-[34px] w-auto max-sm:flex-1" value={groupe} onChange={(e) => setGroupe(e.target.value as "date" | "pilote")}>
                <option value="date">Par date</option>
                <option value="pilote">Par pilote</option>
              </Select>
              <TableSearch value={query} onChange={setQuery} placeholder="Client, pilote, route…" className="max-sm:w-full" />
            </div>
          </>
        }
      >
        <thead>
          <tr>
            <TableHeaderCell>Date</TableHeaderCell>
            <TableHeaderCell>Client</TableHeaderCell>
            <TableHeaderCell>Pilote</TableHeaderCell>
            <TableHeaderCell>Route</TableHeaderCell>
            <TableHeaderCell>Statut</TableHeaderCell>
            <TableHeaderCell>Signal</TableHeaderCell>
            <TableHeaderCell />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-10 text-center text-sm text-st-muted">
                {filtre !== "tous" || pilote || needle ? "Aucun vol ne correspond." : "Aucun vol."}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => {
              const cities = routeCities(r);
              const client = r.clients ? `${r.clients.prenom} ${r.clients.nom}`.trim() : "—";
              const contact = r.clients?.telephone || r.clients?.email || "";
              const sg = signalsById.get(r.id) ? topSignal(r) : null;
              const nomPilote = r.pilotes?.nom ?? null;
              const nouveauGroupe = groupe === "pilote" && (i === 0 || (rows[i - 1].pilotes?.nom ?? null) !== nomPilote);
              return (
                <Fragment key={r.id}>
                  {nouveauGroupe && (
                    <tr>
                      <td colSpan={7} className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-st-muted max-sm:block">
                        {nomPilote ?? "Sans pilote"}
                      </td>
                    </tr>
                  )}
                  <TableRow onClick={() => setDrawer(r)} selected={drawer?.id === r.id}>
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
                      <p className="truncate font-[550]">{client}</p>
                      <p className="truncate text-xs text-st-muted">
                        {contact}
                        {r.passagers != null ? `${contact ? " · " : ""}${r.passagers} pax` : ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      {nomPilote ? (
                        <div className="flex items-center gap-2">
                          <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-st-ink-soft text-[11px] font-bold text-st-ink">
                            {initiales(nomPilote)}
                          </span>
                          <span className="truncate">{nomPilote}</span>
                        </div>
                      ) : (
                        <span className="text-st-muted">Non assigné</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="max-w-[240px] truncate text-st-text-2 max-sm:max-w-none">{cities ?? <span className="text-st-muted">À tracer</span>}</p>
                      <RouteStatusText status={routeStatus(r)} />
                    </TableCell>
                    <TableCell>
                      <ResaBadge reservation={r} />
                    </TableCell>
                    <TableCell>
                      {sg ? (
                        <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", sg.level === "bad" ? "text-st-bad" : "text-st-warn")}>
                          <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-current" />
                          {sg.label}
                        </span>
                      ) : (
                        <span className="text-xs text-st-muted">Rien à signaler</span>
                      )}
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
                </Fragment>
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
        viewerRole="admin"
      />
    </div>
  );
}
