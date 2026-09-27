"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen, ChevronLeft, ChevronRight, CircleHelp, Info, Monitor, MoreHorizontal, Repeat, Smartphone, TriangleAlert,
} from "lucide-react";
import { Badge, Button, Segmented, SectionHeader, buttonClasses } from "@/components/pilote/studio";
import { PILOTE_NAV } from "@/components/pilote/PiloteSidebar";
import { cn } from "@/lib/utils";
import { addDaysIso, fmtIso } from "@/lib/pilote-creneaux";
import { WeekGrid, blocKey } from "@/components/pilote/dispo/WeekGrid";

// Fiche « Disponibilités » du guide pilote. La démo reproduit la page
// /pilote/disponibilites en vue téléphone ou ordinateur (onglets ; téléphone
// d'office sur un petit écran). La grille est le vrai composant (WeekGrid), avec
// les mêmes gestes ; le reste de la page est redessiné ici : si l'en-tête ou la
// carte de DispoGrid change, relire ce fichier. Rien n'est envoyé.

type View = "phone" | "pc";

const DEMO_MONDAY = "2026-10-12";
const DEMO_TODAY = "2026-10-10";
const DEMO_DATES = Array.from({ length: 7 }, (_, i) => addDaysIso(DEMO_MONDAY, i));
const START = [
  blocKey(DEMO_DATES[2], 13), blocKey(DEMO_DATES[2], 15),
  ...[5, 6].flatMap((d) => [7, 9, 11].map((b) => blocKey(DEMO_DATES[d], b))),
];
const RESERVED = new Map([[blocKey(DEMO_DATES[5], 9), "Julie"]]);

const PHONE_QUERY = "(max-width: 639px)";
const subscribePhone = (cb: () => void) => {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

// Affiche un cadre de largeur fixe, réduit s'il ne tient pas dans la place disponible.
function Scaled({ width, children }: { width: number; children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ scale: 1, h: 0 });
  useEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    const measure = () => setSize({ scale: Math.min(1, o.clientWidth / width), h: i.offsetHeight });
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={outer} className="flex justify-center">
      <div style={{ width: width * size.scale, height: size.h ? size.h * size.scale : undefined }}>
        <div ref={inner} style={{ width, transform: `scale(${size.scale})`, transformOrigin: "top left" }}>{children}</div>
      </div>
    </div>
  );
}

// Contenu de la page, dessiné pour une vue donnée (pas de classes d'écran :
// le cadre n'a pas la taille de l'écran).
function PageMock({ view, open, saved, setOpen, setSaved }: {
  view: View;
  open: Set<string>;
  saved: Set<string>;
  setOpen: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSaved: (s: Set<string>) => void;
}) {
  const phone = view === "phone";
  const dirty = [...open].filter((k) => !saved.has(k)).length + [...saved].filter((k) => !open.has(k)).length;
  const weekCount = open.size;
  const fake = "pointer-events-none";

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className={cn("font-semibold leading-tight tracking-[-0.03em] text-st-text", phone ? "text-[24px]" : "text-[28px]")}>Disponibilités</h1>
        <div className="flex gap-2">
          <span className={buttonClasses({ variant: "secondary", size: "icon", className: fake })}><CircleHelp /></span>
          <span className={buttonClasses({ variant: "secondary", className: fake })}><Repeat />{phone ? "Récurrence" : "Ajouter une récurrence"}</span>
        </div>
      </div>

      <section className={cn("mt-5 rounded-[20px] border border-st-line bg-white shadow-st-sm", phone ? "px-2.5 py-3.5" : "px-5 py-5")}>
        <div className="flex flex-wrap items-center gap-2">
          <div className={cn("flex items-center justify-between gap-1.5", phone && "w-full")}>
            <span className={buttonClasses({ variant: "secondary", size: "icon", className: fake })}><ChevronLeft /></span>
            <span className={cn("text-center font-semibold", phone ? "min-w-0 flex-1 text-[13.5px]" : "min-w-[230px] text-[14.5px]")}>
              Semaine du {fmtIso(DEMO_DATES[0])} au {fmtIso(DEMO_DATES[6])}
            </span>
            <span className={buttonClasses({ variant: "secondary", size: "icon", className: fake })}><ChevronRight /></span>
          </div>
          <span className={cn("text-[12.5px] text-st-muted", phone ? "w-full text-center" : "ml-auto")}>
            <b className="st-num font-semibold text-st-text">{weekCount}</b> bloc{weekCount > 1 ? "s" : ""} ouvert{weekCount > 1 ? "s" : ""} cette semaine
          </span>
        </div>
        <div className={phone ? "mt-3" : "mt-4"}>
          <WeekGrid dates={DEMO_DATES} today={DEMO_TODAY} open={open} saved={saved} reserved={RESERVED} setOpen={setOpen} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-[18px] gap-y-2 text-xs text-st-text-2">
          {[["border-st-gold bg-st-gold-soft", "Ouvert"], ["border-st-line-strong bg-st-surface", "Fermé"], ["border-st-ink bg-st-ink", "Réservé"]].map(([c, l]) => (
            <span key={l} className="inline-flex items-center gap-[7px]"><i className={cn("size-3.5 rounded-[4px] border", c)} />{l}</span>
          ))}
          <span className="inline-flex items-center gap-[7px]"><i className="size-[7px] rounded-full bg-st-ink" />Pas encore enregistré</span>
        </div>
      </section>

      <div className="mt-5 flex gap-2.5 rounded-[14px] bg-st-info-soft px-4 py-3 text-[13px] leading-snug text-st-info">
        <Info size={16} className="mt-px shrink-0" />
        <p>Un seul calendrier pour toutes vos annonces. Le passager réserve un bloc de 2 h entier, vous calez ensuite l&apos;heure exacte ensemble ; un vol plus long demande deux blocs qui se suivent.</p>
      </div>

      <div
        className={cn(
          "absolute z-10 flex items-center gap-1.5 rounded-2xl bg-st-ink py-2 pl-3.5 pr-2 text-white shadow-st-panel transition-[translate,opacity] duration-200",
          phone ? "inset-x-4 bottom-[86px]" : "bottom-5 left-[calc(50%+38px)] -translate-x-1/2 gap-3.5 pl-[18px]",
          dirty ? "opacity-100" : "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        <span className="min-w-0 flex-1 whitespace-nowrap text-[12.5px] font-[550]">
          {dirty} modification{dirty > 1 ? "s" : ""}{!phone && <span className="font-normal text-[#b9c4d2]"> non enregistrée{dirty > 1 ? "s" : ""}</span>}
        </span>
        <Button variant="ghost" className="text-[#d5dde7] hover:bg-white/10 hover:text-white" onClick={() => setOpen(new Set(saved))}>Annuler</Button>
        <Button className="bg-st-gold font-semibold text-st-ink shadow-none hover:bg-[#ffc81f]" onClick={() => setSaved(new Set(open))}>Enregistrer</Button>
      </div>
    </>
  );
}

function PcFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-st-line-strong bg-st-bg shadow-st-panel">
      <div className="flex h-9 items-center gap-1.5 border-b border-st-line bg-white px-3.5">
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => <i key={c} className="size-2.5 rounded-full" style={{ background: c }} />)}
        <span className="mx-auto rounded-md bg-st-surface px-16 py-0.5 text-[11.5px] text-st-muted">fly-horizons.com/pilote/disponibilites</span>
      </div>
      <div className="relative flex">
        <div className="flex w-[76px] shrink-0 flex-col items-center gap-1 border-r border-st-line bg-white py-4">
          <Image src="/icone.svg" alt="" width={28} height={28} className="mb-3.5 size-7" unoptimized />
          {PILOTE_NAV.map(({ id, icon: Icon }) => (
            <span key={id} className={cn("grid h-10 w-[52px] place-items-center rounded-[11px]", id === "dispos" ? "bg-st-ink-soft text-st-ink" : "text-st-text-2")}>
              <Icon size={18} strokeWidth={id === "dispos" ? 2 : 1.8} />
            </span>
          ))}
          <span className="mt-6 grid h-10 w-[52px] place-items-center text-st-text-2"><BookOpen size={18} strokeWidth={1.8} /></span>
        </div>
        <div className="min-w-0 flex-1 px-7 pb-24 pt-6">{children}</div>
      </div>
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  const tabs = PILOTE_NAV.filter((n) => ["dashboard", "vols", "mb", "annonces"].includes(n.id));
  return (
    <div className="relative overflow-hidden rounded-[46px] border-[10px] border-[#0f1117] bg-st-bg shadow-st-panel">
      <div className="mx-auto mt-2 h-[26px] w-[110px] rounded-full bg-[#0f1117]" />
      <div className="px-4 pb-32 pt-5">{children}</div>
      <div className="absolute inset-x-3 bottom-4 flex items-center justify-between rounded-full border border-st-line bg-white/90 p-1.5 shadow-st-lg backdrop-blur-xl">
        {tabs.map(({ id, icon: Icon }) => (
          <span key={id} className="grid h-[46px] place-items-center px-3.5 text-st-muted"><Icon size={20} strokeWidth={1.8} /></span>
        ))}
        <span className="flex h-[46px] items-center gap-2 rounded-full bg-st-ink pl-4 pr-5 text-[13px] font-semibold text-white">
          <MoreHorizontal size={20} />Plus
        </span>
      </div>
    </div>
  );
}

function PageDemo() {
  const isPhone = useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE_QUERY).matches, () => false);
  const [choice, setChoice] = useState<View | null>(null);
  const view = choice ?? (isPhone ? "phone" : "pc");
  const [open, setOpen] = useState(() => new Set(START));
  const [saved, setSaved] = useState(() => new Set(START));
  const mock = <PageMock view={view} open={open} saved={saved} setOpen={setOpen} setSaved={setSaved} />;

  return (
    <div className="rounded-[20px] bg-st-surface-hover px-3 pb-5 pt-4 sm:px-8 sm:pb-7">
      <div className="flex items-center justify-between gap-3">
        <Segmented<View>
          value={view}
          onChange={setChoice}
          items={[
            { key: "phone", label: <span className="inline-flex items-center gap-1.5"><Smartphone size={14} />Téléphone</span> },
            { key: "pc", label: <span className="inline-flex items-center gap-1.5"><Monitor size={14} />Ordinateur</span> },
          ]}
        />
        <Badge tone="gold">Démo</Badge>
      </div>
      <div className="mt-5">
        {view === "pc"
          ? <Scaled width={1040}><PcFrame>{mock}</PcFrame></Scaled>
          : <Scaled width={390}><PhoneFrame>{mock}</PhoneFrame></Scaled>}
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
        <p className="text-[14px] leading-relaxed text-st-text-2">
          Un seul calendrier pour toutes vos annonces. Chaque jour est découpé en 7 blocs de 2 heures, de 7 h à 21 h, et chaque bloc
          est soit <b className="font-semibold text-st-text">ouvert</b> (jaune), soit <b className="font-semibold text-st-text">fermé</b> (gris).
          Un passager ne peut réserver que dans un bloc ouvert. En bleu marine, un bloc déjà réservé ; hachurés, les jours passés.
        </p>
        <PageDemo />
      </section>

      <section className="space-y-3">
        <SectionHeader title="Ouvrir des créneaux" />
        <ol>
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
        <div className="space-y-3 text-[14px] leading-relaxed text-st-text-2">
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
        <ul className="list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-st-text-2">
          <li>Sur votre annonce, il choisit une date, puis un bloc : « 9 h – 11 h ». Il ne peut pas réserver moins de 48 heures à l&apos;avance.</li>
          <li>Un vol de plus de 2 heures demande des blocs ouverts qui se suivent : un vol de 3 heures à 9 h a besoin de 9 h et de 11 h.</li>
          <li>Dès qu&apos;une demande arrive, les blocs qu&apos;elle occupe sont pris : deux passagers ne peuvent pas réserver le même créneau chez vous.</li>
          <li>
            L&apos;heure du vol est le début du bloc. Vous calez l&apos;heure exacte ensemble dans l&apos;onglet Messages du vol ; pour changer de jour ou de bloc,
            « Autre créneau » dans le tiroir (voir <Link href="/pilote/guide/reservation" className="font-semibold text-st-ink hover:underline">Une réservation de A à Z</Link>).
          </li>
        </ul>
        <div className="flex gap-2.5 rounded-[14px] bg-st-warn-soft px-4 py-3 text-[13px] leading-snug text-st-warn">
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
