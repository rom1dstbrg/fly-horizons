"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  confirmMyDocumentUpload, createMyDocumentUpload, deleteMyDocument, submitMyDocuments, type PiloteDocument,
} from "@/lib/actions/pilote-documents";
import { Button } from "@/components/pilote/studio";
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

  // Affiché dans la ligne « Justificatifs » de l'onglet Licence : l'état global
  // (vérifiés, en attente…) est porté par les étapes en haut de l'onglet.
  return (
    <div className="space-y-3">
      {status === "refuses" && note && (
        <p className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">Refusés par Romain : {note}</p>
      )}
      {status === "envoyes" && (
        <p className="rounded-[12px] bg-st-info-soft px-3.5 py-2.5 text-[13px] text-st-info">
          {renewal
            ? "Nouveau document envoyé, en cours de vérification. Vous restez en règle d'ici là."
            : "Envoyés, en cours de vérification. Vous recevrez un email dès que c'est fait."}
        </p>
      )}

      {(editable || documents.length > 0) && (
        <div className="divide-y divide-st-line overflow-hidden rounded-[14px] border border-st-line bg-white">
          {ROWS.map((row) => {
            const docs = byType(row.type);
            return (
              <div key={row.type} className="space-y-2 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
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
                        {uploading !== row.type && <Plus />} {docs.length ? "Ajouter une page" : "Ajouter"}
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
        <div className="flex flex-wrap items-center gap-3">
          <Button variant={ready ? "primary" : "secondary"} disabled={!ready || !!uploading} loading={pending} onClick={submit}>
            {renewal ? "Envoyer le nouveau document" : "Envoyer à Romain pour vérification"}
          </Button>
          {!ready && (
            <span className="text-[12px] text-st-muted">
              {renewal ? "Ajoutez d'abord le nouveau document." : "Ajoutez d'abord votre licence et votre certificat médical."}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
