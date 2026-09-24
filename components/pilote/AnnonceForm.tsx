"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createAnnonce, updateAnnonce, uploadAnnonceImage, deleteAnnonceImageFile } from "@/lib/actions/annonces";
import { evaluerPartPilote } from "@/lib/annonces-pilote";
import {
  AlertTriangle, ShieldCheck, PlaneTakeoff, ImagePlus, X,
  ChevronLeft, ChevronRight, Loader2, Route, Clock, Check,
} from "lucide-react";
import { Button, FormField, Input, Segmented, Select, Textarea } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import type { AnnonceRow } from "./AnnoncesList";
import type { WaypointDraft } from "@/components/admin/AdminRouteEditor";

const MAX_IMAGES = 6;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

const AdminRouteEditorDynamic = dynamic(
  () => import("@/components/admin/AdminRouteEditor").then(m => ({ default: m.AdminRouteEditor })),
  { ssr: false, loading: () => <div className="h-[340px] animate-pulse rounded-[14px] bg-st-surface" /> }
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

const eur = (v: number) => `${v.toLocaleString("fr-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

// Grande option cliquable (type de vol, mode de vente) : bordure navy + anneau
// quand elle est choisie.
function Option({ selected, onClick, icon: Icon, title, desc }: {
  selected: boolean;
  onClick: () => void;
  icon?: React.ComponentType<{ size?: number }>;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-[14px] border bg-white p-3.5 text-left transition-all",
        selected ? "border-st-ink ring-4 ring-st-ink-soft" : "border-st-line hover:border-st-line-strong hover:bg-st-surface",
      )}
    >
      {Icon && (
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-[10px]", selected ? "bg-st-ink text-white" : "bg-st-surface text-st-text-2")}>
          <Icon size={16} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold text-st-text">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-st-muted">{desc}</span>
      </span>
      {selected && Icon && <Check size={16} className="shrink-0 text-st-ink" />}
    </button>
  );
}

function SumRow({ label, children, strong }: { label: React.ReactNode; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-[13px] first:pt-0 last:pb-0">
      <span className="text-st-text-2">{label}</span>
      <span className={cn("st-num text-right", strong ? "text-[15px] font-semibold text-st-text" : "text-st-text")}>{children}</span>
    </div>
  );
}

// Formulaire d'annonce en 5 étapes, rendu en page (/pilote/annonces/nouvelle et
// /pilote/annonces/[id]/modifier) : à la fin ou sur « Annuler », retour à la liste.
export function AnnonceForm({ editing }: { editing?: AnnonceRow }) {
  const router = useRouter();
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

  function backToList() {
    router.push("/pilote/annonces");
  }

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
      router.push("/pilote/annonces");
      router.refresh();
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

  const nextLabel = step === "legal"
    ? (isPending ? (editing ? "Enregistrement…" : "Publication…") : (editing ? "Enregistrer les modifications" : "Publier ce vol"))
    : STEPS[stepIndex + 1] ? `Continuer : ${STEPS[stepIndex + 1].label.toLowerCase()}` : "Continuer";

  return (
    <div className="space-y-5">
      {error && (
        <div ref={errorRef} className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">
          {error}
        </div>
      )}

      {/* Indicateur d'étapes — cliquable pour changer directement d'étape */}
      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-1">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => jumpTo(s.key, i)}
              disabled={!canJumpTo(i)}
              className={cn(
                "h-1 rounded-full transition-colors",
                canJumpTo(i) ? "cursor-pointer" : "cursor-not-allowed",
                i <= stepIndex ? "bg-st-ink" : "bg-st-line",
              )}
              aria-label={s.label}
            />
          ))}
        </div>
        <p className="text-[12.5px] text-st-muted">
          Étape {stepIndex + 1} sur {STEPS.length} · {STEPS[stepIndex].label}
        </p>
      </div>

      {/* ── Étape : Type ─────────────────────────────────────────── */}
      {step === "type" && (
        <div className="space-y-2.5">
          <p className="text-[13px] text-st-text-2">Quel type de vol souhaitez-vous publier ?</p>
          <Option
            selected={hasRoute === true}
            onClick={() => { setHasRoute(true); goNext(); }}
            icon={Route}
            title="Vol avec itinéraire"
            desc="Vous tracez la route sur une carte, affichée au client sur l'annonce."
          />
          <Option
            selected={hasRoute === false}
            onClick={() => { setHasRoute(false); goNext(); }}
            icon={Clock}
            title="Vol à durée fixe"
            desc="Une durée en minutes, sans itinéraire précis. Le plus simple."
          />
        </div>
      )}

      {/* ── Étape : Le vol ───────────────────────────────────────── */}
      {step === "vol" && (
        <div className="space-y-4">
          <FormField id="annonce-titre" label="Titre de l'annonce" hint="Facultatif : sans titre, l'annonce affiche le nombre de passagers.">
            <Input
              id="annonce-titre" type="text" maxLength={80} placeholder="Ex. Coucher de soleil sur la Meuse"
              value={titre} onChange={e => setTitre(e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3.5">
            <FormField id="annonce-duree" label="Durée (minutes)">
              <Input
                id="annonce-duree" type="number" inputMode="numeric" min={10} max={240} required placeholder="60"
                value={duree} onChange={e => setDuree(e.target.value)}
              />
            </FormField>
            <FormField id="annonce-places" label="Passagers max">
              <Select id="annonce-places" value={places} onChange={e => setPlaces(e.target.value)} required>
                {[1, 2, 3, 4, 5, 6].map(p => <option key={p} value={p}>{p} place{p > 1 ? "s" : ""}</option>)}
              </Select>
            </FormField>
          </div>

          {hasRoute && (
            <FormField
              label="Itinéraire : cliquez sur la carte pour placer vos points"
              hint="Fond « Aéronautique » en haut à droite pour repérer zones et aérodromes. Tracé indicatif, affiché au client ; il ne change ni la durée ni le prix."
            >
              <div className="overflow-hidden rounded-[14px] border border-st-line">
                <AdminRouteEditorDynamic waypoints={routeDraft} onChange={setRouteDraft} height="340px" />
              </div>
            </FormField>
          )}
        </div>
      )}

      {/* ── Étape : Tarif ────────────────────────────────────────── */}
      {step === "tarif" && (
        <div className="space-y-4">
          <FormField label="Mode de vente">
            <div className="grid grid-cols-2 gap-2">
              <Option selected={modeVente === "avion"} onClick={() => setModeVente("avion")} title="Avion entier" desc="Un seul client réserve et règle le vol entier." />
              <Option selected={modeVente === "place"} onClick={() => setModeVente("place")} title="À la place" desc="Plusieurs clients, chacun règle sa place. Part égale automatique." />
            </div>
          </FormField>

          <FormField id="annonce-prix" label="Coût total du vol (€)" hint="Location de l'avion, carburant, taxes d'aérodrome : ce total se partage entre vous et vos passagers.">
            <Input
              id="annonce-prix" type="number" inputMode="decimal" min="0" step="0.01" required placeholder="300"
              value={prixTotal} onChange={e => setPrixTotal(e.target.value)}
            />
          </FormField>

          {modeVente === "avion" && (
            <FormField id="annonce-part" label="Votre part" hint="Ce que vous payez vous-même, indépendant du nombre de passagers.">
              <div className="flex items-center gap-2">
                <Input
                  id="annonce-part" type="number" inputMode="decimal" min="0" step="0.01" required placeholder={partMode === "pct" ? "25" : "75"}
                  value={partValue} onChange={e => setPartValue(e.target.value)}
                />
                <Segmented
                  value={partMode}
                  onChange={setPartMode}
                  items={[{ key: "pct", label: "%" }, { key: "eur", label: "€" }]}
                />
              </div>
            </FormField>
          )}

          {prixTotal !== "" && (modeVente === "place" || partValue !== "") && (
            <div className="rounded-[14px] bg-st-surface px-4 py-3">
              {modeVente === "avion" ? (
                <>
                  <SumRow label="Vous payez">{eur(Math.max(0, partPiloteEuros))}</SumRow>
                  <SumRow label="Prix affiché au client" strong>{eur(prixClient)}</SumRow>
                </>
              ) : (
                <>
                  <SumRow label={`Votre part (${placesNum + 1} parts égales)`}>{eur(partPiloteAuto)}</SumRow>
                  <SumRow label="Solde à partager entre les passagers">{eur(prixClient)}</SumRow>
                  <SumRow label="Prix par passager si complet" strong>{eur(prixParPlace)}</SumRow>
                  <p className="mt-2 text-xs leading-snug text-st-muted">
                    Recalculé sur les occupants réels à la clôture du groupe : plus cher par passager si le groupe
                    part avant d&apos;être complet.
                  </p>
                </>
              )}
            </div>
          )}

          {showCheck && (
            <div className={cn(
              "flex items-start gap-2.5 rounded-[14px] px-3.5 py-3 text-[13px]",
              check.level === "ok" ? "bg-st-ok-soft text-st-ok" : "bg-st-warn-soft text-st-warn",
            )}>
              {check.level === "ok" ? <ShieldCheck size={16} className="mt-px shrink-0" /> : <AlertTriangle size={16} className="mt-px shrink-0" />}
              <div>
                <p className="font-semibold leading-snug">
                  {check.level === "ok"
                    ? `Votre part : ${check.pct} % (minimum recommandé ${check.minPct} % pour ${places} passager${Number(places) > 1 ? "s" : ""})`
                    : (check.message ?? "")}
                </p>
                {check.level !== "ok" && (
                  <p className="mt-0.5 text-xs opacity-80">Part actuelle : {check.pct} % · minimum recommandé {check.minPct} %</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Étape : Présentation ─────────────────────────────────── */}
      {step === "presentation" && (
        <div className="space-y-4">
          <FormField id="annonce-description" label="Description">
            <Textarea
              id="annonce-description"
              value={description} onChange={e => setDescription(e.target.value)}
              rows={5} placeholder="Décrivez le vol, l'itinéraire envisagé, l'ambiance…"
              className="resize-none"
            />
          </FormField>

          <FormField label={`Photos (jusqu'à ${MAX_IMAGES}) : la première est la couverture`}>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {images.map((img, i) => (
                <div key={img.path} className="relative aspect-square overflow-hidden rounded-[12px] border border-st-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded-[6px] bg-st-ink px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      Couverture
                    </span>
                  )}
                  <button type="button" onClick={() => removeImage(i)} aria-label="Retirer la photo"
                    className="absolute right-1.5 top-1.5 grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-black/60 text-white hover:bg-black/80">
                    <X size={12} />
                  </button>
                  <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between">
                    <button type="button" disabled={i === 0} onClick={() => moveImage(i, -1)} aria-label="Déplacer vers la gauche"
                      className="grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-30">
                      <ChevronLeft size={12} />
                    </button>
                    <button type="button" disabled={i === images.length - 1} onClick={() => moveImage(i, 1)} aria-label="Déplacer vers la droite"
                      className="grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-30">
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed border-st-line-strong text-st-muted transition-colors hover:border-st-ink hover:text-st-text disabled:opacity-50">
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                  <span className="text-[11px] font-[550]">Ajouter</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef} type="file" accept="image/*" multiple hidden
              onChange={handleFilesSelected}
            />
          </FormField>
        </div>
      )}

      {/* ── Étape : Publication ──────────────────────────────────── */}
      {step === "legal" && (
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-[14px] bg-st-surface px-4 py-3.5">
            <input
              type="checkbox"
              checked={legalOk}
              onChange={e => setLegalOk(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#0b2238]"
            />
            <span className="text-[13px] leading-snug text-st-text-2">
              Je confirme que je réalise réellement ce vol et que je partage mes frais avec les
              passagers. Je ne fais pas de transport à titre onéreux : ma part reste à ma charge.
            </span>
          </label>
          <p className="text-xs leading-snug text-st-muted">
            Vos disponibilités (quand vous êtes libre de voler) se gèrent à part, dans
            « Disponibilités » : un seul calendrier, valable pour toutes vos annonces.
          </p>
        </div>
      )}

      {/* Bas de formulaire : secondaire à gauche, validation pleine largeur */}
      <div className="grid grid-cols-[auto_1fr] gap-2.5 pt-2">
        {stepIndex > 0 ? (
          <Button variant="secondary" size="lg" className="sm:h-[38px] sm:text-[13px]" onClick={goBack}>
            <ChevronLeft />
            Retour
          </Button>
        ) : (
          <Button variant="secondary" size="lg" className="sm:h-[38px] sm:text-[13px]" onClick={backToList}>
            Annuler
          </Button>
        )}
        <Button
          size="lg"
          className="sm:h-[38px] sm:text-[13px]"
          onClick={goNext}
          disabled={!canProceed[step] || uploading}
          loading={isPending}
        >
          {!isPending && step === "legal" && <PlaneTakeoff />}
          <span className="truncate">{nextLabel}</span>
          {step !== "legal" && <ChevronRight />}
        </Button>
      </div>
    </div>
  );
}
