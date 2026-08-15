"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { createAnnonce, updateAnnonce, uploadAnnonceImage, deleteAnnonceImageFile } from "@/lib/actions/annonces";
import { evaluerPartPilote } from "@/lib/annonces-pilote";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ShieldAlert, ShieldCheck, PlaneTakeoff, ImagePlus, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { AnnonceRow } from "./AnnoncesList";

const MAX_IMAGES = 6;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

type ImageItem = { path: string; url: string };

export function AnnonceForm({ onDone, editing }: { onDone: () => void; editing?: AnnonceRow }) {
  const [duree, setDuree] = useState(editing ? String(editing.duree) : "60");
  const [places, setPlaces] = useState(editing ? String(editing.places) : "3");
  const [prixTotal, setPrixTotal] = useState(editing ? String(editing.prix_total) : "");
  const [partMode, setPartMode] = useState<"pct" | "eur">("eur");
  const [partValue, setPartValue] = useState(editing ? String(editing.part_pilote) : "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [images, setImages] = useState<ImageItem[]>(
    () => (editing?.images ?? []).map(path => ({ path, url: `${SUPABASE_URL}/storage/v1/object/public/annonces/${path}` }))
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const prixTotalNum = parseFloat(prixTotal) || 0;
  const partValueNum = partValue === "" ? -1 : parseFloat(partValue) || 0;
  const partPiloteEuros = partValue === "" ? -1
    : partMode === "pct" ? Math.round(prixTotalNum * (partValueNum / 100) * 100) / 100
    : partValueNum;
  const prixClient = Math.max(0, prixTotalNum - Math.max(0, partPiloteEuros));

  const check = useMemo(
    () => evaluerPartPilote(prixTotalNum, partPiloteEuros),
    [prixTotalNum, partPiloteEuros]
  );
  const showCheck = prixTotal !== "" && partValue !== "";

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const room = MAX_IMAGES - images.length;
    const toUpload = files.slice(0, room);
    setUploading(true);
    setError(null);
    for (const file of toUpload) {
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadAnnonceImage(fd);
      if (result.error) { setError(result.error); continue; }
      if (result.path && result.url) {
        setImages(prev => [...prev, { path: result.path!, url: result.url! }]);
      }
    }
    setUploading(false);
  }

  function removeImage(index: number) {
    const img = images[index];
    setImages(prev => prev.filter((_, i) => i !== index));
    deleteAnnonceImageFile(img.path);
  }

  function moveImage(index: number, dir: -1 | 1) {
    setImages(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const payload = {
        duree: Number(duree),
        places: Number(places),
        prix_total: prixTotalNum,
        part_pilote: Math.max(0, partPiloteEuros),
        description: description.trim() || undefined,
        images: images.map(i => i.path),
      };
      const result = editing
        ? await updateAnnonce(editing.id, payload)
        : await createAnnonce(payload);
      if (result?.error) { setError(result.error); return; }
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-5 space-y-5">
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">Durée (minutes) *</Label>
          <Input
            type="number" min={10} max={240} required placeholder="60"
            value={duree} onChange={e => setDuree(e.target.value)}
            className="bg-input border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">Places passagers *</Label>
          <select value={places} onChange={e => setPlaces(e.target.value)} required
            className="w-full h-10 bg-input border border-border text-foreground rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
            {[1, 2, 3, 4, 5, 6].map(p => <option key={p} value={p}>{p} place{p > 1 ? "s" : ""}</option>)}
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">Prix de l&apos;avion — coût total du vol (€) *</Label>
          <Input
            type="number" min="0" step="0.01" required placeholder="300"
            value={prixTotal} onChange={e => setPrixTotal(e.target.value)}
            className="bg-input border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">Votre part *</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number" min="0" step="0.01" required placeholder={partMode === "pct" ? "25" : "75"}
              value={partValue} onChange={e => setPartValue(e.target.value)}
              className="bg-input border-border"
            />
            <div className="flex rounded-md border border-border overflow-hidden shrink-0">
              <button type="button" onClick={() => setPartMode("pct")}
                className={`px-3 h-10 text-sm font-semibold cursor-pointer transition-colors ${partMode === "pct" ? "bg-primary text-primary-foreground" : "bg-input text-muted-foreground hover:text-foreground"}`}>
                %
              </button>
              <button type="button" onClick={() => setPartMode("eur")}
                className={`px-3 h-10 text-sm font-semibold cursor-pointer transition-colors border-l border-border ${partMode === "eur" ? "bg-primary text-primary-foreground" : "bg-input text-muted-foreground hover:text-foreground"}`}>
                €
              </button>
            </div>
          </div>
        </div>
      </div>

      {prixTotal !== "" && partValue !== "" && (
        <div className="bg-secondary/40 border border-border rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Prix affiché au client</span>
          <span className="text-lg font-black text-foreground">{prixClient.toFixed(2)} €</span>
        </div>
      )}

      {showCheck && (
        <div className={`flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm border ${
          check.level === "block" ? "bg-red-50 border-red-200 text-red-700"
          : check.level === "warn" ? "bg-amber-50 border-amber-200 text-amber-700"
          : "bg-emerald-50 border-emerald-200 text-emerald-700"
        }`}>
          {check.level === "block" && <ShieldAlert size={16} className="shrink-0 mt-0.5" />}
          {check.level === "warn"  && <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
          {check.level === "ok"    && <ShieldCheck size={16} className="shrink-0 mt-0.5" />}
          <div>
            <p className="font-semibold">
              {check.level === "ok" ? `Votre part : ${check.pct}%` : (check.message ?? "")}
            </p>
            {check.level !== "ok" && partValue !== "" && (
              <p className="text-xs opacity-80 mt-0.5">Part actuelle : {check.pct}%</p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-sm text-muted-foreground">Description</Label>
        <textarea
          value={description} onChange={e => setDescription(e.target.value)}
          rows={4} placeholder="Décrivez le vol, l'itinéraire envisagé, l'ambiance..."
          className="w-full px-3 py-2 rounded-md border border-border bg-input text-foreground text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Photos (jusqu&apos;à {MAX_IMAGES}) — la 1ère est la couverture</Label>
        <div className="flex flex-wrap gap-3">
          {images.map((img, i) => (
            <div key={img.path} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">
                  Couverture
                </span>
              )}
              <button type="button" onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80">
                <X size={11} />
              </button>
              <div className="absolute bottom-1 left-1 right-1 flex justify-between">
                <button type="button" disabled={i === 0} onClick={() => moveImage(i, -1)}
                  className="w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronLeft size={11} />
                </button>
                <button type="button" disabled={i === images.length - 1} onClick={() => moveImage(i, 1)}
                  className="w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronRight size={11} />
                </button>
              </div>
            </div>
          ))}
          {images.length < MAX_IMAGES && (
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer disabled:opacity-50">
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
              <span className="text-[10px]">Ajouter</span>
            </button>
          )}
        </div>
        <input
          ref={fileInputRef} type="file" accept="image/*" multiple hidden
          onChange={handleFilesSelected}
        />
      </div>

      <button
        type="submit"
        disabled={isPending || uploading || check.level === "block"}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-[#e6a800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <PlaneTakeoff size={14} />
        {isPending
          ? (editing ? "Enregistrement..." : "Publication...")
          : (editing ? "Enregistrer les modifications" : "Publier ce vol")}
      </button>
    </form>
  );
}
