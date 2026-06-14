"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  Trash2, Upload, Loader2, Pencil, Check, X,
  LayoutDashboard, GripVertical, ArrowUp, ArrowDown, Square,
} from "lucide-react";
import {
  uploadGalleryImage, deleteGalleryImage, deleteGalleryImages,
  updateGalleryAlt, reorderGalleryImages,
} from "@/lib/actions/gallery";

const LANDING_COUNT = 5;

interface GalleryImage {
  id: string;
  storage_path: string;
  alt: string;
  display_order: number;
  publicUrl: string;
}

export function GalleryManager({ images: initial }: { images: GalleryImage[] }) {
  const [images, setImages]         = useState(initial);
  const [pending, startTransition]  = useTransition();
  const [uploading, setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver]     = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editAlt, setEditAlt]       = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const fileRef  = useRef<HTMLInputElement>(null);
  const dragId   = useRef<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // ── Upload ────────────────────────────────────────────────────────────────
  async function handleFiles(files: FileList) {
    setUploading(true);
    setUploadError(null);
    let errored = false;
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("alt", "Photo vol Fly Horizons");
        await uploadGalleryImage(fd);
      } catch (err) {
        setUploadError((err as Error).message ?? "Erreur inconnue lors de l'upload");
        errored = true;
        break;
      }
    }
    setUploading(false);
    if (!errored) window.location.reload();
  }

  function handleUploadDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  // ── Drag & drop reorder (désactivé en mode sélection) ────────────────────
  function onDragStart(id: string) {
    if (selectMode) return;
    dragId.current = id;
  }

  function onDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (selectMode) return;
    if (dragId.current && dragId.current !== id) setDropTargetId(id);
  }

  function onDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    setDropTargetId(null);
    if (selectMode || !dragId.current || dragId.current === targetId) return;

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
    if (selectMode) return;
    setEditingId(img.id);
    setEditAlt(img.alt);
  }

  async function saveAlt(id: string) {
    await updateGalleryAlt(id, editAlt);
    setImages(imgs => imgs.map(i => i.id === id ? { ...i, alt: editAlt } : i));
    setEditingId(null);
  }

  // ── Sélection ─────────────────────────────────────────────────────────────
  function toggleSelectMode() {
    setSelectMode(s => !s);
    setSelected(new Set());
    setEditingId(null);
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Actions groupées ──────────────────────────────────────────────────────
  function bulkMoveFirst() {
    const sel      = images.filter(i => selected.has(i.id));
    const rest     = images.filter(i => !selected.has(i.id));
    const reordered = [...sel, ...rest];
    setImages(reordered);
    startTransition(async () => { await reorderGalleryImages(reordered.map(i => i.id)); });
    setSelected(new Set());
    setSelectMode(false);
  }

  function bulkMoveLast() {
    const sel      = images.filter(i => selected.has(i.id));
    const rest     = images.filter(i => !selected.has(i.id));
    const reordered = [...rest, ...sel];
    setImages(reordered);
    startTransition(async () => { await reorderGalleryImages(reordered.map(i => i.id)); });
    setSelected(new Set());
    setSelectMode(false);
  }

  function bulkDelete() {
    const items = images
      .filter(i => selected.has(i.id))
      .map(i => ({ id: i.id, storage_path: i.storage_path }));
    if (!confirm(`Supprimer ${items.length} photo${items.length > 1 ? "s" : ""} ?`)) return;
    startTransition(async () => {
      await deleteGalleryImages(items);
      setImages(imgs => imgs.filter(i => !selected.has(i.id)));
      setSelected(new Set());
      setSelectMode(false);
    });
  }

  const selCount = selected.size;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
            <LayoutDashboard size={10} />
            Landing
          </span>
          <span>= les {LANDING_COUNT} premières photos affichées en accueil. Glissez pour réordonner.</span>
        </div>
        <button
          onClick={toggleSelectMode}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
            selectMode
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
          }`}
        >
          {selectMode ? "Annuler" : "Sélectionner"}
        </button>
      </div>

      {/* Sous-toolbar sélection */}
      {selectMode && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <button
            onClick={() => setSelected(new Set(images.map(i => i.id)))}
            className="hover:text-foreground underline underline-offset-2 cursor-pointer"
          >
            Tout sélectionner
          </button>
          {selCount > 0 && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <button
                onClick={() => setSelected(new Set())}
                className="hover:text-foreground underline underline-offset-2 cursor-pointer"
              >
                Désélectionner tout
              </button>
            </>
          )}
          <span className="text-muted-foreground/40">·</span>
          <span>{selCount} sélectionnée{selCount > 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Zone d'upload */}
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

      {/* Erreur upload */}
      {uploadError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <span className="font-semibold shrink-0">Erreur upload :</span>
          <span className="font-mono text-xs break-all">{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="ml-auto shrink-0 cursor-pointer"><X size={14} /></button>
        </div>
      )}

      {/* Grille */}
      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucune photo pour l&apos;instant.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-24">
          {images.map((img, idx) => {
            const onLanding  = idx < LANDING_COUNT;
            const isTarget   = dropTargetId === img.id;
            const isSelected = selected.has(img.id);

            return (
              <div
                key={img.id}
                draggable={!selectMode}
                onDragStart={() => onDragStart(img.id)}
                onDragOver={e => onDragOver(e, img.id)}
                onDrop={e => onDrop(e, img.id)}
                onDragEnd={onDragEnd}
                onClick={selectMode ? () => toggleSelect(img.id) : undefined}
                className={`group relative rounded-xl overflow-hidden border bg-secondary transition-all select-none
                  ${onLanding && !selectMode ? "border-primary/40 ring-1 ring-primary/20" : "border-border"}
                  ${isTarget   ? "ring-2 ring-primary scale-[0.97]" : ""}
                  ${isSelected ? "ring-2 ring-primary border-primary" : ""}
                  ${selectMode ? "cursor-pointer" : ""}
                `}
              >
                {/* Badge landing */}
                {onLanding && !selectMode && (
                  <div className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                    <LayoutDashboard size={9} />
                    Landing
                  </div>
                )}

                {/* Checkbox sélection */}
                {selectMode && (
                  <div className={`absolute top-2 left-2 z-10 w-5 h-5 rounded flex items-center justify-center shadow transition-colors ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-white/90 text-muted-foreground border border-border"
                  }`}>
                    {isSelected ? <Check size={12} strokeWidth={3} /> : <Square size={11} />}
                  </div>
                )}

                {/* Poignée drag */}
                {!selectMode && (
                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white rounded p-1 cursor-grab active:cursor-grabbing">
                    <GripVertical size={14} />
                  </div>
                )}

                {/* Overlay sélectionné */}
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/10 z-[5] pointer-events-none" />
                )}

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

                {/* Bas de carte */}
                <div className="p-2 flex items-center gap-1">
                  {!selectMode && editingId === img.id ? (
                    <>
                      <input
                        value={editAlt}
                        onChange={e => setEditAlt(e.target.value)}
                        className="flex-1 text-xs border border-border rounded px-2 py-1 bg-white focus:outline-none focus:border-primary"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === "Enter") saveAlt(img.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <button onClick={() => saveAlt(img.id)} className="text-green-600 hover:text-green-700 cursor-pointer"><Check size={14} /></button>
                      <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X size={14} /></button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground truncate flex-1">{img.alt}</p>
                      {!selectMode && (
                        <>
                          <button onClick={() => startEdit(img)} className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0">
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Supprimer cette photo ?")) {
                                startTransition(async () => {
                                  await deleteGalleryImage(img.id, img.storage_path);
                                  setImages(imgs => imgs.filter(i => i.id !== img.id));
                                });
                              }
                            }}
                            disabled={pending}
                            className="text-red-400 hover:text-red-600 cursor-pointer shrink-0 disabled:opacity-30"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Barre d'actions flottante */}
      {selectMode && selCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-card border border-border shadow-2xl rounded-2xl px-4 py-3">
          <span className="text-sm font-semibold text-foreground mr-1">
            {selCount} photo{selCount > 1 ? "s" : ""}
          </span>
          <button
            onClick={bulkMoveFirst}
            disabled={pending}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-foreground font-medium transition-colors cursor-pointer disabled:opacity-40"
          >
            <ArrowUp size={14} />
            En premier
          </button>
          <button
            onClick={bulkMoveLast}
            disabled={pending}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-foreground font-medium transition-colors cursor-pointer disabled:opacity-40"
          >
            <ArrowDown size={14} />
            En dernier
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button
            onClick={bulkDelete}
            disabled={pending}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-colors cursor-pointer disabled:opacity-40"
          >
            <Trash2 size={14} />
            Supprimer
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-1 p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
