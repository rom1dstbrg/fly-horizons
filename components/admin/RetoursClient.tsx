"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Download, ExternalLink, Flag, Paperclip, RotateCcw } from "lucide-react";
import { setRetourStatut } from "@/lib/actions/pilote-retours";
import { appareil, fmtDateBrussels, RETOUR_TYPES, type PiloteRetour } from "@/lib/pilote-retours";
import {
  Badge, Button, EmptyState, PageHeader, Segmented, Sheet, SheetBody, SheetCloseButton, SheetFooter, SheetRow, SheetRows,
  Table, TableCell, TableHeaderCell, TableRow, TableSearch, buttonClasses,
} from "@/components/pilote/studio";

// Retours pilotes (maquette validée le 27/09) : tableau comme /admin/pilotes,
// tiroir avec l'essentiel, bouton ↗ vers la page complète (captures).
// « Exporter pour Claude » : zip RETOURS.md + captures, à donner à Claude Code.

type Filtre = "a_traiter" | "traite" | "tous";

export function relTime(iso: string): string {
  const d = new Date(iso);
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  if (h < 48) return "hier";
  return d.toLocaleDateString("fr-BE", { timeZone: "Europe/Brussels", day: "numeric", month: "short" });
}

export function PiloteMini({ r, size = 28 }: { r: PiloteRetour; size?: number }) {
  const nom = r.pilotes?.nom ?? "?";
  const ini = nom.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return r.pilotes?.photo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={r.pilotes.photo_url} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />
  ) : (
    <span style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-full bg-st-ink text-[11px] font-semibold text-white">{ini}</span>
  );
}

export function StatutBadge({ r }: { r: PiloteRetour }) {
  return r.statut === "traite" ? <Badge tone="success" dot>Traité</Badge> : <Badge tone="ink" dot>À traiter</Badge>;
}

export function RetoursClient({ retours }: { retours: PiloteRetour[] }) {
  const router = useRouter();
  const [filtre, setFiltre] = useState<Filtre>("a_traiter");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const aTraiter = retours.filter((r) => r.statut === "a_traiter").length;
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return retours.filter((r) =>
      (filtre === "tous" || r.statut === filtre) &&
      (!q || `${r.pilotes?.nom ?? ""} ${r.message} ${r.page ?? ""}`.toLowerCase().includes(q)),
    );
  }, [retours, filtre, search]);
  const selected = openId ? retours.find((r) => r.id === openId) ?? null : null;

  function toggle(r: PiloteRetour) {
    startTransition(async () => {
      await setRetourStatut(r.id, r.statut !== "traite");
      router.refresh();
    });
  }

  return (
    <div className="pilote-studio space-y-5">
      <PageHeader
        title="Retours pilotes"
        actions={retours.length > 0 && (
          // Téléchargement d'un fichier : lien simple.
          <a href={`/api/admin/retours/export?statut=${filtre}`} className={buttonClasses({ variant: "secondary" })}>
            <Download /> Exporter pour Claude
          </a>
        )}
      />

      {retours.length === 0 ? (
        <EmptyState icon={Flag} title="Aucun retour pour l'instant" description="Les bugs, idées et questions envoyés par les pilotes depuis leur espace arrivent ici." />
      ) : (
        <Table
          toolbar={
            <>
              <Segmented
                value={filtre}
                onChange={setFiltre}
                items={[
                  { key: "a_traiter", label: "À traiter", count: aTraiter },
                  { key: "traite", label: "Traités", count: retours.length - aTraiter },
                  { key: "tous", label: "Tous", count: retours.length },
                ]}
              />
              <TableSearch value={search} onChange={setSearch} placeholder="Pilote ou message" />
            </>
          }
        >
          <thead>
            <tr>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Pilote</TableHeaderCell>
              <TableHeaderCell>Message</TableHeaderCell>
              <TableHeaderCell>Page</TableHeaderCell>
              <TableHeaderCell align="right">Reçu</TableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-st-text-2">Rien ici.</td></tr>
            ) : shown.map((r) => (
              <TableRow key={r.id} onClick={() => setOpenId(r.id)} selected={openId === r.id}>
                <TableCell><Badge tone={RETOUR_TYPES[r.type].tone}>{RETOUR_TYPES[r.type].label}</Badge></TableCell>
                <TableCell>
                  <span className="flex items-center gap-2.5 whitespace-nowrap font-[550]"><PiloteMini r={r} />{r.pilotes?.nom ?? "?"}</span>
                </TableCell>
                <TableCell><span className="block max-w-[340px] truncate text-st-text-2">{r.message}</span></TableCell>
                <TableCell>
                  <span className="whitespace-nowrap font-mono text-[11.5px] text-st-muted">{r.page}</span>
                  {r.captures.length > 0 && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-[12px] text-st-muted"><Paperclip size={12} />{r.captures.length}</span>
                  )}
                </TableCell>
                <TableCell align="right"><span className="whitespace-nowrap text-st-text-2">{relTime(r.created_at)}</span></TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}

      <Sheet value={selected} onClose={() => setOpenId(null)}>
        {(r) => (
          <>
            <div className="flex items-start gap-3 px-[22px] pb-4 pt-3 sm:pt-5">
              <PiloteMini r={r} size={40} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold text-st-text">{r.pilotes?.nom ?? "?"}</div>
                <div className="truncate text-[12.5px] text-st-muted">{fmtDateBrussels(r.created_at)}</div>
              </div>
              <Link
                href={`/admin/retours/${r.id}`}
                title="Ouvrir la page complète"
                aria-label="Ouvrir la page complète"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-st-line-strong bg-white text-st-ink transition-colors hover:bg-st-surface"
              >
                <ExternalLink size={16} />
              </Link>
              <SheetCloseButton onClick={() => setOpenId(null)} />
            </div>
            <SheetBody>
              <div className="rounded-[16px] bg-st-surface px-4 py-3.5">
                <p className="mb-1 text-[11.5px] text-st-muted">{RETOUR_TYPES[r.type].label}</p>
                <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-st-text">{r.message}</p>
              </div>
              <SheetRows>
                <SheetRow label="Statut"><StatutBadge r={r} /></SheetRow>
                <SheetRow label="Type"><Badge tone={RETOUR_TYPES[r.type].tone}>{RETOUR_TYPES[r.type].label}</Badge></SheetRow>
                <SheetRow label="Page">
                  {r.page ? <a href={r.page} target="_blank" rel="noopener" className="break-all font-mono text-[12px] font-semibold text-st-ink hover:underline">{r.page}</a> : "?"}
                </SheetRow>
                <SheetRow label="Appareil">{appareil(r.user_agent)}</SheetRow>
                <SheetRow label="Captures">
                  {r.captures.length > 0
                    ? <Link href={`/admin/retours/${r.id}`} className="font-semibold text-st-ink hover:underline">{r.captures.length} · voir sur la page</Link>
                    : <span className="text-st-muted">Aucune</span>}
                </SheetRow>
                <SheetRow label="Erreurs navigateur">
                  {r.erreurs.length > 0 ? <span className="font-semibold text-st-bad">{r.erreurs.length}</span> : <span className="text-st-muted">Aucune</span>}
                </SheetRow>
                <SheetRow label="Pilote"><Link href="/admin/pilotes" className="font-semibold text-st-ink hover:underline">Voir l&apos;équipe</Link></SheetRow>
              </SheetRows>
            </SheetBody>
            <SheetFooter>
              <div className="grid grid-cols-[auto_1fr] gap-2.5">
                <a href={`/api/admin/retours/export?id=${r.id}`} className={buttonClasses({ variant: "secondary", size: "lg", className: "sm:h-[38px] sm:text-[13px]" })}>
                  <Download /> Exporter
                </a>
                {r.statut === "traite" ? (
                  <Button variant="secondary" size="lg" className="sm:h-[38px] sm:text-[13px]" loading={isPending} onClick={() => toggle(r)}>
                    <RotateCcw /> Remettre à traiter
                  </Button>
                ) : (
                  <Button size="lg" className="sm:h-[38px] sm:text-[13px]" loading={isPending} onClick={() => toggle(r)}>
                    <Check /> Marquer comme traité
                  </Button>
                )}
              </div>
            </SheetFooter>
          </>
        )}
      </Sheet>
    </div>
  );
}
