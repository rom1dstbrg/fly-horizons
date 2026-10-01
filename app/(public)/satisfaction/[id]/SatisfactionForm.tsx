"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Star, AlertCircle, ImagePlus, X, Loader2, Check } from "lucide-react";
import { COMME_ANNONCE_OPTIONS, MAX_PHOTOS, RECO_OPTIONS, SOURCE_OPTIONS } from "@/lib/satisfaction";
import { uuid } from "@/lib/uuid";

interface Props {
  reservationId: string;
  prenom: string;
  dateStr: string;
  duree: string;
  /** Pilote du vol ; null pour un ancien vol sans pilote. */
  pilote: { nom: string; photoUrl: string | null } | null;
}

const MAX_PHOTO_SIZE = 12 * 1024 * 1024;

const EYEBROW = "text-[11px] font-bold text-primary uppercase tracking-[3px]";
const CTA = "inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-[10px] bg-primary px-8 py-[15px] text-sm font-black text-[#0b2238] shadow-gold hover:bg-[#e6a800] hover:-translate-y-px transition-all disabled:opacity-40 disabled:hover:translate-y-0 disabled:cursor-default cursor-pointer";

interface PhotoEntry {
  localId: string;
  localUrl: string;
  status: "uploading" | "done" | "error";
  path?: string;
}

// Une question : libellé, aide, puis le contrôle. Séparées par un filet, sans boîtes.
function Question({ label, hint, optional, children }: { label: React.ReactNode; hint?: React.ReactNode; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="py-[22px] border-t border-border first:border-t-0 first:pt-0">
      <p className="text-[16px] font-bold text-foreground leading-snug">
        {label}
        {optional && <span className="ml-1.5 text-[13px] font-normal text-foreground/45">(facultatif)</span>}
      </p>
      {hint && <p className="mt-1 mb-3.5 text-[13px] leading-snug text-foreground/55">{hint}</p>}
      {!hint && <div className="mb-3.5" />}
      {children}
    </div>
  );
}

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1.5" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = (hovered || value) >= n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            className="p-0.5 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground rounded cursor-pointer"
            aria-label={`${n} étoile${n > 1 ? "s" : ""} sur 5`}
          >
            <Star size={36} fill={on ? "#F2B705" : "transparent"} stroke={on ? "#F2B705" : "#cfd6e2"} strokeWidth={1.6} />
          </button>
        );
      })}
    </div>
  );
}

function Chips({ options, value, onChange, label }: { options: readonly { value: string; label: string }[]; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={[
            "rounded-full border-[1.5px] px-4 py-2.5 text-[14px] font-semibold transition-colors cursor-pointer",
            value === o.value ? "border-[#0b2238] bg-[#0b2238] text-white" : "border-border bg-white text-foreground hover:border-foreground",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PhotoPicker({ photos, onAdd, onRemove, error }: { photos: PhotoEntry[]; onAdd: (files: FileList) => void; onRemove: (localId: string) => void; error: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="flex flex-wrap gap-2.5">
        {photos.map((photo) => (
          <div key={photo.localId} className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.localUrl} alt="" className="h-full w-full object-cover" />
            {photo.status === "uploading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Loader2 size={16} className="animate-spin text-white" /></div>
            )}
            {photo.status === "error" && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-500/60"><AlertCircle size={16} className="text-white" /></div>
            )}
            <button
              type="button"
              onClick={() => onRemove(photo.localId)}
              className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer"
              aria-label="Retirer cette photo"
            >
              <X size={11} />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-[#cfd6e2] text-foreground/50 hover:border-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Ajouter une photo"
          >
            <ImagePlus size={20} />
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onAdd(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

const initialsOf = (nom: string) => nom.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export default function SatisfactionForm({ reservationId, prenom, dateStr, duree, pilote }: Props) {
  const pf = pilote ? pilote.nom.trim().split(/\s+/)[0] : "";
  const [notePilote, setNotePilote] = useState(0);
  const [noteVol, setNoteVol] = useState(0);
  const [notePreparation, setNotePreparation] = useState(0);
  const [noteQualitePrix, setNoteQualitePrix] = useState(0);
  const [commeAnnonce, setCommeAnnonce] = useState("");
  const [recommandation, setRecommandation] = useState("");
  const [source, setSource] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const uploading = photos.some((p) => p.status === "uploading");
  const canSubmit =
    notePilote > 0 && noteVol > 0 && notePreparation > 0 && noteQualitePrix > 0 &&
    commeAnnonce !== "" && recommandation !== "" && source !== "" &&
    status !== "loading" && !uploading;

  async function uploadPhoto(localId: string, file: File) {
    try {
      const fd = new FormData();
      fd.append("reservation_id", reservationId);
      fd.append("file", file);
      const res = await fetch("/api/satisfaction/photo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setPhotoError(data.error ?? "Erreur lors de l'envoi d'une photo.");
        setPhotos((prev) => prev.map((p) => (p.localId === localId ? { ...p, status: "error" } : p)));
        return;
      }
      setPhotos((prev) => prev.map((p) => (p.localId === localId ? { ...p, status: "done", path: data.path } : p)));
    } catch {
      setPhotoError("Impossible d'envoyer une photo. Vérifiez votre connexion.");
      setPhotos((prev) => prev.map((p) => (p.localId === localId ? { ...p, status: "error" } : p)));
    }
  }

  function handleAddPhotos(files: FileList) {
    const room = MAX_PHOTOS - photos.length;
    const incoming = Array.from(files).slice(0, room);
    if (files.length > room) setPhotoError(`${MAX_PHOTOS} photos maximum.`);
    else setPhotoError("");
    for (const file of incoming) {
      if (file.size > MAX_PHOTO_SIZE) {
        setPhotoError("Une photo dépasse 12 Mo et a été ignorée.");
        continue;
      }
      const localId = uuid();
      const localUrl = URL.createObjectURL(file);
      setPhotos((prev) => [...prev, { localId, localUrl, status: "uploading" }]);
      uploadPhoto(localId, file);
    }
  }

  function handleRemovePhoto(localId: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.localId === localId);
      if (target?.status === "done" && target.path) {
        fetch("/api/satisfaction/photo", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reservation_id: reservationId, path: target.path }),
        }).catch(() => {});
      }
      if (target) URL.revokeObjectURL(target.localUrl);
      return prev.filter((p) => p.localId !== localId);
    });
    setPhotoError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/satisfaction/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservation_id: reservationId,
          note_preparation: notePreparation,
          note_pilote: notePilote,
          note_vol: noteVol,
          note_qualite_prix: noteQualitePrix,
          comme_annonce: commeAnnonce,
          recommandation,
          source_decouverte: source,
          commentaire,
          photos: photos.filter((p) => p.status === "done").map((p) => p.path),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Une erreur est survenue.");
        setStatus("error");
      } else {
        setStatus("success");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setErrorMsg("Impossible d'envoyer le formulaire. Vérifiez votre connexion.");
      setStatus("error");
    }
  }

  // Confirmation sur la page (pas de toast ni de redirection).
  if (status === "success") {
    const nbPhotos = photos.filter((p) => p.status === "done").length;
    return (
      <div className="max-w-[560px] mx-auto text-center pt-6 lg:pt-12">
        <span className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-primary">
          <Check size={26} strokeWidth={2.8} className="text-[#0b2238]" />
        </span>
        <p className={`${EYEBROW} mb-3`}>Avis envoyé</p>
        <h1 className="text-[30px] lg:text-[40px] font-black text-foreground leading-[1.08] tracking-[-0.02em]">Merci, {prenom}.</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-foreground/65 max-w-[44ch] mx-auto">
          Votre avis{pilote ? ` sur le vol avec ${pf}` : ""} nous est bien parvenu{nbPhotos > 0 ? `, avec vos ${nbPhotos} photo${nbPhotos > 1 ? "s" : ""}` : ""}. Nous lisons chaque retour.
        </p>
        <Link
          href="/nos-offres"
          className="mt-7 inline-flex items-center justify-center rounded-[10px] border border-foreground px-6 py-[13px] text-sm font-black text-foreground hover:bg-secondary transition-colors cursor-pointer"
        >
          Voir les prochains vols
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-[1040px] mx-auto lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-16 lg:items-start">
      {/* Titre et pilote : à gauche (collant) sur ordinateur, en haut sur téléphone */}
      <div className="lg:sticky lg:top-[100px] pb-6 lg:pb-0">
        <p className={`${EYEBROW} mb-3`}>Votre avis</p>
        <h1 className="text-[28px] lg:text-[36px] font-black text-foreground leading-[1.1] tracking-[-0.02em]">
          {pilote ? <>Comment s&apos;est passé votre vol avec {pf}&nbsp;?</> : <>Comment s&apos;est passé votre vol&nbsp;?</>}
        </h1>
        <div className="mt-5 flex items-center gap-3">
          {pilote && (
            pilote.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pilote.photoUrl} alt="" className="size-11 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#0b2238] text-[14px] font-bold text-white">{initialsOf(pilote.nom)}</span>
            )
          )}
          <div className="min-w-0 text-[14px] leading-snug">
            {pilote && <p className="font-bold text-foreground">{pilote.nom}</p>}
            <p className="text-foreground/60 first-letter:uppercase">{dateStr} · {duree}</p>
          </div>
        </div>
        <p className="mt-5 text-[14px] leading-relaxed text-foreground/60">
          Une minute suffit. Vos réponses nous aident à veiller à la qualité des vols et à améliorer le service. Elles sont lues par l&apos;équipe Fly Horizons.
        </p>
      </div>

      <div>
        <Question label={pilote ? `${pf}, votre pilote` : "Le pilote"} hint="Accueil, briefing, mise en confiance">
          <StarRating value={notePilote} onChange={setNotePilote} label="Note du pilote" />
        </Question>
        <Question label="Le vol" hint="Ce que vous avez vu et ressenti">
          <StarRating value={noteVol} onChange={setNoteVol} label="Note du vol" />
        </Question>
        <Question label="Avant le vol" hint={`L'annonce, les échanges${pilote ? ` avec ${pf}` : ""}, les informations reçues`}>
          <StarRating value={notePreparation} onChange={setNotePreparation} label="Note de l'avant-vol" />
        </Question>
        <Question label="La participation aux frais" hint={`Le montant que vous avez réglé${pilote ? ` à ${pf}` : ""}`}>
          <StarRating value={noteQualitePrix} onChange={setNoteQualitePrix} label="Note de la participation aux frais" />
        </Question>

        <Question label="Le vol s'est-il passé comme annoncé ?" hint="Heure, itinéraire, durée">
          <Chips options={COMME_ANNONCE_OPTIONS} value={commeAnnonce} onChange={setCommeAnnonce} label="Le vol s'est-il passé comme annoncé" />
        </Question>
        <Question label="Recommanderiez-vous Fly Horizons autour de vous ?">
          <Chips options={RECO_OPTIONS} value={recommandation} onChange={setRecommandation} label="Recommandation" />
        </Question>
        <Question label="Comment nous avez-vous connus ?">
          <Chips options={SOURCE_OPTIONS} value={source} onChange={setSource} label="Source de découverte" />
        </Question>

        <Question label="Un mot sur ce vol" optional hint="Ce qui vous a marqué, ou ce qui n'était pas parfait : dites-le franchement.">
          <textarea
            id="commentaire"
            rows={4}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="L'accueil, le briefing, un moment fort du vol…"
            maxLength={1500}
            aria-label="Commentaire"
            className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-[15px] text-foreground placeholder:text-[#8a94a6] outline-none transition-colors focus:bg-white focus:border-foreground resize-none"
          />
        </Question>
        <Question label="Un souvenir à partager ?" optional hint={`Une photo prise pendant le vol. Jusqu'à ${MAX_PHOTOS} images (${photos.length}/${MAX_PHOTOS}).`}>
          <PhotoPicker photos={photos} onAdd={handleAddPhotos} onRemove={handleRemovePhoto} error={photoError} />
        </Question>

        {status === "error" && (
          <div role="alert" className="mt-2 flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mt-6 border-t border-border pt-7">
          <button type="submit" disabled={!canSubmit} className={CTA}>
            {status === "loading" ? (
              <><Loader2 size={15} className="animate-spin" /> Envoi en cours…</>
            ) : uploading ? (
              <><Loader2 size={15} className="animate-spin" /> Envoi des photos…</>
            ) : (
              "Envoyer mon avis"
            )}
          </button>
          {!canSubmit && status === "idle" && !uploading && (
            <p className="mt-3 text-[12.5px] text-foreground/45">Répondez aux questions notées et aux choix pour envoyer. Le commentaire et les photos sont facultatifs.</p>
          )}
        </div>
      </div>
    </form>
  );
}
