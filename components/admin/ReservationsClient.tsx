"use client";

import { useState, useTransition } from "react";
import { updateStatutReservation } from "@/lib/actions/reservations";
import { deleteReservationStandard } from "@/lib/actions/delete";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

const STATUTS = [
  { value: "payment_pending", label: "Paiement en attente", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "en_attente",      label: "En attente",          color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { value: "date_confirmee",  label: "Date confirmée",      color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "heure_confirmee", label: "Heure confirmée",     color: "bg-green-100 text-green-700 border-green-200" },
  { value: "vol_effectue",    label: "Vol effectué",        color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "annulee",         label: "Annulée",             color: "bg-red-100 text-red-700 border-red-200" },
];

const FILTERS = ["Tous", "En attente", "Confirmées", "Effectuées", "Annulées"] as const;
const FILTER_MAP: Record<string, string[] | null> = {
  "Tous": null,
  "En attente": ["payment_pending", "en_attente"],
  "Confirmées": ["date_confirmee", "heure_confirmee"],
  "Effectuées": ["vol_effectue"],
  "Annulées": ["annulee"],
};

type Reservation = {
  id: string;
  date_vol: string;
  heure_vol: string | null;
  duree: number;
  passagers: number;
  poids_total: number | null;
  statut: string;
  voucher_code: string | null;
  created_at: string;
  clients: { id: string; prenom: string; nom: string; email: string; telephone: string | null } | null;
};

function ReservationCard({ reservation: r }: { reservation: Reservation }) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [loadingStatut, setLoadingStatut] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const statut = STATUTS.find(s => s.value === r.statut) ?? STATUTS[1];
  const client = r.clients;
  const dateStr = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  function changeStatut(val: string) {
    setLoadingStatut(val);
    startTransition(async () => {
      const res = await updateStatutReservation(r.id, val);
      if (res.error) setMessage(res.error);
      setLoadingStatut(null);
    });
  }

  return (
    <div className="card-premium p-4">
      <div
        className="flex items-start justify-between gap-4 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground text-sm">
              {client ? `${client.prenom} ${client.nom}` : "—"}
            </p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statut.color}`}>
              {statut.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
            <p className="text-xs text-muted-foreground">{dateStr}{r.heure_vol ? ` · ${r.heure_vol}` : ""}</p>
            <p className="text-xs text-muted-foreground">{r.duree} min · {r.passagers} pax{r.poids_total ? ` · ${r.poids_total} kg` : ""}</p>
            {r.voucher_code && (
              <p className="text-xs text-emerald-600 font-mono font-semibold">{r.voucher_code}</p>
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
            onDelete={() => deleteReservationStandard(r.id)}
            confirmMessage="Confirmer ?"
          />
          <span className="p-1.5 text-muted-foreground pointer-events-none">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </div>

      {message && (
        <p className="text-xs text-destructive mt-2">{message}</p>
      )}

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              { label: "Passagers", value: String(r.passagers) },
              { label: "Poids total", value: r.poids_total ? `${r.poids_total} kg` : "—" },
              { label: "Durée", value: `${r.duree} min` },
              { label: "Voucher", value: r.voucher_code ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-secondary/30 rounded-lg p-2.5">
                <p className="text-muted-foreground">{label}</p>
                <p className="font-semibold text-foreground mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-full">Statut</p>
            {STATUTS.map(s => (
              <button key={s.value}
                disabled={r.statut === s.value || isPending}
                onClick={() => changeStatut(s.value)}
                className={[
                  "text-xs px-3 py-1.5 rounded-lg border font-medium transition-all",
                  r.statut === s.value
                    ? `${s.color} cursor-default`
                    : "border-border text-muted-foreground hover:bg-secondary disabled:opacity-50",
                ].join(" ")}>
                {loadingStatut === s.value ? <Loader2 size={11} className="animate-spin inline mr-1" /> : null}
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ReservationsClient({ reservations }: { reservations: Reservation[] }) {
  const [filter, setFilter] = useState<typeof FILTERS[number]>("Tous");

  const filtered = filter === "Tous"
    ? reservations
    : reservations.filter(r => (FILTER_MAP[filter] ?? []).includes(r.statut));

  return (
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
          {filtered.map(r => <ReservationCard key={r.id} reservation={r} />)}
        </div>
      )}
    </div>
  );
}
