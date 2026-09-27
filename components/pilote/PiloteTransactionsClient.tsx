"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Banknote, Check, Clock, Download, ExternalLink, Receipt, Send } from "lucide-react";
import { setPilotePaye, renvoyerLienVirement } from "@/lib/actions/pilote-paiement";
import {
  bilanTransactions, formatMinutes,
  type PaiementEtat, type PiloteTransaction,
} from "@/lib/pilote/transactions-shared";
import {
  Badge, Button, ButtonLabel, buttonClasses, Card, CardSplit, DateTile, EmptyState, LinkButton, Metric, PageHeader, Segmented,
  Sheet, SheetBody, SheetFooter, SheetHeader, SheetHero, SheetRow, SheetRows,
  Table, TableCell, TableHeaderCell, TableRow, TableSearch,
} from "@/components/pilote/studio";
import { cn } from "@/lib/utils";

// Page « Transactions » du pilote (maquette validée le 27/09, option B) : une
// grande carte en haut (reçu dans l'année, mini graphique par mois, puis
// « À recevoir | Votre part | Vols »), le tableau des paiements, le tiroir.

type Tab = "tout" | "attente" | "recus";
const MOIS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

const eur = (v: number | null, d = 0) =>
  v == null ? "—" : v.toLocaleString("fr-BE", { minimumFractionDigits: d, maximumFractionDigits: 2 }) + " €";
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const frDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", timeZone: "Europe/Brussels" });
const longDate = (d: string) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Brussels" });
const plural = (n: number, s: string) => `${n} ${s}${n > 1 ? "s" : ""}`;

export function EtatBadge({ etat }: { etat: PaiementEtat }) {
  if (etat === "recu") return <Badge tone="success"><Check className="size-3" />Reçu</Badge>;
  if (etat === "relance") return <Badge tone="warning"><AlertTriangle className="size-3" />À relancer</Badge>;
  return <Badge tone="neutral"><Clock className="size-3" />En attente</Badge>;
}

function etatDetail(t: PiloteTransaction, today: string): string {
  if (t.etat === "recu") return t.payeLe ? `reçu le ${frDate(t.payeLe)}` : "reçu";
  if (t.montant == null) return "prix fixé à la clôture du groupe";
  if (t.etat === "attente") return `vol le ${frDate(t.date + "T12:00:00Z")}`;
  const jours = Math.round((new Date(today + "T12:00:00Z").getTime() - new Date(t.date + "T12:00:00Z").getTime()) / 86400000);
  return jours <= 0 ? "vol fait aujourd'hui" : `vol fait il y a ${plural(jours, "jour")}`;
}

// Barre du partage des frais d'un vol : passagers en navy, pilote en or.
function PartageFrais({ cout, part }: { cout: number; part: number }) {
  const pax = Math.max(0, cout - part);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-st-text">Partage des frais du vol</p>
        <span className="st-num text-[12.5px] text-st-muted">{eur(cout)}</span>
      </div>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        {pax > 0 && <span className="bg-st-ink" style={{ flex: pax }} />}
        {part > 0 && <span className="bg-st-gold" style={{ flex: part }} />}
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[12px] text-st-text-2">
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-[3px] bg-st-ink" />Passagers <b className="st-num font-semibold text-st-text">{eur(pax)}</b></span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-[3px] bg-st-gold" />Vous <b className="st-num font-semibold text-st-text">{eur(part)} · {pct(part, cout)} %</b></span>
      </div>
    </div>
  );
}

export function PiloteTransactionsClient({ rows, today }: { rows: PiloteTransaction[]; today: string }) {
  const router = useRouter();
  const years = useMemo(() => {
    const s = new Set(rows.map((r) => r.date.slice(0, 4)));
    s.add(today.slice(0, 4));
    return [...s].sort().reverse().slice(0, 4);
  }, [rows, today]);
  const [year, setYear] = useState(today.slice(0, 4));
  const [tab, setTab] = useState<Tab>("tout");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  const ofYear = useMemo(() => rows.filter((r) => r.date.startsWith(year)), [rows, year]);
  const bilan = useMemo(() => bilanTransactions(ofYear), [ofYear]);
  const counts = {
    tout: ofYear.length,
    attente: ofYear.filter((r) => r.etat !== "recu").length,
    recus: ofYear.filter((r) => r.etat === "recu").length,
  };
  const q = query.trim().toLowerCase();
  const shown = ofYear.filter((r) =>
    (tab === "tout" || (tab === "recus") === (r.etat === "recu")) &&
    (!q || r.client.toLowerCase().includes(q) || r.titre.toLowerCase().includes(q)),
  );
  const open = rows.find((r) => r.id === openId) ?? null;
  const close = useCallback(() => { setOpenId(null); setMsg(null); }, []);
  const maxMois = Math.max(...bilan.parMois, 1);
  const moisCourant = year === today.slice(0, 4) ? Number(today.slice(5, 7)) - 1 : 11;

  function run(key: string, fn: () => Promise<{ error?: string; emailError?: boolean }>, okText: string) {
    setMsg(null);
    setBusy(key);
    startTransition(async () => {
      const r = await fn();
      setBusy(null);
      if (r?.error) { setMsg({ text: "Erreur : " + r.error, ok: false }); return; }
      setMsg({ text: r?.emailError ? `${okText} · email au client non envoyé` : okText, ok: !r?.emailError });
      router.refresh();
    });
  }

  const header = (
    <PageHeader
      title="Transactions"
      actions={rows.length > 0 && (
        <>
          {years.length > 1 && (
            <Segmented value={year} onChange={setYear} items={years.map((y) => ({ key: y, label: y }))} className="max-[480px]:hidden" />
          )}
          {/* Téléchargement d'un fichier PDF : lien simple, pas une navigation. */}
          <a href={`/api/pilote/releve?annee=${year}`} className={buttonClasses()}>
            <Download />
            <ButtonLabel full="Exporter le relevé" short="Relevé" />
          </a>
        </>
      )}
    />
  );

  if (rows.length === 0) {
    return (
      <>
      {header}
      <EmptyState
        icon={Receipt}
        title="Aucun paiement pour l'instant"
        description="Quand un passager réserve l'une de vos annonces, son paiement apparaît ici : ce qu'il vous doit, ce qui est reçu, et votre part des frais."
      />
      </>
    );
  }

  return (
    <>
      {header}
      {/* Petit téléphone : l'année passe sous le titre, faute de place à côté du bouton. */}
      {years.length > 1 && (
        <Segmented value={year} onChange={setYear} items={years.map((y) => ({ key: y, label: y }))} className="min-[481px]:hidden" />
      )}

      <Card padded={false}>
        <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div className="min-w-0">
            <p className="text-[12.5px] text-st-muted">Reçu en {year}</p>
            <p className="st-num mt-1 text-[34px] font-medium leading-[1.05] tracking-[-0.035em] text-st-text sm:text-[40px]">{eur(bilan.recu)}</p>
            <p className="mt-1 text-[12.5px] text-st-muted">{plural(bilan.nRecus, "paiement")} de passagers · virements directs</p>
          </div>
          <div className="flex h-[86px] items-end gap-1.5 sm:gap-2" aria-label="Reçu par mois">
            {bilan.parMois.slice(0, moisCourant + 1).map((v, i) => (
              <div key={i} className="flex flex-col items-center gap-1" title={`${eur(v)}`}>
                <span
                  className={cn("w-[18px] rounded-[6px] sm:w-[22px]", i === moisCourant ? "bg-st-ink" : v > 0 ? "bg-[#c7d2de]" : "bg-st-surface")}
                  style={{ height: Math.max(4, Math.round((v / maxMois) * 64)) }}
                />
                <small className="text-[10.5px] text-st-muted">{MOIS[i]}</small>
              </div>
            ))}
          </div>
        </div>
        <CardSplit>
          <Metric
            label="À recevoir"
            value={eur(bilan.aRecevoir)}
            tone={bilan.nRelance > 0 ? "warn" : undefined}
            hint={bilan.nARecevoir === 0 ? "rien en attente" : `${plural(bilan.nARecevoir, "paiement")}${bilan.nRelance ? `, ${bilan.nRelance} à relancer` : ""}`}
          />
          <Metric
            label="Votre part des frais"
            value={eur(bilan.partTotal)}
            hint={bilan.coutTotal > 0 ? `${pct(bilan.partTotal, bilan.coutTotal)} % de ${eur(bilan.coutTotal)} de coûts` : "sur les vols effectués"}
          />
          <Metric
            label="Vols effectués"
            value={bilan.vols}
            hint={bilan.minutes > 0 ? `${formatMinutes(bilan.minutes)} de vol` : " "}
          />
        </CardSplit>
      </Card>

      <Table
        toolbar={
          <>
            <Segmented
              value={tab}
              onChange={setTab}
              className="max-sm:w-full"
              fill={false}
              items={[
                { key: "tout", label: "Tout", count: counts.tout },
                { key: "attente", label: "À recevoir", count: counts.attente },
                { key: "recus", label: "Reçus", count: counts.recus },
              ]}
            />
            <TableSearch value={query} onChange={setQuery} placeholder="Client, vol…" className="max-sm:w-full" />
          </>
        }
      >
        <thead>
          <tr>
            <TableHeaderCell>Vol</TableHeaderCell>
            <TableHeaderCell>Montant client</TableHeaderCell>
            <TableHeaderCell>Partage des frais</TableHeaderCell>
            <TableHeaderCell>Paiement</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {shown.length === 0 ? (
            <tr><td colSpan={4} className="py-10 text-center text-sm text-st-muted">Aucun paiement ici.</td></tr>
          ) : shown.map((t) => (
            <TableRow key={t.id} onClick={() => { setOpenId(t.id); setMsg(null); }} selected={t.id === openId}>
              <TableCell>
                <div className="flex min-w-0 items-center gap-3">
                  <DateTile date={t.date} today={t.date === today} className="max-sm:hidden" />
                  <div className="min-w-0">
                    <p className="truncate font-[550]">{t.client}</p>
                    <p className="truncate text-[12px] text-st-muted">{t.titre}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <p className="st-num font-[550]">{eur(t.montant)}</p>
                <p className="text-[12px] text-st-muted max-sm:hidden">{t.passagers ? plural(t.passagers, "passager") : ""}</p>
              </TableCell>
              <TableCell>
                {t.cout != null && t.part != null ? (
                  <>
                    <p className="st-num font-[550]">{eur(t.part)} <span className="font-medium text-st-muted">sur {eur(t.cout)}</span></p>
                    <p className="text-[12px] text-st-muted max-sm:hidden">votre part · {pct(t.part, t.cout)} %</p>
                  </>
                ) : <span className="text-st-muted">—</span>}
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-start gap-1 max-sm:items-end">
                  <EtatBadge etat={t.etat} />
                  <span className="text-[12px] text-st-muted max-sm:hidden">{etatDetail(t, today)}</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>

      <Sheet value={open} onClose={close}>
        {(t) => (
          <>
            <SheetHeader title={t.client} subtitle={t.titre} leading={<DateTile date={t.date} today={t.date === today} />} onClose={close} />
            <SheetBody>
              <SheetHero label="Montant du passager" aside={<EtatBadge etat={t.etat} />} hint={etatDetail(t, today)}>
                {eur(t.montant, 0)}
              </SheetHero>
              {t.cout != null && t.part != null && <PartageFrais cout={t.cout} part={t.part} />}
              <SheetRows>
                <SheetRow label="Date du vol">{longDate(t.date)}{t.heure ? ` · ${t.heure}` : ""}</SheetRow>
                {(t.dureeReelle ?? t.duree) != null && (
                  <SheetRow label={t.dureeReelle ? "Durée réelle" : "Durée prévue"}>
                    {t.dureeReelle ?? t.duree} min{t.dureeReelle && t.duree && t.dureeReelle !== t.duree ? ` (prévu ${t.duree})` : ""}
                  </SheetRow>
                )}
                {t.passagers != null && (
                  <SheetRow label="Passagers">{t.passagers}{t.modeVente ? ` · ${t.modeVente === "place" ? "à la place" : "avion entier"}` : ""}</SheetRow>
                )}
                {t.etat !== "recu" && <SheetRow label="Communication" className="text-[12.5px]">{t.communication}</SheetRow>}
              </SheetRows>
              {msg && (
                <p className={cn("rounded-[10px] px-3 py-2 text-[12.5px] font-medium", msg.ok ? "bg-st-ok-soft text-st-ok" : "bg-st-bad-soft text-st-bad")}>{msg.text}</p>
              )}
            </SheetBody>
            <SheetFooter>
              <div className="flex flex-col gap-2">
                {t.etat !== "recu" && t.montant != null && (
                  <>
                    <Button size="lg" fullWidth className="sm:h-[38px] sm:text-[13px]" loading={busy === "paye"} disabled={isPending} onClick={() => run("paye", () => setPilotePaye(t.id, true, "virement"), "Paiement marqué reçu")}>
                      <Check />Marquer comme reçu
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="secondary" loading={busy === "especes"} disabled={isPending} onClick={() => run("especes", () => setPilotePaye(t.id, true, "especes"), "Paiement en espèces enregistré")}>
                        <Banknote />En espèces
                      </Button>
                      <Button variant="secondary" loading={busy === "lien"} disabled={isPending} onClick={() => run("lien", () => renvoyerLienVirement(t.id), "Lien de virement renvoyé")}>
                        <Send />Renvoyer le lien
                      </Button>
                    </div>
                  </>
                )}
                {t.etat === "recu" && (
                  <Button variant="secondary" fullWidth loading={busy === "annuler"} disabled={isPending} onClick={() => run("annuler", () => setPilotePaye(t.id, false), "Paiement remis en attente")}>
                    Remettre en attente
                  </Button>
                )}
                <LinkButton href={`/pilote/vols?ouvrir=${t.id}`} variant="ghost" fullWidth>
                  <ExternalLink />Ouvrir le vol
                </LinkButton>
              </div>
            </SheetFooter>
          </>
        )}
      </Sheet>
    </>
  );
}
