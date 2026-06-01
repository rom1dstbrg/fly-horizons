"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plane } from "lucide-react";
import type { DrawerReservation } from "./ReservationDrawer";

type Reservation = DrawerReservation;

const STATUS_COLOR: Record<string, string> = {
  payment_pending: "bg-orange-100 text-orange-700 border-orange-200",
  en_attente:      "bg-yellow-100 text-yellow-700 border-yellow-200",
  date_confirmee:  "bg-blue-100 text-blue-700 border-blue-200",
  heure_confirmee: "bg-green-100 text-green-700 border-green-200",
  vol_effectue:    "bg-purple-100 text-purple-700 border-purple-200",
  annulee:         "bg-red-100 text-red-400 border-red-200 opacity-60",
  acompte_recu:    "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export function ReservationCalendar({
  reservations,
  onCardClick,
}: {
  reservations: Reservation[];
  onCardClick: (r: Reservation) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year  = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    // Monday = 0
    const startPad = (firstDay.getDay() + 6) % 7;
    const days: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [year, month]);

  const resaByDate = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    for (const r of reservations) {
      if (!map[r.date_vol]) map[r.date_vol] = [];
      map[r.date_vol].push(r);
    }
    return map;
  }, [reservations]);

  function prevMonth() { setCurrentMonth(new Date(year, month - 1, 1)); }
  function nextMonth() { setCurrentMonth(new Date(year, month + 1, 1)); }
  function goToday()   { const n = new Date(); setCurrentMonth(new Date(n.getFullYear(), n.getMonth(), 1)); }

  const todayStr = new Date().toISOString().split("T")[0];

  // Count confirmed flights this month
  const volsConfirmes = reservations.filter(r => {
    const d = new Date(r.date_vol + "T12:00:00Z");
    return d.getFullYear() === year && d.getMonth() === month && ["heure_confirmee", "date_confirmee"].includes(r.statut);
  }).length;

  return (
    <div className="space-y-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-foreground">
            {MONTHS_FR[month]} {year}
          </h2>
          {volsConfirmes > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-navy bg-navy/8 border border-navy/15 px-2.5 py-1 rounded-full">
              <Plane size={11} />
              {volsConfirmes} vol{volsConfirmes > 1 ? "s" : ""} confirmé{volsConfirmes > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            Aujourd'hui
          </button>
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button onClick={prevMonth} className="p-1.5 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground cursor-pointer">
              <ChevronLeft size={15} />
            </button>
            <div className="w-px h-5 bg-border" />
            <button onClick={nextMonth} className="p-1.5 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground cursor-pointer">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS_FR.map(d => (
            <div key={d} className="px-2 py-2.5 text-center text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div>
          {Array.from({ length: calendarDays.length / 7 }).map((_, weekIdx) => (
            <div key={weekIdx} className={`grid grid-cols-7 ${weekIdx < calendarDays.length / 7 - 1 ? "border-b border-border" : ""}`}>
              {calendarDays.slice(weekIdx * 7, weekIdx * 7 + 7).map((day, dayIdx) => {
                if (!day) {
                  return <div key={dayIdx} className="p-2 min-h-[90px] bg-secondary" />;
                }

                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                const dayResas = resaByDate[dateStr] ?? [];
                const isToday = dateStr === todayStr;
                const isSunday = (day.getDay() === 0);
                const isSaturday = (day.getDay() === 6);

                return (
                  <div
                    key={dayIdx}
                    className={`p-2 min-h-[90px] ${dayIdx < 6 ? "border-r border-border" : ""} ${isSunday || isSaturday ? "bg-secondary" : ""}`}
                  >
                    <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold mb-1.5 ${
                      isToday
                        ? "bg-navy text-white"
                        : "text-muted-foreground"
                    }`}>
                      {day.getDate()}
                    </div>

                    <div className="space-y-1">
                      {dayResas.slice(0, 3).map(r => {
                        const client = r.clients;
                        const statusClass = STATUS_COLOR[r.statut] ?? STATUS_COLOR.en_attente;
                        return (
                          <button
                            key={r.id}
                            onClick={() => onCardClick(r)}
                            className={`w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded border truncate hover:opacity-80 transition-opacity cursor-pointer ${statusClass}`}
                            title={`${client?.prenom} ${client?.nom} — ${r.heure_vol?.slice(0, 5) ?? "?"} — ${r.duree}min`}
                          >
                            {r.heure_vol ? r.heure_vol.slice(0, 5) + " " : ""}
                            {client?.prenom} {client?.nom?.charAt(0)}.
                          </button>
                        );
                      })}
                      {dayResas.length > 3 && (
                        <p className="text-[10px] text-muted-foreground pl-1">
                          +{dayResas.length - 3} autre{dayResas.length - 3 > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        {[
          { label: "Paiement att.", className: "bg-orange-100 border-orange-200" },
          { label: "En attente", className: "bg-yellow-100 border-yellow-200" },
          { label: "Date confirmée", className: "bg-blue-100 border-blue-200" },
          { label: "Heure confirmée", className: "bg-green-100 border-green-200" },
          { label: "Vol effectué", className: "bg-purple-100 border-purple-200" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm border ${l.className}`} />
            <span className="text-xs text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
