import type { LegalSection } from "@/components/legal/LegalDoc";

// Conditions générales de participation, version 2.0 (01/10/2026).
// Refonte du fond : l'offre est celle de la FAQ (vols publiés par des pilotes, demande puis confirmation,
// règlement direct au pilote). Retirés : boutique et livraison, bons de vol, vol sur mesure, crédit de vol,
// avion et limite de masse d'un seul appareil. À garder alignées avec la FAQ (`app/(public)/faq/page.tsx`).

export const CGP_META = ["Version 2.0", "Mise à jour le 1er octobre 2026", "Droit belge, règlement EASA"];

export const CGP_NOTICE = {
  title: "Partage de frais, pas transport commercial",
  text:
    "Les vols proposés sur Fly Horizons sont des vols de pilotes privés en **partage de frais**, au sens du règlement EASA (UE) n° 965/2012, article NCO.GEN.104. Ce n'est pas un service de transport aérien commercial. Votre paiement couvre votre part des frais directs du vol (avion, carburant, taxes d'aérodrome). Le pilote paie aussi sa part et ne perçoit aucune rémunération pour son pilotage.",
};

export const CGP_SECTIONS: LegalSection[] = [
  {
    id: "identification",
    title: "Qui est Fly Horizons",
    short: "Fly Horizons",
    blocks: [
      "Le site fly-horizons.com est exploité par **DESTANBERG Romain**, Rue des Fusillés, 6040 Charleroi, Belgique. Contact : [info@fly-horizons.com](mailto:info@fly-horizons.com).",
      "Fly Horizons met en relation des pilotes privés et des passagers pour des vols en partage de frais. Nous ne sommes ni l'exploitant des vols ni un transporteur aérien : chaque pilote reste seul commandant de bord et seul responsable de la préparation, de la conduite et de la sécurité de son vol.",
      "Fly Horizons ne perçoit aucune commission sur les vols et n'encaisse à aucun moment votre participation aux frais : elle est versée directement au pilote (voir l'article 5).",
    ],
  },
  {
    id: "champ",
    title: "Champ d'application",
    short: "Champ d'application",
    blocks: [
      "Les présentes conditions générales de participation (CGP) s'appliquent à toute demande de vol et à toute participation à un vol publié sur fly-horizons.com, par une personne physique non professionnelle (le « Passager »).",
      "En envoyant une demande, vous reconnaissez avoir pris connaissance des CGP et les acceptez. Les CGP applicables sont celles en vigueur au moment de votre demande.",
    ],
  },
  {
    id: "pilotes",
    title: "Les pilotes",
    blocks: [
      "Les vols sont publiés par des pilotes privés licenciés. Avant de pouvoir publier un vol, chaque pilote nous transmet sa licence et son certificat médical, que nous vérifions. Son profil est accessible depuis la fiche de chaque vol.",
      "Le pilote décide seul de son vol : date, heure, itinéraire, faisabilité, météo. Il accepte ou décline chaque demande selon ses disponibilités et la sécurité. Fly Horizons n'intervient pas dans la conduite du vol.",
    ],
  },
  {
    id: "demande",
    title: "Faire une demande de vol",
    short: "Demande de vol",
    blocks: [
      "Sur la page [Les vols](/nos-offres), vous choisissez un vol publié par un pilote, une date parmi ses disponibilités, le nombre de passagers, puis vous envoyez votre demande avec vos coordonnées. **Aucun paiement n'est demandé à ce stade.**",
      "Une demande doit être faite au moins 48 heures avant le vol. Elle ne constitue ni une réservation ferme ni un engagement : vous rejoignez le vol une fois la demande acceptée par le pilote, qui répond dans un délai maximum de 72 heures. Vous recevez alors un email de confirmation.",
      "Le pilote peut vous proposer un autre créneau si celui demandé ne convient pas. L'heure précise de décollage peut être ajustée dans les jours qui précèdent le vol, selon la météo.",
      "La durée annoncée est indicative. Selon le vol, le prix est donné pour l'avion entier ou par place. Pour un vol vendu à la place, les frais sont partagés à parts égales entre les passagers réellement à bord : si toutes les places ne sont pas prises, le pilote clôture le groupe et la part de chacun est recalculée. **Vous connaissez toujours le montant définitif avant de payer.**",
      "Fly Horizons et le pilote peuvent refuser une demande sans avoir à se justifier, tant que le paiement n'a pas été confirmé.",
    ],
  },
  {
    id: "paiement",
    title: "Participation aux frais et paiement",
    short: "Paiement",
    blocks: [
      "Les montants sont exprimés en euros. Ils représentent votre quote-part des frais directs du vol, taxes d'aérodrome comprises, sans marge commerciale. Il n'y a aucun frais supplémentaire à régler après le vol.",
      "**Quand payer.** Uniquement une fois votre demande confirmée par le pilote. Vous recevez par email un lien vers une page de paiement avec le montant, l'IBAN du pilote et un QR code de virement SEPA pré-rempli.",
      "**Comment payer.** Par virement bancaire, directement au pilote. Si le pilote l'accepte, le paiement en espèces est possible : convenez-en avec lui après la confirmation. Le paiement par carte n'est pas proposé.",
      "Le pilote vous remet un reçu. Le vol est définitivement validé à la réception du paiement par le pilote.",
      "Fly Horizons n'est pas partie au paiement : la somme ne transite jamais par nous.",
    ],
  },
  {
    id: "participation",
    title: "Conditions de participation",
    short: "Participation",
    blocks: [
      "Pour participer à un vol, vous devez respecter les conditions suivantes :",
      {
        ul: [
          "**Santé.** Être en bonne santé générale. Toute affection pouvant être aggravée par le vol (problème cardiaque, épilepsie, claustrophobie sévère, grossesse avancée, mobilité réduite) doit être signalée avant le vol. Le pilote peut refuser un passager dont l'état de santé présenterait un risque.",
          "**Alcool et substances.** Il est interdit de se présenter au vol sous l'influence de l'alcool ou d'une substance altérant les facultés, et de consommer de l'alcool dans les 8 heures qui précèdent le vol.",
          "**Mineurs.** Un mineur doit être accompagné d'un parent ou d'un tuteur légal, présent et d'accord. Un mineur ne peut pas embarquer seul.",
          "**Ponctualité.** Être présent à l'aérodrome au moins 15 minutes avant l'heure de départ prévue.",
          "**Masse.** Chaque avion a ses limites de masse et de centrage, que le pilote calcule avant le vol. Il peut vous demander le poids approximatif de chaque passager. Si les informations fournies sont inexactes et qu'un dépassement est constaté le jour du vol, le pilote peut refuser l'embarquement, sans remboursement.",
          "**Nombre de passagers.** Il est indiqué sur chaque vol et dépend de l'avion.",
        ],
      },
    ],
  },
  {
    id: "bord",
    title: "Commandant de bord et comportement à bord",
    short: "À bord",
    blocks: [
      "Le pilote, commandant de bord, a une autorité exclusive sur toute décision liée à la sécurité du vol : décollage, atterrissage, itinéraire, retour anticipé. Sa décision est définitive. Les passagers suivent ses instructions à tout moment.",
      "Il peut modifier l'itinéraire prévu, dérouter ou annuler le vol à tout moment s'il l'estime nécessaire pour des raisons de sécurité ou de réglementation aérienne.",
      "Les passagers ne touchent aux commandes qu'avec l'accord explicite du pilote. Il est interdit d'introduire des substances illicites, des matières dangereuses ou tout objet pouvant compromettre la sécurité. Un comportement mettant en danger le vol peut entraîner son interruption immédiate, aux frais du passager.",
    ],
  },
  {
    id: "annulation",
    title: "Report, annulation et remboursement",
    short: "Annulation",
    blocks: [
      "**Report par vous.** Reporter votre vol est gratuit jusqu'à 48 heures avant le vol : [contactez-nous](/contact) ou répondez à l'email de confirmation.",
      "**Annulation par vous.** Prévenez-nous le plus tôt possible. Votre paiement ayant été fait directement au pilote, un éventuel remboursement se règle avec lui ; nous restons votre interlocuteur pour l'organiser. À moins de 48 heures du vol, ou en cas d'absence sans prévenir, aucune compensation n'est garantie.",
      "**Météo.** Le pilote est seul juge de la praticabilité des conditions météorologiques, parfois le jour même. Si elles ne permettent pas de voler en sécurité, le vol est reporté sans frais et le pilote vous propose un nouveau créneau par email.",
      "**Indisponibilité du pilote ou de l'avion.** Si le vol ne peut pas avoir lieu pour une raison indépendante de votre volonté, il est reporté sans frais. Si aucun nouveau créneau ne vous convient, contactez-nous : nous cherchons une solution avec le pilote, y compris, le cas échéant, le remboursement des sommes déjà versées.",
      "Aucune indemnité supplémentaire (frais de déplacement, etc.) ne peut être réclamée à Fly Horizons ou au pilote dans ces situations : il s'agit d'un vol privé en partage de frais, pas d'un transport commercial.",
    ],
  },
  {
    id: "retractation",
    title: "Droit de rétractation",
    short: "Rétractation",
    blocks: [
      "Conformément à l'article VI.53, 12° du Code de droit économique belge, le droit de rétractation **ne s'applique pas** aux services de loisirs lorsque le contrat prévoit une date ou une période d'exécution spécifique. Une fois votre vol confirmé pour une date précise, ce droit est donc exclu : les règles de report et d'annulation de l'article 8 s'appliquent à la place.",
    ],
  },
  {
    id: "assurance",
    title: "Assurance et responsabilité",
    short: "Assurance",
    blocks: [
      "Chaque avion vole sous sa propre assurance aviation, qui couvre la responsabilité civile envers les passagers. Votre pilote vous en donne le détail sur demande. Nous vous conseillons de souscrire une assurance individuelle accident pour une couverture complémentaire.",
      "Fly Horizons n'étant pas l'exploitant des vols, sa responsabilité est limitée aux dommages directs résultant d'une faute prouvée de sa part, à l'exclusion de tout dommage indirect, consécutif ou immatériel. Chaque pilote répond de son vol.",
      "**Force majeure.** Ni Fly Horizons ni le pilote ne sont responsables de l'inexécution d'un vol en cas de force majeure : météo, fermeture d'espace aérien, indisponibilité soudaine de l'avion, décision d'une autorité (NOTAM, restriction ATC) ou toute circonstance indépendante de leur volonté.",
      "**Informations inexactes.** Si vous avez fourni des informations inexactes, notamment sur le poids des passagers, Fly Horizons et le pilote sont déchargés des conséquences de cette inexactitude.",
    ],
  },
  {
    id: "echanges",
    title: "Compte et échanges",
    blocks: [
      "Un compte n'est pas nécessaire : tout se passe par email. Si vous créez un compte avec la même adresse email, vous retrouvez vos demandes et leur statut dans Mes réservations.",
      "Les échanges avec votre pilote et avec nous passent par des pages de messages liées à votre vol ou à votre demande, accessibles depuis les emails que vous recevez. Vos coordonnées sont transmises au pilote dont vous rejoignez le vol, pour qu'il l'organise avec vous.",
    ],
  },
  {
    id: "donnees",
    title: "Données personnelles",
    blocks: [
      "Vos données servent à traiter votre demande, organiser le vol et communiquer avec vous. Le responsable du traitement est DESTANBERG Romain (adresse ci-dessus). Vous pouvez exercer vos droits d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition par email à [info@fly-horizons.com](mailto:info@fly-horizons.com).",
      "Le détail (données collectées, destinataires, durées de conservation, cookies) est dans notre [politique de confidentialité](/politique-de-confidentialite). En cas de problème non résolu, vous pouvez introduire une réclamation auprès de l'Autorité de protection des données : [www.autoriteprotectiondonnees.be](https://www.autoriteprotectiondonnees.be).",
    ],
  },
  {
    id: "litiges",
    title: "Droit applicable et litiges",
    blocks: [
      "Les présentes CGP sont soumises au droit belge, notamment au Code de droit économique et au Code civil.",
      "**Solution amiable.** En cas de litige, nous recherchons d'abord une solution amiable : écrivez-nous à [info@fly-horizons.com](mailto:info@fly-horizons.com).",
      "**Médiation.** À défaut d'accord, vous pouvez recourir au [Service de médiation pour le consommateur](https://www.mediationconsommateur.be), ou à la [plateforme européenne de règlement en ligne des litiges](https://ec.europa.eu/consumers/odr).",
      "**Juridiction.** À défaut de résolution amiable, les tribunaux belges sont seuls compétents.",
    ],
  },
  {
    id: "modifications",
    title: "Modification des conditions",
    short: "Modifications",
    blocks: [
      "Nous pouvons faire évoluer ces CGP. La date de dernière mise à jour est indiquée en haut de cette page, et la version applicable à une demande est celle en vigueur le jour où vous l'envoyez.",
    ],
  },
];
