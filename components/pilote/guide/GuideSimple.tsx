import { Share, SquarePlus, EllipsisVertical, Smartphone, Mail, Flag } from "lucide-react";
import { Card, SectionHeader } from "@/components/pilote/studio";
import { CHARTE_PILOTE_TEXTE, CHARTE_VERSION } from "@/lib/pilote/charte";

// Fiches courtes du guide pilote, sans démo interactive.

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed text-st-text-2">
          <span className="st-num mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-st-ink text-[11px] font-semibold text-white">{i + 1}</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

// Petit « bouton du téléphone » dans le texte d'une étape.
function Key({ icon: Icon, label }: { icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; label?: string }) {
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-st-line bg-white px-1.5 py-0.5 align-[-3px] text-[12.5px] font-medium text-st-text">
      <Icon size={13} strokeWidth={2} />
      {label}
    </span>
  );
}

export function GuideInstaller() {
  return (
    <div className="space-y-6">
      <p className="text-[14px] leading-relaxed text-st-text-2">
        L&apos;espace pilote s&apos;utilise comme une application : une icône sur votre écran d&apos;accueil, en plein écran,
        sans barre d&apos;adresse. C&apos;est indispensable pour recevoir les notifications (nouvelle demande, route validée,
        rappels). Ouvrez d&apos;abord <strong className="font-semibold text-st-text">fly-horizons.com/pilote</strong> sur votre téléphone.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="space-y-3">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-st-text"><Smartphone size={16} /> iPhone (Safari)</p>
          <Steps items={[
            <>Touchez <Key icon={Share} label="Partager" /> en bas de l&apos;écran.</>,
            <>Faites défiler et choisissez <Key icon={SquarePlus} label="Sur l'écran d'accueil" />.</>,
            <>Touchez <strong className="font-semibold text-st-text">Ajouter</strong> en haut à droite.</>,
            <>Ouvrez l&apos;app depuis son icône et acceptez les notifications.</>,
          ]} />
        </Card>
        <Card className="space-y-3">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-st-text"><Smartphone size={16} /> Android (Chrome)</p>
          <Steps items={[
            <>Touchez le menu <Key icon={EllipsisVertical} /> en haut à droite.</>,
            <>Choisissez <strong className="font-semibold text-st-text">Installer l&apos;application</strong> ou <strong className="font-semibold text-st-text">Ajouter à l&apos;écran d&apos;accueil</strong>.</>,
            <>Confirmez avec <strong className="font-semibold text-st-text">Installer</strong>.</>,
          ]} />
        </Card>
      </div>
      <p className="text-[13px] text-st-muted">
        Sur iPhone, l&apos;ajout ne marche que depuis Safari, pas depuis Chrome ou une autre application.
      </p>
    </div>
  );
}

export function GuideCharte() {
  // Le texte est découpé en paragraphes ; un titre d'article commence par « 1. », « 2. »…
  const blocks = CHARTE_PILOTE_TEXTE.split("\n\n");
  const [y, m, d] = CHARTE_VERSION.split("-");
  return (
    <Card className="max-w-3xl space-y-3.5">
      <p className="text-[12.5px] text-st-muted">Version du {d}/{m}/{y}, acceptée à votre accès à l&apos;espace pilote.</p>
      {blocks.map((b, i) => {
        const [first, ...rest] = b.split("\n");
        const isArticle = /^\d+\.\s/.test(first);
        return isArticle ? (
          <div key={i}>
            <p className="text-[14px] font-semibold text-st-text">{first}</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-st-text-2">{rest.join(" ")}</p>
          </div>
        ) : (
          <p key={i} className="text-[13.5px] leading-relaxed text-st-text-2">{b}</p>
        );
      })}
    </Card>
  );
}

export function GuideContact() {
  const items = [
    { icon: Mail, title: "info@fly-horizons.com", desc: "Une question, un imprévu, un vol qui ne peut pas se faire.", href: "mailto:info@fly-horizons.com" },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        {items.map(({ icon: Icon, title, desc, href }) => (
          <a key={title} href={href} className="block rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-st-ink/25">
            <Card interactive className="flex items-start gap-3.5">
              <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px] bg-st-ink text-white"><Icon size={20} /></span>
              <span>
                <span className="block text-[14.5px] font-semibold text-st-text">{title}</span>
                <span className="block text-[12.5px] text-st-text-2">{desc}</span>
              </span>
            </Card>
          </a>
        ))}
      </div>
      <section className="space-y-2">
        <SectionHeader title="Un bug, une idée ?" />
        <p className="flex items-start gap-2 text-[14px] leading-relaxed text-st-text-2">
          <Flag size={16} className="mt-1 shrink-0" />
          <span>« Signaler un problème », dans le menu de l&apos;espace pilote (sous « Plus » sur téléphone), nous envoie votre message. Vous pouvez y joindre des captures d&apos;écran.</span>
        </p>
      </section>
    </div>
  );
}
