"use client";

import { useEffect, useState, useTransition } from "react";
import { Ban, CalendarDays, ChevronLeft, ChevronRight, Plus, Repeat, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Badge, Button, DateTile, FormField, Input, SectionHeader, Segmented,
  Sheet, SheetBody, SheetFooter, SheetHeader,
} from "@/components/pilote/studio";
import { computeEffectiveDay, type DispoJourIndiv, type DispoPlage, type EffectiveDay } from "@/lib/dispo-utils";
import * as adminActions from "@/lib/actions/disponibilites";

// Calendrier de disponibilités de l'admin (calendrier de Fly Horizons), style
// « Studio » : plages récurrentes + exceptions d'un jour (lib/dispo-utils.ts, qui
// calcule aussi ce que voient les clients). L'espace pilote a sa propre grille de
// blocs de 2 h depuis le 27/09 (components/pilote/dispo/DispoGrid.tsx).
//
// Bureau et tablette : grille de la semaine, on trace un créneau en glissant,
// on déplace ou étire un bloc (événements pointeur : souris et doigt).
// Téléphone : la semaine en liste, un jour par ligne, un toucher ouvre le jour.
// Toute édition passe par un tiroir (Sheet), jamais par une bulle flottante.

type Result = { error?: string } | { success: boolean } | undefined;
type Actions = {
  createPlage: (fd: FormData) => Promise<Result>;
  updatePlage: (id: string, fd: FormData) => Promise<Result>;
  togglePlageActif: (id: string, actif: boolean) => Promise<Result>;
  deletePlage: (id: string) => Promise<Result>;
  upsertJours: (dates: string[], data: { ferme: boolean; heure_debut: string | null; heure_fin: string | null }) => Promise<Result>;
  deleteJour: (id: string) => Promise<Result>;
};

const ACTIONS: Record<"admin", Actions> = {
  admin: {
    createPlage: adminActions.createPlage,
    updatePlage: adminActions.updatePlage,
    togglePlageActif: adminActions.togglePlageActif,
    deletePlage: adminActions.deletePlage,
    upsertJours: adminActions.upsertJoursIndivBulk,
    deleteJour: adminActions.deleteJourIndiv,
  },

};

const errorOf = (r: Result) => (r && "error" in r ? r.error ?? null : null);

// ── Constantes et dates ─────────────────────────────────────────

const JOURS_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const JOURS_ORDER = [1, 2, 3, 4, 5, 6, 0]; // lundi → dimanche
const HOURS_START = 7;
const HOURS_END = 21;
const N_HOURS = HOURS_END - HOURS_START;
const ROW_H = 30; // px par heure

function pad(n: number) { return String(n).padStart(2, "0"); }
function toISODate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function mondayOf(d: Date) {
  const day = d.getDay();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (day === 0 ? -6 : 1 - day));
}
function addDays(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function hourOf(hms: string) {
  const [h, m] = hms.split(":").map(Number);
  return h + (m || 0) / 60;
}
function hourFromY(columnTop: number, clientY: number) {
  const idx = Math.round((clientY - columnTop) / ROW_H);
  return Math.max(HOURS_START, Math.min(HOURS_END, HOURS_START + idx));
}
const fmtLong = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" });
const fmtShort = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" });
const fmtDate = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });
const hhmm = (t: string) => t.slice(0, 5);

// ── État des tiroirs ────────────────────────────────────────────

interface DayDraft {
  key: number;
  date: string;
  existingId: string | null; // exception déjà enregistrée pour ce jour
  plageId: string | null;    // plage récurrente qui couvre ce jour (s'il y en a une)
  ferme: boolean;
  heure_debut: string;
  heure_fin: string;
}

interface PlageDraft {
  key: number;
  plage: DispoPlage | null; // null = nouvelle plage
}

let draftSeq = 0;

function dayDraft(date: string, plages: DispoPlage[], jours: DispoJourIndiv[], times?: { debut: string; fin: string }): DayDraft {
  const eff = computeEffectiveDay(date, plages, jours);
  // Plage qui couvrirait ce jour sans exception : sert à « Modifier la plage ».
  const under = eff.type === "plage" ? eff : computeEffectiveDay(date, plages, []);
  const d: DayDraft = {
    key: ++draftSeq,
    date,
    existingId: eff.type === "override" ? eff.sourceId : null,
    plageId: under.type === "plage" ? under.windows[0].sourceId : null,
    ferme: eff.type === "override" && eff.ferme,
    heure_debut: "08:00",
    heure_fin: "18:00",
  };
  if (eff.type === "override" && !eff.ferme) { d.heure_debut = hhmm(eff.heure_debut); d.heure_fin = hhmm(eff.heure_fin); }
  if (eff.type === "plage") { d.heure_debut = hhmm(eff.windows[0].heure_debut); d.heure_fin = hhmm(eff.windows[0].heure_fin); }
  if (times) { d.ferme = false; d.heure_debut = times.debut; d.heure_fin = times.fin; }
  return d;
}

// ── Composant principal ─────────────────────────────────────────

export function DispoPlanner({ scope, plages, joursIndiv }: {
  scope: "admin";
  plages: DispoPlage[];
  joursIndiv: DispoJourIndiv[];
}) {
  const actions = ACTIONS[scope];
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [dayEdit, setDayEdit] = useState<DayDraft | null>(null);
  const [plageEdit, setPlageEdit] = useState<PlageDraft | null>(null);
  const [pending, startTransition] = useTransition();

  const weekDates = Array.from({ length: 7 }, (_, i) => toISODate(addDays(weekStart, i)));
  const today = toISODate(new Date());

  const openDay = (date: string, times?: { debut: string; fin: string }) =>
    setDayEdit(dayDraft(date, plages, joursIndiv, times));
  const openPlage = (plage: DispoPlage | null) => {
    setDayEdit(null);
    setPlageEdit({ key: ++draftSeq, plage });
  };

  const first = new Date(weekDates[0] + "T12:00:00Z");
  const last = new Date(weekDates[6] + "T12:00:00Z");
  const weekLabel = `${first.toLocaleDateString("fr-BE", { day: "numeric", month: first.getMonth() === last.getMonth() ? undefined : "short" })} – ${last.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}`;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Semaine précédente" onClick={() => setWeekStart((w) => addDays(w, -7))}>
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Semaine suivante" onClick={() => setWeekStart((w) => addDays(w, 7))}>
              <ChevronRight />
            </Button>
            <span className="ml-1 text-[14px] font-semibold text-st-text">{weekLabel}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setWeekStart(mondayOf(new Date()))}>
            <CalendarDays /> Aujourd&apos;hui
          </Button>
        </div>

        <div className="hidden md:block">
          <WeekGrid
            dates={weekDates}
            today={today}
            plages={plages}
            joursIndiv={joursIndiv}
            pending={pending}
            onOpenDay={openDay}
            onMove={(date, debut, fin) => startTransition(async () => { await actions.upsertJours([date], { ferme: false, heure_debut: debut, heure_fin: fin }); })}
            onToggleClosed={(date, eff) => startTransition(async () => {
              if (eff.type === "override" && eff.ferme) await actions.deleteJour(eff.sourceId);
              else await actions.upsertJours([date], { ferme: true, heure_debut: null, heure_fin: null });
            })}
          />
        </div>

        <div className="md:hidden">
          <DayList dates={weekDates} today={today} plages={plages} joursIndiv={joursIndiv} onOpenDay={openDay} />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-st-muted">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-st-ink" /> Récurrent</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-st-gold" /> Ce jour seulement</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-st-surface-hover" /> Fermé</span>
          <span className="hidden md:inline">Glissez sur une case vide pour créer un créneau, sur un bloc pour le déplacer ou l&apos;étirer.</span>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Plages récurrentes"
          action={<Button size="sm" variant="secondary" onClick={() => openPlage(null)}><Plus /> Ajouter</Button>}
        />
        <p className="-mt-1 text-[13px] text-st-muted">Un même créneau répété certains jours de la semaine, sur une période.</p>
        {plages.length === 0 ? (
          <p className="text-[13px] text-st-text-2">Aucune plage : seuls les jours ajoutés un par un sont ouverts.</p>
        ) : (
          <div className="divide-y divide-st-line overflow-hidden rounded-[14px] border border-st-line bg-white">
            {plages.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => openPlage(p)}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-st-surface"
              >
                <Repeat size={16} className={cn("shrink-0", p.actif ? "text-st-ink" : "text-st-muted")} />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[13.5px] font-medium", p.actif ? "text-st-text" : "text-st-muted")}>
                    {fmtDate(p.date_debut)} → {fmtDate(p.date_fin)}
                  </span>
                  <span className="st-num block text-[12.5px] text-st-muted">
                    {hhmm(p.heure_debut)} – {hhmm(p.heure_fin)} · {joursLabel(p.jours)}
                  </span>
                </span>
                {!p.actif && <Badge>Désactivée</Badge>}
                <ChevronRight size={16} className="shrink-0 text-st-muted" />
              </button>
            ))}
          </div>
        )}
      </section>

      <Sheet value={dayEdit} onClose={() => setDayEdit(null)}>
        {(d) => (
          <DayEditor
            key={d.key}
            draft={d}
            actions={actions}
            onClose={() => setDayEdit(null)}
            onEditPlage={d.plageId ? () => openPlage(plages.find((p) => p.id === d.plageId) ?? null) : undefined}
          />
        )}
      </Sheet>

      <Sheet value={plageEdit} onClose={() => setPlageEdit(null)}>
        {(p) => <PlageEditor key={p.key} plage={p.plage} actions={actions} onClose={() => setPlageEdit(null)} />}
      </Sheet>
    </div>
  );
}

function joursLabel(jours: number[] | null) {
  const set = jours ?? [0, 1, 2, 3, 4, 5, 6];
  if (set.length === 7) return "tous les jours";
  return JOURS_ORDER.filter((j) => set.includes(j)).map((j) => JOURS_LABELS[j].toLowerCase()).join(", ");
}

// ── Téléphone : la semaine en liste ─────────────────────────────

function DayList({ dates, today, plages, joursIndiv, onOpenDay }: {
  dates: string[];
  today: string;
  plages: DispoPlage[];
  joursIndiv: DispoJourIndiv[];
  onOpenDay: (date: string) => void;
}) {
  return (
    <div className="divide-y divide-st-line overflow-hidden rounded-[14px] border border-st-line bg-white">
      {dates.map((date) => {
        const eff = computeEffectiveDay(date, plages, joursIndiv);
        return (
          <button
            key={date}
            type="button"
            onClick={() => onOpenDay(date)}
            className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left transition-colors active:bg-st-surface"
          >
            <DateTile date={date} today={date === today} />
            <span className="min-w-0 flex-1 space-y-1">
              {eff.type === "none" && <span className="block text-[13px] text-st-muted">Aucun créneau</span>}
              {eff.type === "override" && eff.ferme && (
                <span className="flex items-center gap-1.5 text-[13px] text-st-muted"><Ban size={13} /> Fermé</span>
              )}
              {eff.type === "override" && !eff.ferme && (
                <span className="flex items-center gap-2">
                  <span className="st-num text-[14px] font-medium text-st-text">{hhmm(eff.heure_debut)} – {hhmm(eff.heure_fin)}</span>
                  <span className="h-2 w-2 rounded-full bg-st-gold" aria-label="Ce jour seulement" />
                </span>
              )}
              {eff.type === "plage" && eff.windows.map((w) => (
                <span key={w.sourceId} className="flex items-center gap-2">
                  <span className="st-num text-[14px] font-medium text-st-text">{hhmm(w.heure_debut)} – {hhmm(w.heure_fin)}</span>
                  <Repeat size={12} className="text-st-muted" aria-label="Récurrent" />
                </span>
              ))}
            </span>
            <ChevronRight size={16} className="shrink-0 text-st-muted" />
          </button>
        );
      })}
    </div>
  );
}

// ── Bureau : grille de la semaine ───────────────────────────────

type BlockDrag = {
  date: string;
  blockKey: string;
  columnTop: number;
  mode: "move" | "top" | "bottom";
  origStart: number;
  origEnd: number;
  anchor: number;
  liveStart: number;
  liveEnd: number;
};

function WeekGrid({ dates, today, plages, joursIndiv, pending, onOpenDay, onMove, onToggleClosed }: {
  dates: string[];
  today: string;
  plages: DispoPlage[];
  joursIndiv: DispoJourIndiv[];
  pending: boolean;
  onOpenDay: (date: string, times?: { debut: string; fin: string }) => void;
  onMove: (date: string, debut: string, fin: string) => void;
  onToggleClosed: (date: string, eff: EffectiveDay) => void;
}) {
  const [draw, setDraw] = useState<{ date: string; columnTop: number; anchor: number; hour: number } | null>(null);
  const [blockDrag, setBlockDrag] = useState<BlockDrag | null>(null);

  // Tracer un nouveau créneau sur une case vide.
  useEffect(() => {
    if (!draw) return;
    const onMovePtr = (e: PointerEvent) => setDraw((d) => (d ? { ...d, hour: hourFromY(d.columnTop, e.clientY) } : d));
    const onUp = () => {
      const lo = Math.min(draw.anchor, draw.hour);
      const hi = Math.max(draw.anchor, draw.hour);
      const end = hi > lo ? hi : Math.min(HOURS_END, lo + 2);
      onOpenDay(draw.date, { debut: `${pad(lo)}:00`, fin: `${pad(end)}:00` });
      setDraw(null);
    };
    const onCancel = () => setDraw(null);
    window.addEventListener("pointermove", onMovePtr);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMovePtr);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [draw, onOpenDay]);

  // Déplacer ou étirer un bloc ; sans mouvement, c'est un clic : on ouvre le jour.
  useEffect(() => {
    if (!blockDrag) return;
    const onMovePtr = (e: PointerEvent) => setBlockDrag((bd) => {
      if (!bd) return bd;
      const cur = hourFromY(bd.columnTop, e.clientY);
      let s = bd.origStart;
      let en = bd.origEnd;
      if (bd.mode === "top") s = Math.min(cur, bd.origEnd - 1);
      else if (bd.mode === "bottom") en = Math.max(cur, bd.origStart + 1);
      else {
        const dur = bd.origEnd - bd.origStart;
        s = Math.max(HOURS_START, Math.min(HOURS_END - dur, bd.origStart + (cur - bd.anchor)));
        en = s + dur;
      }
      return { ...bd, liveStart: Math.max(HOURS_START, s), liveEnd: Math.min(HOURS_END, en) };
    });
    const onUp = () => {
      if (blockDrag.liveStart !== blockDrag.origStart || blockDrag.liveEnd !== blockDrag.origEnd) {
        onMove(blockDrag.date, `${pad(blockDrag.liveStart)}:00`, `${pad(blockDrag.liveEnd)}:00`);
      } else {
        onOpenDay(blockDrag.date);
      }
      setBlockDrag(null);
    };
    const onCancel = () => setBlockDrag(null);
    window.addEventListener("pointermove", onMovePtr);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMovePtr);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [blockDrag, onMove, onOpenDay]);

  function startDraw(date: string, e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || (e.target as HTMLElement).closest("[data-block]")) return;
    e.preventDefault();
    const columnTop = e.currentTarget.getBoundingClientRect().top;
    const h = hourFromY(columnTop, e.clientY);
    setDraw({ date, columnTop, anchor: h, hour: h });
  }

  function startBlock(date: string, blockKey: string, mode: BlockDrag["mode"], start: number, end: number, e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const col = (e.target as HTMLElement).closest("[data-daycol]") as HTMLElement | null;
    const columnTop = col?.getBoundingClientRect().top ?? 0;
    setBlockDrag({ date, blockKey, columnTop, mode, origStart: start, origEnd: end, anchor: hourFromY(columnTop, e.clientY), liveStart: start, liveEnd: end });
  }

  return (
    <div className="overflow-x-auto rounded-[16px] border border-st-line bg-white p-3">
      <div className="grid min-w-[620px] grid-cols-[40px_repeat(7,minmax(72px,1fr))]">
        <div />
        {dates.map((date) => {
          const eff = computeEffectiveDay(date, plages, joursIndiv);
          const closed = eff.type === "override" && eff.ferme;
          const d = new Date(date + "T12:00:00Z");
          const isToday = date === today;
          return (
            <div key={date} className="flex items-center justify-center gap-1.5 pb-2.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-st-muted">
                {d.toLocaleDateString("fr-BE", { weekday: "short" }).replace(".", "")}
              </span>
              <span className={cn("st-num grid h-6 min-w-6 place-items-center rounded-full px-1 text-[13px] font-semibold", isToday ? "bg-st-ink text-white" : "text-st-text")}>
                {d.getDate()}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => onToggleClosed(date, eff)}
                title={closed ? "Rouvrir ce jour" : "Fermer ce jour"}
                className={cn(
                  "grid h-6 w-6 cursor-pointer place-items-center rounded-md transition-colors disabled:opacity-50",
                  closed ? "bg-st-bad-soft text-st-bad" : "text-st-line-strong hover:bg-st-bad-soft hover:text-st-bad",
                )}
              >
                <Ban size={12} />
              </button>
            </div>
          );
        })}

        <div>
          {Array.from({ length: N_HOURS }).map((_, i) => (
            <div key={i} style={{ height: ROW_H }} className="relative">
              <span className="st-num absolute right-2 -translate-y-1/2 text-[10.5px] text-st-muted">{HOURS_START + i}h</span>
            </div>
          ))}
        </div>

        {dates.map((date) => {
          const eff = computeEffectiveDay(date, plages, joursIndiv);
          const blocks: { key: string; start: string; end: string; kind: "plage" | "override" }[] = [];
          if (eff.type === "override" && !eff.ferme) blocks.push({ key: eff.sourceId, start: eff.heure_debut, end: eff.heure_fin, kind: "override" });
          if (eff.type === "plage") eff.windows.forEach((w) => blocks.push({ key: `plage:${w.sourceId}`, start: w.heure_debut, end: w.heure_fin, kind: "plage" }));
          return (
            <div
              key={date}
              data-daycol
              onPointerDown={(e) => startDraw(date, e)}
              style={{ height: N_HOURS * ROW_H }}
              className="relative cursor-crosshair touch-none select-none border-l border-st-line-soft"
            >
              {Array.from({ length: N_HOURS }).map((_, i) => (
                <div key={i} style={{ height: ROW_H }} className="border-t border-st-line-soft" />
              ))}

              {eff.type === "override" && eff.ferme && (
                <div
                  data-block
                  onClick={() => onOpenDay(date)}
                  className="absolute inset-x-1 inset-y-1 grid cursor-pointer place-items-center rounded-[9px] bg-st-surface-hover text-[11.5px] font-medium text-st-muted bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgba(15,17,23,0.035)_6px_12px)]"
                >
                  Fermé
                </div>
              )}

              {blocks.map((b) => {
                const s = hourOf(b.start);
                const en = hourOf(b.end);
                const dragging = blockDrag?.date === date && blockDrag.blockKey === b.key;
                return (
                  <div
                    key={b.key}
                    data-block
                    style={{ top: (s - HOURS_START) * ROW_H + 1, height: Math.max(ROW_H * 0.6, (en - s) * ROW_H - 2) }}
                    className={cn(
                      "absolute inset-x-1 overflow-hidden rounded-[9px] text-[11px] font-semibold shadow-st-sm transition-opacity",
                      b.kind === "plage" ? "bg-st-ink text-white" : "bg-st-gold text-st-ink",
                      dragging && "opacity-30",
                    )}
                  >
                    <div onPointerDown={(e) => startBlock(date, b.key, "top", s, en, e)} className="absolute inset-x-0 top-0 h-2 cursor-ns-resize" />
                    <div onPointerDown={(e) => startBlock(date, b.key, "move", s, en, e)} className="st-num absolute inset-0 cursor-grab px-2 py-1.5 active:cursor-grabbing">
                      {hhmm(b.start)}–{hhmm(b.end)}
                    </div>
                    <div onPointerDown={(e) => startBlock(date, b.key, "bottom", s, en, e)} className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize" />
                  </div>
                );
              })}

              {draw?.date === date && (
                <div
                  style={{
                    top: (Math.min(draw.anchor, draw.hour) - HOURS_START) * ROW_H,
                    height: Math.max(ROW_H * 0.5, Math.abs(draw.hour - draw.anchor) * ROW_H),
                  }}
                  className="pointer-events-none absolute inset-x-1 rounded-[9px] border-2 border-dashed border-st-ink/50 bg-st-ink-soft"
                />
              )}

              {blockDrag?.date === date && (
                <div
                  style={{ top: (blockDrag.liveStart - HOURS_START) * ROW_H, height: Math.max(ROW_H * 0.5, (blockDrag.liveEnd - blockDrag.liveStart) * ROW_H) }}
                  className="pointer-events-none absolute inset-x-1 grid place-items-center rounded-[9px] border-2 border-dashed border-st-ink/50 bg-st-ink-soft"
                >
                  <span className="st-num rounded-md bg-white px-1.5 py-0.5 text-[11px] font-semibold text-st-ink">
                    {pad(blockDrag.liveStart)}:00–{pad(blockDrag.liveEnd)}:00
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tiroir d'un jour ────────────────────────────────────────────

function DayEditor({ draft, actions, onClose, onEditPlage }: {
  draft: DayDraft;
  actions: Actions;
  onClose: () => void;
  onEditPlage?: () => void;
}) {
  const [ferme, setFerme] = useState(draft.ferme);
  const [debut, setDebut] = useState(draft.heure_debut);
  const [fin, setFin] = useState(draft.heure_fin);
  const [extra, setExtra] = useState<string[]>([]);
  const [dateInput, setDateInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hoursInvalid = !ferme && (!debut || !fin || debut >= fin);

  function addExtra() {
    if (!dateInput || dateInput === draft.date || extra.includes(dateInput)) return;
    setExtra((x) => [...x, dateInput].sort());
    setDateInput("");
  }

  function save() {
    if (hoursInvalid) { setError("L'heure de fin doit être après l'heure de début."); return; }
    setError(null);
    startTransition(async () => {
      const res = await actions.upsertJours([draft.date, ...extra], {
        ferme,
        heure_debut: ferme ? null : debut,
        heure_fin: ferme ? null : fin,
      });
      const err = errorOf(res);
      if (err) setError(err);
      else onClose();
    });
  }

  function removeException() {
    if (!draft.existingId) return;
    startTransition(async () => {
      const err = errorOf(await actions.deleteJour(draft.existingId!));
      if (err) setError(err);
      else onClose();
    });
  }

  const source = draft.existingId
    ? "Réglé pour ce jour seulement"
    : draft.plageId
      ? "Suit une plage récurrente"
      : "Aucun créneau pour l'instant";

  return (
    <>
      <SheetHeader title={<span className="capitalize">{fmtLong(draft.date)}</span>} subtitle={source} onClose={onClose} />
      <SheetBody>
        <Segmented
          fill
          value={ferme ? "ferme" : "ouvert"}
          onChange={(k) => setFerme(k === "ferme")}
          items={[{ key: "ouvert", label: "Disponible" }, { key: "ferme", label: "Fermé" }]}
        />

        {!ferme && (
          <div className="grid grid-cols-2 gap-3">
            <FormField id="dispo-debut" label="De">
              <Input id="dispo-debut" type="time" value={debut} onChange={(e) => setDebut(e.target.value)} />
            </FormField>
            <FormField id="dispo-fin" label="À">
              <Input id="dispo-fin" type="time" value={fin} onChange={(e) => setFin(e.target.value)} />
            </FormField>
          </div>
        )}

        {draft.plageId && !draft.existingId && (
          <p className="text-[12.5px] leading-relaxed text-st-muted">
            Ce jour suit une plage récurrente. En enregistrant, vous le modifiez pour ce jour seulement ; la plage reste inchangée.
          </p>
        )}

        <div className="space-y-2">
          <p className="text-[13px] font-medium text-st-text">Appliquer aussi à</p>
          <div className="flex gap-2">
            <Input type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)} aria-label="Autre jour" className="flex-1" />
            <Button variant="secondary" onClick={addExtra} disabled={!dateInput}>Ajouter</Button>
          </div>
          {extra.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {extra.map((d) => (
                <span key={d} className="inline-flex items-center gap-1 rounded-full bg-st-surface py-1 pl-2.5 pr-1 text-[12px] font-medium text-st-text">
                  {fmtShort(d)}
                  <button
                    type="button"
                    aria-label="Retirer"
                    onClick={() => setExtra((x) => x.filter((y) => y !== d))}
                    className="grid h-5 w-5 cursor-pointer place-items-center rounded-full text-st-muted hover:bg-st-line hover:text-st-text"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {error && <p className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">{error}</p>}
      </SheetBody>
      <SheetFooter>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button size="lg" className="sm:h-[38px] sm:text-[13px]" fullWidth loading={pending} onClick={save}>
            {extra.length ? `Enregistrer (${extra.length + 1} jours)` : "Enregistrer"}
          </Button>
          {draft.existingId && (
            <Button variant="danger" size="lg" className="sm:h-[38px] sm:text-[13px]" disabled={pending} onClick={removeException}>
              {draft.plageId ? "Revenir à la plage" : "Effacer ce jour"}
            </Button>
          )}
          {onEditPlage && (
            <Button variant="secondary" size="lg" className="sm:h-[38px] sm:text-[13px]" disabled={pending} onClick={onEditPlage}>
              <Repeat /> Modifier la plage
            </Button>
          )}
        </div>
      </SheetFooter>
    </>
  );
}

// ── Tiroir d'une plage récurrente ───────────────────────────────

function PlageEditor({ plage, actions, onClose }: {
  plage: DispoPlage | null;
  actions: Actions;
  onClose: () => void;
}) {
  const [jours, setJours] = useState<number[]>(plage?.jours ?? [1, 2, 3, 4, 5, 6, 0]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if ((fd.get("date_debut") as string) > (fd.get("date_fin") as string)) { setError("La date de fin doit être après la date de début."); return; }
    if ((fd.get("heure_debut") as string) >= (fd.get("heure_fin") as string)) { setError("L'heure de fin doit être après l'heure de début."); return; }
    if (!jours.length) { setError("Choisissez au moins un jour."); return; }
    jours.forEach((j) => fd.append("jours", String(j)));
    setError(null);
    startTransition(async () => {
      const err = errorOf(plage ? await actions.updatePlage(plage.id, fd) : await actions.createPlage(fd));
      if (err) setError(err);
      else onClose();
    });
  }

  function run(fn: () => Promise<Result>) {
    startTransition(async () => {
      const err = errorOf(await fn());
      if (err) setError(err);
      else onClose();
    });
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <SheetHeader
        title={plage ? "Plage récurrente" : "Nouvelle plage récurrente"}
        subtitle={plage && !plage.actif ? "Désactivée : elle n'ouvre aucun créneau" : undefined}
        onClose={onClose}
      />
      <SheetBody>
        <div className="grid grid-cols-2 gap-3">
          <FormField id="plage-du" label="Du">
            <Input id="plage-du" name="date_debut" type="date" required defaultValue={plage?.date_debut} />
          </FormField>
          <FormField id="plage-au" label="Au">
            <Input id="plage-au" name="date_fin" type="date" required defaultValue={plage?.date_fin} />
          </FormField>
          <FormField id="plage-de" label="De">
            <Input id="plage-de" name="heure_debut" type="time" required defaultValue={plage ? hhmm(plage.heure_debut) : "08:00"} />
          </FormField>
          <FormField id="plage-a" label="À">
            <Input id="plage-a" name="heure_fin" type="time" required defaultValue={plage ? hhmm(plage.heure_fin) : "18:00"} />
          </FormField>
        </div>

        <div className="space-y-2">
          <p className="text-[13px] font-medium text-st-text">Jours</p>
          <div className="grid grid-cols-7 gap-1.5">
            {JOURS_ORDER.map((j) => {
              const on = jours.includes(j);
              return (
                <button
                  key={j}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setJours((prev) => (on ? prev.filter((x) => x !== j) : [...prev, j]))}
                  className={cn(
                    "h-10 cursor-pointer rounded-[10px] text-[12.5px] font-semibold transition-colors",
                    on ? "bg-st-ink text-white" : "border border-st-line bg-white text-st-text-2 hover:bg-st-surface",
                  )}
                >
                  {JOURS_LABELS[j]}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">{error}</p>}
      </SheetBody>
      <SheetFooter>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" size="lg" className="sm:h-[38px] sm:text-[13px]" fullWidth loading={pending}>
            {plage ? "Enregistrer" : "Créer la plage"}
          </Button>
          {plage && (
            <>
              <Button
                variant="secondary"
                size="lg"
                className="sm:h-[38px] sm:text-[13px]"
                disabled={pending}
                onClick={() => run(() => actions.togglePlageActif(plage.id, !plage.actif))}
              >
                {plage.actif ? "Désactiver" : "Activer"}
              </Button>
              <Button
                variant="danger"
                size="lg"
                className="sm:h-[38px] sm:text-[13px]"
                disabled={pending}
                onClick={() => (confirmDelete ? run(() => actions.deletePlage(plage.id)) : setConfirmDelete(true))}
              >
                {confirmDelete ? "Confirmer la suppression" : "Supprimer"}
              </Button>
            </>
          )}
        </div>
      </SheetFooter>
    </form>
  );
}
