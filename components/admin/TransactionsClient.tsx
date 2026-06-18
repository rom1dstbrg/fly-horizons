"use client";

import { useState, useTransition } from "react";
import { TrendingUp, TrendingDown, Minus, Plus, Trash2 } from "lucide-react";
import { addDepense, deleteDepense } from "@/lib/actions/depenses";

export type LigneVol = {
  id: string;
  date: string;
  client: string;
  type_resa: "standard" | "perso";
  acompte: number | null;
  paye: number;
  remboursement: number;
  net_client: number;
  duree: number | null;
  duree_reelle: number | null;
  cout_avion: number | null;
  resultat: number | null;
  voucher_code: string | null;
  voucher_montant: number | null; // montant encaissé lors de l'achat du voucher
};

export type LigneVoucher = {
  id: string;
  date: string;
  destinataire: string;
  type: "boutique" | "cash" | "offered";
  minutes: number;
  montant: number | null;
  code: string;
};

export type Depense = {
  id: string;
  montant: number;
  description: string;
  date: string;
};

export type SoldeStats = {
  encaisse: number;
  rembourse: number;
  cout_avion: number;
  depenses: number;
  solde_net: number;
};

type FilterType = "tout" | "vols" | "vouchers" | "depenses";

type Ligne =
  | { kind: "vol";      data: LigneVol }
  | { kind: "voucher";  data: LigneVoucher }
  | { kind: "depense";  data: Depense };

function fmt(n: number) {
  return n.toLocaleString("fr-BE", { style: "currency", currency: "EUR" });
}

function KpiCard({ label, value, cls, sub }: { label: string; value: string; cls?: string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>
      <p className={`text-xl font-black ${cls ?? "text-foreground"}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

const DASH = <span className="text-muted-foreground">—</span>;

function Resultat({ v }: { v: number | null }) {
  if (v === null) return <span className="text-xs text-muted-foreground">—</span>;
  if (Math.abs(v) < 0.01) return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Minus size={11} />{fmt(0)}</span>;
  if (v > 0) return <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold"><TrendingUp size={11} />+{fmt(v)}</span>;
  return <span className="inline-flex items-center gap-1 text-xs text-red-500 font-semibold"><TrendingDown size={11} />{fmt(v)}</span>;
}

function VolRow({ vol }: { vol: LigneVol }) {
  const coveredByVoucher = !!vol.voucher_code && vol.paye === 0;
  return (
    <>
      <td className="px-3 py-3 font-medium text-foreground text-sm whitespace-nowrap">{vol.client}</td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-0.5">
          <span className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
            vol.type_resa === "perso" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"
          }`}>
            {vol.type_resa === "perso" ? "Sur mesure" : "Standard"}
          </span>
          {vol.voucher_code && (
            <span className="text-[10px] text-amber-600 font-mono">Voucher {vol.voucher_code}</span>
          )}
        </div>
      </td>
      {/* Dû */}
      <td className="px-3 py-3 text-right tabular-nums text-xs text-muted-foreground">
        {vol.acompte != null ? fmt(vol.acompte) : DASH}
      </td>
      {/* Versé */}
      <td className="px-3 py-3 text-right tabular-nums text-xs">
        {coveredByVoucher ? (
          <div>
            <span className="text-muted-foreground italic text-[10px]">vol offert</span>
            {vol.voucher_montant != null && (
              <p className="text-[10px] text-amber-600 mt-0.5">+{fmt(vol.voucher_montant)} à l&apos;achat</p>
            )}
          </div>
        ) : vol.paye > 0
          ? <span className="font-semibold text-emerald-600">+{fmt(vol.paye)}</span>
          : DASH
        }
      </td>
      {/* Remboursement */}
      <td className="px-3 py-3 text-right tabular-nums text-xs text-red-500">
        {vol.remboursement > 0 ? `−${fmt(vol.remboursement)}` : DASH}
      </td>
      {/* Net client */}
      <td className="px-3 py-3 text-right tabular-nums text-xs font-semibold text-foreground">
        {coveredByVoucher ? DASH : fmt(vol.net_client)}
      </td>
      {/* Durée */}
      <td className="px-3 py-3 text-right tabular-nums text-xs text-muted-foreground whitespace-nowrap">
        {vol.duree_reelle != null ? (
          <span>
            <span className="text-foreground font-medium">{vol.duree_reelle} min</span>
            {vol.duree != null && vol.duree_reelle !== vol.duree && (
              <span className={`ml-1 text-[10px] ${vol.duree_reelle > vol.duree ? "text-red-400" : "text-emerald-500"}`}>
                (prévu {vol.duree})
              </span>
            )}
          </span>
        ) : (
          <span className="italic text-muted-foreground/60 text-[10px]">non renseignée</span>
        )}
      </td>
      {/* Coût avion */}
      <td className="px-3 py-3 text-right tabular-nums text-xs text-amber-600">
        {vol.cout_avion != null ? `−${fmt(vol.cout_avion)}` : DASH}
      </td>
      {/* Résultat */}
      <td className="px-3 py-3 text-right"><Resultat v={vol.resultat} /></td>
    </>
  );
}

function VoucherRow({ v }: { v: LigneVoucher }) {
  const montant = v.montant ?? null;
  return (
    <>
      <td className="px-3 py-3 text-sm text-foreground">{v.destinataire}</td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-0.5">
          <span className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
            v.type === "boutique" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
            {v.type === "boutique" ? "Voucher boutique" : "Voucher cash"}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">{v.code} · {v.minutes} min</span>
        </div>
      </td>
      <td className="px-3 py-3 text-right text-xs text-muted-foreground">{DASH}</td>
      <td className="px-3 py-3 text-right tabular-nums text-xs font-semibold text-emerald-600">
        {montant != null ? `+${fmt(montant)}` : DASH}
      </td>
      <td className="px-3 py-3 text-right text-xs text-muted-foreground">{DASH}</td>
      <td className="px-3 py-3 text-right tabular-nums text-xs font-semibold text-emerald-600">
        {montant != null ? `+${fmt(montant)}` : DASH}
      </td>
      <td className="px-3 py-3 text-right text-xs text-muted-foreground">{DASH}</td>
      <td className="px-3 py-3 text-right text-xs text-muted-foreground">{DASH}</td>
      <td className="px-3 py-3 text-right">
        <Resultat v={montant} />
      </td>
    </>
  );
}

function DepenseRow({ d }: { d: Depense }) {
  return (
    <>
      <td className="px-3 py-3 text-sm text-foreground">{d.description}</td>
      <td className="px-3 py-3">
        <span className="inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-orange-50 text-orange-700 border-orange-200">
          Dépense
        </span>
      </td>
      <td className="px-3 py-3 text-right text-xs text-muted-foreground">{DASH}</td>
      <td className="px-3 py-3 text-right text-xs text-muted-foreground">{DASH}</td>
      <td className="px-3 py-3 text-right text-xs text-muted-foreground">{DASH}</td>
      <td className="px-3 py-3 text-right text-xs text-muted-foreground">{DASH}</td>
      <td className="px-3 py-3 text-right text-xs text-muted-foreground">{DASH}</td>
      <td className="px-3 py-3 text-right tabular-nums text-xs font-semibold text-orange-500">
        −{fmt(d.montant)}
      </td>
      <td className="px-3 py-3 text-right">
        <Resultat v={-d.montant} />
      </td>
    </>
  );
}

export function TransactionsClient({
  vols,
  vouchers,
  depenses: initialDepenses,
  soldeGlobal,
}: {
  vols: LigneVol[];
  vouchers: LigneVoucher[];
  depenses: Depense[];
  soldeGlobal: SoldeStats;
}) {
  const [depenses, setDepenses] = useState<Depense[]>(initialDepenses);
  const [filter, setFilter] = useState<FilterType>("tout");
  const [showForm, setShowForm] = useState(false);
  const [montant, setMontant] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [formError, setFormError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Solde global mis à jour en temps réel avec les dépenses locales
  const totalDepenses = depenses.reduce((s, d) => s + d.montant, 0);
  const soldeNet = Math.round((soldeGlobal.encaisse - soldeGlobal.rembourse - soldeGlobal.cout_avion - totalDepenses) * 100) / 100;

  function handleAddDepense(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const m = parseFloat(montant);
    if (isNaN(m) || m <= 0) { setFormError("Montant invalide."); return; }
    if (!description.trim()) { setFormError("Description requise."); return; }
    startTransition(async () => {
      const r = await addDepense(m, description, date);
      if (r.error) { setFormError(r.error); return; }
      setDepenses(prev => [{ id: crypto.randomUUID(), montant: m, description: description.trim(), date }, ...prev]);
      setMontant(""); setDescription("");
      setDate(new Date().toISOString().slice(0, 10));
      setShowForm(false);
    });
  }

  function handleDeleteDepense(id: string) {
    startTransition(async () => {
      const r = await deleteDepense(id);
      if (!r.error) setDepenses(prev => prev.filter(d => d.id !== id));
    });
  }

  // Fusion et tri par date desc
  const allLignes: Ligne[] = [
    ...vols.map(d => ({ kind: "vol" as const, data: d })),
    ...vouchers.filter(v => v.type !== "offered").map(d => ({ kind: "voucher" as const, data: d })),
    ...depenses.map(d => ({ kind: "depense" as const, data: d })),
  ].sort((a, b) => {
    const da = a.kind === "vol" ? a.data.date : a.kind === "voucher" ? a.data.date : a.data.date;
    const db = b.kind === "vol" ? b.data.date : b.kind === "voucher" ? b.data.date : b.data.date;
    return db.localeCompare(da);
  });

  const filtered = filter === "tout" ? allLignes
    : filter === "vols" ? allLignes.filter(l => l.kind === "vol")
    : filter === "vouchers" ? allLignes.filter(l => l.kind === "voucher")
    : allLignes.filter(l => l.kind === "depense");

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: "tout",      label: "Tout" },
    { key: "vols",      label: `Vols (${vols.length})` },
    { key: "vouchers",  label: `Vouchers (${vouchers.filter(v => v.type !== "offered").length})` },
    { key: "depenses",  label: `Dépenses (${depenses.length})` },
  ];

  return (
    <div className="space-y-5">
      {/* KPIs globaux */}
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Solde caisses Fly Horizons (cumulatif)</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label="Total encaissé" value={`+${fmt(soldeGlobal.encaisse)}`} cls="text-emerald-600" />
          <KpiCard label="Remboursements" value={soldeGlobal.rembourse > 0 ? `−${fmt(soldeGlobal.rembourse)}` : fmt(0)} cls="text-red-500" />
          <KpiCard
            label="Coûts avion"
            value={soldeGlobal.cout_avion > 0 ? `−${fmt(soldeGlobal.cout_avion)}` : "À renseigner"}
            cls={soldeGlobal.cout_avion > 0 ? "text-amber-600" : "text-muted-foreground"}
          />
          <KpiCard
            label="Dépenses autres"
            value={totalDepenses > 0 ? `−${fmt(totalDepenses)}` : fmt(0)}
            cls={totalDepenses > 0 ? "text-orange-500" : "text-muted-foreground"}
          />
          <KpiCard
            label="Solde net"
            value={`${soldeNet >= 0 ? "+" : ""}${fmt(soldeNet)}`}
            cls={soldeNet >= 0 ? "text-navy" : "text-red-600"}
          />
        </div>
      </div>

      {/* Barre filtres + bouton ajouter dépense */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filter === f.key
                  ? "bg-navy text-white"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setFormError(""); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
        >
          <Plus size={12} /> Ajouter une dépense
        </button>
      </div>

      {/* Formulaire dépense inline */}
      {showForm && (
        <form onSubmit={handleAddDepense} className="bg-card border border-border rounded-xl p-4 space-y-3">
          {formError && <p className="text-xs text-destructive">{formError}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Montant (€) *</label>
              <input
                type="number" step="0.01" min="0.01" required
                value={montant} onChange={e => setMontant(e.target.value)}
                placeholder="9.99"
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description *</label>
              <input
                type="text" required
                value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Ex. SkyDemon mensuel"
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Date *</label>
              <input
                type="date" required
                value={date} onChange={e => setDate(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit" disabled={isPending}
              className="px-4 py-2 rounded-lg bg-navy text-white text-xs font-semibold hover:bg-navy/90 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isPending ? "Enregistrement…" : "Ajouter"}
            </button>
            <button
              type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Tableau unifié */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl text-center py-14 text-sm text-muted-foreground">
          Aucune transaction.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="border-b border-border bg-secondary">
                <th className="text-left px-3 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Label</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-right px-3 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Dû</th>
                <th className="text-right px-3 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Versé</th>
                <th className="text-right px-3 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Remb.</th>
                <th className="text-right px-3 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Net client</th>
                <th className="text-right px-3 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Durée</th>
                <th className="text-right px-3 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Coût avion</th>
                <th className="text-right px-3 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Résultat</th>
                <th className="w-8 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map(ligne => {
                const rawDate = ligne.data.date.length === 10 ? ligne.data.date + "T12:00:00Z" : ligne.data.date;
                const dateStr = new Date(rawDate).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "2-digit" });

                if (ligne.kind === "vol") {
                  return (
                    <tr key={`vol-${ligne.data.id}`} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{dateStr}</td>
                      <VolRow vol={ligne.data} />
                      <td className="px-2" />
                    </tr>
                  );
                }
                if (ligne.kind === "voucher") {
                  return (
                    <tr key={`vc-${ligne.data.id}`} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{dateStr}</td>
                      <VoucherRow v={ligne.data} />
                      <td className="px-2" />
                    </tr>
                  );
                }
                return (
                  <tr key={`dep-${ligne.data.id}`} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{dateStr}</td>
                    <DepenseRow d={ligne.data} />
                    <td className="px-2 py-3 text-right">
                      <button
                        onClick={() => handleDeleteDepense(ligne.data.id)}
                        disabled={isPending}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-30"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
