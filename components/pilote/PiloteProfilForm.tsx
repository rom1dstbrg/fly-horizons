"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, AlertCircle, ShieldCheck, Upload, KeyRound } from "lucide-react";
import { updateMyPiloteProfile, uploadPiloteProfilPhoto } from "@/lib/actions/pilote-profil";
import { piloteLegalStatus } from "@/lib/pilote/legal";
import { Badge, Button, FormField, Input, SectionHeader, Textarea } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import type { Pilote } from "@/types/database";

type LegalState = "error" | "warn" | "ok";

// Bordure d'un champ légal selon son état recalculé en direct.
const legalCls: Record<LegalState, string> = {
  error: "border-st-bad focus:border-st-bad focus:ring-st-bad-soft",
  warn: "border-st-warn focus:border-st-warn focus:ring-st-warn-soft",
  ok: "",
};

function LegalLabel({ children, state }: { children: React.ReactNode; state: LegalState }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {children}
      {state === "error" && <Badge tone="danger" size="sm">à compléter</Badge>}
      {state === "warn" && <Badge tone="warning" size="sm">expire bientôt</Badge>}
    </span>
  );
}

// Formulaire Studio : pas de cartes, sections titrées, validation pleine largeur.
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
  const stateOf = (name: "licence_numero" | "licence_expiration" | "medical_expiration"): LegalState => {
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
    <form onSubmit={submit} className="space-y-7">
      {/* Statut légal */}
      <div className={cn("flex gap-2.5 rounded-[14px] px-4 py-3.5 text-[13px]", legal.ok ? "bg-st-ok-soft text-st-ok" : "bg-st-bad-soft text-st-bad")}>
        {legal.ok ? <ShieldCheck size={17} className="mt-px shrink-0" /> : <AlertCircle size={17} className="mt-px shrink-0" />}
        <div className="min-w-0">
          <p className="font-semibold">
            {legal.ok ? "Vous êtes en règle pour recevoir des vols." : "Profil incomplet : vous ne pouvez pas recevoir de vols."}
          </p>
          {legal.issues.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {legal.issues.map((i) => (
                <li key={i.code} className={cn("text-[12.5px] leading-snug", i.severity === "error" ? "text-st-bad" : "text-st-warn")}>
                  {i.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Informations légales */}
      <section className="space-y-3.5">
        <div>
          <SectionHeader title="Informations légales" />
          <p className="mt-0.5 text-[12.5px] text-st-muted">Déclaratif : à remplir et à tenir à jour pour recevoir des vols.</p>
        </div>
        <FormField id="p-licence" label={<LegalLabel state={licNumState}>Numéro de licence</LegalLabel>}>
          <Input id="p-licence" className={legalCls[licNumState]} value={form.licence_numero} onChange={set("licence_numero")} placeholder="BE.FCL.PPL…." />
        </FormField>
        <div className="grid grid-cols-1 gap-3.5 min-[420px]:grid-cols-2">
          <FormField id="p-licexp" label={<LegalLabel state={licExpState}>Expiration licence / SEP</LegalLabel>}>
            <Input id="p-licexp" type="date" className={legalCls[licExpState]} value={form.licence_expiration} onChange={set("licence_expiration")} />
          </FormField>
          <FormField id="p-medexp" label={<LegalLabel state={medExpState}>Expiration médical</LegalLabel>}>
            <Input id="p-medexp" type="date" className={legalCls[medExpState]} value={form.medical_expiration} onChange={set("medical_expiration")} />
          </FormField>
        </div>
        <FormField id="p-ratings" label="Qualifications">
          <Input id="p-ratings" value={form.ratings} onChange={set("ratings")} placeholder="SEP(land), Night, Radio FR/EN" />
        </FormField>
      </section>

      {/* Coordonnées & présentation */}
      <section className="space-y-3.5">
        <SectionHeader title="Coordonnées et présentation" />
        <div className="grid grid-cols-1 gap-3.5 min-[420px]:grid-cols-2">
          <FormField id="p-tel" label="Téléphone">
            <Input id="p-tel" type="tel" value={form.telephone} onChange={set("telephone")} placeholder="+32 4xx xx xx xx" />
          </FormField>
          <FormField id="p-iban" label="IBAN">
            <Input id="p-iban" value={form.iban} onChange={set("iban")} placeholder="BE.. .... .... ...." />
          </FormField>
        </div>
        <p className="-mt-1.5 text-xs text-st-muted">Le client vous règle directement sur cet IBAN : un QR de virement est généré pour lui.</p>

        <FormField id="p-photo" label="Photo" hint="Visible par le client sur la page de son vol." error={photoError || undefined}>
          <div className="flex items-center gap-2.5">
            {form.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.photo_url} alt="" className="h-11 w-11 shrink-0 rounded-full border border-st-line object-cover" />
            ) : (
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-st-ink text-[13px] font-semibold text-white">
                {pilote.nom.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </span>
            )}
            <Input id="p-photo" className="min-w-0" value={form.photo_url} onChange={set("photo_url")} placeholder="Lien direct vers une image" />
            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoFile} className="hidden" />
            <Button variant="secondary" className="h-11" onClick={() => photoInputRef.current?.click()} loading={uploadingPhoto} aria-label="Envoyer une photo">
              {!uploadingPhoto && <Upload />}
              <span className="max-sm:hidden">Envoyer</span>
            </Button>
          </div>
        </FormField>

        <FormField id="p-bio" label="Bio courte">
          <Textarea id="p-bio" className="resize-y" value={form.bio} onChange={set("bio")} placeholder="Pilote en formation ATPL, basé à Charleroi…" />
        </FormField>
        <FormField
          id="p-signature"
          label="Signature des emails aux clients"
          hint="Ajoutée en bas de vos messages. Vide : signature par défaut (nom · Pilote · téléphone)."
        >
          <Textarea
            id="p-signature"
            className="min-h-16 resize-y"
            value={form.signature}
            onChange={set("signature")}
            placeholder={`${pilote.nom} · Pilote${form.telephone ? ` · ${form.telephone}` : ""}`}
          />
        </FormField>
      </section>

      <div className="space-y-3">
        {saved && (
          <p className="flex items-center gap-2 rounded-[12px] bg-st-ok-soft px-3.5 py-2.5 text-[13px] text-st-ok">
            <Check size={15} className="shrink-0" />
            Profil enregistré.
          </p>
        )}
        {error && <p className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">{error}</p>}

        <Button type="submit" size="lg" fullWidth loading={isPending} className="sm:h-[38px] sm:text-[13px]">
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-st-muted">
          <span>
            {pilote.conditions_accepted_at &&
              `Charte pilote acceptée le ${new Date(pilote.conditions_accepted_at).toLocaleDateString("fr-BE", { day: "2-digit", month: "long", year: "numeric" })}${pilote.conditions_version ? ` (version ${pilote.conditions_version})` : ""}.`}
          </span>
          <Link href="/pilote/mot-de-passe" className="inline-flex items-center gap-1 font-[550] text-st-ink hover:underline">
            <KeyRound size={13} />
            Changer mon mot de passe
          </Link>
        </div>
      </div>
    </form>
  );
}
