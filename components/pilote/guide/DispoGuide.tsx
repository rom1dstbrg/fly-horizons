"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { Check, Repeat, TriangleAlert } from "lucide-react";
import { Badge, Button, SectionHeader } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import { BLOCS, BLOC_H, addDaysIso } from "@/lib/pilote-creneaux";
import { GRID_COLS, cellClass, dayHeaderClass, hourLabelClass } from "@/components/pilote/dispo/styles";

// Fiche « Disponibilités » du guide pilote. La démo reprend la grille de
// /pilote/disponibilites avec les mêmes styles (components/pilote/dispo/styles.ts)
// et les mêmes gestes, sans rien envoyer.

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DEMO_MONDAY = "2026-10-12";
const DEMO_DATES = Array.from({ length: 7 }, (_, i) => addDaysIso(DEMO_MONDAY, i));
const key = (d: number, b: number) => `${d}|${b}`;
const START = new Set([key(2, 13), key(2, 15), key(5, 7), key(5, 9), key(5, 11), key(6, 7), key(6, 9), key(6, 11)]);
const RESERVED = new Map([[key(5, 9), "Julie"]]);

function GridDemo() {
  const [open, setOpen] = useState(() => new Set(START));
  const [saved, setSaved] = useState(() => new Set(START));
  const dirty = [...open].filter((k) => !saved.has(k)).length + [...saved].filter((k) => !open.has(k)).length;

  const toggleMany = (keys: string[]) => {
    const free = keys.filter((k) => !RESERVED.has(k));
    const allOpen = free.every((k) => open.has(k));
    const next = new Set(open);
    free.forEach((k) => (allOpen ? next.delete(k) : next.add(k)));
    setOpen(next);
  };

  return (
    <div className="relative overflow-hidden rounded-[20px] bg-st-surface-hover px-2 py-6 sm:px-8 sm:py-9">
      <Badge tone="gold" className="absolute right-3 top-3">Démo</Badge>
      <div className="mx-auto max-w-[560px] rounded-[20px] border border-st-line bg-white px-2.5 py-3.5 shadow-st-panel sm:px-5 sm:py-5">
        <p className="text-center text-[13.5px] font-semibold sm:text-[14.5px]">Semaine du 12 oct. au 18 oct.</p>
        <div className={cn(GRID_COLS, "mt-3")}>
          <span />
          {DEMO_DATES.map((date, d) => {
            const n = BLOCS.filter((b) => open.has(key(d, b))).length;
            const full = n === BLOCS.length;
            return (
              <button key={date} type="button" className={dayHeaderClass} onClick={() => toggleMany(BLOCS.map((b) => key(d, b)))}
                title={full ? "Fermer toute la journée" : "Ouvrir toute la journée"}>
                <span className={cn("block text-[11px] font-[550] sm:text-xs", d >= 5 && "text-st-text")}>{DAYS[d]}</span>
                <span className="st-num block text-[15px] font-semibold text-st-text sm:text-[17px]">{Number(date.slice(8))}</span>
                <span className={cn("mt-0.5 hidden text-[11px] sm:block", full ? "font-[550] text-st-gold-text" : "text-st-muted")}>
                  {n === 0 ? "Fermé" : full ? "Journée" : `${n} bloc${n > 1 ? "s" : ""}`}
                </span>
              </button>
            );
          })}
          {BLOCS.map((b) => (
            <Fragment key={b}>
              <button type="button" className={hourLabelClass} onClick={() => toggleMany(DAYS.map((_, d) => key(d, b)))}
                title="Ouvrir ou fermer ce créneau toute la semaine">
                {String(b).padStart(2, "0")} h
                <small className="hidden text-[10.5px] font-normal text-st-muted sm:block">{String(b + BLOC_H).padStart(2, "0")} h</small>
              </button>
              {DAYS.map((label, d) => {
                const k = key(d, b);
                const res = RESERVED.get(k);
                const isOpen = open.has(k);
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={res ? undefined : isOpen}
                    aria-label={`${label}, ${b} h à ${b + BLOC_H} h : ${res ? "réservé" : isOpen ? "ouvert" : "fermé"}`}
                    onClick={() => { if (!res) toggleMany([k]); }}
                    className={cellClass({ reserved: !!res, open: isOpen, past: false, dirty: isOpen !== saved.has(k) })}
                  >
                    {res ? <span className="truncate">{res}</span> : isOpen && <Check size={15} strokeWidth={2.5} />}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
        <div className="mt-3.5 flex min-h-[38px] items-center justify-between gap-2 rounded-[12px] bg-st-surface py-1 pl-3 pr-1 text-[12.5px] text-st-text-2">
          {dirty ? (
            <>
              <span><b className="st-num font-semibold text-st-text">{dirty}</b> modification{dirty > 1 ? "s" : ""} pas encore enregistrée{dirty > 1 ? "s" : ""}</span>
              <Button size="sm" onClick={() => setSaved(new Set(open))}>Enregistrer</Button>
            </>
          ) : (
            <span>Tout est enregistré.</span>
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-[12px] text-st-text-2">Touchez les blocs, les jours et les heures : rien n&apos;est envoyé.</p>
    </div>
  );
}

const GESTES = [
  { t: "Un bloc", d: "Touchez-le pour l'ouvrir, touchez encore pour le fermer. À la souris, glissez sur plusieurs blocs d'un coup." },
  { t: "Toute une journée", d: "Touchez le jour en haut de la colonne : les 7 blocs s'ouvrent. Touchez encore : la journée se ferme." },
  { t: "Un créneau toute la semaine", d: "Touchez l'heure à gauche : ce bloc s'ouvre du lundi au dimanche." },
  { t: "Enregistrez", d: "Rien ne part avant « Enregistrer », en bas de l'écran. Un point sur un bloc veut dire qu'il n'est pas encore enregistré ; si vous quittez la page avant, on vous prévient." },
];

export function DispoGuide() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <SectionHeader title="La vue d'ensemble" />
        <p className="max-w-2xl text-[14px] leading-relaxed text-st-text-2">
          Un seul calendrier pour toutes vos annonces. Chaque jour est découpé en 7 blocs de 2 heures, de 7 h à 21 h, et chaque bloc
          est soit <b className="font-semibold text-st-text">ouvert</b> (jaune), soit <b className="font-semibold text-st-text">fermé</b> (gris).
          Un passager ne peut réserver que dans un bloc ouvert. En bleu marine, un bloc déjà réservé ; hachurés, les jours passés.
        </p>
        <GridDemo />
      </section>

      <section className="space-y-3">
        <SectionHeader title="Ouvrir des créneaux" />
        <ol className="max-w-2xl">
          {GESTES.map((e, i) => (
            <li key={e.t} className="grid grid-cols-[28px_1fr] gap-3 border-t border-st-line py-3 first:border-t-0">
              <span className="st-num grid h-[26px] w-[26px] place-items-center rounded-full bg-st-ink text-[12px] font-semibold text-white">{i + 1}</span>
              <span>
                <span className="block text-[14px] font-semibold text-st-text">{e.t}</span>
                <span className="block text-[13px] leading-relaxed text-st-text-2">{e.d}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Les semaines suivantes : la récurrence" />
        <div className="max-w-2xl space-y-3 text-[14px] leading-relaxed text-st-text-2">
          <p>
            <span className="mr-1 inline-flex items-center gap-1 rounded-md border border-st-line bg-white px-1.5 py-0.5 align-[-3px] text-[12.5px] font-medium text-st-text">
              <Repeat size={13} />Ajouter une récurrence
            </span>
            ouvre les mêmes blocs sur plusieurs semaines d&apos;un coup, à partir de la semaine affichée. Par exemple : chaque mardi de 13 h à 17 h
            pendant 8 semaines. Choisissez les jours, les heures, puis la durée (4, 8 ou 12 semaines, ou jusqu&apos;à une date).
          </p>
          <p>
            Le même outil <b className="font-semibold text-st-text">ferme</b> aussi : pour des congés, choisissez « Fermer », tous les jours,
            « Toute la journée ». Les blocs déjà réservés ne bougent pas.
          </p>
          <p>
            Ce n&apos;est pas une règle enregistrée : la récurrence coche la grille, et vous pouvez encore retoucher chaque bloc avant
            d&apos;enregistrer. Au bout de la période, plus rien n&apos;est ouvert : pensez à prolonger.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Ce que voit le passager" />
        <ul className="max-w-2xl list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-st-text-2">
          <li>Sur votre annonce, il choisit une date, puis un bloc : « 9 h – 11 h ». Il ne peut pas réserver moins de 48 heures à l&apos;avance.</li>
          <li>Un vol de plus de 2 heures demande des blocs ouverts qui se suivent : un vol de 3 heures à 9 h a besoin de 9 h et de 11 h.</li>
          <li>Dès qu&apos;une demande arrive, les blocs qu&apos;elle occupe sont pris : deux passagers ne peuvent pas réserver le même créneau chez vous.</li>
          <li>
            L&apos;heure du vol est le début du bloc. Vous calez l&apos;heure exacte ensemble dans l&apos;onglet Messages du vol ; pour changer de jour ou de bloc,
            « Autre créneau » dans le tiroir (voir <Link href="/pilote/guide/reservation" className="font-semibold text-st-ink hover:underline">Une réservation de A à Z</Link>).
          </li>
        </ul>
        <div className="flex max-w-2xl gap-2.5 rounded-[14px] bg-st-warn-soft px-4 py-3 text-[13px] leading-snug text-st-warn">
          <TriangleAlert size={16} className="mt-px shrink-0" />
          <p>
            <b className="font-semibold">Rien d&apos;ouvert, aucune réservation possible.</b> Et un bloc ouvert est un créneau où vous vous engagez
            à pouvoir voler : tenez la grille à jour.
          </p>
        </div>
      </section>
    </div>
  );
}
