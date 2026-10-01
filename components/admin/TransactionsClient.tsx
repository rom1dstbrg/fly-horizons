"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, ExternalLink, Plus, Receipt, Trash2 } from "lucide-react";
import { addDepense, deleteDepense, updateDepense } from "@/lib/actions/depenses";
import { setReversementPilote } from "@/lib/actions/reversement-pilote";
import { getReservationForDrawer, updateReservationAllFields } from "@/lib/actions/reservation-edit";
import { ReservationDrawer } from "@/components/admin/reservation-drawer/ReservationDrawer";
import type { DrawerReservation } from "@/components/admin/reservation-drawer/types";
import {
  Badge, Button, ButtonLabel, buttonClasses, Card, DateTile, EmptyState, FormField, Input, Metric,
  PageHeader, Segmented, SectionHeader, Sheet, SheetBody, SheetFooter, SheetHeader, SheetHero, SheetRow, SheetRows,
  Table, TableCell, TableHeaderCell, TableRow, TableSearch,
} from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import { uuid } from "@/lib/uuid";
import {
  netVol, resultatVol,
  type Depense, type LigneReversement, type LignePiloteVol, type LigneVol, type LigneVoucher, type SoldeStats,
} from "@/lib/transactions-types";

// Page Transactions de l'admin (maquette validée le 01/10) : bilan de l'année,
// virements aux pilotes à faire, tableau des vols et dépenses, tiroir propre aux
// transactions (avec un bouton vers le tiroir classique de la réservation), puis
// les vols des pilotes tiers à part. Sur téléphone, le tableau devient des cartes.

type Tab = "tout" | "vols" | "depenses";
type OpenSheet = { kind: "vol"; id: string } | { kind: "depense"; id: string | "new" };
type Row =
  | { kind: "vol"; date: string; vol: LigneVol }
  | { kind: "depense"; date: string; depense: Depense };

const MOIS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const round2 = (n: number) => Math.round(n * 100) / 100;
const eur = (v: number, d = 2) =>
  v.toLocaleString("fr-BE", { minimumFractionDigits: Math.abs(v % 1) < 0.005 ? 0 : d, maximumFractionDigits: 2 }) + " €";
const signed = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "") + eur(Math.abs(v));
const plural = (n: number, s: string) => `${n} ${s}${n > 1 ? "s" : ""}`;
const toneOf = (v: number | null) => (v == null || Math.abs(v) < 0.005 ? "text-st-muted" : v > 0 ? "text-st-ok" : "text-st-bad");
const longDate = (d: string) =>
  new Date(d.slice(0, 10) + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Brussels" });
const num = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function TransactionsClient({
  vols: initialVols,
  piloteVols = [],
  reversements = [],
  reversementsDisponibles = true,
  vouchers,
  depenses: initialDepenses,
  today,
}: {
  vols: LigneVol[];
  piloteVols?: LignePiloteVol[];
  reversements?: LigneReversement[];
  reversementsDisponibles?: boolean;
  vouchers: LigneVoucher[];
  depenses: Depense[];
  soldeGlobal?: SoldeStats;
  today: string;
}) {
  const router = useRouter();
  const [vols, setVols] = useState<LigneVol[]>(initialVols);
  const [depenses, setDepenses] = useState<Depense[]>(initialDepenses);
  const [year, setYear] = useState(today.slice(0, 4));
  const [tab, setTab] = useState<Tab>("tout");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<OpenSheet | null>(null);
  const [classique, setClassique] = useState<DrawerReservation | null>(null);
  const [loadingClassique, setLoadingClassique] = useState(false);

  const years = useMemo(() => {
    const s = new Set<string>([today.slice(0, 4)]);
    for (const v of vols) s.add(v.date.slice(0, 4));
    for (const d of depenses) s.add(d.date.slice(0, 4));
    return [...s].sort().reverse().slice(0, 4);
  }, [vols, depenses, today]);

  const volsAn = useMemo(() => vols.filter((v) => v.date.startsWith(year)), [vols, year]);
  const depensesAn = useMemo(() => depenses.filter((d) => d.date.startsWith(year)), [depenses, year]);
  const vouchersAn = useMemo(
    () => vouchers.filter((v) => v.type !== "offered" && v.date.startsWith(year)),
    [vouchers, year],
  );

  // Bilan de l'année : même formule que le solde net historique.
  const bilan = useMemo(() => {
    const parMois = Array<number>(12).fill(0);
    let encaisse = 0, coutAvion = 0, vire = 0, stripe = 0, rembourse = 0, nPaiements = 0, nAvecCout = 0;
    for (const v of volsAn) {
      encaisse += v.paye;
      if (v.paye > 0) nPaiements++;
      parMois[Number(v.date.slice(5, 7)) - 1] += v.paye;
      rembourse += v.remboursement;
      if (!v.confie && v.cout_avion != null) { coutAvion += v.cout_avion; nAvecCout++; }
      if (v.confie && v.reversement != null) vire += v.reversement;
      if (v.stripe_net != null) stripe += v.stripe_fee ?? 0;
    }
    for (const v of vouchersAn) {
      encaisse += v.montant ?? 0;
      parMois[Number(v.date.slice(5, 7)) - 1] += v.montant ?? 0;
    }
    const depensesTotal = depensesAn.reduce((s, d) => s + d.montant, 0);
    const nVire = volsAn.filter((v) => v.confie && v.reversement != null).length;
    return {
      parMois, encaisse: round2(encaisse), coutAvion: round2(coutAvion), vire: round2(vire),
      stripe: round2(stripe), rembourse: round2(rembourse), depenses: round2(depensesTotal),
      nPaiements, nAvecCout, nVire,
      solde: round2(encaisse - coutAvion - vire - stripe - rembourse - depensesTotal),
    };
  }, [volsAn, depensesAn, vouchersAn]);

  const aVirerRows = useMemo(
    () => reversements
      .map((r) => ({ r, vol: vols.find((v) => v.id === r.id) }))
      .filter((x): x is { r: LigneReversement; vol: LigneVol } => !!x.vol && x.vol.reversement == null),
    [reversements, vols],
  );
  const nAFaire = aVirerRows.filter((x) => x.vol.effectue).length;

  const rows: Row[] = useMemo(() => {
    const all: Row[] = [
      ...volsAn.map((vol) => ({ kind: "vol" as const, date: vol.date, vol })),
      ...depensesAn.map((depense) => ({ kind: "depense" as const, date: depense.date, depense })),
    ];
    return all.sort((a, b) => b.date.localeCompare(a.date));
  }, [volsAn, depensesAn]);

  const q = query.trim().toLowerCase();
  const shown = rows.filter((r) =>
    (tab === "tout" || (tab === "vols") === (r.kind === "vol")) &&
    (!q || (r.kind === "vol"
      ? `${r.vol.client} ${r.vol.pilote ?? ""}`.toLowerCase().includes(q)
      : r.depense.description.toLowerCase().includes(q))),
  );
  const counts = { tout: rows.length, vols: volsAn.length, depenses: depensesAn.length };

  const piloteVolsAn = piloteVols.filter((v) => v.date.startsWith(year));
  const maxMois = Math.max(...bilan.parMois, 1);
  const moisCourant = year === today.slice(0, 4) ? Number(today.slice(5, 7)) - 1 : 11;

  const close = useCallback(() => setOpen(null), []);

  function patchVol(id: string, patch: Partial<LigneVol>) {
    setVols((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  async function openClassique(id: string, perso: boolean) {
    if (loadingClassique) return;
    setLoadingClassique(true);
    const res = await getReservationForDrawer(id, perso);
    setLoadingClassique(false);
    if (!res.data) return;
    setOpen(null);
    setClassique(res.data as unknown as DrawerReservation);
  }

  const openVol = open?.kind === "vol" ? vols.find((v) => v.id === open.id) ?? null : null;
  const sheetValue = open && (open.kind === "depense" || openVol) ? open : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transactions"
        actions={
          <>
            {years.length > 1 && (
              <Segmented value={year} onChange={setYear} items={years.map((y) => ({ key: y, label: y }))} className="max-[480px]:hidden" />
            )}
            <a href="/api/admin/transactions/export" className={buttonClasses({ variant: "secondary" })}>
              <Download />
              <ButtonLabel full="Exporter PDF" short="PDF" />
            </a>
            <Button onClick={() => setOpen({ kind: "depense", id: "new" })}>
              <Plus />
              <ButtonLabel full="Ajouter une dépense" short="Dépense" />
            </Button>
          </>
        }
      />
      {years.length > 1 && (
        <Segmented value={year} onChange={setYear} items={years.map((y) => ({ key: y, label: y }))} className="min-[481px]:hidden" />
      )}

      {/* Bilan de l'année */}
      <Card padded={false}>
        <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div className="min-w-0">
            <p className="text-[12.5px] text-st-muted">Solde net en {year}</p>
            <p className={cn("st-num mt-1 text-[34px] font-medium leading-[1.05] tracking-[-0.035em] sm:text-[40px]", toneOf(bilan.solde))}>
              {signed(bilan.solde)}
            </p>
            <p className="mt-1 text-[12.5px] text-st-muted">
              Encaissé {eur(bilan.encaisse)} moins toutes les sorties ci-dessous
            </p>
          </div>
          <div className="flex h-[86px] items-end gap-1.5 sm:gap-2" aria-label="Encaissé par mois">
            {bilan.parMois.slice(0, moisCourant + 1).map((v, i) => (
              <div key={i} className="flex flex-col items-center gap-1" title={eur(v)}>
                <span
                  className={cn("w-[14px] rounded-[6px] sm:w-[22px]", i === moisCourant ? "bg-st-ink" : v > 0 ? "bg-[#c7d2de]" : "bg-st-surface")}
                  style={{ height: Math.max(4, Math.round((v / maxMois) * 64)) }}
                />
                <small className="text-[11px] text-st-muted">{MOIS[i]}</small>
              </div>
            ))}
          </div>
        </div>
        <Split5>
          <Metric label="Encaissé" value={"+" + eur(bilan.encaisse)} tone={bilan.encaisse > 0 ? "ok" : undefined} hint={plural(bilan.nPaiements, "paiement")} />
          <Metric label="Coûts avion" value={bilan.coutAvion > 0 ? "−" + eur(bilan.coutAvion) : eur(0)} tone={bilan.coutAvion > 0 ? "bad" : undefined} hint={bilan.nAvecCout > 0 ? `sur ${plural(bilan.nAvecCout, "vol")}` : "à renseigner"} />
          <Metric label="Virés aux pilotes" value={bilan.vire > 0 ? "−" + eur(bilan.vire) : eur(0)} tone={bilan.vire > 0 ? "bad" : undefined} hint={bilan.nVire > 0 ? plural(bilan.nVire, "virement") : "aucun"} />
          <Metric label="Frais Stripe" value={bilan.stripe > 0 ? "−" + eur(bilan.stripe) : eur(0)} tone={bilan.stripe > 0 ? "bad" : undefined} hint="cartes seulement" />
          <Metric
            label="Dépenses, remb."
            value={bilan.depenses + bilan.rembourse > 0 ? "−" + eur(bilan.depenses + bilan.rembourse) : eur(0)}
            tone={bilan.depenses + bilan.rembourse > 0 ? "bad" : undefined}
            hint={bilan.rembourse > 0 ? `dont ${eur(bilan.rembourse)} remboursés` : "aucun remboursement"}
          />
        </Split5>
      </Card>

      {/* À virer aux pilotes : seulement s'il y a quelque chose à faire */}
      {!reversementsDisponibles && (
        <p className="rounded-[12px] bg-st-warn-soft px-4 py-3 text-[12.5px] text-st-warn">
          Suivi des virements indisponible : la migration <code>20260928_reversement_pilote.sql</code> n&apos;a pas encore été exécutée sur Supabase.
        </p>
      )}
      {aVirerRows.length > 0 && (
        <section className="space-y-2.5">
          <SectionHeader title={<>À virer aux pilotes {nAFaire > 0 && <span className="ml-1.5 text-[12.5px] font-medium text-st-warn">{nAFaire} à faire</span>}</>} />
          <Card padded={false} className="divide-y divide-st-line-soft">
            {aVirerRows.map(({ r, vol }) => (
              <AVirerLigne
                key={r.id}
                r={r}
                vol={vol}
                onSaved={(montant, le) => patchVol(r.id, { reversement: montant, reversement_at: le })}
                onOpen={() => setOpen({ kind: "vol", id: r.id })}
              />
            ))}
          </Card>
        </section>
      )}

      {/* Vols et dépenses */}
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
                { key: "vols", label: "Vols", count: counts.vols },
                { key: "depenses", label: "Dépenses", count: counts.depenses },
              ]}
            />
            <TableSearch value={query} onChange={setQuery} placeholder="Client, pilote, libellé…" className="max-sm:w-full" />
          </>
        }
      >
        <thead>
          <tr>
            <TableHeaderCell>Opération</TableHeaderCell>
            <TableHeaderCell align="right">Encaissé</TableHeaderCell>
            <TableHeaderCell align="right">Sorties</TableHeaderCell>
            <TableHeaderCell align="right">Résultat</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {shown.length === 0 ? (
            <tr><td colSpan={4} className="py-10 text-center text-sm text-st-muted">Aucune opération ici.</td></tr>
          ) : shown.map((r) => r.kind === "vol" ? (
            <VolLigne key={`v-${r.vol.id}`} vol={r.vol} selected={open?.kind === "vol" && open.id === r.vol.id} onOpen={() => setOpen({ kind: "vol", id: r.vol.id })} />
          ) : (
            <TableRow key={`d-${r.depense.id}`} onClick={() => setOpen({ kind: "depense", id: r.depense.id })} selected={open?.kind === "depense" && open.id === r.depense.id}>
              <TableCell>
                <div className="flex min-w-0 items-center gap-3">
                  <DateTile date={r.depense.date} className="max-sm:hidden" />
                  <div className="min-w-0">
                    <p className="truncate font-[550]">{r.depense.description}</p>
                    <p className="text-[12px] text-st-muted"><Badge tone="gold" size="sm">Dépense</Badge></p>
                  </div>
                </div>
              </TableCell>
              <TableCell align="right"><span className="text-st-muted">—</span></TableCell>
              <TableCell align="right"><span className="st-num text-st-bad">−{eur(r.depense.montant)}</span></TableCell>
              <TableCell align="right"><span className="st-num font-[550] text-st-bad">{signed(-r.depense.montant)}</span></TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>

      {/* Pilotes tiers : à part, rien ne passe par la caisse */}
      {piloteVolsAn.length > 0 && (
        <section className="space-y-2.5">
          <SectionHeader title="Vols des pilotes tiers" />
          <Table>
            <thead>
              <tr>
                <TableHeaderCell>Vol</TableHeaderCell>
                <TableHeaderCell>Pilote</TableHeaderCell>
                <TableHeaderCell align="right">Montant</TableHeaderCell>
                <TableHeaderCell align="right">Paiement</TableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {piloteVolsAn.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-3">
                      <DateTile date={v.date.slice(0, 10)} className="max-sm:hidden" />
                      <div className="min-w-0">
                        <p className="truncate font-[550]">{v.client}</p>
                        <p className="text-[12px] text-st-muted">payé directement au pilote</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{v.pilote}</TableCell>
                  <TableCell align="right"><span className="st-num">{v.montant != null ? eur(v.montant) : "—"}</span></TableCell>
                  <TableCell align="right"><Badge tone={v.paye ? "success" : "warning"}>{v.paye ? "Payé" : "En attente"}</Badge></TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
          <p className="px-1 text-[12px] text-st-muted">Le client règle directement le pilote : 0 € dans la caisse de Fly Horizons, listé pour information.</p>
        </section>
      )}

      {rows.length === 0 && piloteVolsAn.length === 0 && (
        <EmptyState icon={Receipt} title="Aucune transaction" description="Les vols et les dépenses de l'année apparaîtront ici." />
      )}

      <Sheet value={sheetValue} onClose={close}>
        {(v) => v.kind === "depense" ? (
          <DepenseSheet
            key={v.id}
            depense={v.id === "new" ? null : depenses.find((d) => d.id === v.id) ?? null}
            today={today}
            onClose={close}
            onAdded={(d) => setDepenses((p) => [d, ...p])}
            onUpdated={(d) => setDepenses((p) => p.map((x) => (x.id === d.id ? d : x)))}
            onDeleted={(id) => setDepenses((p) => p.filter((x) => x.id !== id))}
          />
        ) : (
          (() => {
            const vol = vols.find((x) => x.id === v.id);
            return vol ? (
              <VolSheet
                key={vol.id}
                vol={vol}
                onClose={close}
                onSaved={(patch) => { patchVol(vol.id, patch); router.refresh(); }}
                onOpenClassique={() => openClassique(vol.id, vol.type_resa === "perso")}
                loadingClassique={loadingClassique}
              />
            ) : null;
          })()
        )}
      </Sheet>

      <ReservationDrawer
        reservation={classique}
        onClose={() => setClassique(null)}
        onStatusChange={() => {}}
        onFieldsChange={() => {}}
      />
    </div>
  );
}

// Rangée de cinq chiffres (CardSplit s'arrête à quatre) : 2 colonnes sur
// téléphone, 5 sur bureau, un trait fin entre chaque cellule.
function Split5({ children }: { children: React.ReactNode[] }) {
  return (
    <div className="grid grid-cols-2 border-t border-st-line lg:grid-cols-5">
      {children.map((cell, i) => (
        <div
          key={i}
          className={cn(
            "min-w-0 border-st-line px-4 py-3.5 sm:px-5 sm:py-4",
            i % 2 === 1 && "border-l",
            i >= 2 && "border-t",
            "lg:border-t-0",
            i > 0 ? "lg:border-l" : "lg:border-l-0",
            i === children.length - 1 && i % 2 === 0 && "max-lg:col-span-2",
          )}
        >
          {cell}
        </div>
      ))}
    </div>
  );
}

// ── Ligne du tableau : un vol ────────────────────────────────────────────────
function VolLigne({ vol, selected, onOpen }: { vol: LigneVol; selected: boolean; onOpen: () => void }) {
  const res = resultatVol(vol);
  const sortie = vol.confie ? vol.reversement : vol.cout_avion;
  const sortiesTotal = sortie != null || vol.remboursement > 0 ? (sortie ?? 0) + vol.remboursement : null;
  return (
    <TableRow onClick={onOpen} selected={selected}>
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <DateTile date={vol.date.slice(0, 10)} className="max-sm:hidden" />
          <div className="min-w-0">
            <p className="truncate font-[550]">{vol.client}</p>
            <p className="flex flex-wrap items-center gap-1.5 text-[12px] text-st-muted">
              {vol.confie ? <Badge tone="info" size="sm">Vol confié</Badge> : <Badge tone="info" size="sm">Vol</Badge>}
              <span className="truncate">
                {vol.confie
                  ? vol.pilote ?? ""
                  : vol.duree_reelle != null ? `${vol.duree_reelle} min` : "durée non renseignée"}
              </span>
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell align="right">
        {vol.paye > 0 ? (
          <>
            <p className="st-num font-[550]">{eur(vol.paye)}</p>
            <p className="st-num text-[12px] text-st-muted max-sm:hidden">
              {vol.stripe_net != null ? `net ${vol.stripe_fee_estimated ? "≈ " : ""}${eur(netVol({ ...vol, remboursement: 0 }))}` : "sans frais"}
            </p>
          </>
        ) : <span className="text-st-muted">—</span>}
      </TableCell>
      <TableCell align="right">
        {sortiesTotal != null && sortiesTotal > 0 ? (
          <>
            <p className="st-num text-st-bad">−{eur(sortiesTotal)}</p>
            {vol.remboursement > 0 && <p className="st-num text-[12px] text-st-muted max-sm:hidden">dont {eur(vol.remboursement)} remboursés</p>}
          </>
        ) : <span className="text-st-muted">—</span>}
      </TableCell>
      <TableCell align="right">
        {res != null ? (
          <p className={cn("st-num font-[550]", toneOf(res))}>{signed(res)}</p>
        ) : (
          <p className="text-[12px] text-st-muted">{vol.confie ? "à virer" : "coût à renseigner"}</p>
        )}
      </TableCell>
    </TableRow>
  );
}

// ── « À virer » : une ligne par vol confié, saisie rapide du virement ─────────
function AVirerLigne({ r, vol, onSaved, onOpen }: {
  r: LigneReversement; vol: LigneVol;
  onSaved: (montant: number | null, le: string | null) => void;
  onOpen: () => void;
}) {
  const [saisie, setSaisie] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function save() {
    setError("");
    start(async () => {
      const res = await setReversementPilote(r.id, num(saisie));
      if (res.error) { setError(res.error); return; }
      onSaved(res.montant ?? null, res.le ?? null);
      setSaisie("");
    });
  }
  function copyIban(iban: string) {
    navigator.clipboard?.writeText(iban.replace(/\s+/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center sm:px-5">
      <div className="min-w-0">
        <p className="truncate font-[550]">{r.pilote}</p>
        {r.iban ? (
          <button type="button" onClick={() => copyIban(r.iban!)} title="Copier l'IBAN" className="cursor-pointer font-mono text-[12px] text-st-muted hover:text-st-text">
            {copied ? "IBAN copié" : r.iban}
          </button>
        ) : <p className="text-[12px] text-st-warn">IBAN non renseigné</p>}
      </div>
      <button type="button" onClick={onOpen} className="min-w-0 cursor-pointer text-left text-[12.5px] text-st-muted hover:text-st-text">
        <span className="block truncate">{r.client} · vol du {longDate(r.date)}</span>
        <span className="block">Encaissé {eur(r.encaisse)}{!vol.effectue && " · vol pas encore effectué"}</span>
      </button>
      <div>
        <div className="flex items-center gap-2">
          <Input
            inputMode="decimal" placeholder="Montant €" value={saisie} onChange={(e) => setSaisie(e.target.value)}
            aria-label={`Montant viré à ${r.pilote}`} className="!min-h-[34px] w-28 text-right !py-1.5"
          />
          <Button size="sm" loading={pending} disabled={!(num(saisie) > 0)} onClick={save}>
            <Check />Marquer viré
          </Button>
        </div>
        {error && <p className="mt-1 text-xs text-st-bad">{error}</p>}
      </div>
    </div>
  );
}

// ── Tiroir d'un vol ──────────────────────────────────────────────────────────
function VolSheet({ vol, onClose, onSaved, onOpenClassique, loadingClassique }: {
  vol: LigneVol;
  onClose: () => void;
  onSaved: (patch: Partial<LigneVol>) => void;
  onOpenClassique: () => void;
  loadingClassique: boolean;
}) {
  const [vire, setVire] = useState(vol.reversement != null ? String(vol.reversement) : "");
  const [remb, setRemb] = useState(vol.remboursement > 0 ? String(vol.remboursement) : "");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, start] = useTransition();

  // Aperçu en direct, avant enregistrement.
  const draft: LigneVol = {
    ...vol,
    remboursement: round2(num(remb)),
    reversement: vol.confie ? (num(vire) > 0 ? round2(num(vire)) : null) : vol.reversement,
  };
  const res = resultatVol(draft);
  const dirty = draft.remboursement !== vol.remboursement || (vol.confie && draft.reversement !== vol.reversement);
  const fee = vol.stripe_net != null ? vol.stripe_fee ?? 0 : 0;
  const partPct = !vol.confie && vol.part_pilote_pct != null ? vol.part_pilote_pct : null;

  function save() {
    setMsg(null);
    start(async () => {
      const patch: Partial<LigneVol> = {};
      if (draft.remboursement !== vol.remboursement) {
        const r = await updateReservationAllFields(vol.id, {}, { remboursement: draft.remboursement });
        if ("error" in r && r.error) { setMsg({ text: "Erreur : " + r.error, ok: false }); return; }
        patch.remboursement = draft.remboursement;
        patch.net_client = round2(vol.paye - draft.remboursement);
      }
      if (vol.confie && draft.reversement !== vol.reversement) {
        const r = await setReversementPilote(vol.id, draft.reversement);
        if (r.error) { setMsg({ text: "Erreur : " + r.error, ok: false }); return; }
        patch.reversement = r.montant ?? null;
        patch.reversement_at = r.le ?? null;
      }
      onSaved(patch);
      setMsg({ text: "Enregistré", ok: true });
    });
  }

  return (
    <>
      <SheetHeader
        title={vol.client}
        subtitle={vol.confie ? `Confié à ${vol.pilote ?? "un pilote"} · réglé à Fly Horizons` : `Vol du ${longDate(vol.date)}`}
        leading={<DateTile date={vol.date.slice(0, 10)} />}
        onClose={onClose}
      />
      <SheetBody>
        <SheetHero
          label={vol.confie ? "Bénéfice sur ce vol" : "Résultat de ce vol"}
          aside={<Badge tone="info">{vol.confie ? "Vol confié" : "Vol"}</Badge>}
          hint={
            res == null
              ? vol.confie ? "Saisis le montant viré au pilote pour voir le bénéfice" : "Coût avion inconnu : la durée réelle du vol manque"
              : vol.confie
                ? "Ce qui reste après le remboursement, les frais Stripe et le virement au pilote"
                : `Net encaissé ${eur(netVol(draft))} moins le coût avion ${eur(vol.cout_avion ?? 0)}`
          }
        >
          <span className={toneOf(res)}>{res == null ? "—" : signed(res)}</span>
        </SheetHero>

        {vol.confie && (
          <div className="space-y-3">
            <FormField
              id="tr-vire"
              label={`Viré à ${vol.pilote ?? "le pilote"}`}
              hint={vol.iban ? <>IBAN <span className="font-mono">{vol.iban}</span>{!vol.effectue && " · vol pas encore effectué"}</> : "IBAN non renseigné"}
            >
              <Input id="tr-vire" inputMode="decimal" placeholder="0 €" value={vire} onChange={(e) => setVire(e.target.value)} className="text-right" />
            </FormField>
          </div>
        )}
        <FormField id="tr-remb" label="Remboursé au client" hint="À renseigner si le client a été remboursé, en tout ou en partie.">
          <Input id="tr-remb" inputMode="decimal" placeholder="0 €" value={remb} onChange={(e) => setRemb(e.target.value)} className="text-right" />
        </FormField>

        {partPct != null && vol.cout_avion != null && vol.part_pilote != null && (
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-st-text-2">Part du pilote dans le coût avion</span>
              <span className="st-num font-[550]">{eur(vol.part_pilote)} sur {eur(vol.cout_avion)}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-st-surface">
              <div className="h-full rounded-full bg-st-ink" style={{ width: `${Math.min(100, partPct)}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-st-muted">
              {partPct}% payés par le pilote{vol.part_attendue_pct != null ? `, attendu environ ${vol.part_attendue_pct}%` : ""}. Les passagers couvrent le reste.
            </p>
          </div>
        )}

        <SheetRows>
          <SheetRow label="Montant dû"><span className="st-num">{vol.acompte != null ? eur(vol.acompte) : "—"}</span></SheetRow>
          <SheetRow label="Payé (brut)"><span className="st-num text-st-ok">{vol.paye > 0 ? "+" + eur(vol.paye) : "—"}</span></SheetRow>
          {vol.voucher_code && <SheetRow label="Voucher"><span className="font-mono text-[12.5px]">{vol.voucher_code}</span></SheetRow>}
          {vol.stripe_net != null && (
            <SheetRow label={vol.stripe_fee_estimated ? "Frais Stripe (estimés)" : "Frais Stripe"}>
              <span className="st-num text-st-bad">−{eur(fee)}</span>
            </SheetRow>
          )}
          <SheetRow label="Remboursé"><span className="st-num">{draft.remboursement > 0 ? "−" + eur(draft.remboursement) : eur(0)}</span></SheetRow>
          {vol.confie
            ? <SheetRow label="Viré au pilote"><span className="st-num">{draft.reversement != null ? "−" + eur(draft.reversement) : "—"}</span></SheetRow>
            : <SheetRow label="Coût avion"><span className="st-num">{vol.cout_avion != null ? "−" + eur(vol.cout_avion) : "—"}</span></SheetRow>}
          <SheetRow label="Durée">
            <span className="st-num">
              {vol.duree_reelle != null ? `${vol.duree_reelle} min` : "non renseignée"}
              {vol.duree != null && vol.duree_reelle != null && vol.duree_reelle !== vol.duree ? ` (prévu ${vol.duree})` : ""}
            </span>
          </SheetRow>
          {vol.passagers != null && <SheetRow label="Passagers"><span className="st-num">{vol.passagers}</span></SheetRow>}
        </SheetRows>

        {vol.confie && vol.reversement != null && vol.reversement_at && (
          <p className="text-[12.5px] text-st-muted">Virement enregistré le {longDate(vol.reversement_at)}.</p>
        )}
        {msg && (
          <p className={cn("rounded-[10px] px-3 py-2 text-[12.5px] font-medium", msg.ok ? "bg-st-ok-soft text-st-ok" : "bg-st-bad-soft text-st-bad")}>{msg.text}</p>
        )}
      </SheetBody>
      <SheetFooter>
        <div className="flex flex-col gap-2">
          {dirty && (
            <Button size="lg" fullWidth className="sm:h-[38px] sm:text-[13px]" loading={pending} onClick={save}>
              <Check />Enregistrer
            </Button>
          )}
          <Button variant="secondary" fullWidth loading={loadingClassique} onClick={onOpenClassique}>
            <ExternalLink />Fermer et ouvrir la réservation
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}

// ── Tiroir d'une dépense (ajout, modification, suppression) ──────────────────
function DepenseSheet({ depense, today, onClose, onAdded, onUpdated, onDeleted }: {
  depense: Depense | null;
  today: string;
  onClose: () => void;
  onAdded: (d: Depense) => void;
  onUpdated: (d: Depense) => void;
  onDeleted: (id: string) => void;
}) {
  const [montant, setMontant] = useState(depense ? String(depense.montant) : "");
  const [description, setDescription] = useState(depense?.description ?? "");
  const [date, setDate] = useState(depense?.date ?? today);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const m = num(montant);
    if (!(m > 0)) { setError("Montant invalide."); return; }
    if (!description.trim()) { setError("Description requise."); return; }
    start(async () => {
      const r = depense ? await updateDepense(depense.id, m, description, date) : await addDepense(m, description, date);
      if (r.error) { setError(r.error); return; }
      const next = { id: depense?.id ?? uuid(), montant: m, description: description.trim(), date };
      if (depense) onUpdated(next); else onAdded(next);
      onClose();
    });
  }
  function remove() {
    if (!depense) return;
    start(async () => {
      const r = await deleteDepense(depense.id);
      if (r.error) { setError(r.error); return; }
      onDeleted(depense.id);
      onClose();
    });
  }

  return (
    <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
      <SheetHeader title={depense ? "Modifier la dépense" : "Ajouter une dépense"} subtitle={depense ? longDate(depense.date) : "Sortie de caisse"} onClose={onClose} />
      <SheetBody>
        <FormField id="dep-desc" label="Description">
          <Input id="dep-desc" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex. SkyDemon mensuel" autoFocus={!depense} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField id="dep-montant" label="Montant (€)">
            <Input id="dep-montant" required inputMode="decimal" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="9,99" className="text-right" />
          </FormField>
          <FormField id="dep-date" label="Date">
            <Input id="dep-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
        </div>
        {error && <p className="rounded-[10px] bg-st-bad-soft px-3 py-2 text-[12.5px] font-medium text-st-bad">{error}</p>}
      </SheetBody>
      <SheetFooter>
        <div className="flex flex-col gap-2">
          <Button type="submit" size="lg" fullWidth className="sm:h-[38px] sm:text-[13px]" loading={pending}>
            {depense ? <><Check />Enregistrer</> : <><Plus />Ajouter</>}
          </Button>
          {depense && (
            <Button variant="danger" fullWidth disabled={pending} onClick={remove}>
              <Trash2 />Supprimer cette dépense
            </Button>
          )}
        </div>
      </SheetFooter>
    </form>
  );
}
