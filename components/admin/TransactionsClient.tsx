"use client";

import { useState, useTransition } from "react";
import { TrendingUp, TrendingDown, Minus, Plus, Trash2, Pencil, X, Check, Loader2 } from "lucide-react";
import { addDepense, deleteDepense, updateDepense } from "@/lib/actions/depenses";
import { getReservationForDrawer } from "@/lib/actions/reservation-edit";
import { ReservationDrawer, type DrawerReservation } from "@/components/admin/ReservationDrawer";
import { VolsPersoDrawer, type Reservation as PersoReservation } from "@/components/admin/VolsPersoClient";

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
  voucher_montant: number | null;
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
      <td className="px-3 py-3 text-right tabular-nums text-xs text-emerald-600">
        {vol.acompte != null ? fmt(vol.acompte) : DASH}
      </td>
      {/* Versé */}
      <td className="px-3 py-3 text-right tabular-nums text-xs">
        {coveredByVoucher ? (
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-semibold text-emerald-600">+{fmt(vol.paye)}</span>
            <span className="text-[10px] text-amber-600 font-mono">via {vol.voucher_code}</span>
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
      <td className={`px-3 py-3 text-right tabular-nums text-xs font-semibold ${
        vol.net_client > 0 ? "text-emerald-600"
        : vol.net_client < 0 ? "text-red-500"
        : "text-foreground"
      }`}>
        {vol.net_client !== 0 ? fmt(vol.net_client) : DASH}
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
      <td className="px-3 py-3 text-right tabular-nums text-xs text-red-500">
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

const inputCls = "w-full h-8 px-2 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-navy/30";

function DepenseRow({
  d,
  onEdit,
  onDelete,
  isPending,
}: {
  d: Depense;
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
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
      <td className="px-3 py-3 text-right tabular-nums text-xs font-semibold text-red-500">
        −{fmt(d.montant)}
      </td>
      <td className="px-3 py-3 text-right">
        <Resultat v={-d.montant} />
      </td>
      <td className="px-2 py-3">
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-navy hover:bg-navy/10 transition-colors cursor-pointer"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={onDelete}
            disabled={isPending}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-30"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </td>
    </>
  );
}

function DepenseEditRow({
  d,
  onSave,
  onCancel,
  isPending,
}: {
  d: Depense;
  onSave: (montant: number, description: string, date: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [montant, setMontant] = useState(String(d.montant));
  const [description, setDescription] = useState(d.description);
  const [date, setDate] = useState(d.date);

  return (
    <>
      <td className="px-3 py-2" colSpan={2}>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description"
          className={inputCls}
          autoFocus
        />
      </td>
      <td className="px-3 py-2" colSpan={5} />
      <td className="px-3 py-2">
        <input
          type="number"
          value={montant}
          onChange={e => setMontant(e.target.value)}
          step="0.01"
          min="0.01"
          placeholder="Montant"
          className={inputCls}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className={inputCls}
        />
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => onSave(parseFloat(montant), description, date)}
            disabled={isPending}
            className="p-1.5 rounded-lg bg-navy text-white hover:brightness-90 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          </button>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
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

  // Drawers vols
  const [stdDrawer, setStdDrawer] = useState<DrawerReservation | null>(null);
  const [persoDrawer, setPersoDrawer] = useState<PersoReservation | null>(null);
  const [loadingVolId, setLoadingVolId] = useState<string | null>(null);

  // Edition dépenses
  const [editingDepenseId, setEditingDepenseId] = useState<string | null>(null);

  // Solde global mis à jour en temps réel avec les dépenses locales
  const totalDepenses = depenses.reduce((s, d) => s + d.montant, 0);
  const soldeNet = Math.round((soldeGlobal.encaisse - soldeGlobal.rembourse - soldeGlobal.cout_avion - totalDepenses) * 100) / 100;

  async function openVolDrawer(vol: LigneVol) {
    if (loadingVolId) return;
    setLoadingVolId(vol.id);
    const isPerso = vol.type_resa === "perso";
    const result = await getReservationForDrawer(vol.id, isPerso);
    setLoadingVolId(null);
    if (!result.data) return;
    if (isPerso) {
      setPersoDrawer(result.data as unknown as PersoReservation);
    } else {
      setStdDrawer(result.data as unknown as DrawerReservation);
    }
  }

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

  function handleUpdateDepense(id: string, montant: number, description: string, date: string) {
    startTransition(async () => {
      const r = await updateDepense(id, montant, description, date);
      if (!r.error) {
        setDepenses(prev => prev.map(d => d.id === id ? { ...d, montant, description, date } : d));
        setEditingDepenseId(null);
      }
    });
  }

  // Fusion et tri par date desc
  const allLignes: Ligne[] = [
    ...vols.map(d => ({ kind: "vol" as const, data: d })),
    ...vouchers.filter(v => v.type !== "offered").map(d => ({ kind: "voucher" as const, data: d })),
    ...depenses.map(d => ({ kind: "depense" as const, data: d })),
  ].sort((a, b) => {
    const da = a.data.date;
    const db = b.data.date;
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
    <>
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
              cls={soldeGlobal.cout_avion > 0 ? "text-red-500" : "text-muted-foreground"}
            />
            <KpiCard
              label="Dépenses autres"
              value={totalDepenses > 0 ? `−${fmt(totalDepenses)}` : fmt(0)}
              cls={totalDepenses > 0 ? "text-red-500" : "text-muted-foreground"}
            />
            <KpiCard
              label="Solde net"
              value={`${soldeNet >= 0 ? "+" : ""}${fmt(soldeNet)}`}
              cls={soldeNet >= 0 ? "text-emerald-600" : "text-red-500"}
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
                  <th className="w-16 px-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map(ligne => {
                  const rawDate = ligne.data.date.length === 10 ? ligne.data.date + "T12:00:00Z" : ligne.data.date;
                  const dateStr = new Date(rawDate).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "2-digit" });

                  if (ligne.kind === "vol") {
                    const isLoading = loadingVolId === ligne.data.id;
                    return (
                      <tr
                        key={`vol-${ligne.data.id}`}
                        onClick={() => openVolDrawer(ligne.data)}
                        className="hover:bg-secondary/40 transition-colors cursor-pointer"
                      >
                        <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            {isLoading && <Loader2 size={11} className="animate-spin text-navy" />}
                            {dateStr}
                          </span>
                        </td>
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
                  // Dépense
                  const isEditing = editingDepenseId === ligne.data.id;
                  if (isEditing) {
                    return (
                      <tr key={`dep-${ligne.data.id}`} className="bg-amber-50/50">
                        <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{dateStr}</td>
                        <DepenseEditRow
                          d={ligne.data}
                          onSave={(m, desc, dt) => handleUpdateDepense(ligne.data.id, m, desc, dt)}
                          onCancel={() => setEditingDepenseId(null)}
                          isPending={isPending}
                        />
                      </tr>
                    );
                  }
                  return (
                    <tr key={`dep-${ligne.data.id}`} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{dateStr}</td>
                      <DepenseRow
                        d={ligne.data}
                        onEdit={() => setEditingDepenseId(ligne.data.id)}
                        onDelete={() => handleDeleteDepense(ligne.data.id)}
                        isPending={isPending}
                      />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer standard */}
      <ReservationDrawer
        reservation={stdDrawer}
        onClose={() => setStdDrawer(null)}
        onStatusChange={() => {}}
      />

      {/* Drawer sur mesure */}
      <VolsPersoDrawer
        reservation={persoDrawer}
        onClose={() => setPersoDrawer(null)}
        onStatusChange={() => {}}
        onFieldsChange={() => {}}
      />
    </>
  );
}
