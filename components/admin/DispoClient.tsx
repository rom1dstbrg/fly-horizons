"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Plus, Trash2, Power, Pencil, ChevronLeft, ChevronRight, Ban, Copy, CalendarDays } from "lucide-react";
import {
  createPlage,
  updatePlage,
  togglePlageActif,
  deletePlage,
  upsertJoursIndivBulk,
  deleteJourIndiv,
} from "@/lib/actions/disponibilites";
import { computeEffectiveDay, type DispoPlage, type DispoJourIndiv, type EffectiveDay } from "@/lib/dispo-utils";

const JOURS_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const JOURS_ORDER  = [1, 2, 3, 4, 5, 6, 0]; // Mon→Sun display order
const HOURS_START = 7;
const HOURS_END   = 21;
const N_HOURS     = HOURS_END - HOURS_START;
const ROW_H       = 28; // px par heure

type Plage = DispoPlage;
type JourIndiv = DispoJourIndiv;

interface Props {
  plages: Plage[];
  joursIndiv: JourIndiv[];
}

// ── Helpers date ─────────────────────────────────────────────
function pad(n: number) { return String(n).padStart(2, "0"); }
function toISODate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function mondayOf(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  return m;
}
function addDays(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function parseHourFloat(hms: string) {
  const [h, m] = hms.split(":").map(Number);
  return h + (m || 0) / 60;
}
// Convertit une position souris en heure de la grille — columnTop est le rect.top
// de la colonne du jour, capturé au moment de l'événement (pas via une ref stockée).
function hourFromY(columnTop: number, clientY: number) {
  const idx = Math.round((clientY - columnTop) / ROW_H);
  return Math.max(HOURS_START, Math.min(HOURS_END, HOURS_START + idx));
}
function formatDateLong(iso: string) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function formatDateShort(iso: string) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" });
}
function formatDate(d: string) {
  return new Date(d + "T12:00:00Z").toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });
}

const inputCls = "w-full h-9 px-3 rounded-md border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

function JoursChips({ jours }: { jours: number[] | null }) {
  const active = jours ?? [0,1,2,3,4,5,6];
  return (
    <div className="flex gap-0.5">
      {JOURS_ORDER.map((j) => (
        <span
          key={j}
          className={`text-[10px] font-semibold w-6 h-6 flex items-center justify-center rounded ${
            active.includes(j)
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground/40"
          }`}
        >
          {JOURS_LABELS[j]}
        </span>
      ))}
    </div>
  );
}

// ── Formulaire plage (création ou édition) — inchangé ──────────
function PlageForm({
  initial,
  onDone,
}: {
  initial?: Partial<Plage>;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [jours, setJours] = useState<number[]>(initial?.jours ?? [1,2,3,4,5,6,0]);

  function toggle(j: number) {
    setJours((prev) =>
      prev.includes(j) ? prev.filter((x) => x !== j) : [...prev, j]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    jours.forEach((j) => fd.append("jours", String(j)));
    startTransition(async () => {
      const res = initial?.id
        ? await updatePlage(initial.id, fd)
        : await createPlage(fd);
      if (res?.error) setError(res.error);
      else onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card-premium p-5 space-y-4 border-primary/30">
      <p className="text-sm font-semibold text-foreground">
        {initial?.id ? "Modifier la plage récurrente" : "Nouvelle plage récurrente"}
      </p>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Date début *</label>
          <input name="date_debut" type="date" required
            defaultValue={initial?.date_debut}
            className={inputCls} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Date fin *</label>
          <input name="date_fin" type="date" required
            defaultValue={initial?.date_fin}
            className={inputCls} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Heure début *</label>
          <input name="heure_debut" type="time" required
            defaultValue={initial?.heure_debut?.slice(0, 5) ?? "08:00"}
            className={inputCls} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Heure fin *</label>
          <input name="heure_fin" type="time" required
            defaultValue={initial?.heure_fin?.slice(0, 5) ?? "18:00"}
            className={inputCls} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Jours actifs</label>
        <div className="flex gap-1.5">
          {JOURS_ORDER.map((j) => (
            <button
              key={j}
              type="button"
              onClick={() => toggle(j)}
              className={`text-xs font-semibold w-9 h-9 rounded-md transition-colors cursor-pointer ${
                jours.includes(j)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-secondary"
              }`}
            >
              {JOURS_LABELS[j]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="px-4 h-9 bg-primary text-primary-foreground text-sm font-semibold rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer">
          {pending ? "Enregistrement…" : initial?.id ? "Enregistrer" : "Créer"}
        </button>
        <button type="button" onClick={onDone}
          className="px-4 h-9 border border-border text-sm text-muted-foreground rounded-md hover:bg-secondary transition-colors cursor-pointer">
          Annuler
        </button>
      </div>
    </form>
  );
}

// ── Éditeur de créneau ponctuel (grille) ────────────────────────
// primaryDate = null → mode "dupliquer uniquement" (pas de sauvegarde sur une date source).
// anchor = position écran (clientX/clientY) où afficher la bulle, capturée au moment
// du clic/relâcher qui a ouvert l'éditeur — pas de scroll jusqu'à un panneau ailleurs.
interface OverrideEditorState {
  primaryDate: string | null;
  existingId: string | null;
  heure_debut: string;
  heure_fin: string;
  ferme: boolean;
  extraDates: string[];
  anchor: { x: number; y: number };
}

const BUBBLE_W = 288; // px — largeur fixe de la bulle, pour le clamp au viewport

function OverrideEditor({
  state,
  onChange,
  onSave,
  onDelete,
  onCancel,
  pending,
  error,
}: {
  state: OverrideEditorState;
  onChange: (s: OverrideEditorState) => void;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
  pending: boolean;
  error: string | null;
}) {
  const [dateInput, setDateInput] = useState("");
  const [showDuplicate, setShowDuplicate] = useState(state.extraDates.length > 0 || !state.primaryDate);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) onCancel();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onCancel]);

  function addExtra() {
    if (!dateInput || dateInput === state.primaryDate || state.extraDates.includes(dateInput)) return;
    onChange({ ...state, extraDates: [...state.extraDates, dateInput].sort() });
    setDateInput("");
  }
  function removeExtra(d: string) {
    onChange({ ...state, extraDates: state.extraDates.filter((x) => x !== d) });
  }

  const totalDates = (state.primaryDate ? 1 : 0) + state.extraDates.length;
  const saveLabel = state.existingId
    ? "Confirmer"
    : state.primaryDate
    ? (totalDates > 1 ? `Créer (${totalDates} jours)` : "Confirmer")
    : `Dupliquer${state.extraDates.length ? ` (${state.extraDates.length})` : ""}`;
  const saveDisabled = totalDates === 0 || (!state.ferme && (!state.heure_debut || !state.heure_fin));

  const left = typeof window === "undefined" ? state.anchor.x : Math.min(Math.max(8, state.anchor.x), window.innerWidth - BUBBLE_W - 8);
  const top  = typeof window === "undefined" ? state.anchor.y : Math.min(state.anchor.y + 8, window.innerHeight - 8);

  return (
    <div
      ref={boxRef}
      style={{ left, top, width: BUBBLE_W }}
      className="fixed z-50 card-premium p-4 space-y-3 border-primary/30 shadow-xl"
    >
      <p className="text-xs font-semibold text-foreground">
        {state.primaryDate
          ? state.existingId
            ? formatDateLong(state.primaryDate)
            : `Nouveau créneau — ${formatDateLong(state.primaryDate)}`
          : "Dupliquer ce créneau vers d'autres jours"}
      </p>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {state.primaryDate && (
        <label className="flex items-center gap-2.5 cursor-pointer">
          <button type="button" onClick={() => onChange({ ...state, ferme: !state.ferme })}
            className={`relative inline-flex h-4.5 w-8 items-center rounded-full transition-colors cursor-pointer ${
              state.ferme ? "bg-destructive" : "bg-border"
            }`}>
            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
              state.ferme ? "translate-x-4" : "translate-x-1"
            }`} />
          </button>
          <span className="text-xs text-foreground">Jour fermé (pas de vol)</span>
        </label>
      )}

      {!state.ferme && (
        <div className="flex items-center gap-2">
          <input type="time" value={state.heure_debut} autoFocus
            onChange={(e) => onChange({ ...state, heure_debut: e.target.value })}
            className={`${inputCls} h-8`} />
          <span className="text-muted-foreground text-xs">–</span>
          <input type="time" value={state.heure_fin}
            onChange={(e) => onChange({ ...state, heure_fin: e.target.value })}
            className={`${inputCls} h-8`} />
        </div>
      )}

      {!showDuplicate ? (
        <button type="button" onClick={() => setShowDuplicate(true)}
          className="text-xs font-medium text-primary hover:underline cursor-pointer">
          + Dupliquer vers d&apos;autres jours
        </button>
      ) : (
        <div className="space-y-1.5">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {state.primaryDate ? "Aussi appliqué à" : "Jours à dupliquer vers"}
          </label>
          <div className="flex items-center gap-1.5">
            <input type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)} className={`${inputCls} h-8 flex-1`} />
            <button type="button" onClick={addExtra}
              className="px-2.5 h-8 rounded-md bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/70 transition-colors cursor-pointer whitespace-nowrap">
              Ajouter
            </button>
          </div>
          {state.extraDates.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {state.extraDates.map((d) => (
                <span key={d} className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-primary/10 text-primary pl-2 pr-1 py-0.5 rounded-full">
                  {formatDateShort(d)}
                  <button type="button" onClick={() => removeExtra(d)} title="Retirer"
                    className="w-3.5 h-3.5 rounded-full bg-primary/15 hover:bg-primary/25 flex items-center justify-center text-[9px] cursor-pointer">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" disabled={pending || saveDisabled} onClick={onSave}
          className="flex-1 px-3 h-8 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer">
          {pending ? "…" : saveLabel}
        </button>
        <button type="button" onClick={onCancel}
          className="px-3 h-8 border border-border text-xs text-muted-foreground rounded-md hover:bg-secondary transition-colors cursor-pointer">
          Annuler
        </button>
        {state.existingId && (
          <button type="button" disabled={pending} onClick={onDelete} title="Supprimer"
            className="px-2.5 h-8 border border-destructive/30 text-xs text-destructive rounded-md hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-50">
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Bloc affiché dans la grille ─────────────────────────────────
// Poignées haut/bas pour redimensionner (comme Google Agenda), corps du bloc
// déplaçable verticalement. Un clic sans glisser ouvre l'éditeur normalement.
function Block({
  start, end, kind, dimmed,
  onMouseDownTop, onMouseDownBody, onMouseDownBottom,
  onQuickClose, onQuickDuplicate,
}: {
  start: string; end: string; kind: "override" | "plage"; dimmed?: boolean;
  onMouseDownTop: (e: React.MouseEvent) => void;
  onMouseDownBody: (e: React.MouseEvent) => void;
  onMouseDownBottom: (e: React.MouseEvent) => void;
  onQuickClose: () => void;
  onQuickDuplicate: (x: number, y: number) => void;
}) {
  const top = (parseHourFloat(start) - HOURS_START) * ROW_H;
  const height = Math.max(ROW_H * 0.6, (parseHourFloat(end) - parseHourFloat(start)) * ROW_H - 2);
  const stopMouseDown = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <div
      style={{ top, height }}
      className={`absolute left-0.5 right-0.5 rounded-md text-[10px] font-semibold text-white group overflow-hidden transition-colors ${dimmed ? "opacity-35" : ""} ${
        kind === "plage" ? "bg-navy hover:bg-navy/90" : "bg-primary hover:bg-primary/90"
      }`}
      title={kind === "plage" ? "Fait partie d'une plage récurrente — glisser modifie juste ce jour" : "Glisser pour ajuster, cliquer pour modifier"}
    >
      <div onMouseDown={onMouseDownTop} className="absolute top-0 inset-x-0 h-1.5 cursor-ns-resize" />
      <div onMouseDown={onMouseDownBody} className="absolute inset-0 px-1.5 py-1 cursor-move flex items-center">
        <span className="block truncate">{start.slice(0,5)}–{end.slice(0,5)}</span>
      </div>
      <div onMouseDown={onMouseDownBottom} className="absolute bottom-0 inset-x-0 h-1.5 cursor-ns-resize" />
      <div className="absolute top-0.5 right-0.5 hidden group-hover:flex items-center gap-0.5">
        <button type="button" onMouseDown={stopMouseDown} onClick={(e) => { e.stopPropagation(); onQuickDuplicate(e.clientX, e.clientY); }} title="Dupliquer vers d'autres jours"
          className="w-4 h-4 rounded bg-black/25 hover:bg-black/40 flex items-center justify-center cursor-pointer">
          <Copy size={9} />
        </button>
        <button type="button" onMouseDown={stopMouseDown} onClick={(e) => { e.stopPropagation(); onQuickClose(); }} title="Fermer ce jour"
          className="w-4 h-4 rounded bg-black/25 hover:bg-black/40 flex items-center justify-center cursor-pointer">
          <Ban size={9} />
        </button>
      </div>
    </div>
  );
}

// ── Grille hebdomadaire ──────────────────────────────────────────
function WeekGrid({
  plages,
  joursIndiv,
  onOpenPlage,
  onOpenOverrideEditor,
  pending,
  startTransition,
}: {
  plages: Plage[];
  joursIndiv: JourIndiv[];
  onOpenPlage: (p: Plage) => void;
  onOpenOverrideEditor: (s: OverrideEditorState) => void;
  pending: boolean;
  startTransition: (fn: () => Promise<void> | void) => void;
}) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [drag, setDrag] = useState<{ dayIdx: number; dateStr: string; columnTop: number; anchor: number; hour: number } | null>(null);

  // Redimensionner/déplacer un bloc existant à la souris (façon Google Agenda).
  // blockKey identifie le bloc précis (sourceId de l'override, ou "plage:<id>")
  // pour ne pas confondre deux créneaux qui se chevauchent le même jour.
  const [blockDrag, setBlockDrag] = useState<{
    dayIdx: number; dateStr: string; blockKey: string; columnTop: number;
    mode: "move" | "resize-top" | "resize-bottom";
    origStart: number; origEnd: number; anchorHour: number;
    liveStart: number; liveEnd: number;
    onNoMove: (x: number, y: number) => void;
  } | null>(null);

  useEffect(() => {
    if (!drag) return;
    function onMove(e: MouseEvent) {
      setDrag((d) => (d ? { ...d, hour: hourFromY(d.columnTop, e.clientY) } : d));
    }
    function onUp(e: MouseEvent) {
      // Ne jamais déclencher un setState d'un autre composant (onOpenOverrideEditor)
      // depuis l'intérieur d'un updater de setState — React l'interdit pendant le rendu.
      // On lit `drag` directement depuis la closure (déjà à jour, l'effet se re-crée à
      // chaque changement) et on ne fait qu'un setDrag(null) simple ici.
      if (drag) {
        const lo = Math.min(drag.anchor, drag.hour);
        const hi = Math.max(drag.anchor, drag.hour);
        const end = hi > lo ? hi : Math.min(HOURS_END, lo + 2);
        onOpenOverrideEditor({
          primaryDate: drag.dateStr,
          existingId: null,
          heure_debut: `${pad(lo)}:00`,
          heure_fin: `${pad(end)}:00`,
          ferme: false,
          extraDates: [],
          anchor: { x: e.clientX, y: e.clientY },
        });
      }
      setDrag(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag]);

  useEffect(() => {
    if (!blockDrag) return;
    function onMove(e: MouseEvent) {
      setBlockDrag((bd) => {
        if (!bd) return bd;
        const cur = hourFromY(bd.columnTop, e.clientY);
        let liveStart = bd.origStart;
        let liveEnd = bd.origEnd;
        if (bd.mode === "resize-top") {
          liveStart = Math.min(cur, bd.origEnd - 1);
        } else if (bd.mode === "resize-bottom") {
          liveEnd = Math.max(cur, bd.origStart + 1);
        } else {
          const duration = bd.origEnd - bd.origStart;
          liveStart = bd.origStart + (cur - bd.anchorHour);
          liveStart = Math.max(HOURS_START, Math.min(HOURS_END - duration, liveStart));
          liveEnd = liveStart + duration;
        }
        liveStart = Math.max(HOURS_START, liveStart);
        liveEnd = Math.min(HOURS_END, liveEnd);
        return { ...bd, liveStart, liveEnd };
      });
    }
    function onUp(e: MouseEvent) {
      // Même règle que pour "drag" ci-dessus : lire blockDrag depuis la closure, pas
      // depuis un updater de setState, et appeler les callbacks à côté du setState.
      if (blockDrag) {
        if (blockDrag.liveStart !== blockDrag.origStart || blockDrag.liveEnd !== blockDrag.origEnd) {
          const dateStr = blockDrag.dateStr;
          const heure_debut = `${pad(blockDrag.liveStart)}:00`;
          const heure_fin = `${pad(blockDrag.liveEnd)}:00`;
          startTransition(async () => {
            await upsertJoursIndivBulk([dateStr], { ferme: false, heure_debut, heure_fin });
          });
        } else {
          blockDrag.onNoMove(e.clientX, e.clientY);
        }
      }
      setBlockDrag(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockDrag]);

  function handleMouseDown(di: number, dateStr: string, e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest(".dispo-block")) return;
    const columnTop = e.currentTarget.getBoundingClientRect().top;
    const h = hourFromY(columnTop, e.clientY);
    setDrag({ dayIdx: di, dateStr, columnTop, anchor: h, hour: h });
  }

  function startBlockDrag(
    di: number, dateStr: string, blockKey: string,
    mode: "move" | "resize-top" | "resize-bottom",
    start: number, end: number, e: React.MouseEvent,
    onNoMove: (x: number, y: number) => void
  ) {
    e.stopPropagation();
    const col = (e.target as HTMLElement).closest(".daycol") as HTMLElement | null;
    const columnTop = col?.getBoundingClientRect().top ?? 0;
    const anchor = hourFromY(columnTop, e.clientY);
    setBlockDrag({ dayIdx: di, dateStr, blockKey, columnTop, mode, origStart: start, origEnd: end, anchorHour: anchor, liveStart: start, liveEnd: end, onNoMove });
  }

  function quickClose(dateStr: string) {
    startTransition(async () => {
      await upsertJoursIndivBulk([dateStr], { ferme: true, heure_debut: null, heure_fin: null });
    });
  }

  const weekLabel = `${weekDates[0].toLocaleDateString("fr-BE", { day: "numeric", month: weekDates[0].getMonth() === weekDates[6].getMonth() ? undefined : "short" })} – ${weekDates[6].toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}`;

  return (
    <div className="card-premium overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekStart((w) => addDays(w, -7))} title="Semaine précédente"
            className="p-1.5 rounded hover:bg-secondary transition-colors cursor-pointer text-muted-foreground hover:text-foreground">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setWeekStart((w) => addDays(w, 7))} title="Semaine suivante"
            className="p-1.5 rounded hover:bg-secondary transition-colors cursor-pointer text-muted-foreground hover:text-foreground">
            <ChevronRight size={16} />
          </button>
          <span className="text-sm font-semibold text-foreground ml-2 capitalize">Semaine du {weekLabel}</span>
        </div>
        <button onClick={() => setWeekStart(mondayOf(new Date()))}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <CalendarDays size={13} /> Aujourd&apos;hui
        </button>
      </div>

      <div className="p-4 overflow-x-auto">
        <div className="grid grid-cols-[40px_repeat(7,minmax(64px,1fr))] min-w-[560px]">
          {/* En-tête */}
          <div />
          {weekDates.map((d, i) => {
            const dateStr = toISODate(d);
            const eff = computeEffectiveDay(dateStr, plages, joursIndiv);
            const isClosed = eff.type === "override" && eff.ferme;
            return (
              <div key={i} className="flex flex-col items-center pb-2 border-b border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                  {d.toLocaleDateString("fr-BE", { weekday: "short" })}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-sm font-bold text-foreground">{d.getDate()}</span>
                  <button
                    type="button"
                    title={isClosed ? "Rouvrir ce jour" : "Fermer ce jour"}
                    disabled={pending}
                    onClick={() => {
                      if (isClosed && eff.type === "override") startTransition(async () => { await deleteJourIndiv(eff.sourceId); });
                      else quickClose(dateStr);
                    }}
                    className={`w-4 h-4 rounded flex items-center justify-center cursor-pointer transition-colors ${
                      isClosed ? "text-destructive bg-destructive/10" : "text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10"
                    }`}
                  >
                    <Ban size={10} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Colonne des heures + colonnes jours */}
          <div>
            {Array.from({ length: N_HOURS }).map((_, i) => (
              <div key={i} style={{ height: ROW_H }} className="relative">
                <span className="absolute right-1.5 -translate-y-1/2 text-[9px] font-mono text-muted-foreground/60">
                  {HOURS_START + i}h
                </span>
              </div>
            ))}
          </div>

          {weekDates.map((d, di) => {
            const dateStr = toISODate(d);
            const eff: EffectiveDay = computeEffectiveDay(dateStr, plages, joursIndiv);
            return (
              <div
                key={di}
                onMouseDown={(e) => handleMouseDown(di, dateStr, e)}
                style={{ height: N_HOURS * ROW_H }}
                className="daycol relative border-l border-border cursor-crosshair select-none"
              >
                {Array.from({ length: N_HOURS }).map((_, i) => (
                  <div key={i} style={{ height: ROW_H }} className="border-t border-border/70" />
                ))}

                {eff.type === "override" && eff.ferme && (
                  <div
                    className="dispo-block absolute inset-x-0.5 top-0.5 bottom-0.5 rounded-md bg-muted flex items-center justify-center cursor-pointer"
                    onClick={(e) =>
                      onOpenOverrideEditor({
                        primaryDate: dateStr,
                        existingId: eff.sourceId,
                        heure_debut: "08:00",
                        heure_fin: "18:00",
                        ferme: true,
                        extraDates: [],
                        anchor: { x: e.clientX, y: e.clientY },
                      })
                    }
                  >
                    <span className="text-[10px] font-semibold text-muted-foreground rotate-0">Fermé</span>
                  </div>
                )}

                {eff.type === "override" && !eff.ferme && (() => {
                  const key = eff.sourceId;
                  const isDragging = blockDrag?.dayIdx === di && blockDrag.blockKey === key;
                  const openEditor = (x: number, y: number) =>
                    onOpenOverrideEditor({
                      primaryDate: dateStr,
                      existingId: eff.sourceId,
                      heure_debut: eff.heure_debut.slice(0, 5),
                      heure_fin: eff.heure_fin.slice(0, 5),
                      ferme: false,
                      extraDates: [],
                      anchor: { x, y },
                    });
                  const start = parseHourFloat(eff.heure_debut);
                  const end = parseHourFloat(eff.heure_fin);
                  return (
                    <div className="dispo-block contents">
                      <Block
                        start={eff.heure_debut} end={eff.heure_fin} kind="override" dimmed={isDragging}
                        onMouseDownTop={(e) => startBlockDrag(di, dateStr, key, "resize-top", start, end, e, openEditor)}
                        onMouseDownBody={(e) => startBlockDrag(di, dateStr, key, "move", start, end, e, openEditor)}
                        onMouseDownBottom={(e) => startBlockDrag(di, dateStr, key, "resize-bottom", start, end, e, openEditor)}
                        onQuickClose={() => quickClose(dateStr)}
                        onQuickDuplicate={(x, y) =>
                          onOpenOverrideEditor({
                            primaryDate: null,
                            existingId: null,
                            heure_debut: eff.heure_debut.slice(0, 5),
                            heure_fin: eff.heure_fin.slice(0, 5),
                            ferme: false,
                            extraDates: [],
                            anchor: { x, y },
                          })
                        }
                      />
                    </div>
                  );
                })()}

                {eff.type === "plage" && eff.windows.map((w, wi) => {
                  const key = `plage:${w.sourceId}`;
                  const isDragging = blockDrag?.dayIdx === di && blockDrag.blockKey === key;
                  const openEditor = () => {
                    const full = plages.find((p) => p.id === w.sourceId);
                    if (full) onOpenPlage(full);
                  };
                  const start = parseHourFloat(w.heure_debut);
                  const end = parseHourFloat(w.heure_fin);
                  return (
                    <div key={wi} className="dispo-block contents">
                      <Block
                        start={w.heure_debut} end={w.heure_fin} kind="plage" dimmed={isDragging}
                        onMouseDownTop={(e) => startBlockDrag(di, dateStr, key, "resize-top", start, end, e, openEditor)}
                        onMouseDownBody={(e) => startBlockDrag(di, dateStr, key, "move", start, end, e, openEditor)}
                        onMouseDownBottom={(e) => startBlockDrag(di, dateStr, key, "resize-bottom", start, end, e, openEditor)}
                        onQuickClose={() => quickClose(dateStr)}
                        onQuickDuplicate={(x, y) =>
                          onOpenOverrideEditor({
                            primaryDate: null,
                            existingId: null,
                            heure_debut: w.heure_debut.slice(0, 5),
                            heure_fin: w.heure_fin.slice(0, 5),
                            ferme: false,
                            extraDates: [],
                            anchor: { x, y },
                          })
                        }
                      />
                    </div>
                  );
                })}

                {drag && drag.dayIdx === di && (
                  <div
                    style={{
                      top: (Math.min(drag.anchor, drag.hour) - HOURS_START) * ROW_H,
                      height: Math.max(ROW_H * 0.5, (Math.max(drag.anchor, drag.hour) - Math.min(drag.anchor, drag.hour)) * ROW_H),
                    }}
                    className="absolute left-0.5 right-0.5 rounded-md bg-primary/30 border-2 border-dashed border-primary pointer-events-none"
                  />
                )}

                {blockDrag && blockDrag.dayIdx === di && (
                  <div
                    style={{
                      top: (blockDrag.liveStart - HOURS_START) * ROW_H,
                      height: Math.max(ROW_H * 0.5, (blockDrag.liveEnd - blockDrag.liveStart) * ROW_H),
                    }}
                    className="absolute left-0.5 right-0.5 rounded-md bg-primary/20 border-2 border-dashed border-primary pointer-events-none flex items-center justify-center"
                  >
                    <span className="text-[10px] font-bold text-primary bg-white/90 px-1.5 py-0.5 rounded">
                      {pad(blockDrag.liveStart)}:00–{pad(blockDrag.liveEnd)}:00
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 pb-4 flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary" /> Ponctuel</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-navy" /> Plage récurrente</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-muted" /> Fermé</span>
        <span>Clic-glisse sur une case vide pour créer un créneau.</span>
      </div>
    </div>
  );
}

// ── Main client ───────────────────────────────────────────────
export function DispoClient({ plages, joursIndiv }: Props) {
  const [showPlageForm, setShowPlageForm] = useState(false);
  const [editingPlage, setEditingPlage] = useState<Plage | null>(null);
  const [editingOverride, setEditingOverride] = useState<OverrideEditorState | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => { await togglePlageActif(id, !current); });
  }

  function handleDeletePlage(id: string) {
    if (!confirm("Supprimer cette plage récurrente ? Elle disparaîtra de tous les jours concernés.")) return;
    startTransition(async () => { await deletePlage(id); });
  }

  function openEditPlage(p: Plage) {
    setShowPlageForm(false);
    setEditingOverride(null);
    setEditingPlage(p);
  }

  function openOverrideEditor(s: OverrideEditorState) {
    setEditingPlage(null);
    setOverrideError(null);
    setEditingOverride(s);
  }

  function saveOverride() {
    if (!editingOverride) return;
    const dates = [
      ...(editingOverride.primaryDate ? [editingOverride.primaryDate] : []),
      ...editingOverride.extraDates,
    ];
    if (!dates.length) return;
    setOverrideError(null);
    startTransition(async () => {
      const res = await upsertJoursIndivBulk(dates, {
        ferme: editingOverride.ferme,
        heure_debut: editingOverride.ferme ? null : editingOverride.heure_debut,
        heure_fin: editingOverride.ferme ? null : editingOverride.heure_fin,
      });
      if (res?.error) setOverrideError(res.error);
      else setEditingOverride(null);
    });
  }

  function deleteOverride() {
    if (!editingOverride?.existingId) return;
    startTransition(async () => {
      await deleteJourIndiv(editingOverride.existingId!);
      setEditingOverride(null);
    });
  }

  return (
    <div className="space-y-10">

      {/* ── Grille hebdomadaire ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Disponibilités de la semaine</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dessinez un créneau directement sur la grille, dupliquez-le vers d&apos;autres jours ou fermez une journée en un clic.
          </p>
        </div>

        <WeekGrid
          plages={plages}
          joursIndiv={joursIndiv}
          onOpenPlage={openEditPlage}
          onOpenOverrideEditor={openOverrideEditor}
          pending={pending}
          startTransition={startTransition}
        />

        {editingOverride && (
          <OverrideEditor
            state={editingOverride}
            onChange={setEditingOverride}
            onSave={saveOverride}
            onDelete={deleteOverride}
            onCancel={() => setEditingOverride(null)}
            pending={pending}
            error={overrideError}
          />
        )}
      </section>

      {/* ── Plages récurrentes ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Plages récurrentes</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pour les grandes durées : un créneau répété sur plusieurs jours de semaine, sur une période donnée.
            </p>
          </div>
          {!showPlageForm && !editingPlage && (
            <button onClick={() => setShowPlageForm(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer">
              <Plus size={15} /> Ajouter
            </button>
          )}
        </div>

        {showPlageForm && (
          <PlageForm onDone={() => setShowPlageForm(false)} />
        )}

        {editingPlage && (
          <PlageForm initial={editingPlage} onDone={() => setEditingPlage(null)} />
        )}

        {plages.length === 0 && !showPlageForm && !editingPlage ? (
          <div className="card-premium p-8 text-center">
            <p className="text-sm text-muted-foreground">Aucune plage configurée : la grille restera vide tant qu&apos;aucun créneau n&apos;est ajouté.</p>
          </div>
        ) : plages.length > 0 && (
          <div className="card-premium overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Période</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Horaires</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Jours</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plages.map((p) => (
                  <tr key={p.id} className={`border-b border-border last:border-0 transition-colors ${editingPlage?.id === p.id ? "bg-primary/5" : "hover:bg-secondary/30"}`}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">
                        {formatDate(p.date_debut)} → {formatDate(p.date_fin)}
                      </p>
                      <span className={`text-xs font-medium ${p.actif ? "text-green-500" : "text-muted-foreground"}`}>
                        {p.actif ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-foreground">{p.heure_debut.slice(0,5)} – {p.heure_fin.slice(0,5)}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <JoursChips jours={p.jours} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditPlage(p)}
                          disabled={pending}
                          title="Modifier"
                          className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleToggle(p.id, p.actif)}
                          disabled={pending}
                          title={p.actif ? "Désactiver" : "Activer"}
                          className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Power size={14} className={p.actif ? "text-green-500" : ""} />
                        </button>
                        <button
                          onClick={() => handleDeletePlage(p.id)}
                          disabled={pending}
                          title="Supprimer"
                          className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}
