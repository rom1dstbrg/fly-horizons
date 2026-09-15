"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { createAnnonce, updateAnnonce, uploadAnnonceImage, deleteAnnonceImageFile } from "@/lib/actions/annonces";
import { evaluerPartPilote } from "@/lib/annonces-pilote";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle, ShieldCheck, PlaneTakeoff, ImagePlus, X,
  ChevronLeft, ChevronRight, Loader2, Route, Clock, Check,
} from "lucide-react";
import type { AnnonceRow } from "./AnnoncesList";
import type { WaypointDraft } from "@/components/admin/AdminRouteEditor";

const MAX_IMAGES = 6;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

const AdminRouteEditorDynamic = dynamic(
  () => import("@/components/admin/AdminRouteEditor").then(m => ({ default: m.AdminRouteEditor })),
  { ssr: false, loading: () => <div className="h-[340px] rounded-lg bg-secondary/40 animate-pulse" /> }
);

type ImageItem = { path: string; url: string };
type Step = "type" | "vol" | "tarif" | "presentation" | "legal";
const STEPS: { key: Step; label: string }[] = [
  { key: "type", label: "Type" },
  { key: "vol", label: "Le vol" },
  { key: "tarif", label: "Tarif" },
  { key: "presentation", label: "Présentation" },
  { key: "legal", label: "Publication" },
];

export function AnnonceForm({
  onDone,
  onCancel,
  editing,
}: {
  onDone: () => void;
  onCancel: () => void;
  editing?: AnnonceRow;
}) {
  const [step, setStep] = useState<Step>("type");
  const [maxStepIndex, setMaxStepIndex] = useState(0);
  const [hasRoute, setHasRoute] = useState<boolean | null>(editing ? !!editing.route_waypoints?.length : null);
  const [routeDraft, setRouteDraft] = useState<WaypointDraft[]>(
    () => (editing?.route_waypoints ?? []).map(w => ({ lat: String(w.lat), lng: String(w.lng), nom: w.nom ?? "" }))
  );
  const [titre, setTitre] = useState(editing?.titre ?? "");
  const [duree, setDuree] = useState(editing ? String(editing.duree) : "60");
  const [places, setPlaces] = useState(editing ? String(editing.places) : "3");
  const [modeVente, setModeVente] = useState<"avion" | "place">(editing?.mode_vente === "place" ? "place" : "avion");
  const [prixTotal, setPrixTotal] = useState(editing ? String(editing.prix_total) : "");
  const [partMode, setPartMode] = useState<"pct" | "eur">("eur");
  const [partValue, setPartValue] = useState(editing ? String(editing.part_pilote) : "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [legalOk, setLegalOk] = useState(editing?.legal_ok ?? false);
  const [images, setImages] = useState<ImageItem[]>(
    () => (editing?.images ?? []).map(path => ({ path, url: `${SUPABASE_URL}/storage/v1/object/public/annonces/${path}` }))
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [error]);

  const prixTotalNum = parseFloat(prixTotal) || 0;
  const placesNum = Math.max(1, Number(places) || 1);

  // Mode « à la place » : la part du pilote n'est plus saisie à la main — elle
  // se calcule automatiquement, à parts égales entre lui et les passagers
  // (même règle que le minimum légal NCO.GEN.104, cf. lib/annonces-pilote.ts).
  const partPiloteAuto = prixTotalNum > 0 ? Math.round((prixTotalNum / (placesNum + 1)) * 100) / 100 : 0;
  const partValueNum = partValue === "" ? -1 : parseFloat(partValue) || 0;
  const partPiloteManuel = partValue === "" ? -1
    : partMode === "pct" ? Math.round(prixTotalNum * (partValueNum / 100) * 100) / 100
    : partValueNum;
  const partPiloteEuros = modeVente === "place" ? partPiloteAuto : partPiloteManuel;

  const prixClient = Math.max(0, prixTotalNum - Math.max(0, partPiloteEuros));
  const prixParPlace = Math.round((prixClient / placesNum) * 100) / 100;

  const check = useMemo(
    () => evaluerPartPilote(prixTotalNum, partPiloteEuros, Number(places)),
    [prixTotalNum, partPiloteEuros, places]
  );
  // En mode « à la place », la part est calculée pile au minimum légal : rien à avertir.
  const showCheck = modeVente === "avion" && prixTotal !== "" && partValue !== "";

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

  function submitAnnonce() {
    setError(null);
    startTransition(async () => {
      const payload = {
        titre: titre.trim() || undefined,
        duree: Number(duree),
        places: Number(places),
        prix_total: prixTotalNum,
        part_pilote: Math.max(0, partPiloteEuros),
        mode_vente: modeVente,
        description: description.trim() || undefined,
        images: images.map(i => i.path),
        legal_ok: legalOk,
        route_waypoints: hasRoute
          ? routeDraft
              .filter(w => w.lat.trim() && w.lng.trim())
              .map(w => ({ lat: Number(w.lat), lng: Number(w.lng), nom: w.nom || undefined }))
          : [],
      };
      const result = editing
        ? await updateAnnonce(editing.id, payload)
        : await createAnnonce(payload);
      if (result?.error) { setError(result.error); return; }
      onDone();
    });
  }

  const stepIndex = STEPS.findIndex(s => s.key === step);
  const canProceed: Record<Step, boolean> = {
    type: hasRoute !== null,
    vol: duree !== "" && Number(duree) > 0,
    tarif: prixTotal !== "" && prixTotalNum > 0 && (modeVente === "place" || partValue !== ""),
    presentation: true,
    legal: legalOk,
  };

  function goNext() {
    if (step === "legal") { submitAnnonce(); return; }
    const next = STEPS[stepIndex + 1];
    if (next) { setStep(next.key); setMaxStepIndex(m => Math.max(m, stepIndex + 1)); }
  }
  function goBack() {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.key);
  }
  // En modification, tout est déjà rempli : navigation libre entre étapes
  // (on clique directement sur celle qu'on veut changer). En création, on ne
  // peut pas sauter une étape pas encore atteinte (ex. le type détermine si la
  // carte s'affiche à l'étape suivante).
  function canJumpTo(i: number) {
    return !!editing || i <= maxStepIndex;
  }
  function jumpTo(key: Step, i: number) {
    if (!canJumpTo(i)) return;
    setStep(key);
  }

  return (
    <div className="space-y-5">
      {error && (
        <div ref={errorRef} className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md px-4 py-3">
          {error}
        </div>
      )}

      {/* Indicateur d'étapes — cliquable pour changer directement d'étape */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => jumpTo(s.key, i)}
            disabled={!canJumpTo(i)}
            className={`flex-1 h-1.5 rounded-full transition-colors ${canJumpTo(i) ? "cursor-pointer" : "cursor-not-allowed"} ${i <= stepIndex ? "bg-primary" : "bg-secondary"}`}
            aria-label={s.label}
          />
        ))}
      </div>
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide -mt-3">
        Étape {stepIndex + 1} sur {STEPS.length} · {STEPS[stepIndex].label}
      </p>

      <div className="min-h-[320px]">
        {/* ── Étape : Type ─────────────────────────────────────────── */}
        {step === "type" && (
          <div className="space-y-2.5">
            <p className="text-sm text-muted-foreground">Quel type de vol souhaitez-vous publier ?</p>
            {([
              { val: true, icon: Route, title: "Vol avec itinéraire", desc: "Vous tracez la route sur une carte, affichée au client sur l'annonce." },
              { val: false, icon: Clock, title: "Vol à durée fixe", desc: "Une durée en minutes, sans itinéraire précis — le plus simple." },
            ] as const).map(({ val, icon: Icon, title, desc }) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => { setHasRoute(val); goNext(); }}
                className={`w-full flex items-center gap-3.5 text-left rounded-lg border p-4 transition-colors cursor-pointer group ${
                  hasRoute === val ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-primary/5"
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  hasRoute === val ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
                }`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                {hasRoute === val && <Check size={16} className="text-primary shrink-0" />}
              </button>
            ))}
          </div>
        )}

        {/* ── Étape : Le vol ───────────────────────────────────────── */}
        {step === "vol" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Titre de l&apos;annonce</Label>
              <Input
                type="text" maxLength={80} placeholder="Ex. Coucher de soleil sur la Wallonie"
                value={titre} onChange={e => setTitre(e.target.value)}
                className="bg-input border-border"
              />
              <p className="text-[11px] text-muted-foreground">
                Facultatif — sans titre, l&apos;annonce affiche votre nom par défaut.
              </p>
            </div>

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
                <Label className="text-sm text-muted-foreground">Places passagers maximum *</Label>
                <select value={places} onChange={e => setPlaces(e.target.value)} required
                  className="w-full h-10 bg-input border border-border text-foreground rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  {[1, 2, 3, 4, 5, 6].map(p => <option key={p} value={p}>{p} place{p > 1 ? "s" : ""}</option>)}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Le nombre maximum de passagers acceptés — pas forcément le nombre final.
                </p>
              </div>
            </div>

            {hasRoute && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Itinéraire — cliquez sur la carte pour placer vos points</Label>
                <AdminRouteEditorDynamic waypoints={routeDraft} onChange={setRouteDraft} height="340px" />
                <p className="text-[11px] text-muted-foreground">
                  Basculez sur le fond « Aéronautique » (en haut à droite de la carte) pour repérer
                  zones et aérodromes. Ce tracé est indicatif : affiché au client sur la page de
                  l&apos;annonce, il ne change rien à la durée ni au prix.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Étape : Tarif ────────────────────────────────────────── */}
        {step === "tarif" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Mode de vente *</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["avion", "Tout l'avion", "Un seul client réserve et règle le vol entier."],
                  ["place", "Vente à la place", "Plusieurs clients, chacun règle sa place — part égale automatique."],
                ] as const).map(([val, title, desc]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setModeVente(val)}
                    className={`text-left rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${
                      modeVente === val ? "border-primary bg-primary/5" : "border-border bg-input hover:border-foreground/30"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-foreground">{title}</span>
                    <span className="block text-[11px] text-muted-foreground mt-0.5">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Coût total du vol (€) *</Label>
              <Input
                type="number" min="0" step="0.01" required placeholder="300"
                value={prixTotal} onChange={e => setPrixTotal(e.target.value)}
                className="bg-input border-border"
              />
              <p className="text-[11px] text-muted-foreground">
                Location de l&apos;avion, carburant, taxes d&apos;aérodrome. C&apos;est ce total qui se
                partage entre vous et vos passagers.
              </p>
            </div>

            {modeVente === "avion" ? (
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
                <p className="text-[11px] text-muted-foreground">
                  Ce que vous payez vous-même, fixé par vous — indépendant du nombre de passagers.
                </p>
              </div>
            ) : (
              prixTotal !== "" && (
                <div className="bg-secondary/40 border border-border rounded-lg px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Votre part (calculée automatiquement)</span>
                    <span className="text-lg font-black text-foreground">{partPiloteAuto.toFixed(2)} €</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Partage à parts égales entre vous et les passagers max. ({placesNum + 1} parts) —
                    recalculé sur les occupants réels à la clôture du groupe.
                  </p>
                </div>
              )
            )}

            {prixTotal !== "" && (modeVente === "place" || partValue !== "") && modeVente === "avion" && (
              <div className="bg-secondary/40 border border-border rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Prix affiché au client</span>
                <span className="text-lg font-black text-foreground">{prixClient.toFixed(2)} €</span>
              </div>
            )}

            {prixTotal !== "" && modeVente === "place" && (
              <div className="bg-secondary/40 border border-border rounded-lg px-4 py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Solde à partager entre les passagers</span>
                  <span className="text-lg font-black text-foreground">{prixClient.toFixed(2)} €</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Prix par passager si les {placesNum} places se remplissent : {prixParPlace.toFixed(2)} € chacun
                  (plus si le groupe se clôture avant d&apos;être complet).
                </p>
              </div>
            )}

            {showCheck && (
              <div className={`flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm border ${
                check.level === "block" ? "bg-red-50 border-red-200 text-red-700"
                : check.level === "warn" ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
              }`}>
                {check.level !== "ok" && <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
                {check.level === "ok" && <ShieldCheck size={16} className="shrink-0 mt-0.5" />}
                <div>
                  <p className="font-semibold">
                    {check.level === "ok"
                      ? `Votre part : ${check.pct}% (minimum recommandé ${check.minPct}% pour ${places} passager${Number(places) > 1 ? "s" : ""})`
                      : (check.message ?? "")}
                  </p>
                  {check.level !== "ok" && (
                    <p className="text-xs opacity-80 mt-0.5">Part actuelle : {check.pct}% · minimum recommandé {check.minPct}%</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Étape : Présentation ─────────────────────────────────── */}
        {step === "presentation" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Description</Label>
              <textarea
                value={description} onChange={e => setDescription(e.target.value)}
                rows={5} placeholder="Décrivez le vol, l'itinéraire envisagé, l'ambiance..."
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
          </div>
        )}

        {/* ── Étape : Publication ──────────────────────────────────── */}
        {step === "legal" && (
          <div className="space-y-4">
            <label className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/30 px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={legalOk}
                onChange={e => setLegalOk(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
              />
              <span className="text-xs text-muted-foreground">
                Je confirme que je réalise réellement ce vol et que je partage mes frais avec les
                passagers. Je ne fais pas de transport à titre onéreux : ma part reste à ma charge.
              </span>
            </label>
            <p className="text-[11px] text-muted-foreground">
              Vos disponibilités (quand vous êtes libre de voler) se gèrent séparément, dans
              l&apos;onglet « Disponibilités » — un seul calendrier, valable pour toutes vos annonces.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
        {stepIndex > 0 ? (
          <button type="button" onClick={goBack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer">
            <ChevronLeft size={15} /> Retour
          </button>
        ) : (
          <button type="button" onClick={onCancel}
            className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer">
            Annuler
          </button>
        )}
        <button
          type="button"
          onClick={goNext}
          disabled={!canProceed[step] || isPending || uploading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-[#e6a800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : step === "legal" ? <PlaneTakeoff size={14} /> : null}
          {step === "legal"
            ? (isPending ? (editing ? "Enregistrement..." : "Publication...") : (editing ? "Enregistrer les modifications" : "Publier ce vol"))
            : "Continuer"}
          {step !== "legal" && <ChevronRight size={15} />}
        </button>
      </div>
    </div>
  );
}
