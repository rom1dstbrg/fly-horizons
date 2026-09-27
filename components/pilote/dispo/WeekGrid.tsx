"use client";

import { Fragment, useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { BLOCS, BLOC_H } from "@/lib/pilote-creneaux";
import { GRID_COLS, cellClass, dayHeaderClass, hourLabelClass } from "./styles";

// La grille d'une semaine (7 jours × 7 blocs de 2 h) et ses gestes : toucher un
// bloc, un jour (toute la journée), une heure (toute la semaine), glisser à la
// souris. Partagée par la vraie page (DispoGrid) et la démo du guide
// (DispoGuide). Elle s'adapte à la largeur de son conteneur, pas de l'écran :
// la démo peut l'afficher dans un cadre de téléphone sur un ordinateur.

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export const blocKey = (date: string, bloc: number) => `${date}|${bloc}`;

export function WeekGrid({ dates, today, open, saved, reserved, setOpen, tourCell = false }: {
  /** Les 7 dates "YYYY-MM-DD" de la semaine, du lundi au dimanche. */
  dates: string[];
  today: string;
  open: Set<string>;
  saved: Set<string>;
  /** Bloc pris par un vol → prénom du passager. */
  reserved: Map<string, string>;
  setOpen: React.Dispatch<React.SetStateAction<Set<string>>>;
  /** Marque un bloc pour la visite guidée. */
  tourCell?: boolean;
}) {
  const editable = (k: string) => k.slice(0, 10) >= today && !reserved.has(k);
  const firstFutureCol = Math.max(0, dates.findIndex((d) => d >= today));

  // Ouvre tout si un bloc modifiable est fermé, sinon ferme tout.
  const toggleMany = (keys: string[]) => {
    const free = keys.filter(editable);
    if (!free.length) return;
    const allOpen = free.every((k) => open.has(k));
    setOpen((prev) => {
      const next = new Set(prev);
      free.forEach((k) => (allOpen ? next.delete(k) : next.add(k)));
      return next;
    });
  };
  const setOne = (k: string, on: boolean) => setOpen((prev) => {
    if (prev.has(k) === on) return prev;
    const next = new Set(prev);
    if (on) next.add(k); else next.delete(k);
    return next;
  });

  // Souris : clic ou glisser, le premier bloc touché décide ouvrir/fermer.
  // Doigt et clavier : un bloc à la fois (click), pour ne rien cocher en faisant défiler.
  const paint = useRef<boolean | null>(null);
  const lastPointer = useRef("");
  useEffect(() => {
    const up = () => { paint.current = null; };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);
  const cellKey = (e: React.SyntheticEvent) => (e.target as HTMLElement).closest<HTMLElement>("[data-k]")?.dataset.k;
  const onPointerDown = (e: React.PointerEvent) => {
    lastPointer.current = e.pointerType;
    const k = cellKey(e);
    if (e.pointerType !== "mouse" || !k || !editable(k)) return;
    paint.current = !open.has(k);
    setOne(k, paint.current);
  };
  const onPointerOver = (e: React.PointerEvent) => {
    const k = cellKey(e);
    if (paint.current === null || !k || !editable(k)) return;
    setOne(k, paint.current);
  };
  const onClick = (e: React.MouseEvent) => {
    const k = cellKey(e);
    if (lastPointer.current !== "mouse" && k && editable(k)) setOne(k, !open.has(k));
    lastPointer.current = "";
  };

  return (
    <div className="@container">
      <div className={GRID_COLS} onPointerDown={onPointerDown} onPointerOver={onPointerOver} onClick={onClick}>
        <span />
        {dates.map((date, d) => {
          const n = BLOCS.filter((b) => open.has(blocKey(date, b))).length;
          const full = n === BLOCS.length;
          return (
            <button
              key={date}
              type="button"
              data-col={d}
              disabled={date < today}
              title={full ? "Fermer toute la journée" : "Ouvrir toute la journée"}
              onClick={() => toggleMany(BLOCS.map((b) => blocKey(date, b)))}
              className={dayHeaderClass}
            >
              <span className={cn("block text-[11px] font-[550] @xl:text-xs", d >= 5 && "text-st-text")}>{DAYS[d]}</span>
              <span className="st-num block text-[15px] font-semibold text-st-text @xl:text-[17px]">{Number(date.slice(8))}</span>
              <span className={cn("mt-0.5 hidden text-[11px] @xl:block", full ? "font-[550] text-st-gold-text" : "text-st-muted")}>
                {n === 0 ? "Fermé" : full ? "Journée" : `${n} bloc${n > 1 ? "s" : ""}`}
              </span>
              {full && <span className="mx-auto mt-0.5 block size-[5px] rounded-full bg-st-gold @xl:hidden" />}
            </button>
          );
        })}

        {BLOCS.map((b) => (
          <Fragment key={b}>
            <button
              type="button"
              data-row={b}
              title="Ouvrir ou fermer ce créneau toute la semaine"
              onClick={() => toggleMany(dates.map((d) => blocKey(d, b)))}
              className={hourLabelClass}
            >
              {String(b).padStart(2, "0")} h
              <small className="hidden text-[10.5px] font-normal text-st-muted @xl:block">{String(b + BLOC_H).padStart(2, "0")} h</small>
            </button>
            {dates.map((date, d) => {
              const k = blocKey(date, b);
              const res = reserved.get(k);
              const isOpen = open.has(k);
              const past = date < today;
              return (
                <button
                  key={k}
                  type="button"
                  data-k={k}
                  data-col={d}
                  data-row={b}
                  data-tour={tourCell && d === firstFutureCol && b === 9 ? "cell" : undefined}
                  aria-pressed={res ? undefined : isOpen}
                  aria-label={`${DAYS[d]} ${Number(date.slice(8))}, ${b} h à ${b + BLOC_H} h : ${res ? `réservé (${res})` : isOpen ? "ouvert" : "fermé"}`}
                  title={res ? `Réservé par ${res}` : undefined}
                  disabled={past && !res}
                  className={cellClass({ reserved: !!res, open: isOpen, past, dirty: isOpen !== saved.has(k) })}
                >
                  {res ? <span className="truncate">{res}</span> : isOpen && <Check size={15} strokeWidth={2.5} />}
                </button>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
