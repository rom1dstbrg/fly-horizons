"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, Maximize2, RotateCcw } from "lucide-react";
import { setRetourStatut } from "@/lib/actions/pilote-retours";
import { appareil, fmtDateBrussels, RETOUR_TYPES, routeProbable, type PiloteRetour } from "@/lib/pilote-retours";
import { Badge, Button, Card, PageHeader, SheetRow, SheetRows, buttonClasses } from "@/components/pilote/studio";
import { PiloteMini, StatutBadge } from "./RetoursClient";

// Page complète d'un retour pilote (maquette validée le 27/09) : à gauche le
// message et les captures en grand, à droite les infos du tiroir, les erreurs
// du navigateur et les actions.

export function RetourDetail({ retour: r, captures }: { retour: PiloteRetour; captures: string[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = RETOUR_TYPES[r.type];

  function toggle() {
    startTransition(async () => {
      await setRetourStatut(r.id, r.statut !== "traite");
      router.refresh();
    });
  }

  return (
    <div className="pilote-studio space-y-5">
      <PageHeader
        back={{ href: "/admin/retours", label: "Retours pilotes" }}
        title={<span className="flex flex-wrap items-center gap-2.5">{t.label} · {r.pilotes?.nom ?? "?"} <StatutBadge r={r} /></span>}
        description={fmtDateBrussels(r.created_at)}
        actions={
          <a href={`/api/admin/retours/export?id=${r.id}`} className={buttonClasses({ variant: "secondary" })}>
            <Download /> Exporter pour Claude
          </a>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card>
            <h2 className="mb-2 text-[13.5px] font-semibold text-st-text">Message</h2>
            <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-st-text">{r.message}</p>
          </Card>
          <Card>
            <h2 className="mb-3 text-[13.5px] font-semibold text-st-text">Captures{captures.length > 0 && ` (${captures.length})`}</h2>
            {captures.length === 0 ? (
              <p className="text-[13px] text-st-muted">Pas de capture jointe.</p>
            ) : (
              <div className="space-y-3">
                {captures.map((src, i) => (
                  <figure key={src} className="overflow-hidden rounded-[14px] border border-st-line">
                    <a href={src} target="_blank" rel="noopener" title="Ouvrir en plein écran" className="block bg-st-surface">
                      {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire */}
                      <img src={src} alt={`Capture ${i + 1}`} className="mx-auto max-h-[720px] w-auto max-w-full" />
                    </a>
                    <figcaption className="flex items-center justify-between border-t border-st-line-soft px-3 py-2 text-[12px] text-st-text-2">
                      <span>Capture {i + 1}</span>
                      <a href={src} target="_blank" rel="noopener" className={buttonClasses({ variant: "secondary", size: "sm" })}><Maximize2 /> Plein écran</a>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-3">
              <PiloteMini r={r} size={36} />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold">{r.pilotes?.nom ?? "?"}</p>
                <p className="truncate text-[12px] text-st-muted">{r.pilotes?.email}</p>
              </div>
            </div>
            <SheetRows>
              <SheetRow label="Type"><Badge tone={t.tone}>{t.label}</Badge></SheetRow>
              <SheetRow label="Page">
                {r.page ? <a href={r.page} target="_blank" rel="noopener" className="break-all font-mono text-[12px] font-semibold text-st-ink hover:underline">{r.page}</a> : "?"}
              </SheetRow>
              <SheetRow label="Fichier probable"><span className="break-all font-mono text-[11.5px] text-st-text-2">{routeProbable(r.page)}</span></SheetRow>
              <SheetRow label="Appareil">{appareil(r.user_agent)}</SheetRow>
              <SheetRow label="Fenêtre"><span className="st-num">{r.viewport ?? "?"}</span></SheetRow>
              <SheetRow label="Version"><span className="font-mono text-[12px]">{r.app_version ?? "?"}</span></SheetRow>
            </SheetRows>
            <div className="mt-4">
              {r.statut === "traite" ? (
                <Button variant="secondary" fullWidth loading={isPending} onClick={toggle}><RotateCcw /> Remettre à traiter</Button>
              ) : (
                <Button fullWidth loading={isPending} onClick={toggle}><Check /> Marquer comme traité</Button>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="mb-2 text-[13.5px] font-semibold text-st-text">Erreurs du navigateur ({r.erreurs.length})</h2>
            {r.erreurs.length === 0 ? (
              <p className="text-[12.5px] text-st-muted">Aucune erreur JavaScript pendant la session du pilote.</p>
            ) : (
              <ul className="space-y-2">
                {r.erreurs.map((e, i) => (
                  <li key={i} className="rounded-[10px] bg-st-bad-soft px-3 py-2">
                    <p className="text-[12.5px] font-semibold text-st-bad">{e.message}</p>
                    <p className="mt-0.5 break-all font-mono text-[11px] text-st-text-2">{e.page}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
