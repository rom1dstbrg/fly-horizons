"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, AlertCircle, Upload, KeyRound, Info, IdCard, User, Landmark, Mail, Settings } from "lucide-react";
import { updateMyPiloteProfile, uploadPiloteProfilPhoto } from "@/lib/actions/pilote-profil";
import { piloteLegalStatus } from "@/lib/pilote/legal";
import type { ProfilTab } from "@/lib/pilote/profil-tabs";
import {
  Badge, Button, FormField, Input, PillTabs, SectionHeader, Select, SheetRow, SheetRows, StatCard, StatGrid, Textarea,
} from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import type { Pilote } from "@/types/database";

// Profil pilote (27/09), même mise en page que « Mes vols » : chiffres clés en
// haut, puis une grande carte. Bureau : menu des sections à gauche, contenu à
// droite (champs sur deux colonnes). Téléphone : onglets à pastille au-dessus.
// Un seul état de formulaire : « Enregistrer » sauve tout, quel que soit l'onglet.
// Une fois vérifiés par Romain, licence / SEP / médical ne se modifient plus ici :
// le pilote envoie le nouveau document, Romain met les dates à jour en validant.

type LegalState = "error" | "warn" | "ok";

const legalCls: Record<LegalState, string> = {
  error: "border-st-bad focus:border-st-bad focus:ring-st-bad-soft",
  warn: "border-st-warn focus:border-st-warn focus:ring-st-warn-soft",
  ok: "",
};

const CLASSE: Record<string, string> = { classe1: "Classe 1", classe2: "Classe 2", lapl: "LAPL" };
const frDate = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
const toneCls = (s: LegalState) => (s === "error" ? "text-st-bad" : s === "warn" ? "text-st-warn" : "");
const toneOf = (s: LegalState) => (s === "error" ? "bad" as const : s === "warn" ? "warn" as const : undefined);

const TABS: { key: ProfilTab; label: string; desc: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: "licence", label: "Licence", desc: "Licence, médical, documents", icon: IdCard },
  { key: "profil", label: "Profil", desc: "Ce que voient les clients", icon: User },
  { key: "paiement", label: "Paiement", desc: "IBAN des annonces", icon: Landmark },
  { key: "emails", label: "Emails", desc: "Signature des messages", icon: Mail },
  { key: "compte", label: "Compte", desc: "Connexion et charte", icon: Settings },
];

function LegalLabel({ children, state }: { children: React.ReactNode; state: LegalState }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {children}
      {state === "error" && <Badge tone="danger" size="sm">à compléter</Badge>}
      {state === "warn" && <Badge tone="warning" size="sm">expire bientôt</Badge>}
    </span>
  );
}

function Panel({ title, desc, children }: { title: string; desc?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <SectionHeader title={title} />
        {desc && <p className="mt-0.5 text-[12.5px] text-st-muted">{desc}</p>}
      </div>
      {children}
    </section>
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
  const errors = legal.issues.filter((i) => i.severity === "error");

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

  const docsLabel =
    pilote.docs_status === "verifies" ? "Vérifiés"
    : pilote.docs_status === "envoyes" ? (locked ? "Nouveau document envoyé" : "En vérification")
    : pilote.docs_status === "refuses" ? "Refusés" : "À envoyer";
  const docsTone = pilote.docs_status === "verifies" || (pilote.docs_status === "envoyes" && locked) ? undefined : pilote.docs_status === "envoyes" ? "warn" as const : "bad" as const;

  return (
    <form onSubmit={submit} className="space-y-5">
      <StatGrid>
        <StatCard
          label="Statut"
          value={legal.ok ? "En règle" : `${errors.length} point${errors.length > 1 ? "s" : ""} à régler`}
          tone={legal.ok ? "ok" : "bad"}
          hint={legal.ok ? "Vous pouvez recevoir des vols" : "Aucun vol en attendant"}
        />
        <StatCard label="Qualification SEP" value={frDate(form.licence_expiration || null)} tone={toneOf(stateOf("licence_expiration"))} hint="Valable jusqu'au" />
        <StatCard
          label="Certificat médical"
          value={frDate(form.medical_expiration || null)}
          tone={toneOf(stateOf("medical_expiration"))}
          hint={form.medical_classe ? `${CLASSE[form.medical_classe]}, valable jusqu'au` : "Classe à renseigner"}
        />
        <StatCard
          label="Documents"
          value={docsLabel}
          tone={docsTone}
          hint={pilote.docs_verified_at ? `Vérifiés le ${frDate(pilote.docs_verified_at)}` : "Vérifiés par Romain"}
        />
      </StatGrid>

      {!legal.ok && (
        <div className="flex gap-2.5 rounded-[14px] bg-st-bad-soft px-4 py-3 text-[13px] text-st-bad">
          <AlertCircle size={17} className="mt-px shrink-0" />
          <ul className="space-y-0.5">
            {errors.map((i) => <li key={i.code}>{i.label}</li>)}
          </ul>
        </div>
      )}

      {/* Téléphone : onglets à pastille */}
      <PillTabs
        className="lg:hidden"
        value={tab}
        onChange={changeTab}
        items={TABS.map((t) => ({ key: t.key, label: t.label, icon: t.icon, count: t.key === "licence" ? errors.length || undefined : undefined }))}
      />

      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
        {/* Bureau : menu des sections */}
        <nav aria-label="Sections du profil" className="hidden rounded-[20px] border border-st-line bg-white p-2 shadow-st-sm lg:sticky lg:top-6 lg:block">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = t.key === tab;
            const count = t.key === "licence" ? errors.length : 0;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => changeTab(t.key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors",
                  active ? "bg-st-surface" : "hover:bg-st-surface/70",
                )}
              >
                <Icon size={18} className={active ? "text-st-ink" : "text-st-muted"} />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[13.5px]", active ? "font-semibold text-st-text" : "font-medium text-st-text-2")}>{t.label}</span>
                  <span className="block truncate text-[11.5px] text-st-muted">{t.desc}</span>
                </span>
                {count > 0 && (
                  <span className="st-num grid h-5 min-w-5 place-items-center rounded-full bg-st-bad px-1.5 text-[11px] font-semibold text-white">{count}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Contenu de la section */}
        <div className="rounded-[20px] border border-st-line bg-white shadow-st-sm">
          <div className="p-4 sm:p-6">
            {tab === "licence" && (
              <div className="grid gap-8 xl:grid-cols-2">
                <Panel
                  title="Licence et médical"
                  desc={locked
                    ? "Vérifiés par Romain. Nouveau médical ou SEP prolongée : envoyez le document, Romain mettra vos dates à jour."
                    : "À remplir, puis à justifier avec vos documents."}
                >
                  {locked ? (
                    <SheetRows>
                      <SheetRow label="Numéro de licence">{pilote.licence_numero ?? "—"}</SheetRow>
                      <SheetRow label="SEP valable jusqu'au" className={toneCls(stateOf("licence_expiration"))}>{frDate(pilote.licence_expiration)}</SheetRow>
                      <SheetRow label="Certificat médical" className={toneCls(stateOf("medical_expiration"))}>
                        {CLASSE[pilote.medical_classe ?? ""] ?? "—"} · jusqu&apos;au {frDate(pilote.medical_expiration)}
                      </SheetRow>
                    </SheetRows>
                  ) : (
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <FormField id="p-licence" label={<LegalLabel state={stateOf("licence_numero")}>Numéro de licence</LegalLabel>}>
                        <Input id="p-licence" className={legalCls[stateOf("licence_numero")]} value={form.licence_numero} onChange={set("licence_numero")} placeholder="BE.FCL.PPL…." />
                      </FormField>
                      <FormField id="p-licexp" label={<LegalLabel state={stateOf("licence_expiration")}>Validité SEP</LegalLabel>}>
                        <Input id="p-licexp" type="date" className={legalCls[stateOf("licence_expiration")]} value={form.licence_expiration} onChange={set("licence_expiration")} />
                      </FormField>
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
                </Panel>

                <div className="xl:border-l xl:border-st-line-soft xl:pl-8">{documentsSlot}</div>
              </div>
            )}

            {tab === "profil" && (
              <Panel title="Ce que voient les clients" desc="Affiché sur vos annonces et sur la page du vol du client.">
                <FormField id="p-photo" label="Photo" error={photoError || undefined}>
                  <div className="flex items-center gap-3">
                    {form.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.photo_url} alt="" className="h-16 w-16 shrink-0 rounded-full border border-st-line object-cover" />
                    ) : (
                      <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-st-ink text-[16px] font-semibold text-white">
                        {pilote.nom.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                    )}
                    <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoFile} className="hidden" />
                    <Button variant="secondary" onClick={() => photoInputRef.current?.click()} loading={uploadingPhoto}>
                      {!uploadingPhoto && <Upload />} {form.photo_url ? "Changer la photo" : "Envoyer une photo"}
                    </Button>
                  </div>
                </FormField>
                <div className="grid gap-3.5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <FormField id="p-bio" label="Bio courte">
                    <Textarea id="p-bio" className="min-h-32 resize-y" value={form.bio} onChange={set("bio")} placeholder="Pilote en formation ATPL, basé à Charleroi…" />
                  </FormField>
                  <FormField id="p-tel" label="Téléphone" hint="Pour que Romain et vos clients puissent vous joindre.">
                    <Input id="p-tel" type="tel" value={form.telephone} onChange={set("telephone")} placeholder="+32 4xx xx xx xx" />
                  </FormField>
                </div>
              </Panel>
            )}

            {tab === "paiement" && (
              <Panel title="Paiement de vos annonces" desc="Le client vous règle directement sur cet IBAN : un QR de virement est généré pour lui.">
                <div className="max-w-md">
                  <FormField id="p-iban" label="IBAN">
                    <Input id="p-iban" value={form.iban} onChange={set("iban")} placeholder="BE.. .... .... ...." />
                  </FormField>
                </div>
              </Panel>
            )}

            {tab === "emails" && (
              <Panel title="Emails aux clients" desc="Ajoutée en bas des messages que vous envoyez depuis l'espace pilote.">
                <div className="max-w-2xl">
                  <FormField id="p-signature" label="Signature" hint="Vide : signature par défaut (nom · Pilote · téléphone).">
                    <Textarea
                      id="p-signature"
                      className="min-h-28 resize-y"
                      value={form.signature}
                      onChange={set("signature")}
                      placeholder={`${pilote.nom} · Pilote${form.telephone ? ` · ${form.telephone}` : ""}`}
                    />
                  </FormField>
                </div>
              </Panel>
            )}

            {tab === "compte" && (
              <Panel title="Compte">
                <div className="max-w-2xl space-y-4">
                  <SheetRows>
                    <SheetRow label="Email de connexion">{pilote.email}</SheetRow>
                    <SheetRow label="Charte pilote">
                      {pilote.conditions_accepted_at
                        ? `Acceptée le ${new Date(pilote.conditions_accepted_at).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}${pilote.conditions_version ? ` (version ${pilote.conditions_version})` : ""}`
                        : "Non acceptée"}
                    </SheetRow>
                  </SheetRows>
                  <Link href="/pilote/mot-de-passe" className="inline-flex items-center gap-2.5 rounded-[12px] border border-st-line bg-white px-4 py-2.5 text-[13.5px] font-medium text-st-text transition-colors hover:bg-st-surface">
                    <KeyRound size={16} className="text-st-muted" />
                    Changer mon mot de passe
                  </Link>
                </div>
              </Panel>
            )}
          </div>

          {tab !== "compte" && (
            <div className="flex flex-col gap-3 border-t border-st-line-soft px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
              {saved && (
                <p className="flex items-center gap-2 text-[13px] text-st-ok sm:mr-auto">
                  <Check size={15} className="shrink-0" /> Profil enregistré.
                </p>
              )}
              {error && <p className="text-[13px] text-st-bad sm:mr-auto">{error}</p>}
              <Button type="submit" size="lg" loading={isPending} className="max-sm:w-full sm:h-[38px] sm:text-[13px]">
                {isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
