"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Star, Send, CheckCircle, AlertCircle, ImagePlus, X, Loader2 } from "lucide-react";
import { MAX_PHOTOS, RECO_OPTIONS, SOURCE_OPTIONS } from "@/lib/satisfaction";

interface Props {
  reservationId: string;
  prenom: string;
  dateStr: string;
  duree: string;
}

const MAX_PHOTO_SIZE = 12 * 1024 * 1024;

interface PhotoEntry {
  localId: string;
  localUrl: string;
  status: "uploading" | "done" | "error";
  path?: string;
}

function StarRating({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      {hint && <p className="text-xs text-muted-foreground -mt-0.5">{hint}</p>}
      <div className="flex gap-1 pt-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            className="p-0.5 transition-transform hover:scale-110 focus:outline-none cursor-pointer"
            aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
          >
            <Star
              size={28}
              className="transition-colors"
              fill={(hovered || value) >= n ? "#F2B705" : "transparent"}
              stroke={(hovered || value) >= n ? "#F2B705" : "#d1d8e4"}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function ChoiceGroup({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      {hint && <p className="text-xs text-muted-foreground -mt-1">{hint}</p>}
      <div className="flex flex-wrap gap-2 pt-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer ${
              value === o.value
                ? "bg-navy text-white border-navy"
                : "border-border text-foreground hover:border-primary/50"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PhotoPicker({
  photos,
  onAdd,
  onRemove,
  error,
}: {
  photos: PhotoEntry[];
  onAdd: (files: FileList) => void;
  onRemove: (localId: string) => void;
  error: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-foreground">
        Un souvenir à partager ?{" "}
        <span className="text-muted-foreground font-normal">(facultatif)</span>
      </label>
      <p className="text-xs text-muted-foreground -mt-1">
        Une photo prise pendant le vol, du décollage, du paysage... Jusqu&apos;à {MAX_PHOTOS} images ({photos.length}/{MAX_PHOTOS}).
      </p>

      <div className="flex flex-wrap gap-2">
        {photos.map((photo) => (
          <div key={photo.localId} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border shrink-0 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.localUrl} alt="" className="w-full h-full object-cover" />
            {photo.status === "uploading" && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 size={16} className="text-white animate-spin" />
              </div>
            )}
            {photo.status === "error" && (
              <div className="absolute inset-0 bg-red-500/60 flex items-center justify-center">
                <AlertCircle size={16} className="text-white" />
              </div>
            )}
            <button
              type="button"
              onClick={() => onRemove(photo.localId)}
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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
            className="w-16 h-16 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors shrink-0 cursor-pointer"
            aria-label="Ajouter une photo"
          >
            <ImagePlus size={18} />
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

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

export default function SatisfactionForm({ reservationId, prenom, dateStr, duree }: Props) {
  const [notePreparation, setNotePreparation] = useState(0);
  const [notePilote, setNotePilote] = useState(0);
  const [noteVol, setNoteVol] = useState(0);
  const [noteQualitePrix, setNoteQualitePrix] = useState(0);
  const [recommandation, setRecommandation] = useState("");
  const [source, setSource] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const uploading = photos.some((p) => p.status === "uploading");
  const canSubmit =
    notePreparation > 0 &&
    notePilote > 0 &&
    noteVol > 0 &&
    noteQualitePrix > 0 &&
    recommandation !== "" &&
    source !== "" &&
    status === "idle" &&
    !uploading;

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
      const localId = crypto.randomUUID();
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
      }
    } catch {
      setErrorMsg("Impossible d'envoyer le formulaire. Vérifiez votre connexion.");
      setStatus("error");
    }
  }

  if (status === "success") {
    const nbPhotos = photos.filter((p) => p.status === "done").length;
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-lg bg-navy flex items-center justify-center mx-auto">
          <CheckCircle className="text-primary" size={26} />
        </div>
        <h2 className="text-xl font-black text-foreground">Merci, {prenom} !</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          J&apos;ai bien reçu votre avis{nbPhotos > 0 ? " et vos photos" : ""}. Je lis chaque retour personnellement.
        </p>
        <p className="text-xs text-muted-foreground">À bientôt à bord. Romain</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-navy text-white font-semibold px-5 py-2.5 text-sm hover:brightness-110 transition-all cursor-pointer mt-2"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">

      <div className="text-center space-y-1">
        <p className="text-[10px] font-black text-primary uppercase tracking-[3px]">
          Enquête de satisfaction
        </p>
        <h1 className="text-2xl font-black text-foreground">
          {prenom}, votre avis compte pour moi
        </h1>
        <p className="text-sm text-muted-foreground">
          Vol du {dateStr} &middot; {duree}
        </p>
      </div>

      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        Bonnes ou mauvaises, je lis toutes les réponses moi-même. Une minute suffit.
      </p>

      <hr className="border-border" />

      <div className="space-y-5">
        <StarRating
          label="La préparation de votre venue"
          hint="Infos reçues, échanges avant le vol, briefing"
          value={notePreparation}
          onChange={setNotePreparation}
        />
        <StarRating
          label="Le pilote en vol"
          hint="Mise en confiance, explications, contact"
          value={notePilote}
          onChange={setNotePilote}
        />
        <StarRating
          label="Le vol en lui-même"
          hint="À la hauteur de ce que vous imaginiez"
          value={noteVol}
          onChange={setNoteVol}
        />
        <StarRating
          label="Le rapport qualité / prix"
          hint="Par rapport à ce que vous avez payé"
          value={noteQualitePrix}
          onChange={setNoteQualitePrix}
        />
      </div>

      <hr className="border-border" />

      <ChoiceGroup
        label="Recommanderiez-vous Fly Horizons autour de vous ?"
        options={RECO_OPTIONS}
        value={recommandation}
        onChange={setRecommandation}
      />

      <ChoiceGroup
        label="Comment avez-vous connu Fly Horizons ?"
        options={SOURCE_OPTIONS}
        value={source}
        onChange={setSource}
      />

      <hr className="border-border" />

      <div className="space-y-2">
        <label htmlFor="commentaire" className="text-sm font-semibold text-foreground">
          Un mot sur votre vol, ou ce qu&apos;on pourrait améliorer{" "}
          <span className="text-muted-foreground font-normal">(facultatif)</span>
        </label>
        <p className="text-xs text-muted-foreground -mt-1">
          Aucun filtre. Ce qui vous a marqué, ou ce qui n&apos;était pas parfait : dites-le moi franchement.
        </p>
        <textarea
          id="commentaire"
          rows={4}
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          placeholder="Par exemple : l'accueil à l'arrivée, la durée du briefing, un moment fort du vol..."
          maxLength={1500}
          className="w-full rounded-lg border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      <PhotoPicker photos={photos} onAdd={handleAddPhotos} onRemove={handleRemovePhoto} error={photoError} />

      {status === "error" && (
        <div className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground font-black py-3.5 text-sm hover:brightness-105 active:scale-[0.98] transition-all shadow-gold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {status === "loading" ? (
          <span className="animate-pulse">Envoi en cours…</span>
        ) : uploading ? (
          <span className="animate-pulse">Envoi des photos…</span>
        ) : (
          <>
            <Send size={16} />
            Envoyer mon avis
          </>
        )}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        Votre avis est lu personnellement par votre pilote.
      </p>
    </form>
  );
}
