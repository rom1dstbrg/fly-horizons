"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Upload, X, Loader2, Clock, GripVertical, Route, Ticket, Navigation, Plane, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSection } from "@/components/admin/ui";
import { createProduct, updateProduct, deleteProductImage, reorderProductImages } from "@/lib/actions/products";
import { createClient } from "@/lib/supabase/client";
import type { Product, ProductImage } from "@/types/database";
import type { WaypointDraft } from "@/components/admin/AdminRouteEditor";
import type { Itineraire } from "@/lib/actions/itineraires";
import { useItineraires } from "@/components/admin/reservation-drawer/hooks/useItineraires";
import { ItinerairesModal } from "@/components/admin/reservation-drawer/ItinerairesModal";

const AdminRouteEditorDynamic = dynamic(
  () => import("@/components/admin/AdminRouteEditor").then(m => ({ default: m.AdminRouteEditor })),
  { ssr: false, loading: () => <div className="h-[260px] rounded-lg bg-secondary animate-pulse" /> }
);

interface StopoverOption {
  id: string;
  icao: string;
  nom: string;
  taxe: number;
  lat?: number | null;
  lng?: number | null;
}

interface ProductFormProps {
  product?: Product & { images?: ProductImage[] };
  prixHeure?: number | null;
  stopovers?: StopoverOption[];
}

export function ProductForm({ product, prixHeure, stopovers = [] }: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!product;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages]           = useState<ProductImage[]>(product?.images ?? []);
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();

  const [active, setActive]           = useState(product?.active ?? true);
  const [voucherDuration, setVoucherDuration] = useState<number>(product?.voucher_duration_minutes ?? 60);

  const [hasRoute, setHasRoute] = useState(!!product?.route_waypoints?.length);
  const [routeDraft, setRouteDraft] = useState<WaypointDraft[]>(
    (product?.route_waypoints ?? []).map(w => ({ lat: String(w.lat), lng: String(w.lng), nom: w.nom ?? "" }))
  );
  const itineraires = useItineraires(setRouteDraft);
  function handleApplyItineraire(itin: Itineraire) {
    itineraires.apply(itin);
    setHasRoute(true);
  }

  const [selectedEscales, setSelectedEscales] = useState<StopoverOption[]>(
    (product?.escales ?? []).map(e => ({
      id: e.icao,
      icao: e.icao,
      nom: e.nom,
      taxe: e.taxe,
      lat: e.lat ?? null,
      lng: e.lng ?? null,
    }))
  );
  const [escalesOpen, setEscalesOpen] = useState(false);
  const escalesTaxTotal = selectedEscales.reduce((acc, s) => acc + s.taxe, 0);
  function addEscale(s: StopoverOption) {
    setSelectedEscales(prev => [...prev, s]);
    setEscalesOpen(false);
  }
  function removeEscale(id: string) {
    setSelectedEscales(prev => prev.filter(s => s.id !== id));
  }

  const initialTotalPrice = product?.price ?? 0;
  const [prixVol, setPrixVol] = useState<string>(
    product ? String(Math.max(0, initialTotalPrice - (product.escales ?? []).reduce((a, e) => a + e.taxe, 0))) : ""
  );

  const [unlimited, setUnlimited] = useState(product?.quantity_available == null);
  const [quantityAvailable, setQuantityAvailable] = useState<string>(
    product?.quantity_available != null ? String(product.quantity_available) : "1"
  );

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
    <>
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

      {/* Disposition principale : contenu (large) à gauche, réglages (compacts) à droite */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">

        {/* ── Colonne gauche : galerie + contenu ── */}
        <div className="space-y-5">

          {/* Images */}
          {isEdit ? (
            <div className="card-premium p-6 space-y-4">
              <div className="flex items-center justify-between">
                <FormSection title="Images" />
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
            <FormSection title="Contenu" />

            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm text-muted-foreground">Titre *</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={product?.title}
                placeholder="Ex : Vol découverte 60 min"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="short_description" className="text-sm text-muted-foreground">Description</Label>
              <textarea
                id="short_description"
                name="short_description"
                rows={6}
                defaultValue={product?.short_description ?? ""}
                placeholder="Décrivez l'expérience que vous offrez…"
                className="w-full bg-input border border-border text-foreground placeholder:text-muted-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-y leading-relaxed"
              />
            </div>
          </div>

          {/* Itinéraire — carte pleine largeur, seulement si activé */}
          <div className="card-premium p-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <FormSection title="Itinéraire" />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => itineraires.open()}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                >
                  <Navigation size={12} />
                  Charger un itinéraire
                </button>
                <button
                  type="button"
                  onClick={() => setHasRoute(v => {
                    // Repasser en "durée seule" retire aussi les escales — sinon leur taxe
                    // continuerait d'être ajoutée au prix alors que le panneau est masqué.
                    if (v) setSelectedEscales([]);
                    return !v;
                  })}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                    hasRoute ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <Route size={12} />
                  {hasRoute ? "Itinéraire fixe" : "Durée seule"}
                </button>
              </div>
            </div>
            {hasRoute ? (
              <>
                <AdminRouteEditorDynamic
                  waypoints={routeDraft}
                  onChange={setRouteDraft}
                  height="340px"
                  stopovers={selectedEscales.map(s => ({ icao: s.icao, nom: s.nom, taxe: s.taxe, lat: s.lat ?? undefined, lng: s.lng ?? undefined }))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Cet itinéraire est affiché sur la fiche produit avant l&apos;achat. Il ne sera pas retracé ni
                  renvoyé au client après la réservation.
                </p>

                {/* Escales — destination hors Charleroi, avec taxe d'atterrissage */}
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] flex items-center gap-1.5">
                      <Plane size={11} />
                      Escales
                    </p>
                    {stopovers.some(s => !selectedEscales.find(ss => ss.id === s.id)) && (
                      <button
                        type="button"
                        onClick={() => setEscalesOpen(v => !v)}
                        className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus size={11} /> Ajouter
                      </button>
                    )}
                  </div>

                  {selectedEscales.length === 0 && !escalesOpen && (
                    <p className="text-[11px] text-muted-foreground italic">Aucune escale — vol EBCI ↔ EBCI uniquement.</p>
                  )}

                  {selectedEscales.map(s => (
                    <div key={s.id} className="flex items-center gap-2 bg-secondary rounded-lg px-2.5 py-1.5 border border-border mb-1.5">
                      <span className="font-mono text-[10px] font-bold text-foreground shrink-0">{s.icao}</span>
                      <span className="flex-1 text-[11px] text-muted-foreground truncate">{s.nom}</span>
                      {s.taxe > 0 && <span className="text-[10px] font-bold text-foreground shrink-0">+{s.taxe} €</span>}
                      <button
                        type="button"
                        onClick={() => removeEscale(s.id)}
                        className="text-muted-foreground/50 hover:text-destructive transition-colors cursor-pointer shrink-0"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}

                  {escalesOpen && (
                    <div className="rounded-lg overflow-hidden border border-border mt-1">
                      {stopovers.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground px-3 py-2.5">
                          Aucune escale enregistrée — ajoutez-en une dans Itinéraires &gt; Escales.
                        </p>
                      ) : (
                        stopovers
                          .filter(s => !selectedEscales.find(ss => ss.id === s.id))
                          .map((s, i, arr) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => addEscale(s)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-primary/5 text-left transition-colors cursor-pointer ${i < arr.length - 1 ? "border-b border-border" : ""}`}
                            >
                              <span className="font-mono text-[10px] font-bold text-foreground shrink-0 w-11">{s.icao}</span>
                              <span className="flex-1 text-[11px] text-foreground/80 truncate">{s.nom}</span>
                              {s.taxe > 0 && <span className="text-[10px] text-muted-foreground shrink-0">+{s.taxe} €</span>}
                            </button>
                          ))
                      )}
                    </div>
                  )}

                  {selectedEscales.length > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Taxe(s) d&apos;escale ajoutée(s) automatiquement au prix affiché. Les frais additionnels
                      (extras, douane…) restent à ajouter par toi au cas par cas, sur la réservation.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-[11px] text-muted-foreground bg-secondary/50 rounded-md px-3 py-2">
                Le client réserve une date/heure libre, la route sera tracée et envoyée après paiement comme
                aujourd&apos;hui.
              </p>
            )}
          </div>
        </div>

        {/* ── Colonne droite : réglages compacts ── */}
        <div className="space-y-5">

          {/* Durée & Prix */}
          <div className="card-premium p-6 space-y-4">
            <FormSection title="Durée & prix" />
            <div className="space-y-1.5">
              <Label htmlFor="voucher_duration_minutes_input" className="text-sm text-muted-foreground">Durée (minutes) *</Label>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="voucher_duration_minutes_input"
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={voucherDuration}
                  onChange={e => setVoucherDuration(Number(e.target.value))}
                  placeholder="60"
                  className="pl-9 bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="price" className="text-sm text-muted-foreground">
                {escalesTaxTotal > 0 ? "Prix du vol (EUR) *" : "Prix (EUR) *"}
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                required
                value={prixVol}
                onChange={e => setPrixVol(e.target.value)}
                placeholder="199.00"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
              {!!prixHeure && prixHeure > 0 && voucherDuration > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Indicatif au tarif actuel : {Math.round((prixHeure / 60) * voucherDuration)} €
                </p>
              )}
              {escalesTaxTotal > 0 && (
                <p className="text-[11px] text-primary bg-primary/5 border border-primary/20 rounded-md px-3 py-2">
                  + {escalesTaxTotal} € de taxe(s) d&apos;escale = <strong>{(parseFloat(prixVol) || 0) + escalesTaxTotal} €</strong> facturés au client.
                </p>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              30/60/90/120 min restent synchronisées avec &quot;Prix des vols&quot; dans Paramètres à chaque
              enregistrement ; toute autre durée garde ce prix fixé manuellement.
            </p>
          </div>

          {/* Disponibilité */}
          <div className="card-premium p-6 space-y-3">
            <FormSection title="Disponibilité" />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUnlimited(true)}
                className={`flex-1 px-3 py-2 rounded-lg border-2 text-xs font-semibold transition-colors cursor-pointer ${
                  unlimited ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                Illimité
              </button>
              <button
                type="button"
                onClick={() => setUnlimited(false)}
                className={`flex-1 px-3 py-2 rounded-lg border-2 text-xs font-semibold transition-colors cursor-pointer ${
                  !unlimited ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                Nombre limité
              </button>
            </div>
            {!unlimited && (
              <div className="space-y-1.5">
                <Label htmlFor="quantity_available_input" className="text-sm text-muted-foreground">Places disponibles</Label>
                <div className="relative">
                  <Ticket size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="quantity_available_input"
                    type="number"
                    min={0}
                    step={1}
                    value={quantityAvailable}
                    onChange={e => setQuantityAvailable(e.target.value)}
                    placeholder="1"
                    className="pl-9 bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Chaque réservation en consomme une. À 0, l&apos;offre disparaît des pages publiques (republiable
                  en un clic depuis la liste des produits).
                </p>
              </div>
            )}
          </div>

          {/* Publication */}
          {isEdit && (
            <div className="card-premium p-6 space-y-3">
              <FormSection title="Publication" />
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
            </div>
          )}

        </div>
      </div>

      {/* Hidden inputs */}
      <input type="hidden" name="product_type" value="voucher" />
      <input type="hidden" name="voucher_duration_minutes" value={voucherDuration} />
      <input
        type="hidden"
        name="route_waypoints"
        value={
          hasRoute
            ? JSON.stringify(
                routeDraft
                  .filter(w => w.lat.trim() && w.lng.trim())
                  .map(w => ({ lat: Number(w.lat), lng: Number(w.lng), nom: w.nom || undefined }))
              )
            : ""
        }
      />
      <input type="hidden" name="quantity_available" value={unlimited ? "" : quantityAvailable} />
      <input type="hidden" name="price" value={(parseFloat(prixVol) || 0) + escalesTaxTotal} />
      <input
        type="hidden"
        name="escales"
        value={
          hasRoute && selectedEscales.length > 0
            ? JSON.stringify(selectedEscales.map(s => ({ icao: s.icao, nom: s.nom, taxe: s.taxe, lat: s.lat ?? undefined, lng: s.lng ?? undefined })))
            : ""
        }
      />

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

    <ItinerairesModal
      open={itineraires.showModal}
      onClose={() => itineraires.setShowModal(false)}
      duree={voucherDuration}
      items={itineraires.items}
      loading={itineraires.loading}
      showAll={itineraires.showAll}
      setShowAll={itineraires.setShowAll}
      onApply={handleApplyItineraire}
    />
    </>
  );
}
