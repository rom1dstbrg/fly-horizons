"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { ChatWidget } from "@/components/chat/ChatWidget";
import Link from "next/link";
import {
  Search, MessageCircle, X, Plus, ArrowRight,
  CalendarCheck, CreditCard, CloudRain, PlaneTakeoff, Users,
} from "lucide-react";
import { jsonLd } from "@/lib/json-ld";

// ── Recherche intelligente ──────────────────────────────────────────────────

const SYNONYMS: Record<string, string[]> = {
  prix:        ["tarif", "cout", "combien", "cher", "montant"],
  tarif:       ["prix", "cout", "combien"],
  payer:       ["paiement", "provision", "acompte", "regler", "carte", "virement"],
  paiement:    ["payer", "provision", "acompte", "carte", "regler", "virement", "iban", "especes", "cash"],
  acompte:     ["provision", "payer", "paiement", "depot", "garantie"],
  provision:   ["payer", "paiement", "acompte", "depot", "garantie"],
  annuler:     ["annulation", "rembours", "reporter", "report", "modifier"],
  annulation:  ["annuler", "rembours", "reporter", "modifier"],
  reporter:    ["report", "modifier", "decaler", "annuler", "annulation"],
  cadeau:      ["voucher", "bon", "code", "offrir", "gift"],
  voucher:     ["cadeau", "bon", "code", "offrir"],
  bon:         ["cadeau", "voucher", "code"],
  meteo:       ["meteorologique", "pluie", "vent", "nuage", "orage", "conditions"],
  mesure:      ["personnalise", "itineraire", "route", "carte", "surmesure"],
  participer:  ["rejoindre", "reserver", "demande", "inscrire"],
  rejoindre:   ["participer", "reserver", "demande"],
  itineraire:  ["route", "mesure", "carte", "destination"],
  passager:    ["personne", "personnes", "participants", "invites"],
  poids:       ["masse", "kg", "kilos", "lourd"],
  age:         ["enfant", "mineur", "ans", "bebe", "jeune"],
  casque:      ["bruit", "son", "oreilles", "antibruit"],
  creneau:     ["date", "heure", "disponibilite", "calendrier"],
  secure:      ["garantie", "reserve", "bloque"],
  chaussures:  ["tenue", "vetements", "habits", "porter", "apporter", "shoes"],
  bagage:      ["sac", "valise", "apporter", "bagages", "affaires"],
  alcool:      ["boisson", "boire", "alcoolise"],
  enceinte:    ["grossesse", "bebe", "medical", "medicale", "condition", "sante", "handicap"],
  retard:      ["tarde", "tardive", "absent", "noshow", "arriver"],
  refuser:     ["refuse", "accepte", "valider", "itineraire", "mesure", "modifier"],
  altitude:    ["hauteur", "metres", "haut", "vertige", "peur", "monter"],
  assurance:   ["assure", "couvert", "sinistre", "accident", "responsabilite"],
  hobbs:       ["compteur", "temps", "reel", "minute", "calcul", "prix"],
  pays:        ["frontiere", "france", "allemagne", "paysbas", "angleterre", "etranger", "international"],
  confirme:    ["confirmation", "valide", "accepte", "delai", "combien"],
  frais:       ["supplement", "fraisup", "sup", "depas", "extra"],
};

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/[''«»]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

function expandWords(words: string[]): string[] {
  const expanded = new Set(words);
  for (const w of words) {
    const direct = SYNONYMS[w] ?? [];
    direct.forEach((s) => expanded.add(s));
    for (const [key, vals] of Object.entries(SYNONYMS)) {
      if (key.startsWith(w) && w.length >= 3) {
        expanded.add(key);
        vals.forEach((v) => expanded.add(v));
      }
      if (vals.some((v) => v.startsWith(w) && w.length >= 3)) {
        expanded.add(key);
        vals.forEach((v) => expanded.add(v));
      }
    }
  }
  return [...expanded];
}

function scoreItem(q: string, aText: string, words: string[]): number {
  const nq = normalize(q);
  const na = normalize(aText);
  const qWords = nq.split(/\s+/);
  let s = 0;
  for (const w of words) {
    if (w.length < 2) continue;
    if (nq.includes(w)) s += 4;
    else if (qWords.some((qw) => qw.startsWith(w) && w.length >= 3)) s += 2;
    if (na.includes(w)) s += 1;
  }
  return s;
}

// ── Données FAQ ─────────────────────────────────────────────────────────────

type FaqItem = {
  q: string;
  a: string | React.ReactNode;
  aText: string;
};

type Theme = {
  id: string;
  title: string;
  Icon: React.ElementType;
  items: FaqItem[];
};

const lk = "font-semibold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-[3px] hover:decoration-primary transition-colors";
const item = (q: string, aText: string, a?: React.ReactNode): FaqItem => ({ q, aText, a: a ?? aText });

const THEMES: Theme[] = [
  {
    id: "reservation",
    title: "Participer à un vol",
    Icon: CalendarCheck,
    items: [
      item(
        "Comment participer à un vol partagé ?",
        "Sur la page Les vols, choisissez un vol publié par un pilote. Sa fiche présente les photos, la durée, l'itinéraire et la participation aux frais. Cliquez sur Réserver, choisissez une date parmi les disponibilités du pilote, indiquez le nombre de passagers et vos coordonnées, puis envoyez votre demande. Aucun paiement n'est demandé à ce stade.",
        <>Sur la page <Link href="/nos-offres" className={lk}>Les vols</Link>, choisissez un vol publié par un pilote. Sa fiche présente les photos, la durée, l&apos;itinéraire et la participation aux frais. Cliquez sur Réserver, choisissez une date parmi les disponibilités du pilote, indiquez le nombre de passagers et vos coordonnées, puis envoyez votre demande. Aucun paiement n&apos;est demandé à ce stade.</>,
      ),
      item(
        "Qui sont les pilotes ?",
        "Des pilotes privés licenciés, qui partagent les frais d'un vol qu'ils effectuent. Avant de publier un vol, chaque pilote nous transmet sa licence et son certificat médical, que nous vérifions. Le pilote reste seul commandant de bord et seul responsable de son vol. Son profil est accessible depuis la fiche du vol.",
      ),
      item(
        "Le pilote peut-il refuser ma demande ?",
        "Oui. Le pilote accepte ou décline chaque demande selon ses disponibilités, la météo et la faisabilité du vol. Une demande envoyée ne garantit donc pas votre place : vous rejoignez le vol une fois la demande acceptée.",
      ),
      item(
        "Combien coûte un vol ?",
        "Chaque vol affiche sa participation aux frais : votre part des frais réels du vol (avion, carburant, taxes d'aérodrome), sans marge commerciale. Le pilote paie aussi sa part. Selon le vol, le prix est donné pour l'avion entier (jusqu'à 3 passagers) ou par place. Tous les vols disponibles et leurs montants sont sur la page Les vols.",
        <>Chaque vol affiche sa participation aux frais : votre part des frais réels du vol (avion, carburant, taxes d&apos;aérodrome), sans marge commerciale. Le pilote paie aussi sa part. Selon le vol, le prix est donné pour l&apos;avion entier (jusqu&apos;à 3 passagers) ou par place. Tous les vols disponibles et leurs montants sont sur la page <Link href="/nos-offres" className={lk}>Les vols</Link>.</>,
      ),
      item(
        "D'où partent les vols ?",
        "De l'aérodrome de Charleroi (EBCI). Le plan d'accès (parking, point de rendez-vous) est sur notre page Accès à l'aérodrome.",
        <>De l&apos;aérodrome de Charleroi (EBCI). Le plan d&apos;accès (parking, point de rendez-vous) est sur notre page <Link href="/access-ebci" className={lk}>Accès à l&apos;aérodrome</Link>.</>,
      ),
      item(
        "À quelles heures les vols ont-ils lieu ?",
        "Les créneaux proposés sont ceux du pilote : vous les voyez au moment de choisir votre date. Les vols ont lieu de jour, en général entre 7 h et 21 h.",
      ),
      item(
        "Puis-je réserver pour quelqu'un d'autre ou offrir un vol ?",
        "Oui. Faites la demande avec les coordonnées de la personne qui volera, ou à votre nom en le précisant dans le message pour le pilote. Nous ne proposons pas de bons cadeaux.",
      ),
      item(
        "Combien de temps à l'avance faut-il faire sa demande ?",
        "Au moins 48 heures avant le vol : en dessous, le calendrier ne propose plus de créneaux. Au printemps et en été, mieux vaut s'y prendre plusieurs semaines à l'avance pour avoir le choix des dates.",
      ),
    ],
  },
  {
    id: "paiement",
    title: "Paiement",
    Icon: CreditCard,
    items: [
      item(
        "Quand et comment dois-je payer ?",
        "Uniquement une fois votre demande confirmée par le pilote. Vous recevez alors par email un lien vers une page de paiement avec le montant, l'IBAN du pilote et un QR code à scanner depuis votre app bancaire. Le virement va directement au pilote : Fly Horizons n'encaisse rien. Le pilote vous remet ensuite un reçu.",
      ),
      item(
        "Puis-je payer en espèces ?",
        "Oui, si le pilote l'accepte : convenez-en avec lui après la confirmation. Le virement reste le moyen de paiement par défaut. Le paiement par carte n'est pas proposé.",
      ),
      item(
        "Pour un vol vendu à la place, pourquoi le prix n'est-il pas définitif ?",
        "Parce que les frais sont partagés à parts égales entre les passagers réellement à bord. Le prix affiché correspond à un vol complet. Si toutes les places ne sont pas prises, le pilote clôture le groupe et la part de chacun est recalculée. Vous connaissez le montant définitif avant tout paiement.",
      ),
      item(
        "Y a-t-il des frais supplémentaires après le vol ?",
        "Non. Le montant confirmé couvre tout le vol prévu, taxes d'aérodrome comprises. Il n'y a rien à régler après le vol.",
      ),
    ],
  },
  {
    id: "avant-le-vol",
    title: "Avant le vol",
    Icon: CloudRain,
    items: [
      item(
        "Dans quel délai ma demande est-elle confirmée ?",
        "Le pilote répond dans un délai maximum de 72 heures, souvent bien plus vite. Vous recevez un email de confirmation, puis les informations de paiement. L'heure précise de décollage peut être ajustée dans les jours qui précèdent, selon la météo.",
      ),
      item(
        "Que se passe-t-il en cas de mauvaise météo ?",
        "Le pilote décide, parfois le jour même. Si la météo ne permet pas de voler en sécurité, le vol est reporté sans frais : le pilote vous propose un nouveau créneau par email.",
      ),
      item(
        "Puis-je annuler ou reporter mon vol ?",
        "Reporter est gratuit jusqu'à 48 heures avant le vol : contactez-nous ou répondez à l'email de confirmation. Pour annuler, prévenez le plus tôt possible. Le paiement ayant été fait directement au pilote, un éventuel remboursement se règle avec lui, et nous restons votre interlocuteur pour l'organiser. À moins de 48 heures, ou en cas d'absence sans prévenir, aucune compensation n'est garantie. Les conditions complètes sont dans nos conditions générales.",
        <>Reporter est gratuit jusqu&apos;à 48 heures avant le vol : <Link href="/contact" className={lk}>contactez-nous</Link> ou répondez à l&apos;email de confirmation. Pour annuler, prévenez le plus tôt possible. Le paiement ayant été fait directement au pilote, un éventuel remboursement se règle avec lui, et nous restons votre interlocuteur pour l&apos;organiser. À moins de 48 heures, ou en cas d&apos;absence sans prévenir, aucune compensation n&apos;est garantie. Les conditions complètes sont dans nos <Link href="/cgp" className={lk}>conditions générales</Link>.</>,
      ),
      item(
        "Combien de temps avant le vol dois-je arriver ?",
        "15 minutes avant l'heure prévue, pour l'accueil, le briefing sécurité et l'embarquement. Le plan d'accès complet est sur notre page Accès à l'aérodrome.",
        <>15 minutes avant l&apos;heure prévue, pour l&apos;accueil, le briefing sécurité et l&apos;embarquement. Le plan d&apos;accès complet est sur notre page <Link href="/access-ebci" className={lk}>Accès à l&apos;aérodrome</Link>.</>,
      ),
      item(
        "Que dois-je porter et apporter ?",
        "Des chaussures fermées, indispensables pour monter à bord. Une veste ou un pull selon la saison. Pas de bagage volumineux : la place est limitée. Téléphone et appareil photo sont les bienvenus. Pas d'alcool dans les 8 heures qui précèdent le vol. Les casques audio sont fournis.",
      ),
      item(
        "Je suis enceinte ou j'ai une condition médicale, puis-je voler ?",
        "En cas de grossesse, demandez l'avis de votre médecin avant de réserver. Pour toute condition particulière (problème cardiaque, épilepsie, claustrophobie, mobilité réduite), signalez-le dans le message au pilote ou contactez-nous avant : nous regarderons ensemble ce qui est possible.",
        <>En cas de grossesse, demandez l&apos;avis de votre médecin avant de réserver. Pour toute condition particulière (problème cardiaque, épilepsie, claustrophobie, mobilité réduite), signalez-le dans le message au pilote ou <Link href="/contact" className={lk}>contactez-nous</Link> avant : nous regarderons ensemble ce qui est possible.</>,
      ),
    ],
  },
  {
    id: "a-bord",
    title: "À bord",
    Icon: PlaneTakeoff,
    items: [
      item(
        "Combien de passagers peuvent monter à bord ?",
        "Jusqu'à 3 passagers en plus du pilote, dans un avion léger de 4 places. Le nombre de places est indiqué sur chaque vol.",
      ),
      item(
        "Y a-t-il une limite de poids ?",
        "Oui, comme dans tout avion léger. Avant chaque vol, le pilote calcule la masse et le centrage de l'avion : il peut vous demander le poids approximatif des passagers. Ce n'est pas un jugement, c'est une question de sécurité.",
      ),
      item(
        "Y a-t-il un âge minimum ?",
        "Non. Un enfant peut voler, accompagné d'un parent ou d'un tuteur présent. Un mineur ne peut pas embarquer seul.",
      ),
      item(
        "Le vol est-il bruyant ?",
        "Des casques antibruit sont fournis à chaque passager. Ils permettent aussi de parler avec le pilote pendant tout le vol.",
      ),
      item(
        "À quelle altitude vole-t-on ?",
        "En général entre 2 000 et 3 000 pieds, soit 600 à 1 000 mètres, à environ 200 km/h. Un avion de ligne vole dix fois plus haut : ici, le paysage défile vraiment sous vous. Le pilote commente le trajet et peut adapter l'altitude si vous le souhaitez.",
      ),
      item(
        "J'ai peur de voler, est-ce fait pour moi ?",
        "C'est une appréhension très courante, et la plupart des passagers sont surpris de se sentir à l'aise dès les premières minutes. Vous êtes assis à côté du pilote, vous voyez ce qu'il fait et il vous explique ce qui se passe. On vole bas et doucement, loin des turbulences des altitudes de croisière. Si vous ressentez un inconfort, vous le dites et on s'adapte. Un doute avant de réserver ? Contactez-nous.",
        <>C&apos;est une appréhension très courante, et la plupart des passagers sont surpris de se sentir à l&apos;aise dès les premières minutes. Vous êtes assis à côté du pilote, vous voyez ce qu&apos;il fait et il vous explique ce qui se passe. On vole bas et doucement, loin des turbulences des altitudes de croisière.<br /><br />Si vous ressentez un inconfort, vous le dites et on s&apos;adapte. Un doute avant de réserver ? <Link href="/contact" className={lk}>Contactez-nous</Link>.</>,
      ),
      item(
        "Les passagers sont-ils assurés ?",
        "Chaque avion vole sous sa propre assurance aviation, qui couvre la responsabilité civile envers les passagers. Votre pilote vous en donne le détail sur demande. Nous vous conseillons aussi une assurance individuelle accident. Il s'agit d'un vol privé en partage de frais, pas d'un transport aérien commercial.",
      ),
      item(
        "Vais-je recevoir une demande d'avis après mon vol ?",
        "Oui. Un email vous invite à répondre à une courte enquête. Cela prend moins d'une minute et aide les pilotes à s'améliorer.",
      ),
      item(
        "Puis-je recevoir un certificat de vol ?",
        "Oui, sans frais. Demandez-le à votre pilote ou contactez-nous après le vol.",
        <>Oui, sans frais. Demandez-le à votre pilote ou <Link href="/contact" className={lk}>contactez-nous</Link> après le vol.</>,
      ),
    ],
  },
  {
    id: "compte",
    title: "Suivre ma demande",
    Icon: Users,
    items: [
      item(
        "Dois-je créer un compte ?",
        "Non. Tout se passe par email. Si vous créez un compte avec la même adresse email, vous y retrouvez toutes vos demandes.",
        <>Non. Tout se passe par email. Si vous <Link href="/register" className={lk}>créez un compte</Link> avec la même adresse email, vous y retrouvez toutes vos demandes.</>,
      ),
      item(
        "Comment suivre l'état de ma demande ?",
        "Chaque étape vous est envoyée par email : demande reçue, confirmation, paiement, rappel avant le vol. Avec un compte, vous voyez aussi le statut dans Mes réservations.",
        <>Chaque étape vous est envoyée par email : demande reçue, confirmation, paiement, rappel avant le vol. Avec un <Link href="/account" className={lk}>compte</Link>, vous voyez aussi le statut dans Mes réservations.</>,
      ),
      item(
        "Je n'ai pas reçu d'email, que faire ?",
        "Vérifiez vos spams. Si l'email n'y est pas, contactez-nous : nous vérifions votre demande et vous la renvoyons.",
        <>Vérifiez vos spams. Si l&apos;email n&apos;y est pas, <Link href="/contact" className={lk}>contactez-nous</Link> : nous vérifions votre demande et vous la renvoyons.</>,
      ),
    ],
  },
];

// ── Schéma SEO ──────────────────────────────────────────────────────────────

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: THEMES.flatMap((t) =>
    t.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.aText },
    }))
  ),
};

// ── Page ────────────────────────────────────────────────────────────────────
// Nouvelle DA (maquette-faq.html, 28/09). UNE grille en lg : sommaire 260 px | questions.
// Titre sur les 2 colonnes ; recherche posée sur la colonne des questions (mêmes bords) ;
// sommaire collant qui démarre à hauteur de la recherche. Téléphone : pastilles collées
// sous le header. Aucune boîte : lignes séparées par des filets.

const WRAP = "max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10";

// Espace insécable avant ? ! : ; pour éviter la ponctuation orpheline en fin de ligne.
const nb = (s: string) => s.replace(/ ([?!:;])/g, " $1");

export default function FaqPage() {
  const [openKeys, setOpenKeys] = useState<Set<string>>(
    () => new Set([`${THEMES[0].id}::${THEMES[0].items[0].q}`])
  );
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState(THEMES[0].id);
  const lockSpy = useRef(false);
  const chipsRef = useRef<HTMLElement>(null);

  const query = search.trim();

  // Résultats groupés par thème ; en recherche, triés par pertinence dans chaque thème.
  const sections = useMemo(() => {
    const words = expandWords(normalize(query).split(/\s+/).filter((w) => w.length >= 2));
    return THEMES.map((theme) => ({
      theme,
      items: theme.items
        .map((item) => ({ item, score: words.length ? scoreItem(item.q, item.aText, words) : 1 }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => (words.length ? b.score - a.score : 0))
        .map(({ item }) => item),
    })).filter((s) => s.items.length > 0);
  }, [query]);

  const total = sections.reduce((n, s) => n + s.items.length, 0);

  // Thème actif selon le défilement (le dernier dont le haut est passé sous le header).
  useEffect(() => {
    function spy() {
      if (lockSpy.current) return;
      let cur = sections[0]?.theme.id;
      for (const { theme } of sections) {
        const el = document.getElementById(`t-${theme.id}`);
        if (el && el.getBoundingClientRect().top < 180) cur = theme.id;
      }
      if (cur) setActiveId(cur);
    }
    spy();
    window.addEventListener("scroll", spy, { passive: true });
    return () => window.removeEventListener("scroll", spy);
  }, [sections]);

  // La pastille active reste visible dans la rangée (téléphone).
  useEffect(() => {
    const chip = chipsRef.current?.querySelector<HTMLElement>(`[data-id="${activeId}"]`);
    const bar = chipsRef.current;
    if (!chip || !bar || bar.offsetParent === null) return;
    bar.scrollTo({ left: chip.offsetLeft - (bar.clientWidth - chip.clientWidth) / 2, behavior: "smooth" });
  }, [activeId]);

  // Clic sur un thème : défilement fluide jusqu'à la section (scroll-margin gère le header).
  function goTo(id: string) {
    setActiveId(id);
    lockSpy.current = true;
    window.setTimeout(() => { lockSpy.current = false; }, 900);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`t-${id}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  function toggle(key: string) {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(FAQ_SCHEMA) }}
      />

      <section className="pt-page pb-16 lg:pb-24">
        <div className={`${WRAP} lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-x-24`}>

          {/* En-tête (2 colonnes) */}
          <div className="lg:col-span-2">
            <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3">Questions fréquentes</p>
            <h1 className="text-[34px] lg:text-[52px] font-black text-foreground leading-[1.03] tracking-[-0.02em]">
              Vos questions, nos réponses.
            </h1>
            <p className="mt-3 max-w-[460px] text-[15px] leading-[1.7] text-foreground/70">
              Réserver, payer, se préparer, voler : tout ce qu&apos;on nous demande le plus souvent.
            </p>
          </div>

          {/* Recherche : posée sur la colonne des questions */}
          <div className="mt-5 lg:mt-10 lg:col-start-2 lg:row-start-2">
            <div className="relative">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                placeholder="Rechercher : paiement, météo, annulation…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-[52px] pl-12 pr-11 rounded-xl border border-border bg-secondary text-[15px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:bg-white focus:border-foreground [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Effacer la recherche"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
              {query
                ? `${total} résultat${total > 1 ? "s" : ""}`
                : `${THEMES.reduce((n, t) => n + t.items.length, 0)} questions en ${THEMES.length} thèmes.`}
            </p>
          </div>

          {/* Sommaire (ordinateur) : démarre à hauteur de la recherche, reste collé */}
          <nav
            aria-label="Thèmes"
            className="hidden lg:block lg:col-start-1 lg:row-start-2 lg:row-span-2 lg:mt-10 self-start sticky top-[110px]"
          >
            <p className="text-[11px] font-bold uppercase tracking-[2px] text-muted-foreground mb-3">Thèmes</p>
            {THEMES.map((t) => {
              const on = activeId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => goTo(t.id)}
                  className={`w-full flex justify-between items-center py-2.5 pl-3.5 text-left text-sm font-semibold border-l-2 transition-colors cursor-pointer ${
                    on ? "text-foreground border-primary" : "text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {t.title}
                  <span className="text-xs font-medium">{t.items.length}</span>
                </button>
              );
            })}
          </nav>

          {/* Pastilles (téléphone) : collées sous le header */}
          <nav
            ref={chipsRef}
            aria-label="Thèmes"
            className="lg:hidden sticky top-[72px] z-30 -mx-4 sm:-mx-6 mt-6 px-4 sm:px-6 py-2.5 bg-white border-b border-border flex gap-2 overflow-x-auto no-scrollbar"
          >
            {THEMES.map((t) => (
              <button
                key={t.id}
                data-id={t.id}
                onClick={() => goTo(t.id)}
                className={`shrink-0 px-3.5 py-2 rounded-full border text-[13px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeId === t.id ? "bg-[#0b2238] border-[#0b2238] text-white" : "bg-white border-border text-muted-foreground"
                }`}
              >
                {t.title}
              </button>
            ))}
          </nav>

          {/* Questions */}
          <div className="pt-2 lg:pt-14 lg:col-start-2 lg:row-start-3">
            {sections.length === 0 ? (
              <p className="py-10 text-[15px] text-muted-foreground">
                Aucune question ne correspond à «&nbsp;{query}&nbsp;». Essayez un autre mot, ou{" "}
                <Link href="/contact" className="font-semibold text-foreground hover:text-primary transition-colors">écrivez-nous</Link>.
              </p>
            ) : (
              sections.map(({ theme, items }) => (
                <section key={theme.id} id={`t-${theme.id}`} className="pt-8 lg:pt-0 lg:mb-12 scroll-mt-[136px] lg:scroll-mt-[110px]">
                  <h2 className="flex items-baseline gap-2.5 mb-2 text-[22px] lg:text-[26px] font-black text-foreground tracking-[-0.01em]">
                    {theme.title}
                    <small className="text-xs font-semibold text-muted-foreground">{items.length}</small>
                  </h2>
                  {items.map((item) => {
                    const key = `${theme.id}::${item.q}`;
                    const open = !!query || openKeys.has(key);
                    return (
                      <div key={key} className="border-b border-border">
                        <button
                          onClick={() => toggle(key)}
                          aria-expanded={open}
                          className="w-full flex items-start justify-between gap-4 py-[18px] lg:py-5 text-left text-base lg:text-[17px] font-bold leading-snug text-foreground hover:text-[#0b2238] cursor-pointer"
                        >
                          <span>{nb(item.q)}</span>
                          <span
                            className={`shrink-0 -mt-0.5 grid place-items-center w-7 h-7 rounded-full border transition-[transform,background-color,border-color] duration-200 ${
                              open ? "rotate-45 bg-primary border-primary text-[#0b2238]" : "border-border text-[#0b2238]"
                            }`}
                          >
                            <Plus size={14} />
                          </span>
                        </button>
                        <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                          <div className="overflow-hidden">
                            <p className="max-w-[720px] pb-5 pr-11 lg:pr-0 text-[15px] lg:text-base leading-[1.75] text-foreground/75">
                              {item.a}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </section>
              ))
            )}
          </div>

          {/* Fin : pas de bloc, deux actions */}
          <div className="mt-14 lg:mt-6 pt-8 border-t border-border lg:col-start-2 lg:row-start-4">
            <h2 className="text-2xl lg:text-[28px] font-black text-foreground tracking-[-0.01em]">
              Vous ne trouvez pas votre réponse&nbsp;?
            </h2>
            <p className="mt-2 mb-5 max-w-[460px] text-[15px] leading-[1.7] text-foreground/70">
              Écrivez-nous : une personne vous répond sous 24 h. Pour une question simple, l&apos;assistant répond tout de suite.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-[22px] py-[13px] bg-primary text-[#0b2238] rounded-[10px] text-sm font-black hover:bg-[#e6a800] transition-colors shadow-gold"
              >
                Nous écrire
                <ArrowRight size={15} />
              </Link>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("fh:open-chat"))}
                className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-border text-foreground rounded-[10px] text-sm font-bold hover:border-foreground transition-colors cursor-pointer"
              >
                <MessageCircle size={15} />
                Demander à l&apos;assistant
              </button>
            </div>
          </div>

        </div>
      </section>

      <ChatWidget mobileVisible />
    </main>
  );
}
