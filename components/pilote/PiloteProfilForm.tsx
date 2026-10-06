"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, AlertCircle, Upload, KeyRound, IdCard, User, Mail, Bell, Settings, Plus, X, FileText } from "lucide-react";
import { ChartePiloteGate } from "@/components/pilote/ChartePiloteGate";
import { SettingRow } from "@/components/pilote/SettingRow";
import { PiloteNotifications } from "@/components/pilote/PiloteNotifications";
import { updateMyPiloteProfile, uploadPiloteProfilPhoto } from "@/lib/actions/pilote-profil";
import { piloteLegalStatus } from "@/lib/pilote/legal";
import { QUALIF_TYPES, defaultExpiry, type Qualification } from "@/lib/pilote/qualifications";
import type { ProfilTab } from "@/lib/pilote/profil-tabs";
import { Badge, Button, Input, PillTabs, Select, StatCard, StatGrid, Textarea } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import type { Pilote } from "@/types/database";

// Profil pilote (27/09), même mise en page que « Mes vols » : chiffres clés en
// haut, puis une grande carte. Bureau : menu des sections à gauche, contenu à
// droite en lignes de réglage. Téléphone : onglets à pastille au-dessus.
// Licence, SEP et médical ne se saisissent pas ici : le pilote envoie ses
// justificatifs, Romain relève les valeurs en les vérifiant.

type LegalState = "error" | "warn" | "ok";

const CLASSE: Record<string, string> = { classe1: "Classe 1", classe2: "Classe 2", lapl: "LAPL" };
const frDate = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
const toneOf = (s: LegalState) => (s === "error" ? "bad" as const : s === "warn" ? "warn" as const : undefined);

const TABS: { key: ProfilTab; label: string; desc: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: "profil", label: "Profil", desc: "Photo, bio, contact, IBAN", icon: User },
  { key: "licence", label: "Licence", desc: "Justificatifs, qualifications", icon: IdCard },
  { key: "emails", label: "Emails", desc: "Signature des messages", icon: Mail },
  { key: "notifications", label: "Notifications", desc: "Alertes de vos vols", icon: Bell },
  { key: "compte", label: "Compte", desc: "Connexion et charte", icon: Settings },
];

// Pastille d'état d'une valeur relevée par Romain.
function StateBadge({ state, empty, verified }: { state: LegalState; empty: boolean; verified: boolean }) {
  if (empty) return verified ? <Badge tone="warning" size="sm">À compléter par Romain</Badge> : <Badge size="sm">Après vérification</Badge>;
  if (state === "error") return <Badge tone="danger" size="sm">Expiré</Badge>;
  if (state === "warn") return <Badge tone="warning" size="sm">Expire bientôt</Badge>;
  return <Badge tone="success" size="sm">Valable</Badge>;
}

function ValueList({ items, verified }: { items: { label: string; value: string | null; state: LegalState }[]; verified: boolean }) {
  return (
    <dl className="divide-y divide-st-line-soft rounded-[14px] border border-st-line bg-white">
      {items.map((it) => (
        <div key={it.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <dt className="text-[13px] text-st-text-2">{it.label}</dt>
          <dd className="flex items-center gap-2 text-right text-[13.5px] font-medium text-st-text">
            {it.value && <span>{it.value}</span>}
            <StateBadge state={it.state} empty={!it.value} verified={verified} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

type StepState = "done" | "current" | "todo" | "redo";

// Étapes pour recevoir des vols, avec la prochaine action en clair.
function Steps({ steps }: { steps: { title: string; detail: string; state: StepState }[] }) {
  return (
    <ol className="grid gap-2.5 md:grid-cols-2">
      {steps.map((st, i) => (
        <li
          key={st.title}
          className={cn(
            "flex gap-3 rounded-[14px] border px-3.5 py-3",
            st.state === "current" ? "border-st-ink/30 bg-st-ink-soft" : st.state === "redo" ? "border-st-bad/30 bg-st-bad-soft" : "border-st-line bg-white",
          )}
        >
          <span
            className={cn(
              "st-num grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold",
              st.state === "done" ? "bg-st-ok text-white" : st.state === "current" ? "bg-st-ink text-white" : st.state === "redo" ? "bg-st-bad text-white" : "bg-st-surface-hover text-st-muted",
            )}
          >
            {st.state === "done" ? <Check size={13} strokeWidth={3} /> : i + 1}
          </span>
          <span className="min-w-0">
            <span className={cn("block text-[13.5px] font-semibold", st.state === "todo" ? "text-st-muted" : "text-st-text")}>{st.title}</span>
            <span className="block text-[12.5px] leading-snug text-st-text-2">{st.detail}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

// Liste des qualifications : type, obtenue le, expire le (calculée à partir du
// type et de la date d'obtention, modifiable).
function QualificationsEditor({ value, onChange, sep }: {
  value: Qualification[];
  onChange: (q: Qualification[]) => void;
  /** SEP relevée par Romain : première ligne, en lecture seule. */
  sep: { date: string | null; state: LegalState; verified: boolean };
}) {
  const today = new Date().toISOString().slice(0, 10);
  const update = (i: number, patch: Partial<Qualification>) => onChange(value.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  return (
    <div className="space-y-2.5">
      <div className="divide-y divide-st-line-soft rounded-[14px] border border-st-line bg-white">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[13.5px] font-medium text-st-text">SEP (monomoteur à pistons)</p>
            <p className="text-[12px] text-st-muted">Relevée par Romain sur votre licence · valable 2 ans</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-[13.5px] font-medium text-st-text">
            {sep.date && <span className="st-num">jusqu&apos;au {frDate(sep.date)}</span>}
            <StateBadge state={sep.state} empty={!sep.date} verified={sep.verified} />
          </div>
        </div>
          {value.map((q, i) => {
            const months = QUALIF_TYPES.find((t) => t.key === q.type)?.months ?? null;
            const expired = !!q.expire && q.expire < today;
            return (
              <div key={i} className="grid gap-2.5 p-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                <div className="space-y-1">
                  <p className="text-[11.5px] font-medium text-st-muted">Qualification</p>
                  <Select
                    aria-label="Qualification"
                    value={q.type}
                    onChange={(e) => update(i, { type: e.target.value, expire: defaultExpiry(e.target.value, q.obtenue) })}
                  >
                    {QUALIF_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </Select>
                  {q.type === "AUTRE" && (
                    <Input aria-label="Nom de la qualification" value={q.label ?? ""} onChange={(e) => update(i, { label: e.target.value })} placeholder="Nom" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-[11.5px] font-medium text-st-muted">Obtenue ou prorogée le</p>
                  <Input
                    type="date"
                    aria-label="Obtenue le"
                    value={q.obtenue ?? ""}
                    onChange={(e) => update(i, { obtenue: e.target.value || null, expire: defaultExpiry(q.type, e.target.value || null) ?? q.expire })}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[11.5px] font-medium text-st-muted">
                    {months ? `Expire le (${months % 12 === 0 ? `${months / 12} an${months > 12 ? "s" : ""}` : `${months} mois`})` : "Expire le (si applicable)"}
                  </p>
                  <Input
                    type="date"
                    aria-label="Expire le"
                    className={expired ? "border-st-bad" : undefined}
                    value={q.expire ?? ""}
                    onChange={(e) => update(i, { expire: e.target.value || null })}
                  />
                </div>
                <button
                  type="button"
                  aria-label="Retirer cette qualification"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  className="grid h-[38px] w-[38px] cursor-pointer place-items-center justify-self-end rounded-[11px] text-st-muted transition-colors hover:bg-st-surface hover:text-st-text"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
      </div>
      <Button variant="secondary" size="sm" onClick={() => onChange([...value, { type: "MEP", label: null, obtenue: null, expire: null }])}>
        <Plus /> Ajouter une qualification
      </Button>
    </div>
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
  const verified = !!pilote.docs_verified_at;
  const [showCharte, setShowCharte] = useState(false);

  const [form, setForm] = useState({
    bio: pilote.bio ?? "",
    photo_url: pilote.photo_url ?? "",
    telephone: pilote.telephone ?? "",
    signature: pilote.signature ?? "",
    iban: pilote.iban ?? "",
  });
  const [qualifications, setQualifications] = useState<Qualification[]>(Array.isArray(pilote.qualifications) ? pilote.qualifications : []);

  const legal = piloteLegalStatus(pilote);
  const errors = legal.issues.filter((i) => i.severity === "error");

  const [tab, setTab] = useState<ProfilTab>(initialTab ?? (legal.ok ? "profil" : "licence"));
  function changeTab(t: ProfilTab) {
    setTab(t);
    setSaved(false);
    window.history.replaceState(null, "", `?onglet=${t}`);
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      const res = await updateMyPiloteProfile({ ...form, qualifications });
      if (res.error) { setError(res.error); return; }
      setSaved(true);
      router.refresh();
    });
  }

  const status = pilote.docs_status;
  const steps: { title: string; detail: string; state: StepState }[] = [
    {
      title: "Envoyer vos justificatifs",
      detail: status === "refuses" ? "Refusés : corrigez et renvoyez-les." : status === "envoyes" || status === "verifies" ? "Envoyés à Romain." : "Licence (page SEP comprise) et certificat médical, en photo ou PDF.",
      state: status === "refuses" ? "redo" : status === "envoyes" || status === "verifies" ? "done" : "current",
    },
    {
      title: "Vérification par Romain",
      detail: status === "verifies" ? "Faite : vous pouvez recevoir des vols." : status === "envoyes" ? "En cours : il relève vos dates. Vous recevrez un email." : "Après votre envoi.",
      state: status === "verifies" ? "done" : status === "envoyes" ? "current" : "todo",
    },
  ];

  const docsLabel =
    status === "verifies" ? "Vérifiés"
    : status === "envoyes" ? (verified ? "Nouveau document envoyé" : "En vérification")
    : status === "refuses" ? "Refusés" : "À envoyer";
  const docsTone = status === "verifies" || (status === "envoyes" && verified) ? undefined : status === "envoyes" ? "warn" as const : "bad" as const;

  return (
    <form onSubmit={submit} className="space-y-5">
      <StatGrid>
        <StatCard
          label="Statut"
          value={legal.ok ? "En règle" : `${errors.length} point${errors.length > 1 ? "s" : ""} à régler`}
          tone={legal.ok ? "ok" : "bad"}
          hint={legal.ok ? "Vous pouvez recevoir des vols" : "Aucun vol en attendant"}
        />
        <StatCard label="Qualification SEP" value={frDate(pilote.licence_expiration)} tone={toneOf(stateOf("licence_expiration"))} hint="Valable jusqu'au" />
        <StatCard
          label="Certificat médical"
          value={frDate(pilote.medical_expiration)}
          tone={toneOf(stateOf("medical_expiration"))}
          hint={pilote.medical_classe ? `${CLASSE[pilote.medical_classe]}, valable jusqu'au` : "Relevé par Romain"}
        />
        <StatCard
          label="Justificatifs"
          value={docsLabel}
          tone={docsTone}
          hint={pilote.docs_verified_at ? `Vérifiés le ${frDate(pilote.docs_verified_at)}` : "Vérifiés par Romain"}
        />
      </StatGrid>

      {errors.length > 0 && (
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
        <nav aria-label="Sections du profil" className="hidden rounded-[20px] border border-st-line bg-white p-2 shadow-st-sm lg:sticky lg:top-[88px] lg:block">
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
            {tab === "profil" && (
              <div className="divide-y divide-st-line-soft">
                <SettingRow title="Photo" desc="Affichée sur vos annonces et sur la page du vol du client.">
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
                  {photoError && <p className="mt-2 text-[12.5px] text-st-bad">{photoError}</p>}
                </SettingRow>
                <SettingRow title="Présentation" htmlFor="p-bio" desc="Quelques lignes sur vous, affichées avec votre photo.">
                  <Textarea id="p-bio" className="min-h-32 resize-y" value={form.bio} onChange={set("bio")} placeholder="Pilote en formation ATPL, basé à Charleroi…" />
                </SettingRow>
                <SettingRow title="Téléphone" htmlFor="p-tel" desc="Pour que Romain et vos clients puissent vous joindre.">
                  <Input id="p-tel" type="tel" className="max-w-sm" value={form.telephone} onChange={set("telephone")} placeholder="+32 4xx xx xx xx" />
                </SettingRow>
                <SettingRow title="IBAN" htmlFor="p-iban" desc="Les clients de vos annonces vous paient dessus, avec un QR de virement.">
                  <Input id="p-iban" className="max-w-sm" value={form.iban} onChange={set("iban")} placeholder="BE.. .... .... ...." />
                </SettingRow>
              </div>
            )}

            {tab === "licence" && (
              <div className="space-y-6">
                {status === "verifies" && legal.ok ? (
                  <p className="rounded-[14px] bg-st-ok-soft px-4 py-3 text-[13px] text-st-ok">
                    Tout est vérifié{pilote.docs_verified_at ? ` depuis le ${frDate(pilote.docs_verified_at)}` : ""}. Nouveau médical ou SEP
                    prolongée : envoyez le document dans « Justificatifs », Romain mettra la date à jour.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-[13.5px] font-semibold text-st-text">Pour recevoir des vols</p>
                    <Steps steps={steps} />
                  </div>
                )}

                <div className="divide-y divide-st-line-soft">
                  <SettingRow
                    title="Justificatifs"
                    desc="Une photo ou un PDF de votre licence (page SEP comprise) et de votre certificat médical. Romain les vérifie puis les supprime : seule la date de vérification est gardée."
                  >
                    {documentsSlot}
                  </SettingRow>

                  <SettingRow title="Licence" desc="Relevée par Romain sur votre licence.">
                    <ValueList
                      verified={verified}
                      items={[{ label: "Numéro de licence", value: pilote.licence_numero, state: stateOf("licence_numero") }]}
                    />
                  </SettingRow>

                  <SettingRow title="Certificat médical" desc="Relevé par Romain sur votre certificat.">
                    <ValueList
                      verified={verified}
                      items={[
                        { label: "Classe", value: pilote.medical_classe ? CLASSE[pilote.medical_classe] : null, state: stateOf("medical_classe") },
                        { label: "Valable jusqu'au", value: pilote.medical_expiration ? frDate(pilote.medical_expiration) : null, state: stateOf("medical_expiration") },
                      ]}
                    />
                  </SettingRow>

                  <SettingRow
                    title="Qualifications"
                    desc="La SEP est relevée par Romain. Ajoutez vos autres qualifications : l'expiration se calcule à partir de la date d'obtention ou de prorogation (MEP et IR : 1 an), vous pouvez la corriger."
                  >
                    <QualificationsEditor
                      value={qualifications.filter((q) => q.type !== "SEP")}
                      onChange={(q) => { setQualifications(q); setSaved(false); }}
                      sep={{ date: pilote.licence_expiration, state: stateOf("licence_expiration"), verified }}
                    />
                  </SettingRow>

                  <SettingRow title="Expérience récente" desc="Règle FCL.060, à vérifier vous-même avant chaque vol.">
                    <p className="text-[13px] leading-relaxed text-st-text-2">
                      Pour emmener des passagers, vous devez avoir fait au moins <strong className="text-st-text">3 décollages et 3 atterrissages
                      dans les 90 jours</strong> avant le vol.
                    </p>
                  </SettingRow>
                </div>
              </div>
            )}

            {tab === "emails" && (
              <div className="divide-y divide-st-line-soft">
                <SettingRow
                  title="Signature"
                  htmlFor="p-signature"
                  desc="Ajoutée en bas des messages que vous envoyez aux clients. Vide : nom · Pilote · téléphone."
                >
                  <Textarea
                    id="p-signature"
                    className="min-h-28 resize-y"
                    value={form.signature}
                    onChange={set("signature")}
                    placeholder={`${pilote.nom} · Pilote${form.telephone ? ` · ${form.telephone}` : ""}`}
                  />
                </SettingRow>
              </div>
            )}

            {tab === "notifications" && <PiloteNotifications initialPrefs={pilote.notif_prefs} />}

            {tab === "compte" && (
              <div className="divide-y divide-st-line-soft">
                <SettingRow title="Email de connexion" desc="Pour changer d'adresse, contactez Romain.">
                  <p className="pt-0.5 text-[14px] text-st-text">{pilote.email}</p>
                </SettingRow>
                <SettingRow title="Mot de passe">
                  <Link href="/pilote/mot-de-passe" className="inline-flex items-center gap-2.5 rounded-[11px] border border-st-line bg-white px-4 py-2 text-[13px] font-[550] text-st-text shadow-st-sm transition-colors hover:bg-st-surface">
                    <KeyRound size={15} className="text-st-muted" />
                    Changer mon mot de passe
                  </Link>
                </SettingRow>
                <SettingRow title="Charte pilote" desc="Les règles que vous avez acceptées pour voler avec Fly Horizons.">
                  <div className="space-y-2.5">
                    <p className="pt-0.5 text-[14px] text-st-text">
                      {pilote.conditions_accepted_at
                        ? `Acceptée le ${new Date(pilote.conditions_accepted_at).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}${pilote.conditions_version ? ` (version du ${pilote.conditions_version.split("-").reverse().join("/")})` : ""}`
                        : "Non acceptée"}
                    </p>
                    <Button variant="secondary" onClick={() => setShowCharte(true)}>
                      <FileText /> Relire la charte
                    </Button>
                  </div>
                </SettingRow>
              </div>
            )}
          </div>

          {tab !== "compte" && tab !== "notifications" && (
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
      {showCharte && <ChartePiloteGate onClose={() => setShowCharte(false)} />}
    </form>
  );
}
