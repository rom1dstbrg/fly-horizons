import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Users, Plane, AlertTriangle, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Conditions Générales de Participation — Fly Horizons",
  description:
    "Conditions de participation aux vols en avion léger organisés par Fly Horizons. Sécurité, comportement à bord, limite de poids, annulation.",
};

const SECTIONS = [
  {
    icon: ShieldCheck,
    title: "1. Nature de l'activité",
    content: [
      "Les vols proposés par Fly Horizons sont des vols en partage de coûts (cost-sharing) organisés conformément au règlement européen EASA NCO.GEN.104.",
      "Le paiement effectué par les passagers couvre uniquement leur quote-part des frais directs du vol : carburant, location de l'avion, redevances aéroportuaires. Il ne s'agit pas d'un service de transport aérien commercial.",
      "Le pilote, DESTANBERG Romain, supporte sa propre part proportionnelle des frais et ne perçoit aucune rémunération pour ses services de pilotage.",
    ],
  },
  {
    icon: Users,
    title: "2. Conditions de participation",
    content: [
      "Santé : Le passager doit être en bonne santé générale. Toute affection pouvant être aggravée par le vol (problèmes cardiaques, épilepsie, claustrophobie sévère, grossesse avancée, etc.) doit être signalée avant la réservation.",
      "Âge : Il n'y a pas d'âge minimum. Les mineurs doivent être accompagnés d'un parent ou tuteur légal, qui doit être présent et donner son accord explicite.",
      "Alcool et substances : Il est strictement interdit de se présenter au vol sous l'influence de l'alcool ou de toute substance altérant les facultés dans les 8 heures précédant le vol.",
      "Ponctualité : Les passagers doivent être présents à l'aéroport de Charleroi (EBCI) au minimum 15 minutes avant l'heure de départ prévue.",
    ],
  },
  {
    icon: Plane,
    title: "3. Limite de poids et capacité",
    content: [
      "L'avion utilisé (DA40 TDI) impose une limite de masse totale passagers de 190 kg (pilote non inclus). Cette limite est stricte pour des raisons de sécurité aéronautique (calcul masse & centrage).",
      "Maximum 3 passagers par vol, sous réserve de la contrainte de masse ci-dessus.",
      "Le Client est tenu de déclarer le poids exact de chaque passager lors de la réservation. En cas d'informations inexactes, Fly Horizons se réserve le droit de refuser l'embarquement sans remboursement.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "4. Autorité du pilote commandant de bord",
    content: [
      "Le pilote (Commandant de Bord) dispose d'une autorité exclusive et souveraine sur toute décision liée à la sécurité du vol : décollage, atterrissage, itinéraire, retour anticipé.",
      "Sa décision est définitive et ne peut être contestée. Les passagers s'engagent à suivre ses instructions à tout moment.",
      "Le pilote peut modifier l'itinéraire prévu, dérouter ou annuler le vol à tout moment s'il l'estime nécessaire pour des raisons de sécurité ou de réglementation aérienne.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "5. Comportement à bord",
    content: [
      "Les passagers ne touchent aux commandes de l'avion qu'avec l'accord explicite du pilote, en phase de croisière et sous sa supervision directe.",
      "Il est interdit d'introduire des substances illicites, des matières dangereuses ou des objets susceptibles de compromettre la sécurité du vol.",
      "Tout comportement mettant en danger la sécurité du vol peut entraîner une interruption immédiate du vol aux frais du passager.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "6. Météo et annulations",
    content: [
      "Le pilote est seul juge de la praticabilité des conditions météorologiques. En cas de conditions défavorables, le vol est reporté sans frais. Le Client reçoit un nouveau créneau selon les disponibilités.",
      "Annulation par le Client avec plus de 48 h de préavis : le montant payé est converti en crédit de vol valable 12 mois.",
      "Annulation entre 24 h et 48 h avant le vol : traitement au cas par cas, sans garantie de compensation.",
      "Non-présentation (no-show) : aucun remboursement ni crédit n'est accordé. L'acompte versé est définitivement conservé.",
    ],
  },
  {
    icon: CheckCircle,
    title: "7. Assurance",
    content: [
      "L'avion (DA40 TDI) appartient à Air Academy New CAG (ATO-005, EBCI), école d'aviation certifiée. Leur assurance couvre tous les occupants à bord, pilote et passagers.",
      "Il est conseillé au passager de souscrire une assurance personnelle voyage ou accidents corporels pour une couverture complémentaire.",
    ],
  },
];

export default function CgpPage() {
  return (
    <main className="min-h-screen bg-gradient-navy pt-24 pb-16">
      <div className="container-shop max-w-3xl">

        {/* En-tête */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Légal</p>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Conditions Générales de Participation
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Ces conditions régissent la participation aux vols en avion léger organisés par Fly Horizons dans le cadre du partage de frais (NCO.GEN.104). Elles s'appliquent à tout passager embarquant à bord d'un vol Fly Horizons.
          </p>

          {/* Métadonnées */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-6 card-premium mb-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Exploitant</p>
              <p className="text-sm font-semibold text-foreground">DESTANBERG Romain</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Mise à jour</p>
              <p className="text-sm font-semibold text-foreground">Mai 2026</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Droit applicable</p>
              <p className="text-sm font-semibold text-foreground">Droit belge · EASA</p>
            </div>
          </div>

          {/* Cadre légal */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
              Activité de partage de coûts — NCO.GEN.104
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Les vols Fly Horizons ne constituent pas un service commercial. Vous participez aux frais réels du vol.
              Pour les achats de bons de vol et produits, consultez nos{" "}
              <Link href="/cgv" className="text-primary font-medium hover:underline">
                Conditions Générales de Vente
              </Link>.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {SECTIONS.map(({ icon: Icon, title, content }) => (
            <div key={title} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 bg-[#f5f8ff] border-b border-border">
                <div className="w-8 h-8 rounded-lg bg-[#0b2238]/8 border border-[#0b2238]/12 flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-[#0b2238]" />
                </div>
                <h2 className="text-[#0b2238] font-bold text-sm">{title}</h2>
              </div>
              <div className="px-6 py-5 space-y-3">
                {content.map((para, i) => (
                  <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-8 p-6 card-premium border-l-2 border-primary">
          <p className="text-sm font-semibold text-foreground mb-1">Une question sur ces conditions ?</p>
          <p className="text-xs text-muted-foreground mb-3">
            Romain répond personnellement sous 24 h.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-gold-400 transition-colors"
          >
            Nous contacter
          </Link>
        </div>

      </div>
    </main>
  );
}
