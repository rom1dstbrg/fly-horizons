"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload, X, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProduct, updateProduct, deleteProductImage } from "@/lib/actions/products";
import { createClient } from "@/lib/supabase/client";
import type { Product, ProductImage } from "@/types/database";

interface ProductFormProps {
  product?: Product & { images?: ProductImage[] };
}

const VOUCHER_DURATIONS = [
  { value: 30,  label: "30 minutes" },
  { value: 60,  label: "1 heure" },
  { value: 90,  label: "1h30" },
  { value: 120, label: "2 heures" },
];

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!product;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<ProductImage[]>(product?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [active, setActive] = useState(product?.active ?? true);
  const [productType, setProductType] = useState<"physical" | "voucher">(
    product?.product_type ?? "physical"
  );
  const [voucherDuration, setVoucherDuration] = useState<number>(
    product?.voucher_duration_minutes ?? 60
  );

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    if (images.length + files.length > 6) {
      setUploadError("Maximum 6 images par produit.");
      return;
    }

    if (!product?.id) {
      setUploadError("Sauvegardez le produit avant d'ajouter des images.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    const supabase = createClient();

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError(`${file.name} depasse 5MB.`);
        continue;
      }

      const ext = file.name.split(".").pop();
      const path = `${product.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: false });

      if (uploadErr) {
        setUploadError(`Erreur upload: ${uploadErr.message}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);

      const { data: imgData, error: dbErr } = await supabase
        .from("product_images")
        .insert({
          product_id: product.id,
          url: urlData.publicUrl,
          position: images.length,
        })
        .select()
        .single();

      if (dbErr) {
        setUploadError(`Erreur base de donnees: ${dbErr.message}`);
      } else if (imgData) {
        setImages((prev) => [...prev, imgData]);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDeleteImage(imageId: string, imageUrl: string) {
    const result = await deleteProductImage(imageId, imageUrl);
    if (result.error) {
      setUploadError(result.error);
    } else {
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    // Hidden inputs in the form already carry product_type and voucher_duration_minutes
    // so new FormData(e.currentTarget) picks them up natively — no closure timing issues
    const formData = new FormData(e.currentTarget);
    formData.set("featured", String(featured));
    formData.set("active", String(active));

    startTransition(async () => {
      if (isEdit) {
        const result = await updateProduct(product.id, formData);
        if (result?.error) setError(result.error);
        else setSuccess("Produit mis a jour.");
      } else {
        const result = await createProduct(formData);
        if (result?.error) setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md px-4 py-3">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-500 text-sm rounded-md px-4 py-3">
          {success}
        </div>
      )}

      {/* Type de produit */}
      <div className="card-premium p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Type de produit</h2>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setProductType("physical")}
            className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
              productType === "physical"
                ? "bg-primary/10 border-primary/40 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-primary/20"
            }`}
          >
            Physique
          </button>
          <button
            type="button"
            onClick={() => setProductType("voucher")}
            className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
              productType === "voucher"
                ? "bg-primary/10 border-primary/40 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-primary/20"
            }`}
          >
            Voucher
          </button>
        </div>

        {productType === "voucher" && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Durée du vol</Label>
            <div className="flex gap-2 flex-wrap">
              {VOUCHER_DURATIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setVoucherDuration(d.value)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    voucherDuration === d.value
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Titre */}
      <div className="card-premium p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Informations</h2>

        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm text-muted-foreground">
            Titre *
          </Label>
          <Input
            id="title"
            name="title"
            required
            defaultValue={product?.title}
            placeholder="Porte-cles aviation premium"
            className="bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="short_description" className="text-sm text-muted-foreground">
            Description courte
          </Label>
          <textarea
            id="short_description"
            name="short_description"
            rows={3}
            defaultValue={product?.short_description ?? ""}
            placeholder="Description affichee sur la fiche produit..."
            className="w-full bg-input border border-border text-foreground placeholder:text-muted-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags" className="text-sm text-muted-foreground">
            Tags (separes par des virgules)
          </Label>
          <Input
            id="tags"
            name="tags"
            defaultValue={product?.tags?.join(", ")}
            placeholder="sticker, porte-cles, accessoire"
            className="bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Prix et stock */}
      <div className="card-premium p-6 space-y-4">
        <h2 className="font-semibold text-foreground">
          {productType === "voucher" ? "Prix" : "Prix et stock"}
        </h2>

        <div className={`grid gap-4 ${productType === "physical" ? "grid-cols-2" : "grid-cols-1"}`}>
          <div className="space-y-2">
            <Label htmlFor="price" className="text-sm text-muted-foreground">
              Prix (EUR) *
            </Label>
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
              <Label htmlFor="stock" className="text-sm text-muted-foreground">
                Stock
              </Label>
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
        </div>

        {productType === "voucher" && (
          <p className="text-xs text-muted-foreground">
            Les codes sont générés automatiquement à chaque achat — aucun stock à gérer.
          </p>
        )}
      </div>

      {/* Options */}
      <div className="card-premium p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Options</h2>

        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setFeatured(!featured)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                featured ? "bg-primary" : "bg-border"
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                featured ? "translate-x-4" : "translate-x-1"
              }`} />
            </button>
            <span className="flex items-center gap-1.5 text-sm text-foreground">
              <Star size={14} className="text-primary" />
              Produit mis en avant (homepage)
            </span>
          </label>

          {isEdit && (
            <label className="flex items-center gap-3 cursor-pointer">
              <button
                type="button"
                onClick={() => setActive(!active)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  active ? "bg-primary" : "bg-border"
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  active ? "translate-x-4" : "translate-x-1"
                }`} />
              </button>
              <span className="text-sm text-foreground">
                Produit actif (visible en boutique)
              </span>
            </label>
          )}
        </div>
      </div>

      {/* Images */}
      {isEdit && (
        <div className="card-premium p-6 space-y-4">
          <h2 className="font-semibold text-foreground">
            Images ({images.length}/6)
          </h2>

          {uploadError && (
            <p className="text-destructive text-xs">{uploadError}</p>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {images.map((img) => (
              <div key={img.id} className="relative aspect-square rounded-md overflow-hidden border border-border bg-navy-800 group">
                <Image
                  src={img.url}
                  alt="Image produit"
                  fill
                  className="object-cover"
                  sizes="80px"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteImage(img.id, img.url)}
                  className="absolute top-1 right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} className="text-white" />
                </button>
              </div>
            ))}

            {images.length < 6 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-md border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors"
              >
                {uploading ? (
                  <Loader2 size={16} className="text-muted-foreground animate-spin" />
                ) : (
                  <Upload size={16} className="text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">
                  {uploading ? "..." : "Ajouter"}
                </span>
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
      )}

      {!isEdit && (
        <p className="text-xs text-muted-foreground bg-secondary/50 border border-border rounded-md px-4 py-3">
          Les images peuvent etre ajoutees apres la creation du produit.
        </p>
      )}

      {/* Hidden inputs — valeurs React lues nativement par new FormData(), sans dépendre des closures */}
      <input type="hidden" name="product_type" value={productType} />
      {productType === "voucher" && (
        <input type="hidden" name="voucher_duration_minutes" value={voucherDuration} />
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-primary text-primary-foreground hover:bg-gold-400 font-semibold"
        >
          {isPending
            ? "Sauvegarde..."
            : isEdit
            ? "Sauvegarder les modifications"
            : "Creer le produit"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/products")}
          className="border-border text-foreground hover:bg-secondary"
        >
          Annuler
        </Button>
      </div>

    </form>
  );
}
