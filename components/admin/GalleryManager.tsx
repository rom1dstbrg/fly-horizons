"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Trash2, Upload, Loader2, Pencil, Check, X, LayoutDashboard, GripVertical } from "lucide-react";
import { uploadGalleryImage, deleteGalleryImage, updateGalleryAlt, reorderGalleryImages } from "@/lib/actions/gallery";

const LANDING_COUNT = 5;

interface GalleryImage {
  id: string;
  storage_path: string;
  alt: string;
  display_order: number;
  publicUrl: string;
}

export function GalleryManager({ images: initial }: { images: GalleryImage[] }) {
  const [images, setImages]        = useState(initial);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading]  = useState(false);
  const [dragOver, setDragOver]    = useState(false);
  const [editingId, setEditingId]  = useState<string | null>(null);
  const [editAlt, setEditAlt]      = useState("");
  const fileRef  = useRef<HTMLInputElement>(null);
  const dragId   = useRef<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // ── Upload ────────────────────────────────────────────────────────────────
  async function handleFiles(files: FileList) {
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("alt", "Photo vol Fly Horizons");
      await uploadGalleryImage(fd);
    }
    setUploading(false);
    window.location.reload();
  }

  function handleUploadDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  // ── Drag & drop reorder ───────────────────────────────────────────────────
  function onDragStart(id: string) {
    dragId.current = id;
  }

  function onDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (dragId.current && dragId.current !== id) setDropTargetId(id);
  }

  function onDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    setDropTargetId(null);
    if (!dragId.current || dragId.current === targetId) return;

    const fromIdx = images.findIndex(i => i.id === dragId.current);
    const toIdx   = images.findIndex(i => i.id === targetId);
    dragId.current = null;

    const reordered = [...images];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    setImages(reordered);
    startTransition(async () => {
      await reorderGalleryImages(reordered.map(i => i.id));
    });
  }

  function onDragEnd() {
    dragId.current = null;
    setDropTargetId(null);
  }

  // ── Alt text ──────────────────────────────────────────────────────────────
  function startEdit(img: GalleryImage) {
    setEditingId(img.id);
    setEditAlt(img.alt);
  }

  async function saveAlt(id: string) {
    const { updateGalleryAlt: update } = await import("@/lib/actions/gallery");
    await update(id, editAlt);
    setImages(imgs => imgs.map(i => i.id === id ? { ...i, alt: editAlt } : i));
    setEditingId(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* Légende */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
          <LayoutDashboard size={10} />
          Landing
        </span>
        <span>= affiché dans le teaser de la page d&apos;accueil (les {LANDING_COUNT} premières photos). Glissez pour réordonner.</span>
      </div>

      {/* Zone d'upload fichiers */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); if (!dragId.current) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { if (!dragId.current) handleUploadDrop(e); else setDragOver(false); }}
      >
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)} />
        {uploading ? (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 size={28} className="animate-spin text-primary" />
            <p className="text-sm font-medium">Upload en cours…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Upload size={28} className="text-primary/60" />
            <div>
              <p className="text-sm font-semibold text-foreground">Cliquez ou glissez des photos ici</p>
              <p className="text-xs mt-1">JPG, PNG, WEBP — plusieurs fichiers acceptés</p>
            </div>
          </div>
        )}
      </div>

      {/* Grille */}
      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucune photo pour l&apos;instant.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img, idx) => {
            const onLanding  = idx < LANDING_COUNT;
            const isTarget   = dropTargetId === img.id;

            return (
              <div
                key={img.id}
                draggable
                onDragStart={() => onDragStart(img.id)}
                onDragOver={e => onDragOver(e, img.id)}
                onDrop={e => onDrop(e, img.id)}
                onDragEnd={onDragEnd}
                className={`group relative rounded-xl overflow-hidden border bg-secondary transition-all select-none ${
                  onLanding ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
                } ${isTarget ? "ring-2 ring-primary scale-[0.97]" : ""}`}
              >
                {/* Badge landing */}
                {onLanding && (
                  <div className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                    <LayoutDashboard size={9} />
                    Landing
                  </div>
                )}

                {/* Poignée drag */}
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white rounded p-1 cursor-grab active:cursor-grabbing">
                  <GripVertical size={14} />
                </div>

                {/* Thumbnail */}
                <div className="relative aspect-video pointer-events-none">
                  <Image
                    src={img.publicUrl}
                    alt={img.alt}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>

                {/* Alt text + delete */}
                <div className="p-2 flex items-center gap-1">
                  {editingId === img.id ? (
                    <>
                      <input
                        value={editAlt}
                        onChange={e => setEditAlt(e.target.value)}
                        className="flex-1 text-xs border border-border rounded px-2 py-1 bg-white focus:outline-none focus:border-primary"
                        autoFocus
                        onKeyDown={e => { if (e.key === "Enter") saveAlt(img.id); if (e.key === "Escape") setEditingId(null); }}
                      />
                      <button onClick={() => saveAlt(img.id)} className="text-green-600 hover:text-green-700 cursor-pointer"><Check size={14} /></button>
                      <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X size={14} /></button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground truncate flex-1">{img.alt}</p>
                      <button onClick={() => startEdit(img)} className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0"><Pencil size={12} /></button>
                      <button
                        onClick={() => { if (confirm("Supprimer cette photo ?")) startTransition(async () => { await deleteGalleryImage(img.id, img.storage_path); setImages(imgs => imgs.filter(i => i.id !== img.id)); }); }}
                        disabled={pending}
                        className="text-red-400 hover:text-red-600 cursor-pointer shrink-0 disabled:opacity-30"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
