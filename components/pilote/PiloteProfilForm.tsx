"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, AlertCircle, Upload } from "lucide-react";
import { updateMyPiloteProfile, uploadPiloteProfilPhoto } from "@/lib/actions/pilote-profil";
import { piloteLegalStatus } from "@/lib/pilote/legal";
import { FormSection, FormGrid, FormField, FormFooter } from "@/components/admin/ui";
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    bio: pilote.bio ?? "",
    photo_url: pilote.photo_url ?? "",
    telephone: pilote.telephone ?? "",
    signature: pilote.signature ?? "",
    iban: pilote.iban ?? "",
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

  async function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError("");
    setUploadingPhoto(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadPiloteProfilPhoto(fd);
    setUploadingPhoto(false);
    if (res.error) { setPhotoError(res.error); return; }
    setForm((f) => ({ ...f, photo_url: res.url! }));
    setSaved(false);
  }

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
        className={`rounded-[10px] border border-navy/15 p-4 ${
          legal.ok ? "bg-emerald-50/60" : "bg-red-50/60"
        }`}
      >
        <p className={`text-sm font-semibold ${legal.ok ? "text-emerald-900" : "text-red-900"}`}>
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
      <div className="rounded-[10px] border border-navy/15 bg-card p-5">
        <FormSection
          title="Informations légales"
          description="Déclaratif. Ces champs doivent être remplis et à jour pour recevoir des vols."
        >
          <FormGrid cols={2}>
            <FormField label={<>Numéro de licence <LabelMark state={licNumState} /></>}>
              <input className={legalField(licNumState)} value={form.licence_numero} onChange={set("licence_numero")} placeholder="BE.FCL.PPL...." />
            </FormField>
            <FormField label="Qualifications / ratings">
              <input className={field} value={form.ratings} onChange={set("ratings")} placeholder="SEP(land), Night, Radio FR/EN" />
            </FormField>
            <FormField label={<>Expiration licence / SEP <LabelMark state={licExpState} /></>}>
              <input type="date" className={legalField(licExpState)} value={form.licence_expiration} onChange={set("licence_expiration")} />
            </FormField>
            <FormField label={<>Expiration certificat médical <LabelMark state={medExpState} /></>}>
              <input type="date" className={legalField(medExpState)} value={form.medical_expiration} onChange={set("medical_expiration")} />
            </FormField>
          </FormGrid>
        </FormSection>
      </div>

      {/* Coordonnées & présentation */}
      <div className="rounded-[10px] border border-navy/15 bg-card p-5">
        <FormSection title="Coordonnées & présentation">
          <FormGrid cols={2}>
            <FormField label="Téléphone">
              <input className={field} value={form.telephone} onChange={set("telephone")} placeholder="+32 4xx xx xx xx" />
            </FormField>
            <FormField label="IBAN (participation aux frais)" hint="Le client vous règle directement dessus. Un QR de virement est généré pour lui.">
              <input className={field} value={form.iban} onChange={set("iban")} placeholder="BE.. .... .... ...." />
            </FormField>
            <FormField label="Photo" hint="Visible par le client sur la page de son vol." className="sm:col-span-2">
              <div className="flex items-start gap-3">
                {form.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.photo_url}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover border border-navy/15 shrink-0"
                  />
                )}
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      className={field}
                      value={form.photo_url}
                      onChange={set("photo_url")}
                      placeholder="https://... (lien direct vers une image)"
                    />
                    <span className="text-xs text-muted-foreground shrink-0">ou</span>
                    <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoFile} className="hidden" />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="h-9 px-3 rounded-lg border border-navy/15 bg-card text-xs font-semibold text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {uploadingPhoto ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                      Envoyer une photo
                    </button>
                  </div>
                  {photoError && <p className="text-[11px] text-destructive">{photoError}</p>}
                </div>
              </div>
            </FormField>
            <FormField label="Bio courte" className="sm:col-span-2">
              <textarea
                className={`${field} h-auto py-2 min-h-[80px] resize-y`}
                value={form.bio}
                onChange={set("bio")}
                placeholder="Pilote en formation ATPL, basé à Charleroi..."
              />
            </FormField>
            <FormField
              label="Signature (emails aux clients)"
              hint="Ajoutée en bas de vos messages au client. Laissez vide pour la signature par défaut (nom · Pilote · téléphone)."
              className="sm:col-span-2"
            >
              <textarea
                className={`${field} h-auto py-2 min-h-[60px] resize-y`}
                value={form.signature}
                onChange={set("signature")}
                placeholder={`${pilote.nom} · Pilote${form.telephone ? ` · ${form.telephone}` : ""}`}
              />
            </FormField>
          </FormGrid>
        </FormSection>
      </div>

      {saved && (
        <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2">
          <Check size={14} className="shrink-0" />
          Profil enregistré.
        </div>
      )}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      <FormFooter pending={isPending} submitLabel="Enregistrer" />

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
