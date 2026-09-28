import {
  Rocket, Info, Smartphone, LayoutDashboard, Plane, PlaneTakeoff, CalendarRange, Receipt,
  Navigation, Scale, NotebookPen, User, Route, Banknote, Users, Bell, TriangleAlert,
  ShieldCheck, CircleQuestionMark, MessageCircle, type LucideIcon,
} from "lucide-react";

// Catalogue du guide pilote (maquette validée le 27/09 : maquette-guide-accueil.html).
// Accueil = onglets + cartes ; chaque carte ouvre /pilote/guide/<slug>. Une fiche
// pas encore rédigée (`ready: false`) affiche « En construction » : on les
// remplit une par une, le contenu de référence est dans maquette-guide-pilote.html.

export type GuideTabKey = "demarrer" | "pages" | "parcours" | "aide";

export type GuideEntry = {
  slug: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  /** Temps de lecture, en minutes. */
  min: number;
  /** Mise en avant (icône pleine) : les fiches à lire en premier. */
  featured?: boolean;
  ready?: boolean;
  /** La page de l'espace n'existe pas encore (Logbook). */
  soon?: boolean;
  /** Page de l'espace concernée, pour le lien « Ouvrir la page ». */
  href?: string;
};

export const GUIDE_TABS: { key: GuideTabKey; label: string; intro: string; entries: GuideEntry[] }[] = [
  {
    key: "demarrer",
    label: "Démarrer",
    intro: "Les bases, à lire une fois avant votre premier passager.",
    entries: [
      { slug: "principe", icon: Info, title: "Le principe", desc: "Mise en relation, partage de frais, vous êtes seul commandant de bord.", min: 2, featured: true },
      { slug: "premiers-pas", icon: Rocket, title: "Premiers pas", desc: "Les 4 choses à faire avant votre premier passager.", min: 2, featured: true },
      { slug: "installer", icon: Smartphone, title: "Installer l'app", desc: "L'espace sur l'écran d'accueil, pour recevoir les notifications.", min: 1, ready: true },
    ],
  },
  {
    key: "pages",
    label: "Pages",
    intro: "Une fiche par page de votre espace : à quoi elle sert et comment l'utiliser.",
    entries: [
      { slug: "tableau-de-bord", icon: LayoutDashboard, title: "Tableau de bord", desc: "Ce qui vous attend aujourd'hui, en un coup d'œil.", min: 1, href: "/pilote" },
      { slug: "mes-vols", icon: Plane, title: "Mes vols", desc: "Toutes vos réservations et le tiroir de chaque vol.", min: 4, href: "/pilote/vols" },
      { slug: "mes-annonces", icon: PlaneTakeoff, title: "Mes annonces", desc: "Publier un vol, fixer le tarif, gérer les groupes.", min: 4, href: "/pilote/annonces" },
      { slug: "disponibilites", icon: CalendarRange, title: "Disponibilités", desc: "Les blocs de 2 heures où les passagers peuvent réserver.", min: 3, href: "/pilote/disponibilites", ready: true },
      { slug: "transactions", icon: Receipt, title: "Transactions", desc: "Ce que vous avez reçu et ce qui reste à recevoir.", min: 2, href: "/pilote/transactions" },
      { slug: "itineraires", icon: Navigation, title: "Itinéraires", desc: "Vos routes enregistrées, réutilisables partout.", min: 1, href: "/pilote/itineraires" },
      { slug: "masse-centrage", icon: Scale, title: "Masse & centrage", desc: "Chargement, performances et météo avant le vol.", min: 3, href: "/pilote/mass-balance" },
      { slug: "profil", icon: User, title: "Mon profil", desc: "Licence, médical, IBAN et justificatifs.", min: 2, href: "/pilote/profil" },
      { slug: "logbook", icon: NotebookPen, title: "Logbook", desc: "Votre carnet de vol arrive bientôt.", min: 1, soon: true },
    ],
  },
  {
    key: "parcours",
    label: "Parcours",
    intro: "Ce qui traverse plusieurs pages, étape par étape.",
    entries: [
      { slug: "reservation", icon: Route, title: "Une réservation de A à Z", desc: "De la demande du passager au vol effectué.", min: 5, featured: true, ready: true },
      { slug: "paiement", icon: Banknote, title: "Le paiement", desc: "Virement direct, QR code, reçu, relances.", min: 3 },
      { slug: "vente-a-la-place", icon: Users, title: "Vendre à la place", desc: "Plusieurs passagers, un groupe, un prix figé à la clôture.", min: 2 },
      { slug: "notifications", icon: Bell, title: "Emails et notifications", desc: "Qui reçoit quoi, et quand.", min: 2 },
      { slug: "imprevu", icon: TriangleAlert, title: "En cas d'imprévu", desc: "Autre créneau, report, et en dernier recours.", min: 2 },
    ],
  },
  {
    key: "aide",
    label: "Règles et aide",
    intro: "Le cadre à respecter, et où trouver de l'aide.",
    entries: [
      { slug: "charte", icon: ShieldCheck, title: "La charte du pilote", desc: "Le texte que vous avez accepté, en entier.", min: 4, featured: true, ready: true },
      { slug: "faq", icon: CircleQuestionMark, title: "Questions fréquentes", desc: "Paiement, notifications, annulation, documents.", min: 3 },
      { slug: "contact", icon: MessageCircle, title: "Nous contacter", desc: "Par email, ou signaler un problème.", min: 1, ready: true },
    ],
  },
];

export const GUIDE_ENTRIES = GUIDE_TABS.flatMap((t) => t.entries.map((e) => ({ ...e, tab: t.key })));

export function guideEntry(slug: string) {
  return GUIDE_ENTRIES.find((e) => e.slug === slug) ?? null;
}

/** Fiche précédente et suivante, dans l'ordre du catalogue (pour le bas de page). */
export function guideNeighbours(slug: string) {
  const i = GUIDE_ENTRIES.findIndex((e) => e.slug === slug);
  return { prev: i > 0 ? GUIDE_ENTRIES[i - 1] : null, next: i >= 0 && i < GUIDE_ENTRIES.length - 1 ? GUIDE_ENTRIES[i + 1] : null };
}
