"use client";

import { AlertTriangle, ExternalLink, Lock, Pencil, RotateCcw, X } from "lucide-react";
import { evaluerPartPilote } from "@/lib/annonces-pilote";
import {
  Badge, Button, LinkButton, SheetBody, SheetFooter, SheetHeader, SheetHero, SheetRow, SheetRows,
  type BadgeTone,
} from "@/components/pilote/studio";

export interface AnnonceRow {
  id: string;
  titre?: string | null;
  duree: number;
  places: number;
  prix_total: number;
  part_pilote: number;
  mode_vente?: "avion" | "place";
  places_reservees?: number;
  description: string | null;
  images: string[];
  statut: "publiee" | "reservee" | "annulee";
  legal_ok?: boolean;
  route_waypoints?: Array<{ lat: number; lng: number; nom?: string }> | null;
}

export interface AnnonceStats {
  vues: number;
  visiteurs: number;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const coverUrl = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/annonces/${path}`;
const eur = (v: number) => `${v.toLocaleString("fr-BE", { maximumFractionDigits: 2 })} €`;

// Tout ce qu'on déduit d'une annonce pour l'afficher : prix client, alerte
// « À confirmer », groupe ouvert, pastille d'état. Une seule source pour la
// grille et le tiroir.
export function annonceInfo(a: AnnonceRow) {
  const check = evaluerPartPilote(a.prix_total, a.part_pilote, a.places);
  const prixTotalClient = Math.max(0, a.prix_total - a.part_pilote);
  const parPlace = a.mode_vente === "place";
  const prixClient = parPlace
    ? Math.round((prixTotalClient / Math.max(1, a.places)) * 100) / 100
    : prixTotalClient;
  const partSousLeMinimum = check.level === "block";
  const legalPasReattestee = a.legal_ok === false;
  const aConfirmer = a.statut === "publiee" && (partSousLeMinimum || legalPasReattestee);
  const reservees = a.places_reservees ?? 0;
  const groupeOuvert = parPlace && a.statut === "publiee" && reservees > 0;

  let badge: { tone: BadgeTone; label: string };
  if (a.statut === "annulee") badge = { tone: "neutral", label: "Retirée" };
  else if (a.statut === "reservee") badge = { tone: "info", label: "Réservée" };
  else if (aConfirmer) badge = { tone: "warning", label: "À confirmer" };
  else if (groupeOuvert) badge = { tone: "gold", label: `Groupe ouvert · ${reservees}/${a.places}` };
  else badge = { tone: "success", label: "En vente" };

  return { check, prixClient, parPlace, partSousLeMinimum, legalPasReattestee, aConfirmer, reservees, groupeOuvert, badge };
}

export type AnnonceAction = "retirer" | "republier" | "cloturer" | "supprimer";

// Contenu du tiroir d'une annonce (le cadre Sheet est posé par l'appelant).
export function AnnonceSheetContent({
  annonce: a,
  stats,
  error,
  pending,
  onClose,
  onAction,
}: {
  annonce: AnnonceRow;
  stats?: AnnonceStats;
  error: string | null;
  pending: AnnonceAction | null;
  onClose: () => void;
  onAction: (action: AnnonceAction) => void;
}) {
  const info = annonceInfo(a);
  const titre = a.titre?.trim() || `Vol de ${a.duree} min`;
  const route = a.route_waypoints?.length
    ? a.route_waypoints.map((w) => w.nom?.trim() || "?").join(" → ")
    : null;

  return (
    <>
      <SheetHeader
        title={titre}
        subtitle={`${a.duree} min · ${info.parPlace ? "vente à la place" : "avion entier"}`}
        leading={
          a.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl(a.images[0])} alt="" className="h-11 w-11 shrink-0 rounded-[11px] object-cover" />
          ) : (
            <span className="h-11 w-11 shrink-0 rounded-[11px] bg-gradient-to-br from-[#0b2238] to-[#1a4a8a]" />
          )
        }
        onClose={onClose}
      />
      <SheetBody>
        <SheetHero
          label="Prix client"
          aside={<Badge tone={info.badge.tone}>{info.badge.label}</Badge>}
          hint={`Coût total ${eur(a.prix_total)} · votre part ${eur(a.part_pilote)} (${info.check.pct} %)`}
        >
          {eur(info.prixClient)}
          <span className="ml-1 text-[15px] text-st-muted">{info.parPlace ? "/ place" : "/ avion"}</span>
        </SheetHero>

        {info.aConfirmer && (
          <div className="flex gap-2.5 rounded-[14px] bg-st-warn-soft px-3.5 py-3 text-[12.5px] text-st-warn">
            <AlertTriangle size={16} className="mt-px shrink-0" />
            <div className="space-y-1.5">
              <p className="text-[13px] font-semibold">Pourquoi « À confirmer » ?</p>
              {info.partSousLeMinimum && info.check.message && <p className="leading-snug">{info.check.message}</p>}
              {info.legalPasReattestee && (
                <p className="leading-snug">
                  L&apos;annonce a été publiée ou modifiée sans reconfirmer que vous réalisez le vol et partagez
                  vos frais. Modifiez-la et cochez l&apos;attestation à la dernière étape.
                </p>
              )}
              <p className="leading-snug opacity-80">L&apos;annonce reste en vente : vous seul voyez cette alerte.</p>
            </div>
          </div>
        )}

        {info.groupeOuvert && (
          <div className="flex gap-2.5 rounded-[14px] bg-st-gold-soft px-3.5 py-3 text-[12.5px] text-st-gold-text">
            <Lock size={16} className="mt-px shrink-0" />
            <div>
              <p className="text-[13px] font-semibold">
                Groupe ouvert : {info.reservees} place{info.reservees > 1 ? "s" : ""} sur {a.places} réservée{info.reservees > 1 ? "s" : ""}
              </p>
              <p className="mt-0.5 leading-snug">
                Le prix de chaque passager se fige à la clôture (part égale entre les occupants réels).
              </p>
            </div>
          </div>
        )}

        <SheetRows>
          <SheetRow label="Places">
            {info.parPlace ? `${a.places - info.reservees} / ${a.places} libres` : `${a.places} passager${a.places > 1 ? "s" : ""} max`}
          </SheetRow>
          <SheetRow label="Mode de vente">{info.parPlace ? "À la place" : "Avion entier"}</SheetRow>
          <SheetRow label="Vues">
            {stats?.vues ?? 0} · {stats?.visiteurs ?? 0} visiteur{(stats?.visiteurs ?? 0) > 1 ? "s" : ""}
          </SheetRow>
          <SheetRow label="Itinéraire" className="truncate">{route ?? "Durée fixe, sans tracé"}</SheetRow>
          <SheetRow label="Photos">{a.images.length}</SheetRow>
        </SheetRows>

        {a.description && <p className="line-clamp-4 text-[13px] leading-relaxed text-st-text-2">{a.description}</p>}

        {error && <p className="rounded-[12px] bg-st-bad-soft px-3 py-2 text-[12.5px] text-st-bad">{error}</p>}
      </SheetBody>

      <SheetFooter>
        <div className="space-y-2">
          {a.statut === "publiee" ? (
            <>
              <LinkButton href={`/pilote/annonces/${a.id}/modifier`} fullWidth size="lg" className="sm:h-[38px] sm:text-[13px]">
                <Pencil />
                Modifier l&apos;annonce
              </LinkButton>
              <div className="grid grid-cols-2 gap-2">
                {info.groupeOuvert ? (
                  <Button variant="secondary" onClick={() => onAction("cloturer")} loading={pending === "cloturer"}>
                    {pending !== "cloturer" && <Lock />}
                    Clôturer le groupe
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => onAction("retirer")} loading={pending === "retirer"}>
                    {pending !== "retirer" && <X />}
                    Retirer
                  </Button>
                )}
                <LinkButton href={`/vol/annonce/${a.id}`} target="_blank" rel="noopener noreferrer" variant="secondary">
                  <ExternalLink />
                  Page publique
                </LinkButton>
              </div>
              {info.groupeOuvert && (
                <Button variant="secondary" fullWidth onClick={() => onAction("retirer")} loading={pending === "retirer"}>
                  {pending !== "retirer" && <X />}
                  Retirer de la vente
                </Button>
              )}
            </>
          ) : (
            <Button fullWidth size="lg" className="sm:h-[38px] sm:text-[13px]" onClick={() => onAction("republier")} loading={pending === "republier"}>
              {pending !== "republier" && <RotateCcw />}
              Remettre en vente
            </Button>
          )}
          <button
            type="button"
            onClick={() => onAction("supprimer")}
            className="block w-full cursor-pointer py-1.5 text-center text-[12.5px] font-[550] text-st-bad hover:underline"
          >
            Supprimer l&apos;annonce
          </button>
        </div>
      </SheetFooter>
    </>
  );
}
