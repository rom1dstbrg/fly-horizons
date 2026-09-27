import Link from "next/link";
import { Share, SquarePlus, EllipsisVertical, Smartphone } from "lucide-react";
import { PageHeader } from "@/components/pilote/studio";

export const metadata = { title: "Guide pilote — Espace pilote" };

// Guide du pilote : tout ce qu'il faut savoir, sur une page. Texte statique,
// sans cartes (sections séparées par un filet). Les règles reprennent la charte
// (lib/pilote/charte.ts) en version courte : si la charte change, relire ici.

const SECTIONS = [
  { id: "essentiel", title: "L'essentiel" },
  { id: "profil", title: "Un profil en règle" },
  { id: "vols", title: "D'où viennent les vols" },
  { id: "deroule", title: "Le déroulé d'un vol" },
  { id: "regles", title: "Les règles à retenir" },
  { id: "installer", title: "Installer l'app" },
  { id: "aide", title: "Besoin d'aide" },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-st-line pt-6">
      <h2 className="mb-3 text-[17px] font-semibold tracking-[-0.01em] text-st-text">{title}</h2>
      <div className="space-y-3 text-[14px] leading-relaxed text-st-text-2">{children}</div>
    </section>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="st-num mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-st-ink text-[11px] font-semibold text-white">{i + 1}</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

// Petite icône « bouton du téléphone » dans le texte des étapes d'installation.
function Key({ icon: Icon, label }: { icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; label?: string }) {
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-st-line bg-white px-1.5 py-0.5 align-[-3px] text-[12.5px] font-medium text-st-text">
      <Icon size={13} strokeWidth={2} />
      {label}
    </span>
  );
}

export default function PiloteGuidePage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 pb-6">
      <PageHeader title="Guide pilote" description="Tout ce qu'il faut savoir pour voler avec Fly Horizons." />

      <nav aria-label="Sommaire" className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="rounded-full border border-st-line bg-white px-3 py-1.5 text-[12.5px] font-medium text-st-text-2 transition-colors hover:bg-st-surface hover:text-st-text">
            {s.title}
          </a>
        ))}
      </nav>

      <Section id="essentiel" title="L'essentiel">
        <p>
          Fly Horizons met en relation des passagers et des pilotes pour des <strong className="text-st-text">vols en partage de frais</strong>.
          Nous ne sommes pas l&apos;exploitant des vols : <strong className="text-st-text">vous êtes seul commandant de bord</strong>,
          responsable de la préparation, de la décision de partir et de la sécurité.
        </p>
        <p>
          Le passager vous règle directement. Fly Horizons ne prend aucune commission et n&apos;intervient pas dans le paiement.
        </p>
      </Section>

      <Section id="profil" title="Un profil en règle">
        <p>
          Sans profil complet, aucun vol ne peut vous être attribué. Dans <Link href="/pilote/profil" className="font-medium text-st-ink underline underline-offset-2">Mon profil</Link>, renseignez :
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>votre numéro de licence et la validité de votre qualification SEP ;</li>
          <li>la classe et la validité de votre certificat médical ;</li>
          <li>votre IBAN, si vous publiez des annonces : c&apos;est là que les passagers vous paient.</li>
        </ul>
        <p>
          Envoyez ensuite une photo ou un PDF de votre licence (avec la page SEP) et de votre certificat médical.
          Romain les vérifie, puis les fichiers sont supprimés : seule la date de vérification est gardée.
          Si vous modifiez ces informations plus tard, il faudra les renvoyer.
        </p>
        <p>
          Une pastille vous prévient 30 jours avant une expiration. Une date dépassée vous rend inéligible jusqu&apos;à sa mise à jour.
        </p>
      </Section>

      <Section id="vols" title="D'où viennent les vols">
        <p><strong className="text-st-text">Un vol attribué.</strong> Romain vous confie un vol : vous recevez un email et il apparaît dans <Link href="/pilote/vols" className="font-medium text-st-ink underline underline-offset-2">Mes vols</Link>.</p>
        <p><strong className="text-st-text">Un vol proposé à l&apos;équipe.</strong> Un vol est envoyé à tous les pilotes : premier arrivé, premier servi. Sans preneur, l&apos;offre expire après 48 h.</p>
        <p><strong className="text-st-text">Vos annonces.</strong> Dans <Link href="/pilote/annonces" className="font-medium text-st-ink underline underline-offset-2">Mes annonces</Link>, vous publiez vous-même un vol sur le site. Le passager réserve, puis vous règle par virement (avec un QR code) sur votre IBAN. Pensez à marquer le vol « payé » quand l&apos;argent est arrivé : sinon, un rappel vous est envoyé quelques jours après le vol.</p>
        <p>Tenez aussi vos <Link href="/pilote/disponibilites" className="font-medium text-st-ink underline underline-offset-2">disponibilités</Link> à jour : elles servent à vous proposer les bons vols.</p>
      </Section>

      <Section id="deroule" title="Le déroulé d'un vol">
        <Steps items={[
          "Contactez le passager et convenez du créneau.",
          "Tracez la route et envoyez-la au passager, qui la valide ou demande une modification.",
          "Préparez la masse et centrage et les performances dans l'onglet M&B.",
          "Avant le vol : vérifiez votre expérience récente (3 décollages et atterrissages en 90 jours) et l'assurance passagers de l'avion.",
          "Le jour J : météo, décision de partir ou non, accueil du passager.",
          "Après le vol : mettez à jour son statut dans Mes vols (et le paiement pour une annonce).",
        ]} />
      </Section>

      <Section id="regles" title="Les règles à retenir">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong className="text-st-text">Pas de marge.</strong> Le prix ne couvre que les coûts directs du vol, votre part incluse, qui ne descend pas sous le seuil réglementaire.</li>
          <li><strong className="text-st-text">Un vol accepté est un engagement.</strong> Vous pouvez le rendre en ligne jusqu&apos;à 3 jours avant. Plus tard, appelez Romain.</li>
          <li><strong className="text-st-text">Seul Fly Horizons annule</strong> un vol auprès du passager. Si le vol ne peut pas se faire, prévenez Romain.</li>
          <li><strong className="text-st-text">Un créneau convenu ne bouge pas</strong> pour votre seule convenance.</li>
          <li><strong className="text-st-text">Expérience récente.</strong> Au moins 3 décollages et 3 atterrissages dans les 90 jours avant chaque vol avec passagers (FCL.060) : à vérifier vous-même avant chaque vol.</li>
          <li><strong className="text-st-text">Appareil autorisé et assuré</strong>, avec l&apos;assurance passagers en vigueur.</li>
          <li><strong className="text-st-text">Les coordonnées des passagers</strong> servent uniquement à organiser leur vol : ne les transmettez pas, ne les gardez pas.</li>
        </ul>
        <p className="text-[13px] text-st-muted">Le texte complet est celui de la charte que vous avez acceptée à votre premier accès.</p>
      </Section>

      <Section id="installer" title="Installer l'app sur l'écran d'accueil">
        <p>
          L&apos;espace pilote s&apos;utilise comme une application : une icône sur votre écran d&apos;accueil, en plein écran, sans barre d&apos;adresse.
          Ouvrez d&apos;abord <strong className="text-st-text">fly-horizons.com/pilote</strong> sur votre téléphone.
        </p>
        <div className="grid gap-6 pt-1 sm:grid-cols-2">
          <div className="space-y-3">
            <p className="flex items-center gap-2 font-semibold text-st-text"><Smartphone size={16} /> iPhone (Safari)</p>
            <Steps items={[
              <>Touchez <Key icon={Share} label="Partager" /> en bas de l&apos;écran.</>,
              <>Faites défiler et choisissez <Key icon={SquarePlus} label="Sur l'écran d'accueil" />.</>,
              <>Touchez <strong className="text-st-text">Ajouter</strong> en haut à droite.</>,
            ]} />
          </div>
          <div className="space-y-3">
            <p className="flex items-center gap-2 font-semibold text-st-text"><Smartphone size={16} /> Android (Chrome)</p>
            <Steps items={[
              <>Touchez le menu <Key icon={EllipsisVertical} /> en haut à droite.</>,
              <>Choisissez <strong className="text-st-text">Installer l&apos;application</strong> ou <strong className="text-st-text">Ajouter à l&apos;écran d&apos;accueil</strong>.</>,
              <>Confirmez avec <strong className="text-st-text">Installer</strong>.</>,
            ]} />
          </div>
        </div>
        <p className="text-[13px] text-st-muted">Sur iPhone, l&apos;ajout ne marche que depuis Safari, pas depuis Chrome ou une autre application.</p>
      </Section>

      <Section id="aide" title="Besoin d'aide">
        <p>
          Une question, un imprévu, un vol à rendre à moins de 3 jours : contactez Romain directement,
          par <a href="https://wa.me/32472324135" className="font-medium text-st-ink underline underline-offset-2">WhatsApp</a> ou
          à <a href="mailto:info@fly-horizons.com" className="font-medium text-st-ink underline underline-offset-2">info@fly-horizons.com</a>.
        </p>
      </Section>
    </div>
  );
}
