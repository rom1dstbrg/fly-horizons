"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageIcon, Star, X } from "lucide-react";
import { deleteSatisfactionSurvey, deleteSurveyPhotos } from "@/lib/actions/satisfaction";
import { fmtDuration } from "@/lib/email-templates";
import { AXES, commeAnnonceLabel, recoLabel, sourceLabel } from "@/lib/satisfaction";
import { NO_PILOTE_KEY, shortName, type PiloteRow, type SatisfactionData, type Survey } from "@/lib/satisfaction-stats";
import { RichText } from "@/components/admin/RichText";
import {
  Badge, Button, buttonClasses, Card, EmptyState, PageHeader, Segmented, Sheet, SheetBody, SheetFooter, SheetHeader,
  SheetHero, SheetRow, SheetRows, Table, TableCell, TableHeaderCell, TableRow, TableSearch,
  type BadgeTone,
} from "@/components/pilote/studio";
import { cn } from "@/lib/utils";

// Satisfaction (maquette validée le 01/10) : le vol est lié à un pilote, donc les avis sont
// ventilés par pilote. Synthèse en phrases, quatre chiffres, tableau par pilote qui filtre
// la liste, liste des avis et tiroir. Les calculs sont dans lib/satisfaction-stats.ts.

type Filtre = "tous" | "watch" | "comment" | "photos";

const fr1 = (n: number) => n.toLocaleString("fr-BE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtDate = (iso: string) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-BE", { day: "numeric", month: "short" }) : "—");
const fmtDateLong = (iso: string) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" }) : "—");

function relTime(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `il y a ${Math.max(min, 1)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

function Stars({ n, size = 13 }: { n: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5 align-middle" aria-label={`${n} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} fill={i <= n ? "#F2B705" : "transparent"} stroke={i <= n ? "#F2B705" : "#cfd6e2"} strokeWidth={1.6} />
      ))}
    </span>
  );
}

const recoTone = (v: string | null): BadgeTone => (v === "non" ? "danger" : v === "pas_sur" ? "warning" : "success");
const annonceTone = (v: string | null): BadgeTone => (v === "non" ? "danger" : v === "presque" ? "warning" : "success");

function Avatar({ nom, size = 28 }: { nom: string | null; size?: number }) {
  const ini = (nom ?? "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-st-ink font-semibold text-white" style={{ width: size, height: size, fontSize: size * 0.38 }}>{ini}</span>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: "bad" }) {
  return (
    <Card className="flex flex-col gap-1 !p-4 sm:!p-[18px]">
      <p className="text-[12.5px] font-medium text-st-muted">{label}</p>
      <p className={cn("st-num text-[26px] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-[30px]", tone === "bad" && "text-st-bad")}>{value}</p>
      <p className="mt-1 text-[12px] leading-snug text-st-muted">{hint}</p>
    </Card>
  );
}

export function SatisfactionClient({ surveys, data }: { surveys: Survey[]; data: SatisfactionData }) {
  const router = useRouter();
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [search, setSearch] = useState("");
  const [pilote, setPilote] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const byPilote = useMemo(() => (pilote ? surveys.filter((s) => s.piloteKey === pilote) : surveys), [surveys, pilote]);
  const counts = {
    tous: byPilote.length,
    watch: byPilote.filter((s) => s.watch).length,
    comment: byPilote.filter((s) => s.commentaire).length,
    photos: byPilote.filter((s) => s.photos.length > 0).length,
  };
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return byPilote.filter((s) =>
      (filtre === "tous" || (filtre === "watch" && s.watch) || (filtre === "comment" && !!s.commentaire) || (filtre === "photos" && s.photos.length > 0)) &&
      (!q || `${s.client?.prenom ?? ""} ${s.client?.nom ?? ""} ${s.piloteNom ?? ""} ${s.commentaire ?? ""}`.toLowerCase().includes(q)),
    );
  }, [byPilote, filtre, search]);
  const selected = openId ? surveys.find((s) => s.id === openId) ?? null : null;
  const piloteFiltre = pilote ? data.pilotes.find((p) => p.key === pilote) : null;

  return (
    <div className="pilote-studio space-y-5 font-sans text-st-text">
      <PageHeader title="Satisfaction" description="Avis des clients après leur vol, par pilote" />

      {data.total === 0 ? (
        <EmptyState icon={Star} title="Aucun avis pour l'instant" description="Le lien du formulaire part dans l'email envoyé au client quand le pilote marque le vol effectué." />
      ) : (
        <>
          <Card className="space-y-3">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">En bref</h2>
            <p className="max-w-[80ch] text-[16px] font-medium leading-relaxed tracking-[-0.01em] text-st-text-2 sm:text-[17px]"><RichText r={data.brief.lead} /></p>
            {data.brief.points.length > 0 && (
              <ul className="space-y-2">
                {data.brief.points.map((pt, i) => (
                  <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-st-text-2">
                    <i className="mt-[7px] size-1.5 shrink-0 rounded-full bg-st-gold" />
                    <span><RichText r={pt} /></span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div data-xs-grid className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Avis reçus" value={String(data.total)} hint={data.vols ? `sur ${data.vols} vols effectués · ${data.tauxReponse} % de réponses` : "vols effectués : aucun"} />
            <Kpi label="Note moyenne" value={fr1(data.moyenne)} hint="moyenne des 4 notes" />
            <Kpi label="Recommandent" value={`${data.recoPct} %`} hint="« oui » ou « oui, probablement »" />
            <Kpi label="À surveiller" value={String(data.watch)} tone={data.watch > 0 ? "bad" : undefined} hint="note moyenne ≤ 3, « non » ou vol pas comme annoncé" />
          </div>

          <Card className="space-y-1">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Par axe</h2>
            <p className="max-w-[75ch] text-[12.5px] leading-relaxed text-st-muted">La note moyenne de chacune des quatre questions. La plus basse est celle à regarder en premier.</p>
            <ul className="mt-2 divide-y divide-st-line-soft">
              {data.axes.map((a) => (
                <li key={a.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-2.5">
                  <span className="text-[13.5px] font-[550]">{a.label}</span>
                  <span className="st-num text-[13px] text-st-text-2">{fr1(a.value)} / 5</span>
                  <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-st-surface">
                    <span className="block h-full rounded-full bg-st-gold" style={{ width: `${(a.value / 5) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <section className="space-y-2">
            <div className="px-1">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Par pilote</h2>
              <p className="max-w-[75ch] text-[12.5px] leading-relaxed text-st-muted">Un clic sur un pilote filtre les avis ci-dessous. Une note du pilote sous 4 apparaît en rouge dès 3 avis.</p>
            </div>
            <Table>
              <thead>
                <tr>
                  <TableHeaderCell>Pilote</TableHeaderCell>
                  <TableHeaderCell align="right">Avis</TableHeaderCell>
                  <TableHeaderCell align="right">Pilote</TableHeaderCell>
                  <TableHeaderCell align="right">Vol</TableHeaderCell>
                  <TableHeaderCell align="right">Comme annoncé</TableHeaderCell>
                  <TableHeaderCell align="right">Recommandent</TableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {data.pilotes.map((p: PiloteRow) => (
                  <TableRow key={p.key} selected={pilote === p.key} onClick={p.avis > 0 ? () => setPilote(pilote === p.key ? null : p.key) : undefined}>
                    <TableCell>
                      <span className="flex items-center gap-2.5 whitespace-nowrap font-[550]"><Avatar nom={p.key === NO_PILOTE_KEY ? null : p.nom} />{p.nom}</span>
                    </TableCell>
                    <TableCell align="right">{p.avis}<span className="text-st-muted"> / {p.vols}</span></TableCell>
                    <TableCell align="right"><b className={cn("font-semibold", p.low && "text-st-bad")}>{p.avis ? fr1(p.notePilote) : "—"}</b></TableCell>
                    <TableCell align="right">{p.avis ? fr1(p.noteVol) : "—"}</TableCell>
                    <TableCell align="right">{p.commeAnnoncePct !== null ? `${p.commeAnnoncePct} %` : "—"}</TableCell>
                    <TableCell align="right">{p.avis ? `${p.recoPct} %` : "—"}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </section>

          <section className="space-y-2">
            <h2 className="px-1 text-[15px] font-semibold tracking-[-0.01em]">Les avis</h2>
            <Table
              toolbar={
                <>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Segmented
                      value={filtre}
                      onChange={setFiltre}
                      items={[
                        { key: "tous", label: "Tous", count: counts.tous },
                        { key: "watch", label: "À surveiller", count: counts.watch },
                        { key: "comment", label: "Avec commentaire", count: counts.comment },
                        { key: "photos", label: "Avec photos", count: counts.photos },
                      ]}
                    />
                    {piloteFiltre && (
                      <button type="button" onClick={() => setPilote(null)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-st-ink-soft px-3 py-1.5 text-[12.5px] font-semibold text-st-ink">
                        {piloteFiltre.nom}<X size={13} />
                      </button>
                    )}
                  </div>
                  <TableSearch value={search} onChange={setSearch} placeholder="Client, pilote, commentaire" />
                </>
              }
            >
              <thead>
                <tr>
                  <TableHeaderCell>Client</TableHeaderCell>
                  <TableHeaderCell>Pilote</TableHeaderCell>
                  <TableHeaderCell>Vol</TableHeaderCell>
                  <TableHeaderCell>Note</TableHeaderCell>
                  <TableHeaderCell>Recommande</TableHeaderCell>
                  <TableHeaderCell>Commentaire</TableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-st-text-2">Aucun avis ici.</td></tr>
                ) : shown.map((s) => (
                  <TableRow key={s.id} onClick={() => setOpenId(s.id)} selected={openId === s.id}>
                    <TableCell>
                      <span className="flex items-center gap-2 whitespace-nowrap font-[550]">
                        {s.watch && <i className="size-2 shrink-0 rounded-full bg-st-bad" title="À surveiller" />}
                        {s.client ? `${s.client.prenom} ${s.client.nom}` : "—"}
                      </span>
                    </TableCell>
                    <TableCell><span className="flex items-center gap-2 whitespace-nowrap"><Avatar nom={s.piloteNom} size={22} />{shortName(s.piloteNom)}</span></TableCell>
                    <TableCell><span className="whitespace-nowrap text-st-text-2">{fmtDate(s.dateVol)}</span></TableCell>
                    <TableCell><span className="whitespace-nowrap"><Stars n={Math.round(s.moyenne)} size={12} /> <span className="text-[12px] text-st-muted">{fr1(s.moyenne)}</span></span></TableCell>
                    <TableCell><Badge tone={recoTone(s.recommandation)}>{recoLabel(s.recommandation)}</Badge></TableCell>
                    <TableCell>
                      <span className="block max-w-[300px] truncate text-st-text-2">
                        {s.commentaire ?? ""}
                        {s.photos.length > 0 && <ImageIcon size={13} className="ml-1.5 inline text-st-muted" />}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </section>
        </>
      )}

      <Sheet value={selected} onClose={() => setOpenId(null)}>
        {(s) => <SurveyDrawer s={s} onClose={() => setOpenId(null)} onDone={() => { setOpenId(null); router.refresh(); }} />}
      </Sheet>
    </div>
  );
}

function SurveyDrawer({ s, onClose, onDone }: { s: Survey; onClose: () => void; onDone: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const name = s.client ? `${s.client.prenom} ${s.client.nom}` : "Client";

  function remove() {
    if (!confirming) { setConfirming(true); setTimeout(() => setConfirming(false), 4000); return; }
    start(async () => {
      const r = await deleteSatisfactionSurvey(s.id, s.photos);
      if ("error" in r && r.error) setError(r.error); else onDone();
    });
  }
  function dropPhotos() {
    start(async () => {
      const r = await deleteSurveyPhotos(s.id, s.photos);
      if ("error" in r && r.error) setError(r.error); else onDone();
    });
  }

  return (
    <>
      <SheetHeader
        title={name}
        subtitle={`Vol du ${fmtDateLong(s.dateVol)} · ${fmtDuration(s.duree)} · reçu ${relTime(s.createdAt)}`}
        leading={<Avatar nom={name} size={44} />}
        onClose={onClose}
      />
      <SheetBody>
        <SheetHero label="Note moyenne" hint={s.watch ? "À surveiller" : undefined}>
          {fr1(s.moyenne)}<span className="text-[15px] font-normal text-st-muted"> / 5</span>
        </SheetHero>

        <div className="flex items-center gap-3 border-b border-st-line-soft pb-3">
          <Avatar nom={s.piloteNom} size={36} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">{s.piloteNom ?? "Pilote non renseigné"}</p>
            <p className="text-[12px] text-st-muted">Pilote de ce vol</p>
          </div>
          {s.reservationId && <Link href={`/admin/vols?ouvrir=${s.reservationId}`} className="text-[12.5px] font-semibold text-st-info hover:underline">Voir le vol ›</Link>}
        </div>

        <SheetRows>
          {AXES.map((a) => <SheetRow key={a.key} label={a.label}><Stars n={s[a.key]} size={14} /></SheetRow>)}
          <SheetRow label="Comme annoncé">{s.commeAnnonce ? <Badge tone={annonceTone(s.commeAnnonce)}>{commeAnnonceLabel(s.commeAnnonce)}</Badge> : <span className="text-st-muted">Pas demandé</span>}</SheetRow>
          <SheetRow label="Recommande Fly Horizons"><Badge tone={recoTone(s.recommandation)}>{recoLabel(s.recommandation)}</Badge></SheetRow>
          <SheetRow label="Nous a connus par">{sourceLabel(s.sourceDecouverte)}</SheetRow>
        </SheetRows>

        {s.commentaire && (
          <div className="rounded-[16px] bg-st-surface px-4 py-3.5">
            <p className="mb-1 text-[11.5px] text-st-muted">Commentaire</p>
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{s.commentaire}</p>
          </div>
        )}

        {s.photoUrls.length > 0 && (
          <div>
            <div className="flex flex-wrap gap-2">
              {s.photoUrls.map((u, i) => (
                <a key={`${i}-${u}`} href={u} target="_blank" rel="noopener noreferrer" className="block size-[72px] overflow-hidden rounded-xl bg-st-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
            <button type="button" disabled={pending} onClick={dropPhotos} className="mt-2.5 cursor-pointer text-[12.5px] font-semibold text-st-text-2 hover:underline disabled:opacity-50">
              Supprimer les photos et garder l&apos;avis
            </button>
          </div>
        )}
        {error && <p className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">{error}</p>}
      </SheetBody>
      <SheetFooter>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            {s.client?.email ? (
              <a href={`mailto:${s.client.email}`} className={buttonClasses({ variant: "secondary", size: "lg", className: "sm:h-[38px] sm:text-[13px]" })}>Écrire au client</a>
            ) : <span />}
            {s.reservationId && (
              <Link href={`/admin/vols?ouvrir=${s.reservationId}`} className={buttonClasses({ size: "lg", className: "sm:h-[38px] sm:text-[13px]" })}>Voir le vol</Link>
            )}
          </div>
          <div className="text-center">
            <Button variant="ghost" size="sm" loading={pending && confirming} onClick={remove} className="!text-st-bad">
              {confirming ? "Confirmer la suppression" : "Supprimer cet avis"}
            </Button>
          </div>
        </div>
      </SheetFooter>
    </>
  );
}
