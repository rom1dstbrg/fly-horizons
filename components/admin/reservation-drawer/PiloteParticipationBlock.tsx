"use client";

import { useMemo, useState, useTransition } from "react";
import { Wallet, Loader2, Check, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { setPiloteMontant, setPilotePaye } from "@/lib/actions/pilote-paiement";
import { evaluerPartPilote } from "@/lib/annonces-pilote";

// Vue admin (Romain) : lecture seule — l'argent est géré par le pilote.
export function PiloteParticipationInfo({
  piloteNom,
  montant,
  paye,
}: {
  piloteNom: string;
  montant: number | null;
  paye: boolean;
}) {
  return (
    <div className="mt-3 rounded-xl border border-navy/15 bg-navy/5 p-3.5 space-y-1.5">
      <p className="text-[10px] font-bold text-navy uppercase tracking-[1.5px] flex items-center gap-1.5">
        <Wallet size={11} />
        Participation aux frais — gérée par {piloteNom}
      </p>
      <p className="text-sm text-foreground">
        {montant != null ? <strong>{montant} €</strong> : <span className="text-muted-foreground text-xs">montant pas encore fixé</span>}
        {montant != null && (
          paye ? (
            <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs">
              <CheckCircle2 size={12} /> réglé au pilote
            </span>
          ) : (
            <span className="ml-2 inline-flex items-center gap-1 text-amber-600 text-xs">
              <XCircle size={12} className="text-amber-400" /> en attente
            </span>
          )
        )}
      </p>
      <p className="text-[10px] text-muted-foreground">Le client règle directement le pilote. 0 € pour Fly Horizons.</p>
    </div>
  );
}

// Bloc D · modèle A — le pilote fixe la participation aux frais et suit le paiement.
// L'argent va en direct sur son compte, rien ne passe par Fly Horizons.

export function PiloteParticipationBlock({
  reservationId,
  passagers,
  montantInit,
  partPctInit,
  payeInit,
  onChanged,
}: {
  reservationId: string;
  passagers: number;
  montantInit: number | null;
  partPctInit: number | null;
  payeInit: boolean;
  onChanged: (fields: { montant_pilote?: number; part_pilote_pct?: number | null; pilote_paye?: boolean }) => void;
}) {
  const pax = Math.max(1, passagers || 1);

  // Reconstruit le coût total depuis le montant client + le % pilote déjà enregistrés.
  const coutInit =
    montantInit != null && partPctInit != null && partPctInit < 100
      ? Math.round((montantInit / (1 - partPctInit / 100)) * 100) / 100
      : montantInit ?? "";

  const [cout, setCout] = useState<string>(coutInit === "" ? "" : String(coutInit));
  const [mode, setMode] = useState<"egal" | "perso">(partPctInit != null && Math.abs(partPctInit - 100 / (pax + 1)) > 1 ? "perso" : "egal");
  const [montantPerso, setMontantPerso] = useState<string>(montantInit != null ? String(montantInit) : "");
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [paye, setPaye] = useState(payeInit);
  const [isPending, startTransition] = useTransition();
  const [isPayePending, startPayeTransition] = useTransition();

  const coutN = parseFloat(cout) || 0;
  const montantClient = useMemo(() => {
    if (mode === "egal") return Math.round((coutN * pax) / (pax + 1) * 100) / 100;
    return parseFloat(montantPerso) || 0;
  }, [mode, coutN, pax, montantPerso]);

  const partPilote = Math.max(0, Math.round((coutN - montantClient) * 100) / 100);
  const check = coutN > 0 ? evaluerPartPilote(coutN, partPilote) : null;

  function show(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 5000);
  }

  function save() {
    if (!(montantClient > 0)) return show("Indiquez un coût total valide.", false);
    startTransition(async () => {
      const res = await setPiloteMontant(reservationId, montantClient, check ? check.pct : null);
      if (res.error) return show(res.error, false);
      onChanged({ montant_pilote: montantClient, part_pilote_pct: check ? check.pct : null });
      show("Participation enregistrée. Le client la voit sur sa page de suivi.", true);
    });
  }

  function togglePaye() {
    const next = !paye;
    startPayeTransition(async () => {
      const res = await setPilotePaye(reservationId, next);
      if (res.error) return show(res.error, false);
      setPaye(next);
      onChanged({ pilote_paye: next });
    });
  }

  const inputCls =
    "w-full h-8 px-2 rounded-md border border-border bg-white text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-navy/30";

  return (
    <div className="rounded-xl border border-navy/15 bg-navy/5 p-3.5 space-y-3">
      <p className="text-[10px] font-bold text-navy uppercase tracking-[1.5px] flex items-center gap-1.5">
        <Wallet size={11} />
        Participation aux frais
      </p>

      <div className="space-y-2">
        <label className="block text-[11px] font-semibold text-muted-foreground">Coût total estimé du vol (avion, carburant, taxes)</label>
        <div className="flex items-center gap-1.5">
          <input type="number" min={0} step={1} value={cout} onChange={(e) => setCout(e.target.value)} className={`${inputCls} w-28`} placeholder="0" />
          <span className="text-xs text-muted-foreground font-semibold">€</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
          <input type="radio" checked={mode === "egal"} onChange={() => setMode("egal")} className="accent-navy" />
          Partage à parts égales ({pax + 1} personnes à bord, vous compris)
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
          <input type="radio" checked={mode === "perso"} onChange={() => setMode("perso")} className="accent-navy" />
          Montant personnalisé pour le client
        </label>
        {mode === "perso" && (
          <div className="flex items-center gap-1.5 pl-5">
            <input type="number" min={0} step={1} value={montantPerso} onChange={(e) => setMontantPerso(e.target.value)} className={`${inputCls} w-28`} placeholder="0" />
            <span className="text-xs text-muted-foreground font-semibold">€</span>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-white border border-border p-2.5">
        <p className="text-xs text-muted-foreground">Le client règle</p>
        <p className="text-lg font-black text-navy">{montantClient > 0 ? `${montantClient.toFixed(2)} €` : "—"}</p>
        {check && (
          <p className={`text-[11px] mt-0.5 ${check.level === "ok" ? "text-muted-foreground" : "text-amber-700"}`}>
            {check.level === "ok" ? (
              `Votre part : ${partPilote.toFixed(2)} € (${check.pct} %)`
            ) : (
              <span className="inline-flex items-center gap-1">
                <AlertTriangle size={11} />
                {check.message}
              </span>
            )}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={isPending || !(montantClient > 0)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-navy text-white text-xs font-semibold hover:brightness-90 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
        Enregistrer le montant
      </button>

      <div className="pt-2 border-t border-navy/10">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={paye} disabled={isPayePending} onChange={togglePaye} className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer" />
          <span className="text-xs font-semibold text-foreground">Le client m&apos;a payé</span>
          {isPayePending && <Loader2 size={11} className="animate-spin text-muted-foreground" />}
        </label>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Le client vous règle directement (virement / QR / Payconiq). L&apos;argent va sur votre compte,
        Fly Horizons n&apos;encaisse rien et ne prend aucune commission.
      </p>

      {feedback && (
        <p className={`text-[11px] font-medium ${feedback.ok ? "text-emerald-600" : "text-red-600"}`}>{feedback.msg}</p>
      )}
    </div>
  );
}
