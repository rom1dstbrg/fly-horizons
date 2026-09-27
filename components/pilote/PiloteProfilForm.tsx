"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, AlertCircle, ShieldCheck, Upload, KeyRound, Info, IdCard, User, Landmark, Mail, Settings } from "lucide-react";
import { updateMyPiloteProfile, uploadPiloteProfilPhoto } from "@/lib/actions/pilote-profil";
import { piloteLegalStatus } from "@/lib/pilote/legal";
import { Badge, Button, FormField, Input, PillTabs, SectionHeader, Select, SheetRow, SheetRows, Textarea } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import type { Pilote } from "@/types/database";

// Profil pilote en onglets (27/09, façon Nexus) : Licence (infos légales +
// documents), Profil (ce que voit le client), Paiement, Emails, Compte. Un seul
// état de formulaire : « Enregistrer » sauve tout, quel que soit l'onglet.
// Une fois vérifiés par Romain, licence / SEP / médical ne se modifient plus ici :
// le pilote envoie le nouveau document, Romain met les dates à jour en validant.

export type ProfilTab = "licence" | "profil" | "paiement" | "emails" | "compte";
export const PROFIL_TABS: ProfilTab[] = ["licence", "profil", "paiement", "emails", "compte"];

type LegalState = "error" | "warn" | "ok";

const legalCls: Record<LegalState, string> = {
  error: "border-st-bad focus:border-st-bad focus:ring-st-bad-soft",
  warn: "border-st-warn focus:border-st-warn focus:ring-st-warn-soft",
  ok: "",
};

const CLASSE: Record<string, string> = { classe1: "Classe 1", classe2: "Classe 2", lapl: "LAPL" };
const frDate = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
const toneCls = (s: LegalState) => (s === "error" ? "text-st-bad" : s === "warn" ? "text-st-warn" : "");

function LegalLabel({ children, state }: { children: React.ReactNode; state: LegalState }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {children}
      {state === "error" && <Badge tone="danger" size="sm">à compléter</Badge>}
      {state === "warn" && <Badge tone="warning" size="sm">expire bientôt</Badge>}
    </span>
  );
}

export function PiloteProfilForm({ pilote, documentsSlot, initialTab }: {
  pilote: Pilote;
  documentsSlot?: React.ReactNode;
  initialTab?: ProfilTab;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const locked = !!pilote.docs_verified_at;

  const [form, setForm] = useState({
    bio: pilote.bio ?? "",
    photo_url: pilote.photo_url ?? "",
    telephone: pilote.telephone ?? "",
    signature: pilote.signature ?? "",
    iban: pilote.iban ?? "",
    licence_numero: pilote.licence_numero ?? "",
    licence_expiration: pilote.licence_expiration ?? "",
    medical_expiration: pilote.medical_expiration ?? "",
    medical_classe: pilote.medical_classe ?? "",
    ratings: pilote.ratings ?? "",
  });

  // Statut recalculé en direct à partir des champs du formulaire.
  const legal = piloteLegalStatus({
    licence_numero: form.licence_numero || null,
    licence_expiration: form.licence_expiration || null,
    medical_expiration: form.medical_expiration || null,
    medical_classe: form.medical_classe || null,
    docs_status: pilote.docs_status,
    docs_verified_at: pilote.docs_verified_at,
    conditions_accepted_at: pilote.conditions_accepted_at,
  });

  const [tab, setTab] = useState<ProfilTab>(initialTab ?? (legal.ok ? "profil" : "licence"));
  function changeTab(t: ProfilTab) {
    setTab(t);
    setSaved(false);
    window.history.replaceState(null, "", `?onglet=${t}`);
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setSaved(false);
  };

  const stateOf = (name: "licence_numero" | "licence_expiration" | "medical_expiration" | "medical_classe"): LegalState => {
    const rel = legal.issues.filter((i) => i.field === name);
    if (rel.some((i) => i.severity === "error")) return "error";
    if (rel.some((i) => i.severity === "warn")) return "warn";
    return "ok";
  };

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
      if (res.error) { setError(res.error); return; }
      setSaved(true);
      router.refresh();
    });
  }

  const licenceAlerts = legal.issues.filter((i) => i.severity === "error").length;

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Statut légal, toujours visible */}
      <div className={cn("flex gap-2.5 rounded-[14px] px-4 py-3 text-[13px]", legal.ok ? "bg-st-ok-soft text-st-ok" : "bg-st-bad-soft text-st-bad")}>
        {legal.ok ? <ShieldCheck size={17} className="mt-px shrink-0" /> : <AlertCircle size={17} className="mt-px shrink-0" />}
        <div className="min-w-0">
          <p className="font-semibold">
            {legal.ok ? "Vous êtes en règle pour recevoir des vols." : "Profil incomplet : vous ne pouvez pas recevoir de vols."}
          </p>
          {legal.issues.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {legal.issues.map((i) => (
                <li key={i.code} className={cn("text-[12.5px] leading-snug", i.severity === "error" ? "text-st-bad" : "text-st-warn")}>{i.label}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <PillTabs
        value={tab}
        onChange={changeTab}
        items={[
          { key: "licence", label: "Licence", icon: IdCard, count: licenceAlerts || undefined },
          { key: "profil", label: "Profil", icon: User },
          { key: "paiement", label: "Paiement", icon: Landmark },
          { key: "emails", label: "Emails", icon: Mail },
          { key: "compte", label: "Compte", icon: Settings },
        ]}
      />

      {tab === "licence" && (
        <div className="space-y-7">
          <section className="space-y-3.5">
            <div>
              <SectionHeader title="Licence et médical" />
              <p className="mt-0.5 text-[12.5px] text-st-muted">
                {locked
                  ? "Vérifiés par Romain. Nouveau médical ou SEP prolongée : envoyez le document ci-dessous, Romain mettra vos dates à jour."
                  : "À remplir, puis à justifier avec vos documents ci-dessous."}
              </p>
            </div>

            {locked ? (
              <SheetRows>
                <SheetRow label="Numéro de licence">{pilote.licence_numero ?? "—"}</SheetRow>
                <SheetRow label="SEP valable jusqu'au" className={toneCls(stateOf("licence_expiration"))}>
                  {frDate(pilote.licence_expiration)}
                </SheetRow>
                <SheetRow label="Certificat médical" className={toneCls(stateOf("medical_expiration"))}>
                  {CLASSE[pilote.medical_classe ?? ""] ?? "—"} · jusqu&apos;au {frDate(pilote.medical_expiration)}
                </SheetRow>
              </SheetRows>
            ) : (
              <>
                <FormField id="p-licence" label={<LegalLabel state={stateOf("licence_numero")}>Numéro de licence</LegalLabel>}>
                  <Input id="p-licence" className={legalCls[stateOf("licence_numero")]} value={form.licence_numero} onChange={set("licence_numero")} placeholder="BE.FCL.PPL…." />
                </FormField>
                <FormField id="p-licexp" label={<LegalLabel state={stateOf("licence_expiration")}>Validité SEP</LegalLabel>}>
                  <Input id="p-licexp" type="date" className={legalCls[stateOf("licence_expiration")]} value={form.licence_expiration} onChange={set("licence_expiration")} />
                </FormField>
                <div className="grid grid-cols-1 gap-3.5 min-[420px]:grid-cols-2">
                  <FormField id="p-medclasse" label={<LegalLabel state={stateOf("medical_classe")}>Certificat médical</LegalLabel>}>
                    <Select id="p-medclasse" className={legalCls[stateOf("medical_classe")]} value={form.medical_classe} onChange={set("medical_classe")}>
                      <option value="">Choisir la classe</option>
                      <option value="classe1">Classe 1</option>
                      <option value="classe2">Classe 2</option>
                      <option value="lapl">LAPL</option>
                    </Select>
                  </FormField>
                  <FormField id="p-medexp" label={<LegalLabel state={stateOf("medical_expiration")}>Validité médical</LegalLabel>}>
                    <Input id="p-medexp" type="date" className={legalCls[stateOf("medical_expiration")]} value={form.medical_expiration} onChange={set("medical_expiration")} />
                  </FormField>
                </div>
              </>
            )}

            <FormField id="p-ratings" label="Autres qualifications">
              <Input id="p-ratings" value={form.ratings} onChange={set("ratings")} placeholder="Night, IR, Radio FR/EN" />
            </FormField>

            <div className="flex gap-2.5 rounded-[14px] bg-st-info-soft px-4 py-3 text-[12.5px] leading-snug text-st-info">
              <Info size={16} className="mt-px shrink-0" />
              <p>
                <strong className="font-semibold">Expérience récente :</strong> pour emmener des passagers, vous devez avoir fait au moins
                3 décollages et 3 atterrissages dans les 90 jours avant le vol (FCL.060). C&apos;est à vous de le vérifier avant chaque vol :
                vous le confirmez dans la déclaration avant vol.
              </p>
            </div>
          </section>

          {documentsSlot}
        </div>
      )}

      {tab === "profil" && (
        <section className="space-y-3.5">
          <div>
            <SectionHeader title="Ce que voient les clients" />
            <p className="mt-0.5 text-[12.5px] text-st-muted">Affiché sur vos annonces et sur la page du vol du client.</p>
          </div>
          <FormField id="p-photo" label="Photo" error={photoError || undefined}>
            <div className="flex items-center gap-3">
              {form.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.photo_url} alt="" className="h-14 w-14 shrink-0 rounded-full border border-st-line object-cover" />
              ) : (
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-st-ink text-[15px] font-semibold text-white">
                  {pilote.nom.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                </span>
              )}
              <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoFile} className="hidden" />
              <Button variant="secondary" onClick={() => photoInputRef.current?.click()} loading={uploadingPhoto}>
                {!uploadingPhoto && <Upload />} {form.photo_url ? "Changer la photo" : "Envoyer une photo"}
              </Button>
            </div>
          </FormField>
          <FormField id="p-bio" label="Bio courte">
            <Textarea id="p-bio" className="min-h-28 resize-y" value={form.bio} onChange={set("bio")} placeholder="Pilote en formation ATPL, basé à Charleroi…" />
          </FormField>
          <FormField id="p-tel" label="Téléphone" hint="Pour que Romain et vos clients puissent vous joindre.">
            <Input id="p-tel" type="tel" value={form.telephone} onChange={set("telephone")} placeholder="+32 4xx xx xx xx" />
          </FormField>
        </section>
      )}

      {tab === "paiement" && (
        <section className="space-y-3.5">
          <div>
            <SectionHeader title="Paiement de vos annonces" />
            <p className="mt-0.5 text-[12.5px] text-st-muted">Le client vous règle directement sur cet IBAN : un QR de virement est généré pour lui.</p>
          </div>
          <FormField id="p-iban" label="IBAN">
            <Input id="p-iban" value={form.iban} onChange={set("iban")} placeholder="BE.. .... .... ...." />
          </FormField>
        </section>
      )}

      {tab === "emails" && (
        <section className="space-y-3.5">
          <div>
            <SectionHeader title="Emails aux clients" />
            <p className="mt-0.5 text-[12.5px] text-st-muted">Ajoutée en bas des messages que vous envoyez depuis l&apos;espace pilote.</p>
          </div>
          <FormField id="p-signature" label="Signature" hint="Vide : signature par défaut (nom · Pilote · téléphone).">
            <Textarea
              id="p-signature"
              className="min-h-24 resize-y"
              value={form.signature}
              onChange={set("signature")}
              placeholder={`${pilote.nom} · Pilote${form.telephone ? ` · ${form.telephone}` : ""}`}
            />
          </FormField>
        </section>
      )}

      {tab === "compte" && (
        <section className="space-y-3.5">
          <SectionHeader title="Compte" />
          <SheetRows>
            <SheetRow label="Email de connexion">{pilote.email}</SheetRow>
            <SheetRow label="Charte pilote">
              {pilote.conditions_accepted_at
                ? `Acceptée le ${new Date(pilote.conditions_accepted_at).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}${pilote.conditions_version ? ` (version ${pilote.conditions_version})` : ""}`
                : "Non acceptée"}
            </SheetRow>
          </SheetRows>
          <Link href="/pilote/mot-de-passe" className="flex items-center gap-3 rounded-[14px] border border-st-line bg-white px-4 py-3 text-[13.5px] font-medium text-st-text transition-colors hover:bg-st-surface">
            <KeyRound size={17} className="text-st-muted" />
            Changer mon mot de passe
          </Link>
        </section>
      )}

      {tab !== "compte" && (
        <div className="space-y-3 border-t border-st-line pt-4">
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
        </div>
      )}
    </form>
  );
}
