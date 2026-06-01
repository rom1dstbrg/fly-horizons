"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload, X, Star, Loader2, Package, Gift, Clock, GripVertical, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProduct, updateProduct, deleteProductImage, reorderProductImages } from "@/lib/actions/products";
import { createClient } from "@/lib/supabase/client";
import type { Product, ProductImage } from "@/types/database";

interface ProductFormProps {
  product?: Product & { images?: ProductImage[] };
}

const VOUCHER_DURATIONS = [
  { value: 30,  label: "30 min",   sub: "Découverte" },
  { value: 60,  label: "1 heure",  sub: "Initiation" },
  { value: 90,  label: "1 h 30",   sub: "Exploration" },
  { value: 120, label: "2 heures", sub: "Grand vol" },
];

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!product;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages]           = useState<ProductImage[]>(product?.images ?? []);
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();

  const [featured, setFeatured]       = useState(product?.featured ?? false);
  const [active, setActive]           = useState(product?.active ?? true);
  const [productType, setProductType] = useState<"physical" | "voucher">(product?.product_type ?? "physical");
  const [voucherDuration, setVoucherDuration] = useState<number>(product?.voucher_duration_minutes ?? 60);

  const [dragIndex, setDragIndex]         = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (images.length + files.length > 6) { setUploadError("Maximum 6 images par produit."); return; }
    if (!product?.id) { setUploadError("Sauvegardez le produit avant d'ajouter des images."); return; }

    setUploading(true);
    setUploadError(null);
    const supabase = createClient();

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { setUploadError(`${file.name} dépasse 5 MB.`); continue; }
      const ext = file.name.split(".").pop();
      const path = `${product.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
      if (uploadErr) { setUploadError(`Erreur upload : ${uploadErr.message}`); continue; }
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      const { data: imgData, error: dbErr } = await supabase
        .from("product_images")
        .insert({ product_id: product.id, url: urlData.publicUrl, position: images.length })
        .select().single();
      if (dbErr) setUploadError(`Erreur base de données : ${dbErr.message}`);
      else if (imgData) setImages(prev => [...prev, imgData]);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDeleteImage(imageId: string, imageUrl: string) {
    const result = await deleteProductImage(imageId, imageUrl);
    if (result.error) setUploadError(result.error);
    else setImages(prev => prev.filter(img => img.id !== imageId).map((img, i) => ({ ...img, position: i })));
  }

  function handleDragStart(index: number) { setDragIndex(index); }
  function handleDragOver(e: React.DragEvent, index: number) { e.preventDefault(); setDragOverIndex(index); }
  async function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) { setDragIndex(null); setDragOverIndex(null); return; }
    const next = [...images];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, moved);
    const updated = next.map((img, i) => ({ ...img, position: i }));
    setImages(updated);
    setDragIndex(null);
    setDragOverIndex(null);
    await reorderProductImages(updated.map(img => ({ id: img.id, position: img.position })));
  }
  function handleDragEnd() { setDragIndex(null); setDragOverIndex(null); }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);
    formData.set("featured", String(featured));
    formData.set("active", String(active));
    startTransition(async () => {
      if (isEdit) {
        const result = await updateProduct(product.id, formData);
        if (result?.error) setError(result.error);
        else setSuccess("Produit mis à jour.");
      } else {
        const result = await createProduct(formData);
        if (result?.error) setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-5xl">

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-600 text-sm rounded-lg px-4 py-3">
          {success}
        </div>
      )}

      {/* Disposition principale : galerie à gauche, config à droite */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">

        {/* ── Colonne gauche : galerie + contenu ── */}
        <div className="space-y-5">

          {/* Images */}
          {isEdit ? (
            <div className="card-premium p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Images</h2>
                <span className="text-xs text-muted-foreground">{images.length} / 6 · glissez pour réordonner</span>
              </div>

              {uploadError && <p className="text-destructive text-xs">{uploadError}</p>}

              <div className="grid grid-cols-3 gap-3">
                {images.map((img, index) => (
                  <div
                    key={img.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={e => handleDragOver(e, index)}
                    onDrop={e => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`relative group aspect-square rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${
                      dragOverIndex === index && dragIndex !== index
                        ? "border-primary scale-[1.03]"
                        : index === 0
                          ? "border-primary"
                          : "border-border"
                    } ${dragIndex === index ? "opacity-40" : ""}`}
                  >
                    <Image src={img.url} alt="" fill className="object-cover" sizes="200px" />

                    {/* Badge principale */}
                    {index === 0 && (
                      <div className="absolute top-1.5 left-1.5 text-[9px] font-bold text-white bg-primary px-1.5 py-0.5 rounded leading-none">
                        Principale
                      </div>
                    )}

                    {/* Overlay hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                      <GripVertical size={20} className="text-white opacity-0 group-hover:opacity-70 transition-opacity drop-shadow" />
                    </div>

                    {/* Supprimer */}
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id, img.url)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X size={11} className="text-white" />
                    </button>
                  </div>
                ))}

                {images.length < 6 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-secondary/50 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {uploading
                      ? <Loader2 size={18} className="animate-spin text-muted-foreground" />
                      : <Upload size={18} className="text-muted-foreground" />}
                    <span className="text-xs text-muted-foreground">{uploading ? "…" : "Ajouter"}</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground bg-secondary/50 border border-border rounded-lg px-4 py-3">
              Les images peuvent être ajoutées après la création du produit.
            </p>
          )}

          {/* Contenu textuel */}
          <div className="card-premium p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Contenu</h2>

            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm text-muted-foreground">Titre *</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={product?.title}
                placeholder="Ex : Vol découverte en parapente"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="short_description" className="text-sm text-muted-foreground">Description</Label>
              <textarea
                id="short_description"
                name="short_description"
                rows={9}
                defaultValue={product?.short_description ?? ""}
                placeholder="Décrivez l'expérience que vous offrez…"
                className="w-full bg-input border border-border text-foreground placeholder:text-muted-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-y leading-relaxed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags" className="text-sm text-muted-foreground">Tags (séparés par des virgules)</Label>
              <Input
                id="tags"
                name="tags"
                defaultValue={product?.tags?.join(", ")}
                placeholder="vol, découverte, famille…"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* ── Colonne droite : configuration ── */}
        <div className="space-y-5">

          {/* Type de produit */}
          <div className="card-premium p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Type</h2>

            <div className="grid grid-cols-2 gap-2">
              {(["physical", "voucher"] as const).map(type => {
                const selected = productType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setProductType(type)}
                    className={`relative flex flex-col items-center gap-2 py-4 rounded-lg border-2 transition-colors cursor-pointer ${
                      selected ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {type === "physical"
                      ? <Package size={18} />
                      : <Gift size={18} />}
                    <span className="text-xs font-medium">
                      {type === "physical" ? "Physique" : "Voucher"}
                    </span>
                    {selected && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check size={9} className="text-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {productType === "voucher" && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Durée du vol</Label>
                <div className="grid grid-cols-2 gap-2">
                  {VOUCHER_DURATIONS.map(d => {
                    const selected = voucherDuration === d.value;
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setVoucherDuration(d.value)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-left transition-colors cursor-pointer ${
                          selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                        }`}
                      >
                        <Clock size={13} className={selected ? "text-primary flex-shrink-0" : "text-muted-foreground flex-shrink-0"} />
                        <div>
                          <p className={`text-xs font-semibold leading-tight ${selected ? "text-primary" : "text-foreground"}`}>{d.label}</p>
                          <p className="text-[10px] text-muted-foreground">{d.sub}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Prix et stock */}
          <div className="card-premium p-6 space-y-4">
            <h2 className="font-semibold text-foreground">{productType === "voucher" ? "Prix" : "Prix et stock"}</h2>

            <div className="space-y-2">
              <Label htmlFor="price" className="text-sm text-muted-foreground">Prix (EUR) *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={product?.price}
                placeholder="9.99"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {productType === "physical" && (
              <div className="space-y-2">
                <Label htmlFor="stock" className="text-sm text-muted-foreground">Stock</Label>
                <Input
                  id="stock"
                  name="stock"
                  type="number"
                  min="0"
                  defaultValue={product?.stock ?? 0}
                  className="bg-input border-border text-foreground"
                />
              </div>
            )}

            {productType === "voucher" && (
              <p className="text-xs text-muted-foreground bg-secondary/50 rounded-md px-3 py-2">
                Codes générés automatiquement à chaque achat — aucun stock à gérer.
              </p>
            )}
          </div>

          {/* Publication */}
          <div className="card-premium p-6 space-y-3">
            <h2 className="font-semibold text-foreground">Publication</h2>

            <button
              type="button"
              onClick={() => setFeatured(!featured)}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 text-sm text-foreground">
                <Star size={14} className={featured ? "text-primary fill-primary" : "text-muted-foreground"} />
                Mis en avant
              </span>
              <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${featured ? "bg-primary" : "bg-border"}`}>
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${featured ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
            </button>

            {isEdit && (
              <button
                type="button"
                onClick={() => setActive(!active)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                  {active ? "Actif" : "Inactif"}
                </span>
                <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${active ? "bg-emerald-500" : "bg-border"}`}>
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${active ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Hidden inputs */}
      <input type="hidden" name="product_type" value={productType} />
      {productType === "voucher" && (
        <input type="hidden" name="voucher_duration_minutes" value={voucherDuration} />
      )}

      {/* Actions */}
      <div className="flex gap-3 pb-6">
        <Button type="submit" disabled={isPending} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cursor-pointer">
          {isPending ? "Sauvegarde…" : isEdit ? "Sauvegarder les modifications" : "Créer le produit"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/boutique?tab=produits")} className="border-border text-foreground hover:bg-secondary cursor-pointer">
          Annuler
        </Button>
      </div>

    </form>
  );
}
