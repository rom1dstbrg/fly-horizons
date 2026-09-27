"use client";

import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, MapPin, Save, Trash2, X } from "lucide-react";
import type { WaypointDraft } from "@/components/admin/AdminRouteEditor";
import { createItineraire, updateItineraire, type Itineraire } from "@/lib/actions/itineraires";
import { Button, FormField, Input, Segmented, Textarea } from "@/components/pilote/studio";
import { calcRouteStats, suspectPoints } from "@/lib/route-stats";
import { optimizeWaypoints } from "@/lib/route-optimize";
import { toDraft } from "./ItineraireParts";

// Éditeur plein écran d'un itinéraire (maquette validée le 27/09), même
// disposition que l'éditeur de route du tiroir : champs et points à gauche
// (en bas au téléphone), carte en grand. Le temps de vol se tape en minutes ;
// la durée estimée depuis le tracé se reprend en un clic.

const AdminRouteEditorDynamic = dynamic(
  () => import("@/components/admin/AdminRouteEditor").then((m) => ({ default: m.AdminRouteEditor })),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-st-surface" /> },
);

type Ordre = "ajout" | "optimise";

// Ordre des points (27/09) : « Ordre d'ajout » (par défaut) suit l'ordre des
// clics ; « Route optimisée » réordonne pour le trajet le plus court depuis et
// vers EBCI. On garde toujours l'ordre d'ajout en mémoire : revenir au premier
// onglet le rétablit. C'est l'ordre affiché qui est enregistré.
function optimizedOrder(points: WaypointDraft[]): number[] {
  const parsed = points
    .map((p, i) => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lng), i }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  const order = optimizeWaypoints(parsed).map((p) => p.i);
  // Points sans coordonnées valides (ne devrait pas arriver) : laissés à la fin.
  return [...order, ...points.map((_, i) => i).filter((i) => !order.includes(i))];
}

export function ItineraireEditor({ itin, onClose, onSaved }: {
  /** null = nouvel itinéraire. */
  itin: Itineraire | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nom, setNom] = useState(itin?.nom ?? "");
  const [duree, setDuree] = useState(itin?.duree_estimee != null ? String(itin.duree_estimee) : "");
  const [notes, setNotes] = useState(itin?.notes ?? "");
  // `added` : les points dans l'ordre où le pilote les a posés.
  const [added, setAdded] = useState<WaypointDraft[]>(() => (itin ? toDraft(itin) : []));
  const [ordre, setOrdre] = useState<Ordre>("ajout");
  const perm = useMemo(
    () => (ordre === "optimise" ? optimizedOrder(added) : added.map((_, i) => i)),
    [added, ordre],
  );
  const points = useMemo(() => perm.map((i) => added[i]), [perm, added]);

  // Les modifications arrivent dans l'ordre affiché (carte, liste) : on les
  // reporte sur l'ordre d'ajout. Ajout = en fin de liste ; retrait = l'élément
  // qui manque ; déplacement / renommage = même longueur.
  function setPoints(next: WaypointDraft[]) {
    if (next.length === points.length + 1) {
      setAdded([...added, next[next.length - 1]]);
    } else if (next.length === points.length - 1) {
      let k = next.findIndex((p, i) => p !== points[i]);
      if (k === -1) k = points.length - 1;
      setAdded(added.filter((_, i) => i !== perm[k]));
    } else if (next.length === points.length) {
      const copy = [...added];
      next.forEach((p, i) => { copy[perm[i]] = p; });
      setAdded(copy);
    } else {
      setAdded(next);
    }
  }
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const stats = calcRouteStats(points);
  const statsAjout = ordre === "optimise" ? calcRouteStats(added) : stats;
  const suspects = suspectPoints(points);
  const suspectIdx = new Set(suspects.map((x) => x.index));
  const label = (i: number) => `${i + 1}${points[i]?.nom.trim() ? ` (${points[i].nom.trim()})` : ""}`;
  const gainKm = stats && statsAjout ? Math.round(statsAjout.distKm - stats.distKm) : 0;

  function save() {
    setError(null);
    const waypoints = points
      .map((p) => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lng), nom: p.nom.trim() }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    const data = { nom, waypoints, duree_estimee: duree ? Number(duree) : null, notes };
    startTransition(async () => {
      const res = itin ? await updateItineraire(itin.id, data) : await createItineraire(data);
      if ("error" in res) { setError(res.error); return; }
      onSaved();
    });
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="pilote-studio fixed inset-0 z-[200] flex flex-col bg-st-bg font-sans text-st-text" role="dialog" aria-modal="true" aria-label="Éditeur d'itinéraire">
      <div className="flex h-[60px] shrink-0 items-center gap-2.5 border-b border-st-line bg-white px-4 pt-[env(safe-area-inset-top)] sm:px-5">
        <p className="min-w-0 truncate text-[15px] font-semibold">
          {itin ? "Itinéraire" : "Nouvel itinéraire"}
          {nom.trim() && <span className="font-medium text-st-muted"> · {nom.trim()}</span>}
        </p>
        <span className="flex-1" />
        <Button onClick={save} loading={isPending} disabled={points.length === 0 || !nom.trim()}>
          <Save /> Enregistrer
        </Button>
        <button type="button" onClick={onClose} aria-label="Fermer l'éditeur" className="grid h-[38px] w-[38px] shrink-0 cursor-pointer place-items-center rounded-[11px] border border-st-line bg-white text-st-text-2 transition-colors hover:bg-st-surface">
          <X size={17} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col-reverse lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
        <div className="min-h-0 space-y-4 overflow-y-auto border-st-line bg-white p-4 max-lg:max-h-[48dvh] max-lg:border-t lg:border-r">
          <div className="space-y-1.5">
            <Segmented
              fill
              value={ordre}
              onChange={setOrdre}
              items={[
                { key: "ajout", label: "Ordre d'ajout" },
                { key: "optimise", label: "Route optimisée" },
              ]}
            />
            <p className="text-[11.5px] leading-snug text-st-muted">
              {ordre === "ajout"
                ? "Les points sont suivis dans l'ordre où vous les posez."
                : added.length < 3
                  ? "Trajet le plus court depuis et vers EBCI (utile à partir de 3 points)."
                  : gainKm > 0
                    ? `Trajet le plus court depuis et vers EBCI : ${gainKm} km de moins que l'ordre d'ajout.`
                    : "Trajet le plus court depuis et vers EBCI : l'ordre d'ajout l'était déjà."}
            </p>
          </div>
          {error && <p className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">{error}</p>}
          <FormField id="itin-nom" label="Nom">
            <Input id="itin-nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Lacs de l'Eau d'Heure" />
          </FormField>
          <FormField id="itin-duree" label="Temps de vol estimé">
            <div className="relative">
              <Input
                id="itin-duree" type="number" inputMode="numeric" min={1} max={600}
                value={duree} onChange={(e) => setDuree(e.target.value)} placeholder="45" className="pr-12 st-num"
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12.5px] text-st-muted">min</span>
            </div>
          </FormField>
          {stats && (
            <div className="flex items-center justify-between gap-2 rounded-[12px] bg-st-surface px-3 py-2 text-[12.5px] text-st-text-2">
              <span className="st-num">Tracé : ≈ {stats.totalMin} min · {Math.round(stats.distKm)} km</span>
              {String(stats.totalMin) !== duree && (
                <button type="button" onClick={() => setDuree(String(stats.totalMin))} className="cursor-pointer font-semibold text-st-ink hover:underline">
                  Utiliser {stats.totalMin}
                </button>
              )}
            </div>
          )}

          <div>
            <p className="mb-1 text-[12.5px] font-[550] text-st-text-2">Points</p>
            {points.length === 0 ? (
              // Rappel (27/09) à l'endroit où le pilote commence, puis il laisse
              // la place à la liste : le client voit ces points comme le
              // programme du vol, des points de virage n'y ont pas de sens.
              <div className="flex gap-2.5 rounded-[14px] bg-st-info-soft px-3.5 py-3">
                <MapPin size={16} className="mt-0.5 shrink-0 text-st-info" />
                <p className="text-[12.5px] leading-snug text-st-text-2">
                  <span className="font-semibold text-st-info">Cliquez sur la carte pour placer les lieux survolés</span> (villes,
                  sites, lacs). Inutile d&apos;ajouter un point à chaque virage : le client voit ces points comme le programme du vol.
                </p>
              </div>
            ) : (
              <>
              {suspects.length > 0 && (
                <div role="alert" className="mb-2 flex gap-2.5 rounded-[14px] bg-st-bad-soft px-3.5 py-3">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-st-bad" />
                  <div className="space-y-1 text-[12.5px] leading-snug text-st-text-2">
                    <p className="font-semibold text-st-bad">
                      {suspects.length > 1 ? "Ces points ressemblent" : "Ce point ressemble"} à des points de navigation, pas à des lieux survolés
                    </p>
                    <ul className="space-y-0.5">
                      {suspects.map((x) => (
                        <li key={x.index}>
                          Point {label(x.index)} :{" "}
                          {x.reason === "ebci"
                            ? `à ${x.km} km d'EBCI, sans doute un point de sortie ou d'entrée de la CTR.`
                            : `à ${String(x.km).replace(".", ",")} km du point ${x.prev + 1}, sans doute un point pour contourner une zone.`}
                        </li>
                      ))}
                    </ul>
                    <p>Le client voit ces points comme le programme du vol : retirez-les si ce ne sont pas des lieux à voir.</p>
                  </div>
                </div>
              )}
              <ol className="divide-y divide-st-line-soft">
                {points.map((p, i) => (
                  <li key={i} className="flex items-center gap-2.5 py-1.5">
                    <span className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[10.5px] font-semibold text-white ${suspectIdx.has(i) ? "bg-st-bad" : "bg-st-ink"}`}>{i + 1}</span>
                    <input
                      value={p.nom}
                      onChange={(e) => setPoints(points.map((q, k) => (k === i ? { ...q, nom: e.target.value } : q)))}
                      placeholder={`Point ${i + 1}`}
                      aria-label={`Nom du point ${i + 1}`}
                      className="h-8 min-w-0 flex-1 rounded-[8px] border border-transparent bg-transparent px-2 text-[16px] text-st-text outline-none transition-colors hover:border-st-line focus:border-st-ink sm:text-[13px]"
                    />
                    <button type="button" onClick={() => setPoints(points.filter((_, k) => k !== i))} aria-label={`Retirer le point ${i + 1}`} className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-[9px] text-st-muted transition-colors hover:bg-st-bad-soft hover:text-st-bad">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ol>
              </>
            )}
            <p className="mt-1.5 text-[11.5px] text-st-muted">
              Départ et retour à EBCI. Seulement les lieux survolés, pas chaque virage. Clic sur la carte : ajouter un point. Glisser un point : le déplacer.
            </p>
          </div>

          <FormField id="itin-notes" label="Notes (optionnel)">
            <Textarea id="itin-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Altitude, zones à éviter…" className="min-h-0" />
          </FormField>
        </div>
        <div className="relative min-h-[48dvh] flex-1 lg:h-full lg:min-h-0">
          <AdminRouteEditorDynamic waypoints={points} onChange={setPoints} height="fill" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
