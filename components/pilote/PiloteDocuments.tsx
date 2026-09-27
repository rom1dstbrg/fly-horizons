"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, ShieldCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  confirmMyDocumentUpload, createMyDocumentUpload, deleteMyDocument, submitMyDocuments, type PiloteDocument,
} from "@/lib/actions/pilote-documents";
import { Badge, Button, SectionHeader } from "@/components/pilote/studio";
import type { Pilote } from "@/types/database";

// Documents du pilote (profil) : il dépose sa licence et son certificat
// médical, les soumet, Romain vérifie puis les fichiers sont supprimés.
// Après la 1re vérification, il peut envoyer un nouveau document (médical
// renouvelé, SEP prolongée) : il reste en règle pendant la vérification.
// Envoi direct au stockage privé via URL signée (lib/actions/pilote-documents.ts).

const ROWS: { type: "licence" | "medical"; label: string; hint: string }[] = [
  { type: "licence", label: "Licence", hint: "Avec la page de la qualification SEP (photo ou PDF)" },
  { type: "medical", label: "Certificat médical", hint: "La page avec la classe et la date de validité" },
];

const frDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });

export function PiloteDocuments({ status, verifiedAt, note, documents }: {
  status: Pilote["docs_status"];
  verifiedAt: string | null;
  note: string | null;
  documents: PiloteDocument[];
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const renewal = !!verifiedAt;
  const editable = status !== "envoyes";
  const byType = (t: string) => documents.filter((d) => d.type === t);
  const ready = renewal ? documents.length > 0 : ROWS.every((r) => byType(r.type).length > 0);

  async function upload(type: string, file: File) {
    setError(null);
    setUploading(type);
    try {
      const init = await createMyDocumentUpload({ type, contentType: file.type, size: file.size });
      if ("error" in init && init.error) { setError(init.error); return; }
      const { path, token } = init as { path: string; token: string };
      const { error: upErr } = await createClient().storage.from("pilote-documents").uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (upErr) { setError("L'envoi du fichier a échoué, réessayez."); return; }
      const done = await confirmMyDocumentUpload({ type, path, fileName: file.name });
      if (done.error) { setError(done.error); return; }
      router.refresh();
    } finally {
      setUploading(null);
    }
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteMyDocument(id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitMyDocuments();
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <section className="space-y-3.5">
      <div>
        <SectionHeader
          title="Documents"
          action={
            status === "verifies" ? <Badge tone="success">Vérifiés</Badge>
            : status === "envoyes" ? <Badge tone="info">En vérification</Badge>
            : status === "refuses" ? <Badge tone="danger">Refusés</Badge>
            : <Badge tone="danger">À envoyer</Badge>
          }
        />
        <p className="mt-0.5 text-[12.5px] text-st-muted">
          Romain vérifie votre licence et votre certificat médical, puis les fichiers sont supprimés : nous ne gardons que la date de vérification.
        </p>
      </div>

      {status === "verifies" && (
        <p className="flex gap-2.5 rounded-[14px] bg-st-ok-soft px-4 py-3 text-[13px] text-st-ok">
          <ShieldCheck size={16} className="mt-px shrink-0" />
          <span>
            Vérifiés{verifiedAt ? ` le ${frDate(verifiedAt)}` : ""}. Nouveau médical ou SEP prolongée : ajoutez le document ci-dessous
            et envoyez-le, vous restez en règle pendant la vérification.
          </span>
        </p>
      )}

      {status === "envoyes" && (
        <p className="rounded-[14px] bg-st-info-soft px-4 py-3 text-[13px] text-st-info">
          {renewal
            ? "Nouveau document en cours de vérification : vous restez en règle d'ici là. Vous recevrez un email dès que c'est fait."
            : "Envoyés, en cours de vérification. Vous recevrez un email dès que c'est fait."}
        </p>
      )}

      {status === "refuses" && note && (
        <p className="rounded-[14px] bg-st-bad-soft px-4 py-3 text-[13px] text-st-bad">{note}</p>
      )}

      {(editable || documents.length > 0) && (
        <div className="divide-y divide-st-line overflow-hidden rounded-[14px] border border-st-line bg-white">
          {ROWS.map((row) => {
            const docs = byType(row.type);
            return (
              <div key={row.type} className="space-y-2 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-st-text">{row.label}</p>
                    <p className="text-[12px] text-st-muted">{row.hint}</p>
                  </div>
                  {editable && (
                    <>
                      <input
                        ref={(el) => { inputs.current[row.type] = el; }}
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (f) upload(row.type, f);
                        }}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={uploading === row.type}
                        disabled={!!uploading || pending}
                        onClick={() => inputs.current[row.type]?.click()}
                      >
                        {uploading !== row.type && <Plus />} Ajouter
                      </Button>
                    </>
                  )}
                </div>
                {docs.length > 0 && (
                  <ul className="space-y-1.5">
                    {docs.map((d) => (
                      <li key={d.id} className="flex items-center gap-2 rounded-[10px] bg-st-surface px-2.5 py-1.5 text-[12.5px] text-st-text-2">
                        <FileText size={14} className="shrink-0 text-st-muted" />
                        <span className="min-w-0 flex-1 truncate">{d.file_name ?? "Document"}</span>
                        {editable && (
                          <button
                            type="button"
                            aria-label="Retirer ce fichier"
                            disabled={pending}
                            onClick={() => remove(d.id)}
                            className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full text-st-muted hover:bg-st-line hover:text-st-text"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">{error}</p>}

      {editable && (
        <Button variant="secondary" fullWidth disabled={!ready || !!uploading} loading={pending} onClick={submit}>
          {renewal ? "Envoyer le nouveau document" : "Envoyer pour vérification"}
        </Button>
      )}
    </section>
  );
}
