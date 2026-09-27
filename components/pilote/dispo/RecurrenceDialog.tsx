"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button, Input, Segmented, Select, SheetCloseButton } from "@/components/pilote/studio";
import { useScrollLock, useSwipeToClose } from "@/components/pilote/studio/sheet-gestures";
import { BLOCS, BLOC_H, addDaysIso, fmtIso } from "@/lib/pilote-creneaux";

// « Ajouter une récurrence » : les mêmes blocs sur plusieurs semaines d'un coup,
// à partir de la semaine affichée. Ce n'est pas une règle enregistrée : elle
// coche (ou décoche) la grille, que le pilote peut encore retoucher avant
// d'enregistrer. Popup au centre sur le bureau, feuille du bas au téléphone.

export type Recurrence = { mode: "open" | "close"; days: number[]; from: number; to: number; weeks: number };

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAYS_LONG = ["lundis", "mardis", "mercredis", "jeudis", "vendredis", "samedis", "dimanches"];
const HOURS_TO = [...BLOCS.slice(1), BLOCS[BLOCS.length - 1] + BLOC_H];
const DURATIONS = [4, 8, 12];

const chip = (on: boolean) => cn(
  "h-9 cursor-pointer rounded-[10px] border px-3 text-[13px] font-[550] transition-colors",
  on ? "border-st-ink bg-st-ink text-white" : "border-st-line-strong bg-white text-st-text-2 hover:bg-st-surface",
);

export function RecurrenceDialog({ open, weekStart, onClose, onApply, reservedKeys }: {
  open: boolean;
  /** Lundi de la semaine affichée : la récurrence part de là. */
  weekStart: string;
  onClose: () => void;
  onApply: (r: Recurrence) => void;
  reservedKeys: Map<string, string>;
}) {
  const [mode, setMode] = useState<"open" | "close">("open");
  const [days, setDays] = useState<number[]>([1]);
  const [from, setFrom] = useState(13);
  const [to, setTo] = useState(17);
  const [weeks, setWeeks] = useState(8);
  const [custom, setCustom] = useState(false);

  useScrollLock(open);
  const swipeRef = useSwipeToClose(onClose, { enabled: open });
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const blocs = BLOCS.filter((b) => b >= from && b + BLOC_H <= to);
  const keys = Array.from({ length: weeks }, (_, w) => days.flatMap((d) => blocs.map((b) => `${addDaysIso(weekStart, w * 7 + d)}|${b}`))).flat();
  const reservedCount = keys.filter((k) => reservedKeys.has(k)).length;
  const lastDay = addDaysIso(weekStart, weeks * 7 - 1);
  const sorted = [...days].sort().map((d) => DAYS_LONG[d]);
  const dayList = sorted.length > 1 ? `${sorted.slice(0, -1).join(", ")} et ${sorted[sorted.length - 1]}` : sorted[0];

  return (
    <div className={cn("fixed inset-0 z-[70]", !open && "pointer-events-none")} aria-hidden={!open} inert={!open}>
      <div className={cn("absolute inset-0 bg-st-ink/20 backdrop-blur-[1.5px] transition-opacity duration-200", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div
        ref={swipeRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rec-title"
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-[26px] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-16px_40px_-16px_rgba(15,17,23,0.3)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[calc(100dvh-40px)] sm:w-[480px] sm:-translate-x-1/2 sm:rounded-[22px] sm:pb-0 sm:shadow-st-panel",
          open ? "translate-y-0 sm:-translate-y-1/2 sm:opacity-100" : "translate-y-full sm:-translate-y-[46%] sm:opacity-0",
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-[38px] shrink-0 rounded-full bg-st-line-strong sm:hidden" />
        <div className="flex items-start justify-between gap-3 px-[22px] pb-1 pt-3 sm:pt-5">
          <div className="min-w-0">
            <h2 id="rec-title" className="text-lg font-semibold tracking-[-0.02em] text-st-text">Ajouter une récurrence</h2>
            <p className="text-[13px] text-st-text-2">Les mêmes créneaux, sur plusieurs semaines d&apos;un coup.</p>
          </div>
          <SheetCloseButton onClick={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-[22px] pb-2 pt-3.5">
          <Segmented fill value={mode} onChange={setMode} items={[
            { key: "open", label: "Ouvrir des créneaux" },
            { key: "close", label: "Fermer (congés…)" },
          ]} />

          <p className="mb-2 mt-[18px] text-[12.5px] font-semibold text-st-text">Quels jours ?</p>
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map((label, d) => {
              const on = days.includes(d);
              return (
                <button key={d} type="button" aria-pressed={on} className={cn(chip(on), "px-0")}
                  onClick={() => setDays(on ? days.filter((x) => x !== d) : [...days, d])}>
                  {label}
                </button>
              );
            })}
          </div>

          <p className="mb-2 mt-[18px] text-[12.5px] font-semibold text-st-text">Quelles heures ?</p>
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-st-text-2">
            De
            <Select aria-label="De" className="w-[92px]" value={from}
              onChange={(e) => { const v = Number(e.target.value); setFrom(v); if (to <= v) setTo(v + BLOC_H); }}>
              {BLOCS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")} h</option>)}
            </Select>
            à
            <Select aria-label="À" className="w-[92px]" value={to}
              onChange={(e) => { const v = Number(e.target.value); setTo(v); if (from >= v) setFrom(v - BLOC_H); }}>
              {HOURS_TO.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")} h</option>)}
            </Select>
            <button type="button" className={cn(chip(from === BLOCS[0] && to === HOURS_TO[HOURS_TO.length - 1]), "sm:ml-auto")}
              onClick={() => { setFrom(BLOCS[0]); setTo(HOURS_TO[HOURS_TO.length - 1]); }}>
              Toute la journée
            </button>
          </div>

          <p className="mb-2 mt-[18px] text-[12.5px] font-semibold text-st-text">Pendant combien de temps ?</p>
          <div className="flex flex-wrap gap-1.5">
            {DURATIONS.map((w) => (
              <button key={w} type="button" className={chip(!custom && weeks === w)} onClick={() => { setCustom(false); setWeeks(w); }}>
                {w} semaines
              </button>
            ))}
            <button type="button" className={chip(custom)} onClick={() => setCustom(true)}>Jusqu&apos;au…</button>
          </div>
          {custom && (
            <Input type="date" aria-label="Jusqu'au" className="mt-2 w-[220px]" min={addDaysIso(weekStart, 6)} value={lastDay}
              onChange={(e) => {
                if (!e.target.value) return;
                const diff = (Date.parse(`${e.target.value}T00:00:00Z`) - Date.parse(`${weekStart}T00:00:00Z`)) / 864e5;
                setWeeks(Math.max(1, Math.min(52, Math.floor(diff / 7) + 1)));
              }} />
          )}

          <div className={cn(
            "mt-5 rounded-xl px-3.5 py-3 text-[13px] leading-normal",
            !days.length ? "bg-st-surface text-st-muted" : mode === "open" ? "bg-st-gold-soft text-st-gold-text" : "bg-st-surface text-st-text-2",
          )}>
            {!days.length ? "Choisissez au moins un jour." : (
              <>
                {mode === "open" ? "Ouvre" : "Ferme"} <b className="font-semibold text-st-text">les {dayList} de {from} h à {to} h</b>, du {fmtIso(weekStart)} au {fmtIso(lastDay)}, soit <b className="st-num font-semibold text-st-text">{keys.length} blocs</b>.
                {mode === "close" && reservedCount > 0 && (
                  <small className="mt-1 block text-xs">{reservedCount} bloc{reservedCount > 1 ? "s" : ""} déjà réservé{reservedCount > 1 ? "s" : ""} ne {reservedCount > 1 ? "seront" : "sera"} pas fermé{reservedCount > 1 ? "s" : ""}.</small>
                )}
                <small className="mt-1 block text-xs opacity-90">Vous pourrez encore retoucher la grille avant d&apos;enregistrer.</small>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2 px-[22px] pb-6 pt-3.5 sm:justify-end sm:pb-[18px]">
          <Button variant="secondary" className="flex-1 sm:flex-none" onClick={onClose}>Annuler</Button>
          <Button className="flex-1 sm:flex-none" disabled={!days.length}
            onClick={() => onApply({ mode, days, from, to, weeks })}>
            Appliquer
          </Button>
        </div>
      </div>
    </div>
  );
}
