"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bug, Check, CircleHelp, Flag, ImagePlus, Info, Lightbulb, X } from "lucide-react";
import { createRetour, uploadRetourCapture } from "@/lib/actions/pilote-retours";
import { appareil, MAX_CAPTURES, type ClientError, type RetourType } from "@/lib/pilote-retours";
import { Button, SheetCloseButton } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";

// « Signaler un problème » (maquette validée le 27/09) : bug, idée ou question
// envoyés à Romain depuis n'importe quelle page de l'espace pilote. La page,
// l'appareil et les dernières erreurs du navigateur sont joints tout seuls.
// Bureau : fenêtre centrée ; téléphone : feuille du bas.

// Dernières erreurs JavaScript de la session (installé une fois, au premier
// rendu de la navigation pilote) : c'est souvent la cause d'un bug signalé.
const errorLog: ClientError[] = [];
let installed = false;
function installErrorLog() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const push = (message: string, stack?: string) => {
    errorLog.push({ at: new Date().toISOString(), message, stack, page: location.pathname + location.search });
    if (errorLog.length > 10) errorLog.shift();
  };
  window.addEventListener("error", (e) => push(e.message || "Erreur", e.error instanceof Error ? e.error.stack : `${e.filename}:${e.lineno}:${e.colno}`));
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    push(r instanceof Error ? r.message : String(r), r instanceof Error ? r.stack : undefined);
  });
}

const TYPES: { key: RetourType; label: string; icon: typeof Bug }[] = [
  { key: "bug", label: "Un bug", icon: Bug },
  { key: "idee", label: "Une idée", icon: Lightbulb },
  { key: "question", label: "Une question", icon: CircleHelp },
];

type Capture = { file: File; url: string };

export function RetourDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [type, setType] = useState<RetourType>("bug");
  const [message, setMessage] = useState("");
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { installErrorLog(); }, []);

  // Remise à zéro à chaque ouverture.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setType("bug"); setMessage(""); setCaptures([]); setSent(false); setError(null); }
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !sending) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, sending]);

  if (!open) return null;

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next = [...captures];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/") || next.length >= MAX_CAPTURES) continue;
      next.push({ file: f, url: URL.createObjectURL(f) });
    }
    setCaptures(next);
  }

  async function send() {
    setError(null);
    if (message.trim().length < 3) { setError("Décrivez le problème en quelques mots."); return; }
    setSending(true);
    try {
      const paths: string[] = [];
      for (const c of captures) {
        const fd = new FormData();
        fd.append("file", c.file);
        const res = await uploadRetourCapture(fd);
        if ("error" in res) { setError(res.error); return; }
        paths.push(res.path);
      }
      const res = await createRetour({
        type,
        message,
        page: location.pathname + location.search,
        pageTitre: document.title,
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}×${window.innerHeight}`,
        erreurs: [...errorLog],
        captures: paths,
      });
      if ("error" in res) { setError(res.error); return; }
      setSent(true);
    } catch {
      setError("Le message n'a pas pu être envoyé. Vérifiez votre connexion et réessayez.");
    } finally {
      setSending(false);
    }
  }

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;

  return (
    <div className="pilote-studio fixed inset-0 z-[2000] flex items-end justify-center bg-st-ink/30 font-sans backdrop-blur-[1.5px] motion-safe:animate-in motion-safe:fade-in sm:items-center sm:p-4" onClick={() => !sending && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="retour-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[26px] bg-white pb-[env(safe-area-inset-bottom)] text-st-text shadow-st-panel motion-safe:animate-in motion-safe:slide-in-from-bottom-4 sm:max-w-[480px] sm:rounded-[20px] sm:pb-0"
      >
        <div className="mx-auto mt-2.5 h-1 w-[38px] shrink-0 rounded-full bg-st-line-strong sm:hidden" />
        {sent ? (
          <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-st-ok-soft text-st-ok"><Check size={22} /></span>
            <h2 id="retour-title" className="mt-3 text-base font-semibold">Merci, c&apos;est envoyé</h2>
            <p className="mt-1 max-w-xs text-[13px] text-st-text-2">Romain a bien reçu votre message. Il vous répondra par email ou par téléphone si besoin.</p>
            <Button variant="secondary" className="mt-5" onClick={onClose}>Fermer</Button>
          </div>
        ) : (
          <>
            <div className="flex shrink-0 items-center gap-3 px-5 pb-2 pt-3 sm:pt-5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-st-surface text-st-ink"><Flag size={17} /></span>
              <div className="min-w-0 flex-1">
                <h2 id="retour-title" className="text-base font-semibold">Signaler un problème</h2>
                <p className="text-[12px] text-st-muted">Romain reçoit votre message directement</p>
              </div>
              <SheetCloseButton onClick={onClose} />
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-4 pt-2">
              <div>
                <p className="mb-1.5 text-[12.5px] font-[550] text-st-text-2">C&apos;est…</p>
                <div className="grid grid-cols-3 gap-2" role="group" aria-label="Type de message">
                  {TYPES.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={type === key}
                      onClick={() => setType(key)}
                      className={cn(
                        "flex cursor-pointer flex-col items-center gap-1.5 rounded-[12px] border px-2 py-2.5 text-[12.5px] font-[550] transition-colors",
                        type === key ? "border-st-ink bg-st-ink-soft text-st-ink ring-1 ring-st-ink" : "border-st-line bg-white text-st-text-2 hover:bg-st-surface",
                      )}
                    >
                      <Icon size={18} /> {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="retour-message" className="mb-1.5 block text-[12.5px] font-[550] text-st-text-2">
                  {type === "bug" ? "Que s'est-il passé ?" : type === "idee" ? "Votre idée" : "Votre question"}
                </label>
                <textarea
                  id="retour-message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={type === "bug" ? "Ce que vous faisiez, ce qui s'est passé, ce que vous attendiez…" : ""}
                  className="w-full resize-y rounded-[12px] border border-st-line bg-white px-3.5 py-2.5 text-[16px] text-st-text outline-none transition-colors placeholder:text-st-muted hover:border-st-line-strong focus:border-st-ink focus:ring-4 focus:ring-st-ink-soft sm:text-sm"
                />
              </div>

              <div>
                <p className="mb-1.5 text-[12.5px] font-[550] text-st-text-2">
                  Capture d&apos;écran <span className="font-normal text-st-muted">(facultatif, {MAX_CAPTURES} maximum)</span>
                </p>
                <div className="space-y-2">
                  {captures.map((c, i) => (
                    <div key={c.url} className="flex items-center gap-3 rounded-[14px] border border-st-line p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) */}
                      <img src={c.url} alt="" className="h-11 w-16 shrink-0 rounded-[8px] bg-st-surface object-cover" />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-[550]">{c.file.name}</span>
                      <button
                        type="button"
                        onClick={() => setCaptures(captures.filter((_, k) => k !== i))}
                        aria-label={`Retirer ${c.file.name}`}
                        className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-[9px] text-st-muted transition-colors hover:bg-st-bad-soft hover:text-st-bad"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                  {captures.length < MAX_CAPTURES && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-st-line-strong bg-white px-3.5 py-3 text-left text-[13px] text-st-text-2 transition-colors hover:bg-st-surface"
                    >
                      <ImagePlus size={19} className="shrink-0 text-st-muted" />
                      Ajouter une capture d&apos;écran
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                </div>
              </div>

              <div className="flex gap-2.5 rounded-[12px] bg-st-surface px-3 py-2.5 text-[12px] leading-snug text-st-text-2">
                <Info size={15} className="mt-px shrink-0 text-st-muted" />
                <span>
                  Ajouté automatiquement : la page <code className="break-all font-mono text-[11.5px] text-st-text">{pathname}</code> et votre appareil ({appareil(ua)}).
                </span>
              </div>

              {error && <p className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">{error}</p>}
            </div>

            <div className="flex shrink-0 gap-2.5 border-t border-st-line-soft px-5 py-3.5">
              <Button variant="secondary" onClick={onClose} disabled={sending} className="max-sm:hidden">Annuler</Button>
              <Button onClick={send} loading={sending} className="flex-1 max-sm:h-11">Envoyer</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
