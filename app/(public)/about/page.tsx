import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileCheck, CloudSun, Plane } from "lucide-react";
import { ChatWidget } from "@/components/chat/ChatWidget";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";

export const metadata: Metadata = {
  title: "À propos · Fly Horizons",
  description:
    "Fly Horizons met en relation des passagers et des pilotes privés pour des vols en avion léger en partage de frais, au départ de Charleroi. Pilotes vérifiés, frais réels, sans marge.",
  alternates: { canonical: `${siteUrl}/about` },
};

// Nouvelle DA (maquette-about.html v3, 28/09). Règle de composition des sections 1 et 2 :
// texte + UNE photo qui l'illustre ; en lg, 2 colonnes égales et la photo couvre la hauteur du
// texte (row-span-2 + object-cover, plancher 420 px), côtés alternés. Téléphone : titre → photo → texte.

const WRAP = "max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10";
const EYEBROW = "text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3";
const H2 = "text-[28px] lg:text-[40px] font-black text-foreground leading-[1.06] tracking-[-0.02em]";
const P = "text-[15px] lg:text-base leading-[1.75] text-foreground/75";
const PHOTO = "relative -mx-4 sm:-mx-6 lg:mx-0 mt-6 lg:mt-0 aspect-[4/3] lg:aspect-auto lg:min-h-[420px] lg:row-span-2 lg:rounded-[14px] overflow-hidden bg-[#0b2238]";

const PRINCIPES = [
  { t: "Le pilote décide", d: "Vous demandez à rejoindre un vol publié. Le pilote accepte ou décline, à sa seule discrétion." },
  { t: "Des frais réels, sans marge", d: "Avion, carburant et taxes d'aérodrome sont répartis entre les occupants, pilote compris." },
  { t: "Aucun créneau garanti", d: "La météo et les disponibilités du pilote décident de chaque vol, jusqu'au jour même." },
  { t: "Un cadre non commercial", d: "Un partage de coûts entre particuliers : le paiement va au pilote, Fly Horizons n'encaisse rien." },
];

const TEMPS = [
  {
    Icon: FileCheck,
    quand: "Avant de publier",
    titre: "Nous vérifions",
    texte: "Chaque pilote nous transmet sa licence et son certificat médical, que nous vérifions un par un, et accepte notre charte : sécurité d'abord, frais partagés honnêtement, passagers informés.",
  },
  {
    Icon: CloudSun,
    quand: "Avant chaque vol",
    titre: "Le pilote prépare",
    texte: "Météo, route, masse et centrage de l'avion : le pilote prépare son vol comme tout vol privé, et confirme qu'il est en règle pour l'effectuer.",
  },
  {
    Icon: Plane,
    quand: "En vol",
    titre: "Le pilote décide",
    texte: "Seul commandant de bord, il décide de partir, d'adapter la route ou de rentrer plus tôt. Vous êtes assis à côté de lui et il vous explique chaque étape.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* ══ 1 · CE QU'EST FLY HORIZONS (photo à droite) ══ */}
      <section className="pt-page pb-10 lg:pb-24">
        <div className={`${WRAP} grid lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-[72px]`}>
          <div className="lg:col-start-1 lg:row-start-1">
            <p className={EYEBROW}>À propos</p>
            <h1 className="text-[34px] lg:text-[52px] font-black text-foreground leading-[1.03] tracking-[-0.02em]">
              Des pilotes privés partagent leurs vols avec vous.
            </h1>
          </div>
          <div className={`${PHOTO} lg:col-start-2 lg:row-start-1`}>
            <Image
              src="/gallery/2.png"
              alt="Dans le cockpit, à côté du pilote, au coucher du soleil"
              fill
              priority
              className="object-cover"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>
          <div className="mt-6 space-y-4 lg:col-start-1 lg:row-start-2">
            <p className="text-[17px] lg:text-lg leading-[1.7] text-foreground/85">
              Fly Horizons met en relation des passagers qui veulent voir la Belgique d&apos;en haut et
              des pilotes privés qui volent de toute façon. Le pilote publie son vol, vous le rejoignez,
              et les frais réels sont partagés entre les occupants.
            </p>
            <p className={P}>
              Ce n&apos;est ni une compagnie aérienne, ni une agence de baptêmes de l&apos;air. Les pilotes
              ne sont pas payés pour voler : ils entretiennent leurs heures, partent explorer, et
              préfèrent le faire à plusieurs.
            </p>
            <p className={P}>
              Les vols partent de l&apos;aérodrome de Charleroi et durent de trente minutes à deux heures,
              avec jusqu&apos;à trois passagers à bord. Chaque vol a sa propre page : durée, itinéraire,
              pilote et participation aux frais.
            </p>
          </div>
        </div>
      </section>

      {/* ══ 2 · LE PARTAGE DE FRAIS (photo à gauche) ══ */}
      <section className="bg-[#f5f5f7] py-10 lg:py-24">
        <div className={`${WRAP} grid lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-[72px]`}>
          <div className="lg:col-start-2 lg:row-start-1">
            <p className={EYEBROW}>Vol partagé</p>
            <h2 className={H2}>Quatre places, des frais partagés.</h2>
          </div>
          <div className={`${PHOTO} lg:col-start-1 lg:row-start-1`}>
            <Image
              src="/da-40-seats.webp"
              alt="Les quatre sièges d'un avion léger"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>
          <div className="mt-6 lg:col-start-2 lg:row-start-2">
            <p className={P}>
              Le vol partagé répond à un cadre précis, distinct du transport aérien commercial.
              Il repose sur quatre principes.
            </p>
            <ul className="mt-6 grid gap-[18px] lg:grid-cols-2 lg:gap-x-8 lg:gap-y-[22px]">
              {PRINCIPES.map(({ t, d }) => (
                <li key={t} className="pl-4 border-l-2 border-primary">
                  <p className="text-[15px] font-extrabold text-foreground mb-1">{t}</p>
                  <p className="text-sm leading-relaxed text-foreground/70">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ══ 3 · LES PILOTES (sans photo : intro côte à côte, puis frise en 3 temps) ══ */}
      <section className="py-10 lg:py-24">
        <div className={WRAP}>
          <div className="grid gap-[18px] lg:grid-cols-2 lg:gap-x-[72px] lg:items-end">
            <div>
              <p className={EYEBROW}>Les pilotes</p>
              <h2 className={H2}>Qui vous emmène.</h2>
            </div>
            <p className={P}>
              Des pilotes privés licenciés, qui volent pour le plaisir et partagent leurs places. Ils ne
              sont pas payés pour piloter et restent seuls commandants de bord. Leur profil est visible
              sur chaque vol qu&apos;ils publient.
            </p>
          </div>

          <div className="mt-9 lg:mt-14 grid lg:grid-cols-3">
            {TEMPS.map(({ Icon, quand, titre, texte }, i) => (
              <div
                key={quand}
                className={`py-6 border-t border-border lg:pt-7 lg:pb-1 ${
                  i > 0 ? "lg:pl-10 lg:border-l" : ""
                } ${i < TEMPS.length - 1 ? "lg:pr-10" : ""}`}
              >
                <p className="inline-flex items-center gap-2 text-xs font-bold text-[#0b2238] bg-secondary rounded-full px-3 py-1.5 mb-3.5">
                  <Icon size={14} />
                  {quand}
                </p>
                <h3 className="text-[19px] lg:text-[21px] font-black text-foreground tracking-[-0.01em] mb-2">{titre}</h3>
                <p className="text-sm lg:text-[15px] leading-[1.7] text-foreground/70">{texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 4 · DEUX PORTES ══ */}
      <section className="bg-[#f5f5f7] py-14 lg:py-24">
        <div className={`${WRAP} grid lg:grid-cols-2`}>
          <div className="py-7 lg:py-1 lg:pr-14">
            <h2 className="text-[26px] lg:text-[34px] font-black text-foreground leading-tight tracking-[-0.02em]">
              Envie de voler ?
            </h2>
            <p className={`${P} mt-2.5 mb-5 max-w-[440px]`}>
              Parcourez les vols publiés par nos pilotes et envoyez votre demande. Rien à payer avant la
              confirmation.
            </p>
            <Link
              href="/nos-offres"
              className="inline-flex items-center gap-2 px-[22px] py-[13px] bg-primary text-[#0b2238] rounded-[10px] text-sm font-black hover:bg-[#e6a800] hover:-translate-y-px transition-all shadow-gold"
            >
              Voir les vols
              <ArrowRight size={15} />
            </Link>
          </div>
          <div className="py-7 border-t border-[#0b2238]/10 lg:py-1 lg:border-t-0 lg:border-l lg:pl-14">
            <h2 className="text-[26px] lg:text-[34px] font-black text-foreground leading-tight tracking-[-0.02em]">
              Vous êtes pilote ?
            </h2>
            <p className={`${P} mt-2.5 mb-5 max-w-[440px]`}>
              Partagez les frais de vos vols avec des passagers, en restant seul maître à bord.
            </p>
            <Link
              href="/devenir-pilote"
              className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-border text-foreground rounded-[10px] text-sm font-bold hover:border-foreground transition-colors"
            >
              Devenir pilote partenaire
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <ChatWidget />
    </main>
  );
}
