"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { updateMyPiloteProfile } from "@/lib/actions/pilote-profil";
import { piloteLegalStatus } from "@/lib/pilote/legal";
import type { Pilote } from "@/types/database";

const fieldBase =
  "w-full h-9 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-navy/20";
const fieldByState: Record<"error" | "warn" | "ok", string> = {
  error: "border-red-400 bg-red-50",
  warn: "border-amber-400 bg-amber-50",
  ok: "border-border bg-[#f5f8ff]",
};
const field = `${fieldBase} ${fieldByState.ok}`;
const legalField = (s: "error" | "warn" | "ok") => `${fieldBase} ${fieldByState[s]}`;
const labelCls = "text-xs font-semibold text-muted-foreground flex items-center gap-1.5";

function LabelMark({ state }: { state: "error" | "warn" | "ok" }) {
  if (state === "error")
    return <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide">à compléter</span>;
  if (state === "warn")
    return <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">expire bientôt</span>;
  return null;
}

export function PiloteProfilForm({ pilote }: { pilote: Pilote }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    bio: pilote.bio ?? "",
    photo_url: pilote.photo_url ?? "",
    telephone: pilote.telephone ?? "",
    iban: pilote.iban ?? "",
    paylink: pilote.paylink ?? "",
    licence_numero: pilote.licence_numero ?? "",
    licence_expiration: pilote.licence_expiration ?? "",
    medical_expiration: pilote.medical_expiration ?? "",
    ratings: pilote.ratings ?? "",
  });

  // Statut recalculé en direct à partir des champs du formulaire.
  const legal = piloteLegalStatus({
    licence_numero: form.licence_numero || null,
    licence_expiration: form.licence_expiration || null,
    medical_expiration: form.medical_expiration || null,
    conditions_accepted_at: pilote.conditions_accepted_at,
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setSaved(false);
  };

  // État visuel d'un champ légal d'après le statut recalculé en direct.
  const stateOf = (name: "licence_numero" | "licence_expiration" | "medical_expiration"): "error" | "warn" | "ok" => {
    const rel = legal.issues.filter((i) => i.field === name);
    if (rel.some((i) => i.severity === "error")) return "error";
    if (rel.some((i) => i.severity === "warn")) return "warn";
    return "ok";
  };
  const licNumState = stateOf("licence_numero");
  const licExpState = stateOf("licence_expiration");
  const medExpState = stateOf("medical_expiration");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await updateMyPiloteProfile(form);
      if (res.error) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Statut légal */}
      <div
        className={`rounded-xl border p-4 ${
          legal.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
        }`}
      >
        <p className={`text-sm font-semibold ${legal.ok ? "text-emerald-800" : "text-red-800"}`}>
          {legal.ok ? "Vous êtes en règle pour recevoir des vols." : "Profil incomplet, vous ne pouvez pas recevoir de vols."}
        </p>
        {legal.issues.length > 0 && (
          <ul className="mt-2 space-y-1">
            {legal.issues.map((i) => (
              <li
                key={i.code}
                className={`flex items-center gap-1.5 text-xs ${
                  i.severity === "error" ? "text-red-700" : "text-amber-700"
                }`}
              >
                <AlertCircle size={12} className="shrink-0" />
                {i.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Informations légales */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Informations légales</h2>
        <p className="text-xs text-muted-foreground -mt-2">
          Déclaratif. Ces champs doivent être remplis et à jour pour recevoir des vols.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Numéro de licence <LabelMark state={licNumState} /></label>
            <input className={legalField(licNumState)} value={form.licence_numero} onChange={set("licence_numero")} placeholder="BE.FCL.PPL...." />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Qualifications / ratings</label>
            <input className={field} value={form.ratings} onChange={set("ratings")} placeholder="SEP(land), Night, Radio FR/EN" />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Expiration licence / SEP <LabelMark state={licExpState} /></label>
            <input type="date" className={legalField(licExpState)} value={form.licence_expiration} onChange={set("licence_expiration")} />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Expiration certificat médical <LabelMark state={medExpState} /></label>
            <input type="date" className={legalField(medExpState)} value={form.medical_expiration} onChange={set("medical_expiration")} />
          </div>
        </div>
      </div>

      {/* Coordonnées & présentation */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Coordonnées &amp; présentation</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Téléphone</label>
            <input className={field} value={form.telephone} onChange={set("telephone")} placeholder="+32 4xx xx xx xx" />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>IBAN (participation aux frais)</label>
            <input className={field} value={form.iban} onChange={set("iban")} placeholder="BE.. .... .... ...." />
            <p className="text-[11px] text-muted-foreground">Le client vous règle directement dessus. Un QR de virement est généré pour lui.</p>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Lien de paiement (optionnel)</label>
            <input className={field} value={form.paylink} onChange={set("paylink")} placeholder="https://payconiq.com/... ou revolut.me/..." />
            <p className="text-[11px] text-muted-foreground">Payconiq, Revolut… Si rempli, un bouton apparaît pour le client à côté du virement.</p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelCls}>Photo (URL)</label>
            <input className={field} value={form.photo_url} onChange={set("photo_url")} placeholder="https://..." />
            <p className="text-[11px] text-muted-foreground">Visible par le client sur la page de son vol.</p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelCls}>Bio courte</label>
            <textarea
              className={`${field} h-auto py-2 min-h-[80px] resize-y`}
              value={form.bio}
              onChange={set("bio")}
              placeholder="Pilote en formation ATPL, basé à Charleroi..."
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-[#e6a800] transition-colors disabled:opacity-60 cursor-pointer"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Enregistrer
        </button>
        {saved && <span className="text-xs font-medium text-emerald-600">Enregistré</span>}
        {error && <span className="text-xs font-medium text-destructive">{error}</span>}
      </div>

      {pilote.conditions_accepted_at && (
        <p className="text-[11px] text-muted-foreground">
          Charte pilote acceptée le{" "}
          {new Date(pilote.conditions_accepted_at).toLocaleDateString("fr-BE", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
          {pilote.conditions_version ? ` (version ${pilote.conditions_version})` : ""}.
        </p>
      )}
    </form>
  );
}
