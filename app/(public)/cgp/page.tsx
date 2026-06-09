import type { Metadata } from "next";
import { CgvAccordion } from "@/components/shop/CgvAccordion";

export const metadata: Metadata = {
  title: "Conditions Générales de Participation · Fly Horizons",
  description:
    "Conditions générales de participation et de vente applicables aux vols et achats effectués sur fly-horizons.com. Sécurité, paiement, annulation, RGPD.",
};

const CGP_SECTIONS = [
  {
    title: "1. Identification et nature de l'activité",
    content: `Le site fly-horizons.com est exploité par :

Nom : DESTANBERG Romain
E-mail : info@fly-horizons.com
Site web : fly-horizons.com

Fly Horizons est une initiative de partage de coûts aéronautiques exercée conformément au règlement EASA (EU) No 965/2012, article NCO.GEN.104.

IMPORTANT. Nature non commerciale des vols : Les vols proposés sur ce site ne constituent PAS un service de transport aérien commercial. Il s'agit exclusivement de vols en partage de coûts (cost-sharing) au sens de la réglementation européenne. Le paiement effectué par les passagers couvre uniquement leur quote-part des frais directs du vol (carburant, location de l'aéronef, redevances aéroportuaires). Le pilote supporte sa propre part proportionnelle des coûts et ne perçoit aucune rémunération pour ses services de pilotage.`,
  },
  {
    title: "2. Champ d'application",
    content: `Les présentes Conditions Générales de Participation (CGP) s'appliquent à tout achat et à toute participation effectués sur fly-horizons.com par toute personne physique non professionnelle (ci-après « le Client »).

Elles couvrent trois catégories d'achats :
- Produits physiques (accessoires aéronautiques et articles de la boutique)
- Bons de vol (vouchers cadeaux pour une expérience de vol en partage de coûts)
- Réservations de vol (packs 30 / 60 / 90 / 120 min ou vol sur mesure)

En passant commande sur le site, le Client reconnaît avoir pris connaissance des présentes CGP et les accepte sans réserve. Les CGP applicables sont celles en vigueur au moment de la passation de la commande.`,
  },
  {
    title: "3. Produits physiques : Boutique",
    content: `La boutique propose des accessoires aéronautiques et articles dérivés (ci-après « produits »). Les produits disponibles sont ceux affichés sur le site au moment de la consultation.

Les visuels et photographies des produits ont une valeur illustrative et ne sont pas contractuels. Fly Horizons s'efforce de les reproduire aussi fidèlement que possible.

La disponibilité est indiquée sur chaque fiche produit. En cas d'indisponibilité après commande, le Client est informé par e-mail dans les meilleurs délais et peut obtenir le remboursement intégral des sommes versées ou choisir un produit de substitution.`,
  },
  {
    title: "4. Bons de vol (vouchers)",
    content: `Les bons de vol sont des certificats d'expérience valant droit à une expérience de vol en partage de coûts pour la durée mentionnée (30, 60, 90 ou 120 minutes). Ils peuvent être offerts comme cadeau.

Conditions applicables aux bons de vol :

Validité : 12 mois à compter de la date d'achat. Passé ce délai, le bon de vol est expiré et ne peut plus être utilisé ni remboursé.

Utilisation : Le bon de vol permet de couvrir tout ou partie des frais d'un vol, selon sa durée. Il est utilisable pour une réservation standard ou un vol sur mesure, sous réserve des disponibilités.

Non remboursable : Les bons de vol ne sont pas échangeables contre des espèces ou un remboursement en argent.

Transmissibilité : Un bon de vol peut être utilisé par une personne autre que l'acheteur. Il est librement transférable.

Perte ou vol : Fly Horizons ne peut être tenu responsable de la perte, du vol ou de l'utilisation frauduleuse d'un bon de vol.

Droit de rétractation sur les bons de vol : Le Client dispose d'un droit de rétractation de 14 jours calendaires à compter de l'achat, à condition que le bon de vol n'ait pas encore été utilisé pour initier une réservation. Pour exercer ce droit, le Client envoie un e-mail à info@fly-horizons.com.`,
  },
  {
    title: "5. Réservations de vol : Packs standards",
    content: `Les packs de vol (30, 60, 90 ou 120 minutes) permettent de réserver un créneau de vol sur le calendrier disponible, au départ de l'aéroport de Charleroi (EBCI).

Processus de réservation : Le Client choisit sa durée de vol, une date et un horaire disponibles, renseigne ses informations personnelles et procède au paiement ou utilise un bon de vol couvrant le montant total.

Confirmation : La réservation est confirmée dès réception du paiement (ou validation du bon de vol). Un e-mail de confirmation est envoyé au Client.

Nombre de passagers : Maximum 3 passagers par vol, sous réserve des contraintes de masse (voir article 8).

Durée indicative : La durée du pack est indicative et correspond à une durée de vol estimée. Des variations mineures peuvent survenir selon les conditions aéronautiques.`,
  },
  {
    title: "6. Vols sur mesure",
    content: `Les vols sur mesure permettent au Client de définir son propre itinéraire (waypoints, escales) au départ de Charleroi (EBCI). Le prix est calculé en fonction de la durée estimée du vol au tarif horaire en vigueur.

Processus : Le Client soumet sa demande via le formulaire vol sur mesure. Un devis est établi et une provision est demandée pour confirmer la réservation. Le montant définitif est déterminé après le vol, selon la durée effectivement réalisée.

Provision : La provision versée lors de la confirmation couvre le coût réel du vol. Si la provision dépasse le montant dû après le vol, la différence est remboursée au Client. En cas d'annulation par le Client, la provision n'est pas remboursée (voir article 10).

Taxes d'atterrissage : Les taxes d'escale (redevances des aéroports visités) sont dues en sus du tarif horaire et sont à la charge du Client. Elles sont indiquées dans le devis.

Prix final : Le montant total est calculé après le vol sur la base de la durée réelle et des éventuelles taxes d'escale.`,
  },
  {
    title: "7. Tarifs et paiement",
    content: `Les tarifs affichés sur le site sont exprimés en euros (€). Ils représentent la quote-part du Client dans les frais directs du vol ou le prix des produits, toutes taxes applicables incluses.

Tarif horaire vol : Le coût par minute de vol est déterminé par le tarif en vigueur au moment de la réservation, consultable sur le site ou communiqué sur demande. Ce tarif couvre les frais directs (carburant, location de l'aéronef, redevances).

Paiement sécurisé : Les paiements en ligne sont traités par Stripe (stripe.com), solution de paiement conforme aux normes PCI-DSS. Fly Horizons ne stocke aucune donnée bancaire sur ses serveurs.

Lien de paiement : Pour les réservations créées par l'exploitant à la suite d'un contact par e-mail, un lien de paiement sécurisé est envoyé au Client par e-mail.

Validation : La commande ou la réservation est définitivement validée à réception de la confirmation de paiement.`,
  },
  {
    title: "8. Conditions de participation et limite de masse",
    content: `Tout passager souhaitant participer à un vol doit répondre aux conditions suivantes :

Santé : Le passager doit être en bonne santé générale. Toute affection pouvant être aggravée par le vol (problèmes cardiaques, épilepsie, claustrophobie sévère, grossesse avancée, etc.) doit être signalée avant la réservation. Fly Horizons se réserve le droit de refuser un passager dont l'état de santé pourrait constituer un risque.

Alcool et substances : Il est strictement interdit de se présenter au vol sous l'influence de l'alcool ou de toute substance altérant les facultés, dans les 8 heures précédant le vol.

Mineurs : Les passagers mineurs doivent être accompagnés d'un parent ou tuteur légal, présent et ayant donné son accord explicite. Un mineur ne peut embarquer seul.

Ponctualité : Les passagers doivent être présents à l'aéroport de Charleroi (EBCI) 15 minutes au moins avant l'heure de départ prévue.

Masse totale passagers : L'aéronef (Diamond DA40) impose une limite de masse totale passagers de 190 kg (pilote non inclus). Cette limite est stricte pour des raisons de sécurité aéronautique (calcul masse & centrage). Le Client est tenu de déclarer le poids de chaque passager lors de la réservation. En cas de dépassement constaté le jour du vol, Fly Horizons se réserve le droit de refuser l'embarquement sans remboursement, le Client ayant fourni des informations inexactes.

Nombre de passagers : Maximum 3 passagers par vol, sous réserve de la contrainte de masse ci-dessus.`,
  },
  {
    title: "9. Autorité du commandant de bord et comportement à bord",
    content: `Autorité du pilote : Le pilote (Commandant de Bord, CDB) dispose d'une autorité exclusive et souveraine sur toute décision liée à la sécurité du vol, notamment le décollage, l'atterrissage, l'itinéraire et le retour anticipé. Sa décision est définitive et ne peut être contestée. Les passagers s'engagent à suivre ses instructions à tout moment.

Le pilote peut modifier l'itinéraire prévu, dérouter ou annuler le vol à tout moment s'il l'estime nécessaire pour des raisons de sécurité ou de réglementation aérienne.

Comportement : Les passagers ne touchent aux commandes de l'avion qu'avec l'accord explicite du pilote, en phase de croisière et sous sa supervision directe.

Il est interdit d'introduire des substances illicites, des matières dangereuses ou des objets susceptibles de compromettre la sécurité du vol.

Tout comportement mettant en danger la sécurité du vol peut entraîner une interruption immédiate du vol aux frais du passager.`,
  },
  {
    title: "10. Annulations et politique de remboursement",
    content: `ANNULATION PAR LE CLIENT

Les vols en partage de coûts impliquent des frais fixes (réservation de l'appareil, préparation du vol) qui sont engagés indépendamment de la présence des passagers. Par conséquent, aucun remboursement en espèces n'est accordé.

Annulation avec préavis supérieur à 48 heures : Le montant payé est converti en crédit de vol (bon de vol) valable 12 mois à compter de la date d'annulation, utilisable pour toute future réservation.

Annulation entre 24 et 48 heures avant le vol : La situation est traitée au cas par cas. Le Client est invité à contacter Fly Horizons le plus tôt possible à info@fly-horizons.com pour trouver un arrangement (report ou crédit partiel). Aucune garantie de compensation n'est faite dans ce délai.

Non-présentation sans avertissement (no-show) : Si le Client ne se présente pas au vol sans avoir prévenu Fly Horizons avant l'heure du vol, aucun remboursement ni aucun crédit ne sera accordé.

Provision vol sur mesure : La provision versée lors de la confirmation d'un vol sur mesure est non remboursable, quelle que soit la raison de l'annulation par le Client.

ANNULATION OU REPORT PAR FLY HORIZONS

Conditions météorologiques : Le pilote est seul juge de la praticabilité des conditions météorologiques. Si les conditions ne permettent pas le vol en toute sécurité, le vol est annulé ou reporté. Dans ce cas, le Client reçoit un crédit de vol valable 12 mois ou la possibilité de reporter à une date convenable, selon sa préférence.

Raison technique ou administrative : En cas d'indisponibilité de l'aéronef ou d'impossibilité d'effectuer le vol pour toute raison indépendante de la volonté du Client, celui-ci bénéficie d'un report sans frais ou d'un crédit de vol.

Aucune compensation financière supplémentaire (indemnité, frais de déplacement, etc.) ne peut être réclamée à Fly Horizons dans ces situations, l'activité n'étant pas un service de transport aérien commercial.`,
  },
  {
    title: "11. Droit de rétractation",
    content: `Produits physiques (accessoires boutique) : Conformément au livre VI du Code de droit économique belge, le Client dispose d'un droit de rétractation de 14 jours calendaires à compter de la réception du colis. Le produit doit être retourné dans son état d'origine, non utilisé. Les frais de retour sont à la charge du Client. Le remboursement est effectué dans les 14 jours suivant la réception du retour.

Bons de vol (vouchers) : Le Client dispose d'un droit de rétractation de 14 jours à compter de l'achat, à condition que le bon de vol n'ait pas encore été utilisé pour initier une réservation.

Réservations de vol pour une date spécifique : Conformément à l'article VI.53, 12° du Code de droit économique belge, le droit de rétractation NE S'APPLIQUE PAS aux contrats de services liés aux activités de loisirs lorsque le contrat prévoit une date ou une période d'exécution spécifique. Une fois une réservation de vol confirmée pour une date et un horaire précis, le droit de rétractation est exclu. La politique d'annulation de l'article 10 s'applique à la place.

Pour exercer votre droit de rétractation (le cas échéant), envoyez un e-mail à info@fly-horizons.com en mentionnant votre numéro de commande et votre intention de vous rétracter.`,
  },
  {
    title: "12. Assurance et responsabilité",
    content: `Assurance : L'aéronef appartient à Air Academy New CAG (ATO-005, EBCI), école d'aviation certifiée. Leur assurance aviation couvre la responsabilité civile envers tous les occupants à bord, pilote et passagers. Il est vivement conseillé au Client de souscrire une assurance personnelle voyage ou accidents corporels pour une couverture complémentaire.

Responsabilité de Fly Horizons : Dans le cadre d'une activité de partage de coûts non commerciale, la responsabilité de Fly Horizons est limitée aux seuls dommages directs résultant d'une faute prouvée, à l'exclusion de tout dommage indirect, consécutif ou immatériel.

Force majeure : Fly Horizons ne peut être tenu responsable de l'inexécution de ses obligations en cas de force majeure, notamment : conditions météorologiques rendant le vol impossible, fermeture d'espace aérien, indisponibilité soudaine de l'aéronef, décision d'autorité (NOTAM, restriction ATC), ou toute autre circonstance indépendante de sa volonté.

Inexactitude des données passager : Si le Client a fourni des informations inexactes (notamment concernant le poids des passagers), Fly Horizons est déchargé de toute responsabilité liée aux conséquences de cette inexactitude.`,
  },
  {
    title: "13. Livraison : Produits physiques",
    content: `Les produits physiques sont expédiés par bpost vers les pays suivants : Belgique, France, Pays-Bas, Allemagne. Les frais de livraison sont calculés et affichés lors de la finalisation de la commande.

Délais indicatifs : 2 à 5 jours ouvrables selon le pays de destination. Les délais sont donnés à titre indicatif et peuvent varier. Fly Horizons ne saurait être tenu responsable des retards imputables au transporteur.

Réception : En cas de colis endommagé, le Client doit émettre des réserves auprès du livreur au moment de la réception et en informer Fly Horizons par e-mail dans les 48 heures.

Les bons de vol et réservations de vol ne font l'objet d'aucune livraison physique : la confirmation est envoyée exclusivement par e-mail.`,
  },
  {
    title: "14. Protection des données personnelles (RGPD)",
    content: `Les données personnelles collectées lors d'une commande ou d'une réservation (nom, prénom, e-mail, poids déclaré) sont utilisées exclusivement pour le traitement de la commande, la gestion de la réservation et la communication associée.

Responsable du traitement : DESTANBERG Romain, info@fly-horizons.com

Paiements : Les données bancaires sont traitées directement par Stripe et ne transitent pas par les serveurs de Fly Horizons.

Conservation : Les données sont conservées pendant la durée nécessaire à l'exécution du contrat et au respect des obligations légales (maximum 5 ans pour la comptabilité).

Droits RGPD : Conformément au Règlement (UE) 2016/679 (RGPD) et à la loi belge du 30 juillet 2018, le Client dispose d'un droit d'accès, de rectification, d'effacement, de limitation du traitement et d'opposition. Ces droits peuvent être exercés en envoyant un e-mail à info@fly-horizons.com.

Réclamation : En cas de problème non résolu, le Client peut introduire une réclamation auprès de l'Autorité de protection des données (APD) : www.autoriteprotectiondonnees.be.

Pour la politique complète de protection des données (sous-traitants, durées de conservation, cookies), consultez fly-horizons.com/politique-de-confidentialite.`,
  },
  {
    title: "15. Droit applicable et règlement des litiges",
    content: `Les présentes CGP sont soumises au droit belge, notamment au Code de droit économique (CDE/WER) et au Code civil belge.

Résolution amiable : En cas de litige, Fly Horizons et le Client s'engagent à rechercher une solution amiable en priorité. Le Client peut adresser sa réclamation à info@fly-horizons.com.

Médiation : Si aucun accord amiable n'est trouvé, le Client consommateur peut recourir au Service de Médiation pour le Consommateur (www.mediationconsommateur.be), organisme agréé en Belgique pour la résolution extrajudiciaire des litiges de consommation.

Plateforme ODR : Le Client peut également utiliser la plateforme européenne de résolution des litiges en ligne : https://ec.europa.eu/consumers/odr

Juridiction : À défaut de résolution amiable, les tribunaux compétents de Belgique seront seuls compétents pour connaître du litige.`,
  },
];

export default function CgpPage() {
  return (
    <main className="min-h-screen bg-background">

      <section className="pt-[98px] pb-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

          {/* En-tête */}
          <div className="mb-10 pt-2 sm:pt-12">
            <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-4">Légal</p>
            <h1 className="text-4xl sm:text-5xl font-black text-foreground leading-none tracking-tight mb-4">
              Conditions Générales<br />
              <span className="text-primary">de Participation</span>
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl mb-10">
              Ces conditions régissent la participation aux vols en avion léger organisés par Fly Horizons
              dans le cadre du partage de coûts (NCO.GEN.104), ainsi que l&apos;ensemble des achats effectués sur fly-horizons.com.
            </p>

            {/* Métadonnées */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden mb-4">
              {[
                { label: "Version",          value: "1.0" },
                { label: "Exploitant",       value: "DESTANBERG Romain" },
                { label: "Mise à jour",      value: "26 mai 2026" },
                { label: "Droit applicable", value: "Droit belge · EASA" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-card px-5 py-4">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-sm font-semibold text-foreground">{value}</p>
                </div>
              ))}
            </div>

            {/* Avertissement partage de coûts */}
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <p className="text-xs font-bold text-foreground uppercase tracking-[2px] mb-1">
                Activité de partage de coûts · NCO.GEN.104
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Les vols Fly Horizons sont des vols en partage de coûts au sens du règlement EASA NCO.GEN.104.
                Il ne s&apos;agit pas d&apos;un service de transport aérien commercial. Le paiement couvre la quote-part
                des frais directs du vol (carburant, aéronef, redevances).
              </p>
            </div>
          </div>

          {/* Accordéon */}
          <CgvAccordion sections={CGP_SECTIONS} />

          {/* Contact */}
          <div className="mt-8 bg-navy rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-bold text-white mb-0.5">Une question sur ces conditions ?</p>
              <p className="text-xs text-white/50">Réponse personnelle sous 24 h.</p>
            </div>
            <a
              href="/contact"
              className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-black bg-primary text-primary-foreground rounded-lg hover:brightness-105 active:scale-[0.98] transition-all shadow-gold"
            >
              Nous contacter
            </a>
          </div>

        </div>
      </section>

    </main>
  );
}
