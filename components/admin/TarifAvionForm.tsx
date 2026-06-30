"use client";

import { useState, useTransition } from "react";
import { Trash2, Plus } from "lucide-react";
import { addTarifAvion, deleteTarifAvion } from "@/lib/actions/settings";

export type TarifAvion = {
  id: string;
  prix_heure: number;
  actif_depuis: string;
  note: string | null;
  created_at: string;
};

function fmt(n: number) {
  return n.toLocaleString("fr-BE", { style: "currency", currency: "EUR" });
}

export function TarifAvionForm({ tarifs: initial }: { tarifs: TarifAvion[] }) {
  const [tarifs, setTarifs] = useState<TarifAvion[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [prix, setPrix] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const sorted = [...tarifs].sort(
    (a, b) => new Date(b.actif_depuis).getTime() - new Date(a.actif_depuis).getTime()
  );
  const current = sorted[0];

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess(false);
    const p = parseFloat(prix);
    if (isNaN(p) || p <= 0) { setError("Prix invalide."); return; }
    if (!date) { setError("Date requise."); return; }
    startTransition(async () => {
      const r = await addTarifAvion(p, date, note || undefined);
      if (r.error) { setError(r.error); return; }
      setTarifs(prev => [...prev, {
        id: crypto.randomUUID(),
        prix_heure: p,
        actif_depuis: date,
        note: note || null,
        created_at: new Date().toISOString(),
      }]);
      setPrix(""); setDate(""); setNote("");
      setShowForm(false); setSuccess(true);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const r = await deleteTarifAvion(id);
      if (r.error) { setError(r.error); return; }
      setTarifs(prev => prev.filter(t => t.id !== id));
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Tarif avion (école)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ce que l&apos;école prélève. Utilisé pour calculer votre gain/perte sur chaque vol.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(v => !v); setError(""); setSuccess(false); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-medium hover:bg-navy/90 transition-colors cursor-pointer"
        >
          <Plus size={13} /> Nouveau tarif
        </button>
      </div>

      {success && (
        <p className="text-sm text-emerald-600 font-medium">Tarif ajouté avec succès.</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Tarif actuel */}
      {current && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-0.5">Tarif actuel</p>
            <p className="text-xl font-black text-emerald-700">{fmt(current.prix_heure)}<span className="text-sm font-medium">/h</span></p>
            {current.note && <p className="text-xs text-emerald-600 mt-0.5">{current.note}</p>}
          </div>
          <p className="text-xs text-emerald-600 font-medium">
            Depuis le {new Date(current.actif_depuis + "T12:00:00Z").toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      )}

      {/* Formulaire nouveau tarif */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Ajouter un tarif</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Prix (€/h) *</label>
              <input
                type="number" step="0.01" min="0" required
                value={prix} onChange={e => setPrix(e.target.value)}
                placeholder="256.00"
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Actif depuis *</label>
              <input
                type="date" required
                value={date} onChange={e => setDate(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Note</label>
              <input
                type="text"
                value={note} onChange={e => setNote(e.target.value)}
                placeholder="Ex. DA40 nouveau tarif"
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

      {/* Historique */}
      {tarifs.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary">
                <th className="text-left px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Actif depuis</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Prix/h</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Note</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sorted.map((t, i) => (
                <tr key={t.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(t.actif_depuis + "T12:00:00Z").toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" })}
                    {i === 0 && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">actuel</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-sm font-semibold text-foreground">{fmt(t.prix_heure)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{t.note ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={isPending || sorted.length === 1}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      title={sorted.length === 1 ? "Impossible de supprimer le seul tarif" : "Supprimer"}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </section>
  );
}
