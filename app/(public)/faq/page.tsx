"use client";

import { useState, useMemo } from "react";
import { ChatWidget } from "@/components/chat/ChatWidget";
import Link from "next/link";
import {
  ChevronDown, Search, MessageCircle, X,
  CalendarCheck, CreditCard, CloudRain, PlaneTakeoff, Users,
} from "lucide-react";
import { jsonLd } from "@/lib/json-ld";

// ── Recherche intelligente ──────────────────────────────────────────────────

const SYNONYMS: Record<string, string[]> = {
  prix:        ["tarif", "cout", "combien", "cher", "montant"],
  tarif:       ["prix", "cout", "combien"],
  payer:       ["paiement", "provision", "acompte", "regler", "stripe", "carte", "virement"],
  paiement:    ["payer", "provision", "acompte", "stripe", "carte", "regler", "virement", "iban", "especes", "cash"],
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

const lk = "text-primary font-semibold hover:text-[#e6a800] transition-colors";
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

export default function FaqPage() {
  const [openKey, setOpenKey]         = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [activeTheme, setActiveTheme] = useState<string | null>(null);

  const query = search.trim();

  const results = useMemo(() => {
    const words = expandWords(
      normalize(query).split(/\s+/).filter((w) => w.length >= 2)
    );
    const isSearching = words.length > 0;

    return THEMES.flatMap((theme) =>
      theme.items
        .map((item) => ({
          theme,
          item,
          score: isSearching ? scoreItem(item.q, item.aText, words) : 1,
        }))
        .filter(({ score }) => score > 0)
    )
      .sort((a, b) => (query ? b.score - a.score : 0))
      .filter(({ theme }) => !activeTheme || theme.id === activeTheme);
  }, [query, activeTheme]);

  const grouped = useMemo(() => {
    if (query) return null;
    const map: Record<string, typeof results> = {};
    for (const r of results) {
      if (!map[r.theme.id]) map[r.theme.id] = [];
      map[r.theme.id].push(r);
    }
    return map;
  }, [results, query]);

  function toggle(key: string) {
    setOpenKey((prev) => (prev === key ? null : key));
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(FAQ_SCHEMA) }}
      />

      <section className="pt-[98px] pb-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

          {/* En-tête */}
          <div className="mb-10 pt-2 sm:pt-12">
            <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-4">Questions fréquentes</p>
            <h1 className="text-4xl sm:text-5xl font-black text-foreground leading-none tracking-tight mb-4">
              Vous avez des questions ?
            </h1>
            <p className="text-foreground/60 text-sm max-w-lg leading-relaxed">
              Demande de vol, paiement, météo, expérience à bord : trouvez rapidement ce dont vous avez besoin.
            </p>
          </div>

          {/* Recherche */}
          <div className="relative mb-5">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher : paiement, météo, annulation…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpenKey(null); setActiveTheme(null); }}
              className="w-full pl-9 pr-9 py-2.5 text-sm bg-white border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
            />
            {query && (
              <button
                onClick={() => { setSearch(""); setOpenKey(null); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Effacer la recherche"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtres par thème */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-8">
            <button
              onClick={() => { setActiveTheme(null); setSearch(""); setOpenKey(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                !activeTheme && !query ? "bg-navy text-white" : "bg-white text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              Tout
            </button>
            {THEMES.map(({ id, title, Icon }) => (
              <button
                key={id}
                onClick={() => { setActiveTheme(id === activeTheme ? null : id); setSearch(""); setOpenKey(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  activeTheme === id ? "bg-navy text-white" : "bg-white text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                <Icon size={11} />
                {title}
              </button>
            ))}
          </div>

          {/* Résultats */}
          {results.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-muted-foreground text-sm">Aucun résultat pour &laquo;&nbsp;{search}&nbsp;&raquo;.</p>
              <Link href="/contact" className="text-sm text-foreground font-semibold hover:text-primary transition-colors">
                Posez-nous la question directement →
              </Link>
            </div>
          ) : query ? (
            <div className="space-y-8">
              <p className="text-xs text-muted-foreground">
                {results.length} résultat{results.length > 1 ? "s" : ""} pour &laquo;&nbsp;{query}&nbsp;&raquo;
              </p>
              <div className="card-premium divide-y divide-border overflow-hidden">
                <FaqList items={results} openKey={openKey} toggle={toggle} />
              </div>
            </div>
          ) : grouped ? (
            <div className="space-y-8">
              {THEMES.filter((t) => !activeTheme || t.id === activeTheme).map((theme) => {
                const items = grouped[theme.id];
                if (!items || items.length === 0) return null;
                return (
                  <div key={theme.id}>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-[2px] mb-3">
                      {theme.title}
                    </p>
                    <div className="card-premium divide-y divide-border overflow-hidden">
                      <FaqList items={items} openKey={openKey} toggle={toggle} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* CTA chat */}
          <div className="mt-10 bg-white border border-border rounded-lg p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm font-bold text-foreground">Une question rapide ?</p>
              <p className="text-xs text-muted-foreground mt-0.5">Notre assistant répond instantanément, 24h/24.</p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("fh:open-chat"))}
                className="px-5 py-2.5 text-sm font-black bg-[#0b2238] text-white rounded-lg hover:bg-[#0b2238]/85 transition-colors cursor-pointer"
              >
                Poser une question →
              </button>
            </div>
          </div>

          {/* CTA contact */}
          <div className="mt-4 bg-navy rounded-lg p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <MessageCircle size={16} className="text-primary" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm font-bold text-white">Vous ne trouvez pas votre réponse ?</p>
              <p className="text-xs text-white/50 mt-0.5">Nous vous répondons personnellement sous 24 h.</p>
            </div>
            <Link
              href="/contact"
              className="shrink-0 px-5 py-2.5 text-sm font-black bg-primary text-primary-foreground rounded-lg hover:bg-[#e6a800] transition-colors shadow-gold"
            >
              Nous contacter
            </Link>
          </div>

        </div>
      </section>

      <ChatWidget mobileVisible />
    </main>
  );
}

// ── Composant liste ─────────────────────────────────────────────────────────

function FaqList({
  items,
  openKey,
  toggle,
}: {
  items: { theme: Theme; item: FaqItem }[];
  openKey: string | null;
  toggle: (key: string) => void;
}) {
  return (
    <>
      {items.map(({ theme, item }) => {
        const key = `${theme.id}::${item.q}`;
        const open = openKey === key;
        return (
          <div key={key}>
            <button
              onClick={() => toggle(key)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-secondary/60 transition-colors cursor-pointer"
              aria-expanded={open}
            >
              <span className="text-sm font-medium text-foreground">{item.q}</span>
              <ChevronDown
                size={15}
                className={`shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`}
              />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                <div className="px-5 pb-4 border-t border-border pt-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
