"use client";

import { useMemo, useState, useTransition } from "react";
import { createAnnonce } from "@/lib/actions/annonces";
import { evaluerPartPilote } from "@/lib/annonces-pilote";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ShieldAlert, ShieldCheck, PlaneTakeoff } from "lucide-react";

const DUREES = [30, 60, 90, 120];

export function AnnonceForm({ onDone }: { onDone: () => void }) {
  const [prixTotal, setPrixTotal] = useState("");
  const [partPilote, setPartPilote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const check = useMemo(
    () => evaluerPartPilote(parseFloat(prixTotal) || 0, partPilote === "" ? -1 : parseFloat(partPilote) || 0),
    [prixTotal, partPilote]
  );
  // Avant toute saisie de la part, on n'affiche ni blocage ni avertissement
  const showCheck = prixTotal !== "" && partPilote !== "";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createAnnonce({
        date_vol: fd.get("date_vol") as string,
        heure_vol: fd.get("heure_vol") as string,
        duree: Number(fd.get("duree")),
        places: Number(fd.get("places")),
        prix_total: parseFloat(prixTotal),
        part_pilote: parseFloat(partPilote),
      });
      if (result?.error) { setError(result.error); return; }
      onDone();
    });
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-5 space-y-5">
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">Date *</Label>
          <Input name="date_vol" type="date" required min={today} className="bg-input border-border" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">Heure *</Label>
          <Input name="heure_vol" type="time" required className="bg-input border-border" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">Durée *</Label>
          <select name="duree" required defaultValue={60}
            className="w-full h-10 bg-input border border-border text-foreground rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
            {DUREES.map(d => <option key={d} value={d}>{d} minutes</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">Places passagers *</Label>
          <select name="places" required defaultValue={1}
            className="w-full h-10 bg-input border border-border text-foreground rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
            {[1, 2, 3].map(p => <option key={p} value={p}>{p} place{p > 1 ? "s" : ""}</option>)}
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">Prix total du vol (€) *</Label>
          <Input
            type="number" min="0" step="0.01" required placeholder="300"
            value={prixTotal} onChange={e => setPrixTotal(e.target.value)}
            className="bg-input border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">Votre part payée (€) *</Label>
          <Input
            type="number" min="0" step="0.01" required placeholder="90"
            value={partPilote} onChange={e => setPartPilote(e.target.value)}
            className="bg-input border-border"
          />
        </div>
      </div>

      {showCheck && (
        <div className={`flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm border ${
          check.level === "block" ? "bg-red-50 border-red-200 text-red-700"
          : check.level === "warn" ? "bg-amber-50 border-amber-200 text-amber-700"
          : "bg-emerald-50 border-emerald-200 text-emerald-700"
        }`}>
          {check.level === "block" && <ShieldAlert size={16} className="shrink-0 mt-0.5" />}
          {check.level === "warn"  && <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
          {check.level === "ok"    && <ShieldCheck size={16} className="shrink-0 mt-0.5" />}
          <div>
            <p className="font-semibold">
              {check.level === "ok" ? `Votre part : ${check.pct}%` : (check.message ?? "")}
            </p>
            {check.level !== "ok" && partPilote !== "" && (
              <p className="text-xs opacity-80 mt-0.5">Part actuelle : {check.pct}%</p>
            )}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || check.level === "block"}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-[#e6a800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <PlaneTakeoff size={14} />
        {isPending ? "Publication..." : "Publier ce vol"}
      </button>
    </form>
  );
}
