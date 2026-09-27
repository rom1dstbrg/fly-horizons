"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarClock, Check, Clock, Download, FolderOpen, Info, Mail, MessageSquare,
  PlaneLanding, Route as RouteIcon, Send, User, Banknote,
} from "lucide-react";
import { Badge, Button, Card, DateTile, PillTabs, SectionHeader } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";

// Parcours « Une réservation de A à Z » (maquette du 27/09). La démo reprend le
// tiroir d'un vol (ReservationDrawer + OverviewTab) avec les mêmes composants
// Studio et le même rendu de frise, sans rien appeler côté serveur. Si le
// tiroir change, relire ce fichier.

type TabKey = "apercu" | "route" | "messages" | "dossier";
const TABS: { key: TabKey; label: string; icon: typeof Info }[] = [
  { key: "apercu", label: "Aperçu", icon: Info },
  { key: "route", label: "Route", icon: RouteIcon },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "dossier", label: "Dossier", icon: FolderOpen },
];
const TAB_HELP: Record<Exclude<TabKey, "apercu">, string> = {
  route: "La carte du vol : vous tracez la route, l'envoyez au passager et voyez s'il l'a validée ou s'il demande une modification.",
  messages: "Le fil de conversation avec le passager. Tout ce qui se dit sur le vol reste attaché au vol.",
  dossier: "L'historique du vol : emails envoyés, changements de statut, documents.",
};

type Step = {
  label: string;
  title: string;
  text: string;
  actions: React.ReactNode;
  you: string[];
  mails: { subject: string; to: string }[];
};

const STEPS: Step[] = [
  {
    label: "Demande",
    title: "Confirmer sam. 12 oct. à 10:00",
    text: "Julie demande sam. 12 oct. Tracez d'abord la route : elle part avec la confirmation.",
    actions: (
      <>
        <Button size="sm"><RouteIcon />Tracer la route</Button>
        <Button size="sm" variant="secondary"><CalendarClock />Autre créneau</Button>
      </>
    ),
    you: [
      "Vous recevez l'email « Nouvelle demande » et une notification.",
      "Vol avec itinéraire : vous tracez la route, puis vous confirmez le créneau.",
      "Le créneau ne vous convient pas : « Autre créneau » propose une autre date.",
      "Vous avez 72 heures avant l'annulation automatique de la demande.",
    ],
    mails: [
      { subject: "Demande de vol reçue", to: "au passager, dès sa réservation" },
      { subject: "[Nouvelle demande] Julie D. · 12/10 à 10:00", to: "à vous" },
    ],
  },
  {
    label: "Créneau",
    title: "Confirmer sam. 12 oct. à 10:00 ?",
    text: "Julie reçoit un email avec la date, l'heure et votre route. Le vol passe en « Vol confirmé ». Quand elle valide la route, elle reçoit le lien pour vous payer par virement.",
    actions: <Button size="sm"><Send />Confirmer et envoyer</Button>,
    you: [
      "Vous confirmez : l'heure est fixée et la route part avec la confirmation.",
      "Si vous aviez proposé un autre créneau, c'est le passager qui l'accepte.",
    ],
    mails: [{ subject: "Votre itinéraire pour le 12 octobre", to: "au passager, avec la route à valider" }],
  },
  {
    label: "Route",
    title: "Route envoyée",
    text: "Julie valide la route ou demande une modification. Vous recevez sa réponse par email et par notification.",
    actions: <Badge tone="warning">Route envoyée, en attente</Badge>,
    you: [
      "Si le passager valide : rien à faire, le lien de paiement lui part.",
      "S'il demande une modification : ajustez le tracé dans l'onglet Route et renvoyez-le.",
    ],
    mails: [
      { subject: "Itinéraire validé", to: "à vous, quand le passager accepte" },
      { subject: "Modification demandée", to: "à vous, avec son commentaire" },
    ],
  },
  {
    label: "Paiement",
    title: "En attente du virement",
    text: "Julie a reçu votre IBAN et un QR code. Quand l'argent est sur votre compte, marquez-le reçu.",
    actions: (
      <>
        <Button size="sm"><Check />Marquer comme reçu</Button>
        <Button size="sm" variant="secondary"><Banknote />En espèces</Button>
      </>
    ),
    you: [
      "Vous vérifiez votre compte, puis « Marquer comme reçu » : le montant reçu est modifiable.",
      "Vol à durée fixe (sans route) : envoyez le lien avec « Renvoyer le lien ».",
      "Un oubli ? Une notification vous le rappelle, puis un email après le vol.",
    ],
    mails: [
      { subject: "Réglez votre vol partagé", to: "au passager, avec votre IBAN et un QR code" },
      { subject: "Paiement confirmé", to: "au passager, quand vous marquez reçu : son reçu se débloque" },
    ],
  },
  {
    label: "Effectué",
    title: "Vol confirmé · sam. 12 oct. à 10:00",
    text: "Préparez la masse et centrage avant le vol. « Vol effectué » est disponible 8 heures après l'heure du décollage.",
    actions: (
      <>
        <Button size="sm" variant="secondary"><PlaneLanding />Marquer le vol effectué</Button>
        <Button size="sm" variant="ghost"><Download />Reçu client</Button>
      </>
    ),
    you: [
      "48 heures avant le vol : notification de rappel (météo, masse et centrage).",
      "Après le vol : « Marquer le vol effectué », avec les minutes réellement volées si vous voulez.",
    ],
    mails: [{ subject: "Vol dans 48 h", to: "notification pour vous" }],
  },
];

/** Frise du tiroir (même rendu que Journey dans OverviewTab), étapes cliquables. */
function Journey({ now, onSelect }: { now: number; onSelect: (i: number) => void }) {
  return (
    <ol className="flex items-start" aria-label="Parcours du vol">
      {STEPS.map((s, i) => {
        const done = i < now;
        return (
          <li key={s.label} className="relative flex min-w-0 flex-1">
            {i > 0 && (
              <span className={cn("absolute right-1/2 top-[5px] h-0.5 w-full", i <= now ? "bg-st-ok" : "bg-st-line-strong")} />
            )}
            <button
              type="button"
              onClick={() => onSelect(i)}
              aria-current={i === now ? "step" : undefined}
              className="relative z-10 flex w-full cursor-pointer flex-col items-center gap-1.5 focus-visible:outline-none"
            >
              <span
                className={cn(
                  "h-3 w-3 rounded-full border-2",
                  done ? "border-st-ok bg-st-ok" : i === now ? "border-st-gold bg-st-gold shadow-[0_0_0_4px_var(--color-st-gold-soft)]" : "border-st-line-strong bg-white",
                )}
              />
              <span className={cn("truncate text-[11px]", i === now ? "font-semibold text-st-text" : done ? "text-st-text-2" : "text-st-muted")}>{s.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function DrawerDemo({ step, onStep }: { step: number; onStep: (i: number) => void }) {
  const [tab, setTab] = useState<TabKey>("apercu");
  const s = STEPS[step];
  return (
    <div className="relative overflow-hidden rounded-[20px] bg-st-surface-hover px-3 py-6 sm:px-8 sm:py-9">
      <Badge tone="gold" className="absolute right-3 top-3">Démo</Badge>
      <div className="mx-auto max-w-[480px] overflow-hidden rounded-[22px] bg-white shadow-st-panel">
        <div className="flex items-center gap-3 px-[18px] pb-3 pt-4">
          <DateTile date="2026-10-12" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15.5px] font-semibold text-st-text">Julie Dupont</p>
            <p className="truncate text-[12px] text-st-muted">Annonce · Tour de la côte belge · 2 pax</p>
          </div>
          <span className="max-[380px]:hidden">
            <Badge tone={step === 0 ? "warning" : "success"}>{step === 0 ? "Nouvelle demande" : "Vol confirmé"}</Badge>
          </span>
        </div>
        <PillTabs className="mx-[18px]" value={tab} onChange={setTab} items={TABS} />
        <div className="space-y-4 px-[18px] pb-5 pt-4">
          {tab === "apercu" ? (
            <>
              <Journey now={step} onSelect={onStep} />
              <div className="space-y-2.5 rounded-[16px] bg-st-surface p-3.5">
                <p className="text-[11.5px] font-semibold text-st-gold-text">Prochaine étape</p>
                <p className="text-[15px] font-semibold leading-snug text-st-text">{s.title}</p>
                <p className="text-[12.5px] leading-snug text-st-text-2">{s.text}</p>
                <div className="flex flex-wrap gap-2">{s.actions}</div>
              </div>
            </>
          ) : (
            <p className="rounded-[16px] bg-st-surface p-3.5 text-[13px] leading-relaxed text-st-text-2">{TAB_HELP[tab]}</p>
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-[12px] text-st-text-2">Touchez les étapes de la frise et les onglets : rien n&apos;est envoyé.</p>
    </div>
  );
}

function Mail1({ subject, to }: { subject: string; to: string }) {
  return (
    <li className="flex items-start gap-2.5 border-t border-st-line-soft py-2.5 first:border-t-0 first:pt-0 last:pb-0">
      <Image src="/icone.svg" alt="" width={26} height={26} className="h-[26px] w-[26px] shrink-0" unoptimized />
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold leading-snug text-st-text">{subject}</span>
        <span className="block text-[12px] text-st-muted">{to}</span>
      </span>
    </li>
  );
}

const ETAPES = [
  { t: "Un passager réserve", d: "Il choisit un créneau dans vos disponibilités. Il reçoit « Demande de vol reçue », vous recevez « Nouvelle demande » et une notification." },
  { t: "Vous confirmez le créneau, sous 72 heures", d: "Vol avec itinéraire : tracez d'abord la route, elle part avec la confirmation. Le créneau ne convient pas : « Autre créneau »." },
  { t: "Le passager valide la route", d: "Ou il demande une modification : vous ajustez dans l'onglet Route et renvoyez." },
  { t: "Il paie par virement", d: "La validation de la route lui envoie votre IBAN et un QR code. Vous marquez « reçu » quand l'argent est arrivé." },
  { t: "Vous volez, puis vous clôturez", d: "« Vol effectué » est disponible 8 heures après l'heure du décollage." },
];

export function ReservationParcours() {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <SectionHeader title="La vue d'ensemble" />
        <p className="max-w-2xl text-[14px] leading-relaxed text-st-text-2">
          Chaque réservation s&apos;ouvre dans <Link href="/pilote/vols" className="font-semibold text-st-ink hover:underline">Mes vols</Link>, dans un tiroir à quatre onglets :
          Aperçu, Route, Messages et Dossier. En haut de l&apos;aperçu, une frise suit le vol en cinq étapes.
        </p>
        <DrawerDemo step={step} onStep={setStep} />
        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <p className="mb-2.5 flex items-center gap-2 text-[12.5px] font-semibold text-st-text"><User size={15} />Ce que vous faites · {s.label}</p>
            <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-snug text-st-text-2">
              {s.you.map((y) => <li key={y}>{y}</li>)}
            </ul>
          </Card>
          <Card>
            <p className="mb-2.5 flex items-center gap-2 text-[12.5px] font-semibold text-st-text"><Mail size={15} />Emails envoyés automatiquement</p>
            <ul>{s.mails.map((m) => <Mail1 key={m.subject} {...m} />)}</ul>
          </Card>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Étape par étape" />
        <ol className="max-w-2xl">
          {ETAPES.map((e, i) => (
            <li key={e.t} className="grid grid-cols-[28px_1fr] gap-3 border-t border-st-line py-3 first:border-t-0">
              <span className="st-num grid h-[26px] w-[26px] place-items-center rounded-full bg-st-ink text-[12px] font-semibold text-white">{i + 1}</span>
              <span>
                <span className="block text-[14px] font-semibold text-st-text">{e.t}</span>
                <span className="block text-[13px] leading-relaxed text-st-text-2">{e.d}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="flex max-w-2xl gap-2.5 rounded-[14px] bg-st-warn-soft px-4 py-3 text-[13px] leading-snug text-st-warn">
          <Clock size={16} className="mt-px shrink-0" />
          <p><b className="font-semibold">Une demande bloque le créneau 72 heures.</b> Sans confirmation ni autre créneau proposé, elle est annulée automatiquement.</p>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Annuler une demande" />
        <p className="max-w-2xl text-[14px] leading-relaxed text-st-text-2">
          Avant paiement, « Annuler la demande », en rouge en bas du bloc Règlement, remet les places en vente.
          Aucun email n&apos;est envoyé : prévenez le passager dans l&apos;onglet Messages. Un vol confirmé, lui,
          ne s&apos;annule que par Fly Horizons.
        </p>
      </section>
    </div>
  );
}
