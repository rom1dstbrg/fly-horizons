import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Megaphone, CalendarDays, Route, Scale, BookOpen, Wallet } from "lucide-react";

export const metadata: Metadata = {
  title: "Devenir pilote partenaire · Fly Horizons",
  description: "Pilote licencié ? Publiez vos vols en partage de frais avec Fly Horizons, dans le cadre du règlement EASA NCO.GEN.104.",
};

// Nouvelle DA (maquette-devenir-pilote.html, 28/09). La page suit les questions d'un pilote,
// dans l'ordre : est-ce que je peux (conditions) → comment ça se passe → avec quels outils →
// dans quel cadre. Chaque section a sa forme propre, sans photo : intro 7/5 alignée en bas,
// déroulé en tableau à filets (moment | étape), outils en 3 colonnes à filets.
// L'aérodrome de départ est demandé dans la candidature mais jamais imposé sur la page.

const WRAP = "max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10";
const EYEBROW = "text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3";
const H2 = "text-[28px] lg:text-[40px] font-black text-foreground leading-[1.06] tracking-[-0.02em]";
const P = "text-[15px] lg:text-base leading-[1.75] text-foreground/75";
const KICKER = "text-[13px] font-extrabold uppercase tracking-[1.5px] text-[#0b2238]";
const LINK = "font-semibold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-[3px] hover:decoration-primary transition-colors";
const CTA = "inline-flex items-center gap-2 px-6 py-3.5 bg-primary text-[#0b2238] rounded-[10px] text-[15px] font-black hover:bg-[#e6a800] hover:-translate-y-px transition-all shadow-gold";

const CONDITIONS = [
  { t: "Une licence valide", d: "PPL ou supérieure, avec la qualification SEP." },
  { t: "Un certificat médical à jour", d: "Nous relevons sa date de validité." },
  { t: "Une expérience récente", d: "Au moins 3 décollages et 3 atterrissages dans les 90 jours avant un vol avec passagers." },
  { t: "Un avion autorisé et assuré", d: "Un appareil que vous pouvez utiliser, assurance passagers comprise." },
];

const DEROULE = [
  { quand: "Aujourd'hui", titre: "Vous faites une demande", texte: "Vos coordonnées, votre licence, votre expérience et l'aérodrome d'où vous volez. Rien ne vous engage à ce stade." },
  { quand: "Sous quelques jours", titre: "Nous créons votre compte", texte: "Nous vérifions votre demande, puis vous recevez par email l'accès à votre espace pilote." },
  { quand: "Avant de publier", titre: "Vous envoyez vos documents", texte: "Licence, qualification et certificat médical, depuis votre profil, et vous acceptez la charte pilote. Nous vérifions les documents, relevons leurs dates de validité, puis supprimons les fichiers." },
  { quand: "Une fois validé", titre: "Vous publiez un vol", texte: "Date, durée, itinéraire, nombre de places et participation aux frais. Il apparaît sur le site avec votre profil." },
  { quand: "À chaque demande", titre: "Vous acceptez ou déclinez", texte: "Le choix vous revient. Le passager ne paie rien avant votre accord." },
  { quand: "Le jour du vol", titre: "Vous volez ensemble", texte: "Vous accueillez le passager. Il règle sa part directement avec vous, par virement ou en espèces." },
];

const OUTILS = [
  { Icon: Megaphone, t: "Vos annonces", d: "Publier un vol, suivre les places restantes et les demandes." },
  { Icon: CalendarDays, t: "Vos disponibilités", d: "Vos créneaux de la semaine, par blocs de deux heures." },
  { Icon: Route, t: "Vos itinéraires", d: "Des routes tracées sur carte aéronautique, à réutiliser d'un vol à l'autre." },
  { Icon: Scale, t: "Masse et centrage", d: "Calcul et performances pour le DA40, météo de l'aérodrome et fiche PDF." },
  { Icon: BookOpen, t: "Carnet de vol", d: "Vos vols passés, avec les heures et les passagers." },
  { Icon: Wallet, t: "Participations", d: "Ce que chaque passager vous doit, avec un QR code de virement prêt à scanner." },
];

const QUI = [
  {
    qui: "Vous",
    items: [
      "Restez seul commandant de bord, de la préparation à l'atterrissage.",
      "Demandez uniquement les coûts directs, votre part comprise, sans marge.",
      "Encaissez directement la part de chaque passager.",
      "Contactez et accueillez vos passagers.",
    ],
  },
  {
    qui: "Fly Horizons",
    items: [
      "Vérifie les licences, qualifications et certificats médicaux.",
      "Publie vos vols et vous transmet les demandes.",
      "Ne perçoit aucune commission et n'encaisse rien.",
      "N'exploite pas les vols et ne pilote pas.",
    ],
  },
];

export default function DevenirPilotePage() {
  return (
    <main className="min-h-screen bg-white">

      {/* ══ 1 · INTRO : texte | conditions ══ */}
      <section className="pt-page pb-12 lg:pb-24">
        <div className={`${WRAP} grid gap-9 lg:grid-cols-[7fr_5fr] lg:gap-x-[88px] lg:items-end`}>
          <div>
            <p className={EYEBROW}>Pilotes</p>
            <h1 className="text-[34px] lg:text-[52px] font-black text-foreground leading-[1.03] tracking-[-0.02em]">
              Vous volez de toute façon. Partagez les frais.
            </h1>
            <p className="mt-3.5 max-w-[520px] text-base lg:text-[17px] leading-[1.7] text-foreground/80">
              Publiez les vols que vous comptez faire, des passagers demandent à vous rejoindre, et les
              frais réels se partagent entre les occupants. Vous restez seul maître à bord ; nous nous
              occupons de la mise en relation.
            </p>
            <div className="mt-[26px]">
              <Link href="/devenir-pilote/candidature" className={CTA}>
                Faire une demande <ArrowRight size={15} />
              </Link>
              <p className="mt-3 text-[13px] text-muted-foreground">Deux minutes, sans engagement.</p>
            </div>
          </div>

          <div>
            <h2 className={`${KICKER} mb-1`}>Ce qu&apos;il vous faut</h2>
            <ul>
              {CONDITIONS.map(({ t, d }) => (
                <li key={t} className="flex gap-3 py-3.5 border-b border-border last:border-b-0 text-sm leading-[1.55] text-foreground/75">
                  <Check size={18} className="shrink-0 mt-0.5 text-[#e6a800]" />
                  <span><b className="block font-extrabold text-foreground mb-0.5">{t}</b>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className={WRAP}><hr className="border-border" /></div>

      {/* ══ 2 · DÉROULÉ : moment | étape ══ */}
      <section className="py-12 lg:py-24">
        <div className={WRAP}>
          <div className="grid gap-3.5 mb-[26px] lg:grid-cols-2 lg:gap-x-[72px] lg:items-end lg:mb-11">
            <div>
              <p className={EYEBROW}>Le déroulé</p>
              <h2 className={H2}>De la demande au premier vol.</h2>
            </div>
            <p className={P}>
              Chaque compte est vérifié et chaque pilote validé avant de pouvoir publier un premier vol.
            </p>
          </div>
          <ol className="border-t border-border">
            {DEROULE.map(({ quand, titre, texte }) => (
              <li key={titre} className="grid gap-1.5 py-5 border-b border-border lg:grid-cols-[240px_1fr] lg:gap-x-10 lg:py-[26px]">
                <span className="text-xs font-bold uppercase tracking-[1.5px] text-[#e6a800] lg:pt-1.5">{quand}</span>
                <div>
                  <h3 className="text-lg lg:text-[21px] font-black text-foreground tracking-[-0.01em] mb-1">{titre}</h3>
                  <p className="max-w-[640px] text-sm lg:text-[15px] leading-[1.7] text-foreground/70">{texte}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ══ 3 · ESPACE PILOTE : 6 outils ══ */}
      <section className="bg-[#f5f5f7] py-12 lg:py-24">
        <div className={WRAP}>
          <div className="grid gap-3.5 lg:grid-cols-2 lg:gap-x-[72px] lg:items-end">
            <div>
              <p className={EYEBROW}>L&apos;espace pilote</p>
              <h2 className={H2}>Tout se gère au même endroit.</h2>
            </div>
            <p className={P}>
              Un espace réservé aux pilotes, sur ordinateur comme sur téléphone, pour publier, organiser
              et suivre vos vols.
            </p>
          </div>
          <div className="mt-[26px] grid lg:grid-cols-3 lg:gap-x-12 lg:mt-12">
            {OUTILS.map(({ Icon, t, d }) => (
              <div key={t} className="flex gap-3.5 py-[18px] lg:py-6 border-t border-[#0b2238]/10">
                <span className="w-[38px] h-[38px] shrink-0 rounded-[10px] bg-white grid place-items-center text-[#0b2238]">
                  <Icon size={16} />
                </span>
                <div>
                  <h3 className="text-[15px] font-extrabold text-foreground mb-0.5">{t}</h3>
                  <p className="text-sm leading-relaxed text-foreground/70">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 4 · LE CADRE : texte | qui fait quoi ══ */}
      <section className="py-12 lg:py-24">
        <div className={`${WRAP} grid gap-7 lg:grid-cols-[5fr_7fr] lg:gap-x-[88px]`}>
          <div>
            <p className={EYEBROW}>Le cadre</p>
            <h2 className={H2}>Un partage de frais, pas un service commercial.</h2>
            <p className={`${P} mt-4`}>
              Les vols relèvent du partage de coûts entre personnes non professionnelles, au sens du
              règlement européen NCO.GEN.104. Le passager règle uniquement sa part des coûts directs du
              vol : avion, carburant, redevances. Vous gardez votre propre part et n&apos;êtes pas
              rémunéré pour piloter.
            </p>
            <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
              Le détail figure dans les{" "}
              <Link href="/cgp" className={LINK}>conditions générales</Link>{" "}
              et dans la charte que vous acceptez avant de publier.
            </p>
          </div>
          <div className="grid gap-[26px] sm:grid-cols-2 sm:gap-x-12">
            {QUI.map(({ qui, items }) => (
              <div key={qui}>
                <h3 className={`${KICKER} mb-3 pb-2.5 border-b-2 border-primary`}>{qui}</h3>
                <ul className="grid gap-2.5">
                  {items.map((it) => (
                    <li key={it} className="relative pl-4 text-sm leading-relaxed text-foreground/80 before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#0b2238]">
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 5 · FIN ══ */}
      <section className="border-t border-border pt-11 pb-14 lg:pt-[72px] lg:pb-24">
        <div className={`${WRAP} flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between`}>
          <div>
            <h2 className="text-[26px] lg:text-[34px] font-black text-foreground leading-tight tracking-[-0.02em]">
              Prêt à partager vos vols ?
            </h2>
            <p className={`${P} mt-2`}>Laissez-nous vos coordonnées, nous vérifions votre demande et créons votre compte.</p>
          </div>
          <Link href="/devenir-pilote/candidature" className={`${CTA} self-start lg:self-auto shrink-0`}>
            Faire une demande <ArrowRight size={15} />
          </Link>
        </div>
      </section>

    </main>
  );
}
