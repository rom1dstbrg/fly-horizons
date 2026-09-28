"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import { BLOCS, BLOC_H, addDaysIso, blocsOccupes, fmtIso } from "@/lib/pilote-creneaux";

// Vue admin des disponibilités des pilotes (lecture seule) : une ligne par
// pilote actif, une colonne par jour ; dans chaque case, les 7 blocs de 2 h
// empilés de 7 h (en haut) à 21 h (en bas). Mêmes données que la grille du
// pilote (/pilote/disponibilites) : ce qu'on voit ici est ce que le passager
// peut réserver.

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const key = (date: string, bloc: number) => `${date}|${bloc}`;

/** Blocs ouverts qui se suivent regroupés en plages : [9, 11, 15] → "9–13 h · 15–17 h". */
function plages(blocs: number[]) {
  const out: [number, number][] = [];
  for (const b of blocs) {
    const last = out[out.length - 1];
    if (last && last[1] === b) last[1] = b + BLOC_H; else out.push([b, b + BLOC_H]);
  }
  return out.map(([a, z]) => `${a}–${z} h`).join(" · ");
}

export interface DispoPilote { id: string; nom: string; photo_url: string | null }
export interface DispoResa { pilote_id: string; date: string; heure_vol: string | null; duree: number | null; prenom: string | null }

export function PilotesDispo({ monday, today, weeks, pilotes, ouverts, reservations }: {
  /** Lundi de la semaine en cours (heure de Bruxelles). */
  monday: string;
  today: string;
  /** Nombre de semaines chargées à partir de `monday`. */
  weeks: number;
  pilotes: DispoPilote[];
  /** Blocs ouverts par pilote, en clés "YYYY-MM-DD|9". */
  ouverts: Record<string, string[]>;
  reservations: DispoResa[];
}) {
  const [week, setWeek] = useState(0);
  const weekStart = addDaysIso(monday, week * 7);
  const dates = Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i));

  const openSets = useMemo(
    () => Object.fromEntries(pilotes.map((p) => [p.id, new Set(ouverts[p.id] ?? [])])),
    [pilotes, ouverts],
  );

  // Blocs pris par un vol, par pilote → prénom du passager.
  const reserved = useMemo(() => {
    const m: Record<string, Map<string, string>> = {};
    for (const r of reservations) {
      const map = (m[r.pilote_id] ??= new Map());
      for (const b of blocsOccupes([r]).keys()) {
        const k = key(r.date, b);
        map.set(k, map.has(k) ? `${map.get(k)} +1` : r.prenom || "Réservé");
      }
    }
    return m;
  }, [reservations]);

  const countWeek = (id: string) => dates.reduce((n, d) => n + BLOCS.filter((b) => openSets[id]?.has(key(d, b))).length, 0);
  const openDay = (id: string, date: string) => BLOCS.some((b) => openSets[id]?.has(key(date, b)));
  const pilotesOuverts = pilotes.filter((p) => countWeek(p.id) > 0).length;

  return (
    <section className="rounded-[20px] border border-st-line bg-white px-2.5 py-3.5 shadow-st-sm sm:px-5 sm:py-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex w-full items-center justify-between gap-1.5 sm:w-auto">
          <Button variant="secondary" size="icon" aria-label="Semaine précédente" disabled={week === 0} onClick={() => setWeek(week - 1)}><ChevronLeft /></Button>
          <span className="min-w-0 flex-1 text-center text-[13.5px] font-semibold sm:min-w-[230px] sm:text-[14.5px]">
            Semaine du {fmtIso(dates[0])} au {fmtIso(dates[6])}
          </span>
          <Button variant="secondary" size="icon" aria-label="Semaine suivante" disabled={week >= weeks - 1} onClick={() => setWeek(week + 1)}><ChevronRight /></Button>
        </div>
        {week !== 0 && <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => setWeek(0)}>Revenir à aujourd&apos;hui</Button>}
        <span className="w-full text-center text-[12.5px] text-st-muted sm:ml-auto sm:w-auto">
          <b className="st-num font-semibold text-st-text">{pilotesOuverts}</b> pilote{pilotesOuverts > 1 ? "s" : ""} sur {pilotes.length} ouvert{pilotesOuverts > 1 ? "s" : ""} cette semaine
        </span>
      </div>

      {pilotes.length === 0 ? (
        <p className="mt-6 text-center text-[13px] text-st-muted">Aucun pilote actif.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <div className="grid min-w-[680px] grid-cols-[130px_repeat(7,minmax(0,1fr))] sm:min-w-[760px] sm:grid-cols-[210px_repeat(7,minmax(0,1fr))] gap-1.5">
            <span className="sticky left-0 z-10 bg-white" />
            {dates.map((date, d) => {
              const n = pilotes.filter((p) => openDay(p.id, date)).length;
              return (
                <div key={date} className={cn("pb-1 text-center leading-tight", date < today && "opacity-40")}>
                  <span className={cn("block text-xs font-[550] text-st-text-2", d >= 5 && "text-st-text")}>{DAYS[d]}</span>
                  <span className="st-num block text-[17px] font-semibold text-st-text">{Number(date.slice(8))}</span>
                  <span className={cn("block text-[11px]", n ? "font-[550] text-st-gold-text" : "text-st-muted")}>
                    {n ? `${n} pilote${n > 1 ? "s" : ""}` : "Personne"}
                  </span>
                </div>
              );
            })}

            {pilotes.map((p) => {
              const total = countWeek(p.id);
              const res = reserved[p.id];
              return (
                <div key={p.id} className="contents">
                  <div className="sticky left-0 z-10 flex min-w-0 items-center gap-2.5 bg-white pr-2">
                    {p.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo_url} alt="" className="size-8 shrink-0 rounded-full border border-st-line object-cover" />
                    ) : (
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-st-ink text-[11px] font-semibold text-white">
                        {p.nom.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                    )}
                    <span className={cn("min-w-0", !total && "opacity-50")}>
                      <span className="block truncate text-[13px] font-semibold text-st-text">{p.nom}</span>
                      <span className="block text-[11.5px] text-st-muted">
                        {total ? `${total} bloc${total > 1 ? "s" : ""} ouvert${total > 1 ? "s" : ""}` : "Rien d'ouvert"}
                      </span>
                    </span>
                  </div>
                  {dates.map((date, d) => {
                    const past = date < today;
                    const dayOpen = BLOCS.filter((b) => openSets[p.id]?.has(key(date, b)) && !res?.has(key(date, b)));
                    return (
                      <div key={date} className={cn("flex flex-col gap-[3px] rounded-[10px] border border-st-line-soft p-1", past && "opacity-40")}>
                        {BLOCS.map((b) => {
                          const k = key(date, b);
                          const who = res?.get(k);
                          const isOpen = openSets[p.id]?.has(k);
                          return (
                            <span
                              key={b}
                              title={`${p.nom} · ${DAYS[d]} ${Number(date.slice(8))}, ${b} h – ${b + BLOC_H} h : ${who ? `réservé (${who})` : isOpen ? "ouvert" : "fermé"}`}
                              className={cn(
                                "h-[7px] rounded-[3px]",
                                who ? "bg-st-ink" : isOpen ? "bg-st-gold" : "bg-st-surface-hover",
                              )}
                            />
                          );
                        })}
                        <span className={cn("st-num mt-0.5 truncate text-center text-[10.5px] leading-tight", dayOpen.length ? "font-[550] text-st-gold-text" : "text-transparent")}>
                          {dayOpen.length ? plages(dayOpen) : "·"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-[18px] gap-y-2 text-xs text-st-text-2">
        <Legend className="bg-st-gold">Ouvert</Legend>
        <Legend className="bg-st-surface-hover">Fermé</Legend>
        <Legend className="bg-st-ink">Réservé</Legend>
        <span className="w-full text-st-muted sm:ml-auto sm:w-auto">Dans chaque case, 7 blocs de 2 h : 7 h en haut, 21 h en bas. Survolez un bloc pour le détail.</span>
      </div>
    </section>
  );
}

function Legend({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-[7px]">
      <i className={cn("h-[7px] w-4 rounded-[3px]", className)} />
      {children}
    </span>
  );
}
