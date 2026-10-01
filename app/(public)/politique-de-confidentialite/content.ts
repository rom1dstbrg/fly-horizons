import type { LegalSection } from "@/components/legal/LegalDoc";

// Politique de confidentialité, version 2.0 (01/10/2026).
// Refonte du fond : retirés boutique/livraison, bons de vol, vol sur mesure ; ajoutés ce que le site fait réellement
// et que l'ancienne version taisait (newsletter, conversations de l'assistant, fils de messages, hébergeur, cartes tierces).
// À garder alignée avec le code : AnalyticsTracker/`/api/track`, `chat_sessions`, `newsletter_subscribers`, cron purge-analytics.

export const PRIVACY_META = ["Version 2.0", "Mise à jour le 1er octobre 2026", "RGPD, loi belge du 30 juillet 2018"];

export const PRIVACY_NOTICE = {
  title: "Ce que nous ne faisons pas",
  text:
    "Nous ne vendons pas vos données, nous n'utilisons aucun outil publicitaire ni aucun outil de suivi tiers (Google Analytics, Meta Pixel, etc.), et nous ne collectons jamais votre numéro de carte bancaire. Fly Horizons est une initiative de partage de frais exercée sans entreprise ni numéro de TVA : les données servent à organiser et sécuriser les vols.",
};

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: "responsable",
    title: "Responsable du traitement",
    short: "Responsable",
    blocks: [
      "Les données personnelles collectées sur fly-horizons.com sont traitées par **DESTANBERG Romain**, Rue des Fusillés, 6040 Charleroi, Belgique. Contact : [info@fly-horizons.com](mailto:info@fly-horizons.com).",
      "Quand vous rejoignez un vol publié par un pilote, ce pilote reçoit vos coordonnées et les traite, pour son propre compte, afin d'organiser le vol avec vous (voir l'article 4).",
    ],
  },
  {
    id: "donnees",
    title: "Données collectées et finalités",
    short: "Données collectées",
    blocks: [
      "Nous collectons uniquement ce qui est nécessaire au service. Pour chaque usage, voici ce que nous collectons, pourquoi, et sur quelle base légale.",
      "**Demande de vol.** Prénom, nom, email, téléphone, date souhaitée, nombre de passagers, poids déclaré des passagers, message au pilote. Finalités : traiter votre demande, confirmer le vol, vous écrire à son sujet (confirmation, rappels, changement de créneau, météo), et permettre au pilote de calculer la masse et le centrage de l'avion. Base légale : exécution d'un contrat (art. 6.1.b RGPD).",
      "**Compte client (facultatif).** Prénom, nom, email, mot de passe (stocké chiffré, jamais lisible). Finalités : vous authentifier et vous donner accès à vos demandes. Base légale : exécution d'un contrat.",
      "**Échanges.** Les messages que vous échangez avec votre pilote ou avec nous, depuis les pages de messages liées à votre vol ou à votre demande de contact. Finalité : répondre et organiser le vol. Base légale : exécution d'un contrat, ou intérêt légitime (art. 6.1.f) pour une demande de contact.",
      "**Formulaire de contact et candidature pilote.** Prénom, nom, email, message. Pour une candidature pilote : aussi téléphone, licence détenue, heures de vol, avion ou aérodrome habituel. Finalités : répondre à votre demande, ou évaluer votre candidature ; une candidature ne crée aucun compte automatiquement. Base légale : intérêt légitime.",
      "**Espace pilote (compte actif).** Prénom, nom, email, téléphone, numéro de licence, dates d'expiration de la licence et du certificat médical, IBAN, photo de profil, courte biographie. Finalités : vérifier l'éligibilité à publier des vols, organiser ces vols et générer le lien et le QR code de virement par lequel le passager règle directement le pilote. L'IBAN affiché est toujours celui du pilote, jamais celui du passager. Base légale : exécution d'un contrat.",
      "**Newsletter (facultative).** Email et prénom, après votre consentement explicite (case à cocher). Finalité : vous prévenir quand un vol est disponible. Vous pouvez vous désinscrire à tout moment depuis le lien présent dans chaque envoi. Base légale : consentement (art. 6.1.a).",
      "**Assistant de conversation.** Si vous utilisez l'assistant du site, vos messages et les réponses sont enregistrés et transmis à Anthropic pour générer les réponses (voir l'article 4). N'y indiquez pas de données que vous ne souhaitez pas communiquer. Base légale : intérêt légitime (répondre à vos questions, améliorer l'assistant).",
      "**Mesure d'audience interne.** Pages visitées, page d'entrée sur le site (référent), type d'appareil (mobile, tablette, ordinateur) et identifiant technique aléatoire stocké dans votre navigateur, pour distinguer les visites d'un même appareil. Finalité : statistiques internes de fréquentation, jamais de publicité ni de profilage. Conservation : 13 mois glissants, puis suppression automatique. Base légale : intérêt légitime.",
      "**Avis après vol.** Une note et un commentaire facultatif, pour améliorer le service. Base légale : intérêt légitime.",
    ],
  },
  {
    id: "non-collectees",
    title: "Données que nous ne collectons pas",
    short: "Non collectées",
    blocks: [
      {
        ul: [
          "**Numéro de carte bancaire.** Le paiement d'un vol se fait par virement ou en espèces, directement au pilote : nous n'en collectons ni n'en stockons aucune donnée bancaire.",
          "**IBAN du passager.** Jamais demandé. Seul l'IBAN du pilote qui publie un vol est enregistré.",
          "**Données de santé détaillées.** Seule une éventuelle contre-indication que vous signalez librement dans votre message est conservée avec votre demande.",
          "**Géolocalisation.** Nous ne collectons pas votre position.",
          "**Données publicitaires ou de profilage.** Aucun outil de suivi tiers n'est installé sur le site. La seule mesure d'audience est celle, interne, décrite à l'article 2.",
        ],
      },
    ],
  },
  {
    id: "destinataires",
    title: "Destinataires des données",
    short: "Destinataires",
    blocks: [
      "Vos données ne sont jamais vendues ni cédées à des fins commerciales. Elles peuvent être transmises, dans le strict cadre de leur mission, aux destinataires suivants :",
      {
        ul: [
          "**Le pilote du vol que vous rejoignez.** Il reçoit vos prénom, nom, email, téléphone et nombre de passagers pour organiser le vol et recevoir votre règlement. Il les traite pour son propre compte, dans ce seul but.",
          "**Supabase** (supabase.com) : hébergement de la base de données, sur des serveurs situés en Europe.",
          "**Vercel** (vercel.com) : hébergement et diffusion du site.",
          "**Resend** (resend.com) : envoi des emails (confirmations, rappels, messages). Données transmises : prénom, nom, email, contenu de l'email.",
          "**Anthropic** (anthropic.com) : uniquement si vous utilisez l'assistant de conversation. Le contenu de vos messages lui est transmis pour générer une réponse.",
          "**Stripe** (stripe.com) : uniquement dans le cas exceptionnel où un lien de paiement par carte vous est envoyé. Stripe traite alors directement vos données bancaires.",
          "**Fournisseurs de cartes.** Les pages Contact et Accès à l'aérodrome intègrent une carte Google Maps, et les cartes d'itinéraire utilisent des fonds de carte tiers (Esri, CARTO, OpenFlightMaps). Charger ces cartes transmet votre adresse IP à ces fournisseurs, qui peuvent aussi y déposer leurs propres cookies.",
        ],
      },
      "Nos prestataires agissent comme sous-traitants au sens du RGPD : ils traitent vos données sur notre instruction et avec des mesures de sécurité appropriées. Certains ont leur siège aux États-Unis et s'appuient sur des garanties adéquates (clauses contractuelles types ou cadre de protection des données UE-États-Unis).",
    ],
  },
  {
    id: "conservation",
    title: "Durée de conservation",
    short: "Conservation",
    blocks: [
      "Nous conservons vos données le temps nécessaire aux finalités ci-dessus, puis nous les supprimons ou les anonymisons de façon irréversible :",
      {
        ul: [
          "**Demandes et vols :** 5 ans à compter de la date du vol (obligations comptables et légales).",
          "**Compte client :** jusqu'à sa suppression par vous ou, sans activité, 3 ans après la dernière connexion.",
          "**Profil pilote** (licence, certificat médical, IBAN, photo, biographie) : pendant l'activité du compte, puis supprimé ou anonymisé à sa désactivation, sous réserve des obligations comptables (5 ans).",
          "**Contact et candidatures pilote :** 2 ans après la dernière interaction.",
          "**Newsletter :** jusqu'à votre désinscription.",
          "**Conversations avec l'assistant :** conservées jusqu'à leur suppression ; vous pouvez en demander l'effacement à tout moment.",
          "**Mesure d'audience :** 13 mois glissants.",
          "**Avis après vol :** anonymisés après 1 an.",
        ],
      },
    ],
  },
  {
    id: "droits",
    title: "Vos droits",
    blocks: [
      "Conformément au règlement (UE) 2016/679 (RGPD) et à la loi belge du 30 juillet 2018, vous disposez des droits suivants :",
      {
        ul: [
          "**Accès** (art. 15) : savoir si nous traitons des données vous concernant et en recevoir une copie.",
          "**Rectification** (art. 16) : faire corriger des données inexactes ou incomplètes.",
          "**Effacement** (art. 17) : demander la suppression de vos données, dans les limites de nos obligations légales de conservation.",
          "**Limitation** (art. 18) : demander la suspension du traitement dans certains cas.",
          "**Portabilité** (art. 20) : recevoir vos données dans un format structuré et lisible par machine.",
          "**Opposition** (art. 21) : vous opposer à un traitement fondé sur l'intérêt légitime.",
          "**Retrait du consentement** à tout moment, par exemple pour la newsletter.",
        ],
      },
      "Pour exercer un droit, écrivez à [info@fly-horizons.com](mailto:info@fly-horizons.com) en précisant votre identité et votre demande. Nous répondons dans un délai maximum d'un mois.",
    ],
  },
  {
    id: "securite",
    title: "Sécurité",
    blocks: [
      "Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données :",
      {
        ul: [
          "Connexion chiffrée HTTPS sur tout le site.",
          "Mots de passe stockés chiffrés (hachés) par Supabase Auth, jamais en clair.",
          "Aucune donnée de carte bancaire sur nos serveurs. L'IBAN d'un pilote est stocké en base sous accès restreint et n'est montré à un passager que sur la page de paiement de son propre vol.",
          "Base de données protégée par des règles d'accès par ligne (Row Level Security) : les tables sensibles, dont les données des pilotes, ne sont pas accessibles avec la clé publique du site, seul notre serveur y accède.",
          "Liens de paiement à usage unique, avec expiration automatique.",
          "Accès administrateur protégé par authentification.",
        ],
      },
    ],
  },
  {
    id: "cookies",
    title: "Cookies et stockage local",
    short: "Cookies",
    blocks: [
      "Nous n'utilisons que ce qui est nécessaire au fonctionnement du site :",
      {
        ul: [
          "**Cookie de session :** maintient votre connexion à votre compte. Il dure le temps de la session, ou 30 jours si vous cochez « rester connecté ».",
          "**Identifiant de mesure d'audience :** un identifiant aléatoire stocké dans le stockage local de votre navigateur (et non dans un cookie), pour distinguer les visites d'un même appareil. Il sert uniquement à nos statistiques internes (article 2), n'est ni partagé ni vendu, et ses données sont supprimées après 13 mois.",
        ],
      },
      "Nous n'utilisons aucun cookie publicitaire ni outil de suivi comportemental. Les cartes intégrées de tiers (article 4) peuvent, elles, déposer leurs propres cookies lors de leur chargement.",
      "Vous pouvez supprimer cookies et stockage local depuis les paramètres de votre navigateur. Supprimer le cookie de session vous déconnecte ; supprimer le stockage local crée un nouvel identifiant d'audience à votre prochaine visite.",
    ],
  },
  {
    id: "reclamations",
    title: "Réclamations",
    blocks: [
      "Si vous estimez que le traitement de vos données ne respecte pas la réglementation, vous pouvez introduire une réclamation, gratuitement, auprès de l'autorité de contrôle :",
      "**Autorité de protection des données (APD)**, Rue de la Presse 35, 1000 Bruxelles. Tél. : +32 2 274 48 00. Site : [www.autoriteprotectiondonnees.be](https://www.autoriteprotectiondonnees.be). Cette démarche est sans préjudice de tout autre recours.",
    ],
  },
  {
    id: "cgp",
    title: "Conditions générales de participation",
    short: "CGP",
    blocks: [
      "Cette politique est distincte de nos [conditions générales de participation](/cgp), qui précisent les règles de participation aux vols, de paiement, de report et d'annulation.",
    ],
  },
  {
    id: "modifications",
    title: "Modifications de la politique",
    short: "Modifications",
    blocks: [
      "Cette politique peut être mise à jour pour refléter des évolutions légales ou des changements du service. La date de dernière mise à jour est indiquée en haut de la page. En cas de modification importante, les utilisateurs disposant d'un compte actif sont informés par email.",
    ],
  },
];
