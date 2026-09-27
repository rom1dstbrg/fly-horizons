"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, TriangleAlert } from "lucide-react";
import { refusePiloteDocuments, verifyPiloteDocuments } from "@/lib/actions/pilote-documents";
import { Button, FormField, Input, PageHeader, Segmented, Select } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import type { Pilote } from "@/types/database";

// Vérification pas à pas (27/09) : chaque point se coche en regardant le
// document affiché à gauche. Les valeurs lues (numéro, dates, classe) sont
// pré-remplies avec ce que le pilote a déclaré et se corrigent ici : modifier
// une valeur décoche son point. « Valider » n'est possible que tout coché.

type Doc = { id: string; type: string; file_name: string | null; url: string | null };
type Section = "licence" | "medical";
type Classe = "classe1" | "classe2" | "lapl";

const CLASSES: { key: Classe; label: string }[] = [
  { key: "classe1", label: "Classe 1" },
  { key: "classe2", label: "Classe 2" },
  { key: "lapl", label: "LAPL" },
];
const fr = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "?");
const isPdf = (d: Doc) => /\.pdf$/i.test(d.file_name ?? "") || /\.pdf(\?|$)/i.test(d.url ?? "");

export function PiloteDocsReview({ pilote, documents }: { pilote: Pilote; documents: Doc[] }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [values, setValues] = useState({
    licence_numero: pilote.licence_numero ?? "",
    licence_expiration: pilote.licence_expiration ?? "",
    medical_classe: (pilote.medical_classe ?? "") as Classe | "",
    medical_expiration: pilote.medical_expiration ?? "",
  });
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [section, setSection] = useState<Section>("licence");
  const [docId, setDocId] = useState<string | null>(documents.find((d) => d.type === "licence")?.id ?? documents[0]?.id ?? null);
  const [comment, setComment] = useState("");
  const [refusing, setRefusing] = useState(false);
  const [motif, setMotif] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setValue(k: keyof typeof values, v: string, stepId: string) {
    setValues((x) => ({ ...x, [k]: v }));
    setChecked((c) => ({ ...c, [stepId]: false }));
  }

  function focusSection(s: Section) {
    setSection(s);
    const first = documents.find((d) => d.type === s);
    if (first) setDocId(first.id);
  }

  const sepExpired = !!values.licence_expiration && values.licence_expiration < today;
  const medExpired = !!values.medical_expiration && values.medical_expiration < today;

  const STEPS: Record<Section, { id: string; label: React.ReactNode; field?: React.ReactNode; blocked?: string | null }[]> = {
    licence: [
      { id: "l_nom", label: <>Le nom est bien <strong>{pilote.nom}</strong></> },
      { id: "l_type", label: "Licence avion qui permet d'emmener des passagers (LAPL, PPL, CPL ou ATPL)" },
      {
        id: "l_num",
        label: "Le numéro de licence correspond",
        field: <Input value={values.licence_numero} onChange={(e) => setValue("licence_numero", e.target.value, "l_num")} placeholder="BE.FCL…" />,
        blocked: values.licence_numero.trim() ? null : "Numéro manquant",
      },
      {
        id: "l_sep",
        label: "La qualification SEP est valable jusqu'au",
        field: <Input type="date" value={values.licence_expiration} onChange={(e) => setValue("licence_expiration", e.target.value, "l_sep")} />,
        blocked: !values.licence_expiration ? "Date manquante" : sepExpired ? "SEP expirée : à refuser" : null,
      },
    ],
    medical: [
      { id: "m_nom", label: <>Le nom est bien <strong>{pilote.nom}</strong></> },
      {
        id: "m_classe",
        label: "La classe du certificat",
        field: (
          <Select value={values.medical_classe} onChange={(e) => setValue("medical_classe", e.target.value, "m_classe")}>
            <option value="">Choisir</option>
            {CLASSES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </Select>
        ),
        blocked: values.medical_classe ? null : "Classe à choisir",
      },
      {
        id: "m_date",
        label: "Valable jusqu'au (pour cette classe et l'âge du pilote)",
        field: <Input type="date" value={values.medical_expiration} onChange={(e) => setValue("medical_expiration", e.target.value, "m_date")} />,
        blocked: !values.medical_expiration ? "Date manquante" : medExpired ? "Médical expiré : à refuser" : null,
      },
      { id: "m_lim", label: "Limitations lues (ex. VML : lunettes) et compatibles avec les vols" },
    ],
  };

  const all = [...STEPS.licence, ...STEPS.medical];
  const done = all.filter((s) => checked[s.id]).length;
  const complete = done === all.length;

  const classeLabel = CLASSES.find((c) => c.key === values.medical_classe)?.label ?? "?";
  const note =
    `Vérifié le ${new Date().toLocaleDateString("fr-BE")} ${documents.length ? "sur documents" : "sans fichier (visio ou main propre)"} : ` +
    `licence ${values.licence_numero.trim()}, SEP jusqu'au ${fr(values.licence_expiration)}, médical ${classeLabel} jusqu'au ${fr(values.medical_expiration)}, limitations lues.` +
    (comment.trim() ? ` ${comment.trim()}` : "");

  function validate() {
    if (!complete || !values.medical_classe) return;
    setError(null);
    startTransition(async () => {
      const r = await verifyPiloteDocuments(pilote.id, note, {
        licence_numero: values.licence_numero,
        licence_expiration: values.licence_expiration,
        medical_classe: values.medical_classe as Classe,
        medical_expiration: values.medical_expiration,
      });
      if (r.error) setError(r.error);
      else router.push("/admin/pilotes");
    });
  }

  function refuse() {
    setError(null);
    startTransition(async () => {
      const r = await refusePiloteDocuments(pilote.id, motif);
      if (r.error) setError(r.error);
      else router.push("/admin/pilotes");
    });
  }

  const doc = documents.find((d) => d.id === docId) ?? null;

  return (
    <div className="pilote-studio space-y-4">
      <PageHeader title={`Documents de ${pilote.nom}`} back={{ href: "/admin/pilotes", label: "Pilotes" }} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* Document */}
        <div className="flex h-[70dvh] min-h-[480px] flex-col overflow-hidden rounded-[20px] border border-st-line bg-white shadow-st-sm lg:h-[calc(100dvh-170px)]">
          {documents.length > 1 && (
            <div className="border-b border-st-line-soft p-2.5">
              <Segmented
                value={docId ?? ""}
                onChange={(id) => { setDocId(id); const d = documents.find((x) => x.id === id); if (d?.type === "licence" || d?.type === "medical") setSection(d.type); }}
                items={documents.map((d) => ({ key: d.id, label: `${d.type === "licence" ? "Licence" : d.type === "medical" ? "Médical" : "Autre"} · ${d.file_name ?? "fichier"}` }))}
              />
            </div>
          )}
          {doc?.url ? (
            isPdf(doc) ? (
              <iframe src={doc.url} title={doc.file_name ?? "Document"} className="h-full w-full flex-1" />
            ) : (
              <div className="flex-1 overflow-auto bg-st-surface p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={doc.url} alt={doc.file_name ?? "Document"} className="mx-auto max-w-full rounded-md" />
              </div>
            )
          ) : (
            <div className="grid flex-1 place-items-center p-6 text-center text-[13px] text-st-muted">
              <div className="space-y-2">
                <FileText size={28} className="mx-auto" />
                <p>Aucun fichier envoyé. Vous pouvez vérifier en visio ou en main propre, puis cocher les points.</p>
              </div>
            </div>
          )}
        </div>

        {/* Points à vérifier */}
        <aside className="space-y-4 lg:h-[calc(100dvh-170px)] lg:overflow-y-auto lg:pr-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium text-st-text">Points vérifiés</span>
              <span className="st-num text-st-muted">{done} / {all.length}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-st-surface-hover">
              <div className="h-full rounded-full bg-st-ink transition-[width] duration-300" style={{ width: `${(done / all.length) * 100}%` }} />
            </div>
          </div>

          {(["licence", "medical"] as Section[]).map((s) => {
            const steps = STEPS[s];
            const sDone = steps.filter((x) => checked[x.id]).length;
            const active = section === s;
            return (
              <section key={s} className={cn("rounded-[16px] border bg-white transition-colors", active ? "border-st-ink/40 shadow-st-sm" : "border-st-line")}>
                <button type="button" onClick={() => focusSection(s)} className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left">
                  <span className="text-[14px] font-semibold text-st-text">{s === "licence" ? "1. Licence" : "2. Certificat médical"}</span>
                  <span className={cn("st-num text-[12px]", sDone === steps.length ? "text-st-ok" : "text-st-muted")}>{sDone} / {steps.length}</span>
                </button>
                <ol className="space-y-3 border-t border-st-line-soft px-4 py-3">
                  {steps.map((step) => {
                    const on = !!checked[step.id];
                    return (
                      <li key={step.id} className="space-y-2" onFocusCapture={() => section !== s && focusSection(s)}>
                        <label className={cn("flex items-start gap-2.5 text-[13px]", step.blocked ? "cursor-not-allowed" : "cursor-pointer")}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={on}
                            disabled={!!step.blocked}
                            onClick={() => { setChecked((c) => ({ ...c, [step.id]: !on })); if (section !== s) focusSection(s); }}
                            className={cn(
                              "mt-px grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded-[6px] border transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                              on ? "border-st-ink bg-st-ink text-white" : "border-st-line-strong bg-white",
                            )}
                          >
                            {on && <Check size={13} strokeWidth={3} />}
                          </button>
                          <span className={cn("leading-snug", on ? "text-st-text" : "text-st-text-2")}>{step.label}</span>
                        </label>
                        {step.field && <div className="pl-[30px]">{step.field}</div>}
                        {step.blocked && (
                          <p className="flex items-center gap-1.5 pl-[30px] text-[12px] text-st-bad"><TriangleAlert size={12} /> {step.blocked}</p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}

          {refusing ? (
            <div className="space-y-3">
              <FormField id="rv-motif" label="Motif du refus" hint="Envoyé au pilote. Les fichiers sont supprimés.">
                <Input id="rv-motif" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. : page SEP illisible" autoFocus />
              </FormField>
              {error && <p className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">{error}</p>}
              <div className="flex gap-2">
                <Button variant="secondary" disabled={pending} onClick={() => setRefusing(false)}>Annuler</Button>
                <Button variant="danger" fullWidth loading={pending} disabled={!motif.trim()} onClick={refuse}>Refuser et prévenir le pilote</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <FormField id="rv-comment" label="Commentaire (facultatif)" hint="Ajouté à la trace gardée sur la fiche.">
                <Input id="rv-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ex. : vérifié en visio le 12/10" />
              </FormField>
              {complete && <p className="rounded-[12px] bg-st-surface px-3.5 py-2.5 text-[12.5px] text-st-text-2">{note}</p>}
              {error && <p className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">{error}</p>}
              <div className="flex gap-2">
                <Button variant="secondary" disabled={pending} onClick={() => setRefusing(true)}>Refuser</Button>
                <Button fullWidth loading={pending} disabled={!complete} onClick={validate}>
                  {complete ? "Valider et supprimer les fichiers" : `Encore ${all.length - done} point${all.length - done > 1 ? "s" : ""}`}
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
