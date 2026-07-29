"use client";

import { useRef, useState } from "react";
import { Star, Send, CheckCircle, AlertCircle, MessageSquare, ImagePlus, X, Loader2 } from "lucide-react";
import { MAX_PHOTOS } from "@/lib/satisfaction";

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
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <div className="flex gap-1">
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
  const [noteGlobale, setNoteGlobale] = useState(0);
  const [noteAccueil, setNoteAccueil] = useState(0);
  const [notePilote, setNotePilote] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [pointsAmelioration, setPointsAmelioration] = useState("");
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const uploading = photos.some((p) => p.status === "uploading");
  const canSubmit = noteGlobale > 0 && noteAccueil > 0 && notePilote > 0 && status === "idle" && !uploading;

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
          note_globale: noteGlobale,
          note_accueil: noteAccueil,
          note_pilote: notePilote,
          commentaire,
          points_amelioration: pointsAmelioration,
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
          J&apos;ai bien reçu votre avis{nbPhotos > 0 ? " et vos photos" : ""}.<br />
          Chaque retour m&apos;aide à rendre chaque vol meilleur, et je le lis personnellement.
        </p>
        <p className="text-xs text-muted-foreground pt-2">
          À bientôt à bord. — Romain
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">

      <div className="text-center">
        <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-1">
          Enquête de satisfaction
        </p>
        <h1 className="text-2xl font-black text-foreground mb-1">
          {prenom}, votre avis compte pour moi
        </h1>
        <p className="text-sm text-muted-foreground">
          Vol du {dateStr} &middot; {duree}
        </p>
      </div>

      <div className="flex items-start gap-3 bg-secondary border border-border rounded-lg px-4 py-3.5">
        <MessageSquare size={15} className="text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">J&apos;accueille toutes les remarques</strong>, bonnes comme mauvaises.
          Je lis chaque retour moi-même : votre honnêteté m&apos;aide à faire vivre un meilleur vol au prochain passager.
        </p>
      </div>

      <hr className="border-border" />

      <StarRating label="Note globale" value={noteGlobale} onChange={setNoteGlobale} />
      <StarRating label="Qualité de l'accueil" value={noteAccueil} onChange={setNoteAccueil} />
      <StarRating label="Professionnalisme du pilote" value={notePilote} onChange={setNotePilote} />

      <hr className="border-border" />

      <div className="space-y-2">
        <label htmlFor="commentaire" className="text-sm font-semibold text-foreground">
          Votre expérience globale{" "}
          <span className="text-muted-foreground font-normal">(facultatif)</span>
        </label>
        <textarea
          id="commentaire"
          rows={3}
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          placeholder="Comment s'est passé votre vol ? Ce qui vous a marqué..."
          maxLength={1000}
          className="w-full rounded-lg border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="points_amelioration" className="text-sm font-semibold text-foreground">
          Ce qu&apos;on pourrait améliorer{" "}
          <span className="text-muted-foreground font-normal">(facultatif)</span>
        </label>
        <p className="text-xs text-muted-foreground -mt-1">
          Aucun filtre. Si quelque chose n&apos;était pas parfait, dites-le moi franchement.
        </p>
        <textarea
          id="points_amelioration"
          rows={3}
          value={pointsAmelioration}
          onChange={(e) => setPointsAmelioration(e.target.value)}
          placeholder="Par exemple : l'accueil à l'arrivée, la durée du briefing, la communication avant le vol..."
          maxLength={1000}
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
