"use client";

import { useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  useDraggable, useDroppable, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Clock, Users, Ticket, CreditCard, Plane, AlertCircle } from "lucide-react";
import type { DrawerReservation } from "./ReservationDrawer";

type Reservation = DrawerReservation;

const COLUMNS = [
  { id: "traiter",       label: "À traiter",    statuses: ["payment_pending", "en_attente"], targetStatus: "en_attente", color: "border-yellow-300 bg-yellow-50/50", headerColor: "bg-yellow-400", textColor: "text-yellow-700", count_color: "bg-yellow-100 text-yellow-700" },
  { id: "planification", label: "Planification", statuses: ["date_confirmee"],               targetStatus: "date_confirmee", color: "border-blue-200 bg-blue-50/50", headerColor: "bg-blue-400", textColor: "text-blue-700", count_color: "bg-blue-100 text-blue-700" },
  { id: "confirme",      label: "Confirmé",      statuses: ["heure_confirmee"],              targetStatus: "heure_confirmee", color: "border-green-200 bg-green-50/50", headerColor: "bg-green-400", textColor: "text-green-700", count_color: "bg-green-100 text-green-700" },
  { id: "effectue",      label: "Effectué",      statuses: ["vol_effectue"],                 targetStatus: "vol_effectue", color: "border-purple-200 bg-purple-50/50", headerColor: "bg-purple-400", textColor: "text-purple-700", count_color: "bg-purple-100 text-purple-700" },
  { id: "annule",        label: "Annulé",        statuses: ["annulee"],                      targetStatus: "annulee", color: "border-red-200 bg-red-50/30", headerColor: "bg-red-400", textColor: "text-red-600", count_color: "bg-red-100 text-red-600" },
] as const;

function KanbanCard({ reservation, onClick, isDragging = false }: {
  reservation: Reservation;
  onClick?: () => void;
  isDragging?: boolean;
}) {
  const client = reservation.clients;
  const dateLabel = new Date(reservation.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "short", day: "numeric", month: "short",
  });

  return (
    <div
      onClick={onClick}
      className={`bg-card rounded-xl border border-border p-3.5 cursor-pointer hover:border-navy/30 hover:shadow-[0_2px_12px_rgba(17,51,86,.08)] transition-all select-none ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-foreground leading-tight">
          {client?.prenom} {client?.nom}
        </p>
        {reservation.statut === "payment_pending" && (
          <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-100 border border-orange-200 px-1.5 py-0.5 rounded-full">
            <AlertCircle size={9} /> Pmt att.
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Plane size={11} className="shrink-0" />
          <span className="capitalize">{dateLabel}</span>
          {reservation.heure_vol && (
            <span className="text-foreground font-medium">· {reservation.heure_vol.slice(0, 5)}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock size={11} className="shrink-0" />
          <span>{reservation.duree} min</span>
          {reservation.passagers && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <Users size={11} className="shrink-0" />
              <span>{reservation.passagers}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${reservation.type_resa === "standard" ? "bg-navy/5 text-navy border-navy/15" : "bg-gold/10 text-gold-700 border-gold/25"}`}>
          {reservation.type_resa === "standard" ? "Standard" : "Sur mesure"}
        </span>
        {reservation.voucher_code && (
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-600 font-medium">
            <Ticket size={9} />
            Voucher
          </span>
        )}
        {reservation.paye != null && reservation.paye > 0 ? (
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
            <CreditCard size={9} />
            {reservation.paye} € ✓
          </span>
        ) : reservation.acompte != null ? (
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground font-medium">
            <CreditCard size={9} />
            {reservation.acompte} €
          </span>
        ) : null}
      </div>
    </div>
  );
}

function DraggableCard({ reservation, onClick }: { reservation: Reservation; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: reservation.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Transform.toString(transform), zIndex: isDragging ? 50 : undefined }}
    >
      <KanbanCard reservation={reservation} onClick={isDragging ? undefined : onClick} isDragging={isDragging} />
    </div>
  );
}

function DroppableColumn({ col, reservations, onCardClick }: {
  col: typeof COLUMNS[number];
  reservations: Reservation[];
  onCardClick: (r: Reservation) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div className="flex flex-col min-w-[260px] flex-1">
      {/* Column header */}
      <div className={`flex items-center gap-2 px-3 py-2.5 mb-2 rounded-xl border ${col.color}`}>
        <span className={`w-2 h-2 rounded-full ${col.headerColor} shrink-0`} />
        <span className={`text-xs font-bold uppercase tracking-wider flex-1 ${col.textColor}`}>
          {col.label}
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.count_color}`}>
          {reservations.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[200px] space-y-2.5 p-1.5 rounded-xl transition-colors ${
          isOver ? "bg-navy/5 border-2 border-dashed border-navy/20" : ""
        }`}
      >
        {reservations.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground/30 border border-dashed border-border rounded-xl">
            Glisser ici
          </div>
        ) : (
          reservations.map(r => (
            <DraggableCard key={r.id} reservation={r} onClick={() => onCardClick(r)} />
          ))
        )}
      </div>
    </div>
  );
}

export function KanbanPipeline({
  reservations,
  onCardClick,
  onCardMove,
}: {
  reservations: Reservation[];
  onCardClick: (r: Reservation) => void;
  onCardMove?: (id: string, newStatut: string, prevStatut: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function onDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const reservationId = active.id as string;
    const columnId = over.id as string;
    const targetCol = COLUMNS.find(c => c.id === columnId);
    if (!targetCol) return;

    const currentResa = reservations.find(r => r.id === reservationId);
    if (!currentResa) return;
    if (targetCol.statuses.includes(currentResa.statut as never)) return;

    onCardMove?.(reservationId, targetCol.targetStatus, currentResa.statut);
  }

  const activeResa = activeId ? reservations.find(r => r.id === activeId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[500px]">
        {COLUMNS.map(col => (
          <DroppableColumn
            key={col.id}
            col={col}
            reservations={reservations.filter(r => col.statuses.includes(r.statut as never))}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeResa && <KanbanCard reservation={activeResa} />}
      </DragOverlay>
    </DndContext>
  );
}
