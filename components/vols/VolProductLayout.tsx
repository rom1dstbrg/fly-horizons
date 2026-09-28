import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Clock, Users, ShieldCheck, Landmark, CalendarClock, CloudSun,
} from "lucide-react";
import { VolGallery } from "@/components/vols/VolGallery";
import { RouteMapStatic } from "@/components/vols/RouteMapStatic";

// Gabarit UNIQUE des pages produit (nouvelle DA, maquette-page-produit.html, validé le 28/09) :
// /vol/annonce/[id] (annonces des pilotes) et /vols/[slug] (anciens produits voucher).
// Les deux pages ne font que préparer les données : structure et style vivent ici seulement.
//
// Ordre du HTML = ordre de lecture téléphone : titre (+ pilote) → photos → prix → texte →
// itinéraire. En lg, titre et photos pleine largeur, puis texte | colonne de réservation
// collante sans boîte (variante A). Téléphone : barre collante en bas (prix + Réserver).

type Waypoint = { lat: number; lng: number; nom?: string };

export type VolProductProps = {
  title: string;
  description?: string | null;
  duree: number;
  places: number;
  pilote?: { id: string; nom: string; photo_url: string | null } | null;
  images: string[];
  route?: Waypoint[] | null;
  price: number;
  mode: "place" | "avion";
  placesLibres: number;
  /** Précision sous le prix (ex. taxes d'escale incluses). */
  priceNote?: string | null;
  cta: { href: string; label: string } | { disabled: string };
  /** Texte de l'étape « Vous réglez votre part » (moyen de paiement propre au type de vol). */
  paiement: string;
  /** Cartes « autres vols » déjà rendues (3 max), style des cartes actuel. */
  others?: React.ReactNode;
};

const WRAP = "max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10";
const LINK = "font-semibold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-[3px] hover:decoration-primary transition-colors";

export function formatDureeCourte(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

// Siège d'avion vu de profil : foncé = libre, gris = déjà réservé.
function Seat({ taken }: { taken: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`w-[22px] h-[22px] lg:w-[26px] lg:h-[26px] ${taken ? "text-[#cdd3de]" : "text-[#0b2238]"}`} aria-hidden>
      <path fill="currentColor" d="M6.2 2.2c1.1-.3 2.2.4 2.4 1.5l1.9 8.3h6.2c1.3 0 2.3 1 2.3 2.3v.9c0 .6-.5 1.1-1.1 1.1H9.6c-1.2 0-2.2-.8-2.5-2L4.7 4.8c-.3-1.1.4-2.3 1.5-2.6z" />
      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M11 16.3v4.2M16.5 16.3v4.2M9 20.5h9.5" />
    </svg>
  );
}

function Seats({ places, libres, mode }: { places: number; libres: number; mode: "place" | "avion" }) {
  const label = mode === "place"
    ? `${libres} place${libres > 1 ? "s" : ""} libre${libres > 1 ? "s" : ""} sur ${places}`
    : `Jusqu'à ${places} passager${places > 1 ? "s" : ""}`;
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="inline-flex gap-[3px]" aria-hidden>
        {Array.from({ length: places }, (_, i) => <Seat key={i} taken={mode === "place" && i < places - libres} />)}
      </span>
      <span className="text-xs lg:text-[13px] font-semibold text-foreground/70">{label}</span>
    </span>
  );
}

function Cta({ cta, className = "" }: { cta: VolProductProps["cta"]; className?: string }) {
  if ("disabled" in cta) {
    return (
      <span className={`inline-flex items-center justify-center rounded-[10px] bg-secondary px-6 py-[13px] text-sm font-black text-muted-foreground ${className}`}>
        {cta.disabled}
      </span>
    );
  }
  return (
    <Link
      href={cta.href}
      className={`inline-flex items-center justify-center gap-2 rounded-[10px] bg-primary px-6 py-[13px] text-sm font-black text-[#0b2238] shadow-gold hover:bg-[#e6a800] hover:-translate-y-px transition-all ${className}`}
    >
      {cta.label} <ArrowRight size={15} />
    </Link>
  );
}

export function VolProductLayout(p: VolProductProps) {
  const unit = p.mode === "place" ? "/ personne" : "/ avion";
  const prefix = p.mode === "place" ? "dès " : "";
  const hasRoute = !!p.route && p.route.length > 0;
  const paras = (p.description ?? "").split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  const placeNote = p.mode === "place"
    ? "Prix par personne pour un vol complet : il est recalculé si des places restent libres, et vous le connaissez avant de payer."
    : null;

  const ETAPES = [
    { quand: "Aujourd'hui", titre: "Vous choisissez un créneau", texte: "Parmi les disponibilités du pilote, puis vous envoyez votre demande. Rien à payer à ce stade." },
    { quand: "Sous 72 h", titre: "Le pilote confirme", texte: "Il vérifie le créneau et la météo prévue, puis vous confirme le vol par email." },
    { quand: "Après confirmation", titre: "Vous réglez votre part", texte: p.paiement },
  ];

  return (
    <main className="bg-white">
      <div className={`${WRAP} pt-page`}>
        <Link href="/nos-offres" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3.5 lg:mb-[18px]">
          <ArrowLeft size={15} /> Tous les vols
        </Link>

        {/* 1 · Titre + pilote */}
        <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-2.5">Vol partagé · Au départ de Charleroi</p>
        <h1 className="text-[32px] lg:text-[56px] font-black text-foreground leading-[1.04] lg:leading-none tracking-[-0.02em] max-w-[900px]">
          {p.title}
        </h1>
        <div className="mt-3.5 lg:mt-[18px] flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] lg:text-sm text-muted-foreground">
          {p.pilote && (
            <span className="inline-flex items-center gap-2 font-semibold text-foreground basis-full lg:basis-auto">
              {p.pilote.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.pilote.photo_url} alt="" className="w-7 h-7 rounded-full object-cover object-top" />
              ) : null}
              Avec {p.pilote.nom}
              <span aria-hidden>·</span>
              <Link href={`/nos-pilotes/${p.pilote.id}`} className={LINK}>Voir le profil</Link>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5"><Clock size={15} className="text-[#0b2238]/70" />{formatDureeCourte(p.duree)} de vol</span>
          <span className="inline-flex items-center gap-1.5"><Users size={15} className="text-[#0b2238]/70" />{p.places} place{p.places > 1 ? "s" : ""}</span>
        </div>

        {/* 2 · Photos */}
        <VolGallery images={p.images} title={p.title} badge={formatDureeCourte(p.duree)} />

        {/* 3 · Prix (téléphone) */}
        <div className="lg:hidden py-[18px] border-b border-border">
          <p className="text-[11px] font-bold uppercase tracking-[2px] text-muted-foreground mb-1.5">Participation aux frais</p>
          <p className="whitespace-nowrap">
            <span className="text-[28px] font-black leading-none text-foreground">{prefix}{p.price}&nbsp;€</span>
            <span className="ml-1 text-[13px] font-medium text-muted-foreground">{unit}</span>
          </p>
          <div className="mt-3"><Seats places={p.places} libres={p.placesLibres} mode={p.mode} /></div>
        </div>

        {/* 4 · Corps : texte | réservation (variante A) */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16 lg:items-start">
          <div>
            <section className="py-7 lg:py-10">
              <h2 className="text-[22px] lg:text-2xl font-black text-foreground mb-3">Le vol</h2>
              <div className="space-y-3 text-[15px] leading-[1.7] text-foreground/75">
                {paras.length > 0
                  ? paras.map((t, i) => <p key={i}>{t}</p>)
                  : <p>Un vol en avion léger au départ de l&apos;aérodrome de Charleroi. Le pilote commente les repères tout au long du trajet et répond à vos questions au casque.</p>}
              </div>
            </section>

            <section className="py-7 lg:py-10 border-t border-border">
              <h2 className="text-[22px] lg:text-2xl font-black text-foreground mb-3">{hasRoute ? "Itinéraire" : "La route"}</h2>
              {hasRoute ? (
                <>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mb-3.5 text-[13px] font-semibold text-foreground">
                    <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" />Charleroi (EBCI)</span>
                    {p.route!.map((w, i) => (
                      <span key={i} className="inline-flex items-center gap-2">
                        <span className="text-muted-foreground/60" aria-hidden>›</span>
                        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#0b2238]" />{w.nom || `Point ${i + 1}`}</span>
                      </span>
                    ))}
                    <span className="text-muted-foreground/60" aria-hidden>›</span>
                    <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" />Charleroi</span>
                  </div>
                  <RouteMapStatic waypoints={p.route!} />
                  <p className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CloudSun size={14} /> La route peut être ajustée le jour même selon la météo.
                  </p>
                </>
              ) : (
                <p className="text-[15px] leading-[1.7] text-foreground/75">
                  La route se décide avec le pilote selon vos envies et la météo du jour. Vous en parlez ensemble après
                  la confirmation.
                </p>
              )}
            </section>

            <div className="pt-6 pb-9 lg:pt-7 lg:pb-16 border-t border-border">
              <p className="text-[11px] font-bold uppercase tracking-[2px] text-primary mb-1.5">Vol en partage de coûts · NCO.GEN.104</p>
              <p className="text-xs leading-relaxed text-muted-foreground max-w-[720px]">
                Fly Horizons n&apos;est pas un service de transport aérien commercial. Le pilote partage un vol qu&apos;il
                organise déjà : votre participation couvre une quote-part des frais réels (avion, carburant, taxes
                d&apos;aérodrome), sans marge commerciale. Le pilote est seul responsable de son vol.
              </p>
            </div>
          </div>

          {/* Réservation (ordinateur) : colonne collante, séparée par un filet, sans boîte */}
          <aside id="vol-cta" className="hidden lg:block sticky top-[100px] mt-10 pl-10 border-l border-border">
            <p className="text-[11px] font-bold uppercase tracking-[2px] text-muted-foreground mb-2">Participation aux frais</p>
            <p>
              <span className="text-[44px] font-black leading-none text-foreground">{prefix}{p.price}&nbsp;€</span>
              <span className="ml-1.5 text-sm text-muted-foreground">{unit}</span>
            </p>
            {(p.priceNote || placeNote) && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{p.priceNote ?? placeNote}</p>
            )}
            <div className="my-5"><Seats places={p.places} libres={p.placesLibres} mode={p.mode} /></div>
            <Cta cta={p.cta} className="w-full py-[15px]" />
            <ul className="mt-5 space-y-2.5">
              {[
                { Icon: ShieldCheck, t: "Aucun paiement avant que le pilote confirme." },
                { Icon: Landmark, t: "Vous réglez votre part après confirmation." },
                { Icon: CalendarClock, t: "Demande possible jusqu'à 48 h avant le vol." },
              ].map(({ Icon, t }) => (
                <li key={t} className="flex gap-2 text-[13px] leading-normal text-foreground/70">
                  <Icon size={15} className="shrink-0 mt-0.5 text-[#0b2238]/55" /> {t}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>

      {/* 5 · Comment ça se passe */}
      <section className="bg-[#f5f5f7] py-14 lg:py-28">
        <div className={`${WRAP} lg:grid lg:grid-cols-[5fr_7fr] lg:gap-20 lg:items-start`}>
          <div className="lg:sticky lg:top-[110px]">
            <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3">Déroulement</p>
            <h2 className="text-[28px] lg:text-[48px] font-black text-foreground leading-[1.05] lg:leading-none tracking-[-0.02em]">
              Comment ça se passe
            </h2>
            <p className="mt-3.5 max-w-[420px] text-[15px] leading-[1.7] text-foreground/70">
              De la demande au décollage. Vous ne payez qu&apos;une fois le vol confirmé par le pilote.
            </p>
          </div>
          <ol className="mt-7 lg:mt-0">
            {[...ETAPES, {
              quand: "Le jour du vol",
              titre: "Rendez-vous à Charleroi",
              texte: "Accueil à l'aérodrome (EBCI), briefing sécurité, casque audio pour chaque passager. Si la météo ne permet pas de voler, on cherche une autre date ensemble.",
            }].map(({ quand, titre, texte }, i) => (
              <li key={titre} className={`grid grid-cols-[44px_1fr] lg:grid-cols-[72px_1fr] gap-x-3 py-[22px] lg:py-[30px] border-t border-[#0b2238]/10 ${i === 0 ? "lg:border-t-0 lg:pt-0" : ""}`}>
                <span className="text-[30px] lg:text-[40px] font-black leading-none text-[#0b2238] tabular-nums">{i + 1}</span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[2px] text-muted-foreground mb-1">{quand}</p>
                  <p className="text-[17px] lg:text-xl font-black text-foreground leading-snug mb-1.5">{titre}</p>
                  <p className="text-sm lg:text-[15px] leading-[1.65] text-foreground/70">
                    {texte}
                    {i === 3 && <> <Link href="/access-ebci" className={LINK}>Plan d&apos;accès</Link></>}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6 · Autres vols (style de cartes actuel, 3 max) */}
      {p.others && (
        <section className="py-14 lg:py-28">
          <div className={WRAP}>
            <div className="flex items-end justify-between gap-4 mb-7 lg:mb-10">
              <div>
                <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3">Autres vols disponibles</p>
                <h2 className="text-[28px] lg:text-[40px] font-black text-foreground leading-[1.05] tracking-[-0.02em]">Et aussi</h2>
              </div>
              <Link href="/nos-offres" className="inline-flex items-center gap-1.5 mb-1.5 text-sm font-bold text-[#0b2238] hover:text-[#e6a800] whitespace-nowrap">
                Tous les vols <ArrowRight size={15} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">{p.others}</div>
          </div>
        </section>
      )}

      {/* Barre collante (téléphone) : prix + Réserver */}
      <div className="lg:hidden sticky bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-white px-4 sm:px-6 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <p>
          <span className="text-xl font-black text-foreground">{prefix}{p.price}&nbsp;€</span>
          <span className="ml-1 text-[13px] font-medium text-muted-foreground">{unit}</span>
        </p>
        <Cta cta={p.cta} />
      </div>
    </main>
  );
}
