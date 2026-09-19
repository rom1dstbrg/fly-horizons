import type { Metadata } from "next";
import { CgvAccordion } from "@/components/shop/CgvAccordion";
import { FaWhatsapp } from "react-icons/fa6";

export const metadata: Metadata = {
  title: "Politique de confidentialité · Fly Horizons",
  description:
    "Politique de confidentialité et de protection des données personnelles de Fly Horizons, conformément au Règlement Général sur la Protection des Données (RGPD).",
  robots: { index: true, follow: true },
};

const SECTIONS = [
  {
    title: "1. Responsable du traitement",
    content: `Les données personnelles collectées sur fly-horizons.com sont traitées par :

Nom : DESTANBERG Romain
Activité : Fly Horizons, vols en partage de coûts (NCO.GEN.104)
Adresse : Rue des Fusillés, 6040 Charleroi, Belgique
E-mail : info@fly-horizons.com
Site web : fly-horizons.com

Pour toute question relative à la protection de vos données, contactez-nous directement à l'adresse ci-dessus.`,
  },
  {
    title: "2. Données collectées et finalités",
    content: `Fly Horizons collecte uniquement les données nécessaires à l'exécution des services proposés.

RÉSERVATIONS DE VOL ET VOLS SUR MESURE
Données collectées : prénom, nom, adresse e-mail, numéro de téléphone (facultatif), date et heure de vol souhaitées, nombre de passagers, poids total déclaré, itinéraire (waypoints).
Finalités : traitement de la réservation, confirmation du vol, communication relative au vol (rappels, modifications, météo), sécurité aéronautique (calcul masse & centrage).
Base légale : exécution d'un contrat (art. 6.1.b RGPD).

COMMANDES BOUTIQUE
Données collectées : prénom, nom, adresse e-mail, adresse de livraison.
Finalités : traitement de la commande, expédition du colis, envoi de la confirmation et des bons de vol.
Base légale : exécution d'un contrat (art. 6.1.b RGPD).

CRÉATION DE COMPTE
Données collectées : prénom, nom, adresse e-mail, mot de passe (hashé, jamais lisible).
Finalités : authentification, accès à l'historique des réservations et commandes.
Base légale : exécution d'un contrat (art. 6.1.b RGPD).

FORMULAIRE DE CONTACT (dont candidature pilote)
Données collectées : prénom, nom, adresse e-mail, message. Pour une candidature pilote (formulaire dédié) : également téléphone, licence détenue (PPL/CPL/ATPL/autre), heures de vol totales, aéronef ou aérodrome habituel.
Finalités : répondre à votre demande ; pour une candidature, évaluer l'éligibilité avant toute activation d'un compte pilote — la candidature ne crée aucun compte ni aucun accès automatiquement.
Base légale : intérêt légitime (art. 6.1.f RGPD).

ESPACE PILOTE (compte actif)
Données collectées : prénom, nom, adresse e-mail, téléphone, numéro de licence, dates d'expiration de la licence et du certificat médical, IBAN, photo de profil, biographie courte.
Finalités : vérification de l'éligibilité à recevoir des vols, organisation des vols publiés, et — pour l'IBAN — génération du lien et du QR code de virement permettant au passager de régler directement le pilote (voir CGP, article 7). L'IBAN n'est jamais celui du Client, uniquement celui du pilote.
Base légale : exécution d'un contrat (art. 6.1.b RGPD).

VOLS PUBLIÉS PAR UN PILOTE (ANNONCES)
Lorsque vous réservez un vol publié par un pilote, vos coordonnées (prénom, nom, e-mail, téléphone, nombre de passagers) sont transmises à ce pilote afin qu'il organise le vol avec vous et reçoive votre règlement. Voir article 4 pour le détail de ce destinataire.
Base légale : exécution d'un contrat (art. 6.1.b RGPD).

MESURE D'AUDIENCE INTERNE
Données collectées : pages visitées, page d'entrée sur le site (référent), type d'appareil (mobile, tablette, ordinateur), identifiant technique aléatoire stocké dans votre navigateur pour distinguer les visites d'un même appareil.
Finalités : statistiques internes de fréquentation du site (pages consultées, appareils utilisés). Ces données ne sont jamais utilisées à des fins publicitaires ou de profilage individuel, ni transmises ou vendues à un tiers. Aucun outil tiers (Google Analytics, Meta Pixel, etc.) n'est utilisé, voir section 8.
Conservation : 13 mois glissants, puis suppression automatique.
Base légale : intérêt légitime (art. 6.1.f RGPD).

ENQUÊTE DE SATISFACTION
Données collectées : note et commentaire facultatif.
Finalités : amélioration de la qualité du service.
Base légale : intérêt légitime (art. 6.1.f RGPD).`,
  },
  {
    title: "3. Données non collectées",
    content: `Fly Horizons ne collecte pas les données suivantes concernant le Client (passager) :
- Numéro de carte bancaire : pour les achats boutique, le paiement est géré exclusivement par Stripe, qui traite ces données directement selon ses propres standards de sécurité (PCI-DSS).
- IBAN du Client : jamais demandé ni collecté. Seul l'IBAN du pilote publiant un vol est enregistré (voir article 2, « Espace pilote »), afin de permettre au Client de le régler directement par virement.
- Données de santé détaillées : seule une mention d'une contre-indication éventuelle au vol peut être signalée librement par le passager dans le champ commentaire.
- Données de géolocalisation en dehors des waypoints choisis volontairement par le client pour un vol sur mesure.
- Données de navigation à des fins publicitaires ou de profilage : aucun outil de tracking tiers (Google Analytics, Meta Pixel, etc.) n'est installé sur ce site. Une mesure d'audience strictement interne existe néanmoins, décrite aux sections 2 et 8.`,
  },
  {
    title: "4. Destinataires des données",
    content: `Vos données ne sont jamais vendues ni cédées à des tiers à des fins commerciales. Elles peuvent être transmises aux destinataires suivants, dans le strict cadre de leur mission :

Le pilote publiant le vol réservé : lorsque vous réservez un vol publié par un pilote (annonce), vos prénom, nom, e-mail, téléphone et nombre de passagers lui sont transmis afin qu'il organise le vol et reçoive votre règlement directement (voir CGP, article 7). Le pilote traite ces données pour son propre compte, dans le cadre de l'organisation du vol.

Stripe (stripe.com) : traitement des paiements en ligne pour les achats boutique. Données transmises : e-mail, montant, identifiant de commande. Stripe est certifié PCI-DSS niveau 1.

Supabase (supabase.com) : hébergement de la base de données. Les données sont stockées sur des serveurs situés en Europe (région EU-West).

Resend (resend.com) : envoi des e-mails transactionnels (confirmations, bons de vol, rappels). Données transmises : prénom, nom, e-mail, contenu de l'e-mail.

Anthropic (anthropic.com) : si vous utilisez l'assistant de conversation (chat) du site, le contenu de vos messages est transmis à Anthropic (modèle Claude) pour générer une réponse. N'y indiquez pas de données que vous ne souhaitez pas transmettre à ce prestataire.

Ces prestataires agissent en tant que sous-traitants au sens du RGPD. Ils s'engagent contractuellement à traiter vos données uniquement sur instruction de Fly Horizons et à mettre en place les mesures de sécurité appropriées.

Aucune donnée n'est transférée hors de l'Espace Économique Européen, à l'exception des services ci-dessus dont les sièges sont aux États-Unis mais qui disposent de garanties adéquates (clauses contractuelles types ou cadre EU-US Data Privacy Framework).`,
  },
  {
    title: "5. Durée de conservation",
    content: `Les données personnelles sont conservées pour la durée strictement nécessaire aux finalités pour lesquelles elles ont été collectées :

Données de réservation et de vol : 5 ans à compter de la date du vol (obligation comptable et légale).

Données de commande boutique : 5 ans à compter de la commande (obligation comptable).

Données de compte utilisateur : jusqu'à la suppression du compte par l'utilisateur ou, en l'absence d'activité, 3 ans après la dernière connexion.

Données de profil pilote (licence, certificat médical, IBAN, photo, bio) : conservées pendant la durée d'activité du compte pilote, supprimées ou anonymisées à la désactivation du compte, sous réserve des obligations comptables (5 ans).

Données de contact (formulaire) et de candidature pilote : 2 ans à compter de la dernière interaction.

Enquêtes de satisfaction : données anonymisées après 1 an.

À l'expiration de ces délais, les données sont supprimées ou anonymisées de façon irréversible.`,
  },
  {
    title: "6. Vos droits",
    content: `Conformément au Règlement (UE) 2016/679 (RGPD) et à la loi belge du 30 juillet 2018 relative à la protection des personnes physiques à l'égard des traitements de données à caractère personnel, vous disposez des droits suivants :

Droit d'accès (art. 15 RGPD) : obtenir la confirmation que des données vous concernant sont traitées et en recevoir une copie.

Droit de rectification (art. 16 RGPD) : faire corriger des données inexactes ou incomplètes.

Droit à l'effacement (art. 17 RGPD) : demander la suppression de vos données, dans les limites des obligations légales de conservation.

Droit à la limitation du traitement (art. 18 RGPD) : demander la suspension du traitement de vos données dans certains cas.

Droit à la portabilité (art. 20 RGPD) : recevoir vos données dans un format structuré et lisible par machine.

Droit d'opposition (art. 21 RGPD) : vous opposer à un traitement fondé sur l'intérêt légitime.

Pour exercer l'un de ces droits, envoyez un e-mail à info@fly-horizons.com en précisant votre identité et la nature de votre demande. Une réponse vous sera apportée dans un délai maximum d'un mois.`,
  },
  {
    title: "7. Sécurité des données",
    content: `Fly Horizons met en œuvre les mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, altération, divulgation ou destruction :

- Connexion chiffrée HTTPS (TLS) sur l'ensemble du site.
- Mots de passe utilisateurs hashés (bcrypt) via Supabase Auth, jamais stockés en clair.
- Numéro de carte bancaire du Client jamais stocké sur les serveurs de Fly Horizons (délégation complète à Stripe pour les achats boutique). L'IBAN d'un pilote est stocké en base sous accès verrouillé (voir point suivant), et n'est jamais transmis à un Client autrement que via le lien/QR de virement de son propre vol.
- Accès à la base de données restreint via Row Level Security (RLS) de Supabase : les tables sensibles (réservations, données pilotes, y compris IBAN) sont inaccessibles avec la clé publique du site, seul le serveur peut y accéder.
- Tokens de paiement à usage unique et expiration automatique.
- Accès administrateur protégé par authentification forte.`,
  },
  {
    title: "8. Cookies et mesure d'audience",
    content: `Le site fly-horizons.com utilise des cookies strictement nécessaires au fonctionnement du service, ainsi qu'un identifiant technique de mesure d'audience interne :

Cookie de session : utilisé pour maintenir votre connexion à votre compte. Durée : session (supprimé à la fermeture du navigateur) ou 30 jours si vous cochez « rester connecté ».

Identifiant de mesure d'audience : un identifiant aléatoire est stocké dans le stockage local de votre navigateur (localStorage), et non dans un cookie à proprement parler, afin de distinguer les visites d'un même appareil sur les pages du site. Il permet uniquement d'établir des statistiques internes de fréquentation (pages consultées, type d'appareil), voir section 2. Il n'est ni partagé ni vendu à un tiers, et n'est jamais utilisé à des fins publicitaires ou de profilage. Ces données sont conservées 13 mois glissants puis supprimées automatiquement.

Aucun cookie publicitaire, aucun outil tiers de suivi ou d'analyse comportementale (Google Analytics, Facebook Pixel, Hotjar, etc.) n'est utilisé sur ce site.

Vous pouvez à tout moment supprimer les cookies et le stockage local via les paramètres de votre navigateur. La suppression du cookie de session entraîne la déconnexion de votre compte ; la suppression du stockage local génère un nouvel identifiant de mesure d'audience lors de votre prochaine visite.`,
  },
  {
    title: "9. Réclamations",
    content: `Si vous estimez que le traitement de vos données personnelles par Fly Horizons ne respecte pas la réglementation applicable, vous avez le droit d'introduire une réclamation auprès de l'autorité de contrôle compétente :

Autorité de protection des données (APD), Belgique
Site web : www.autoriteprotectiondonnees.be
Adresse : Rue de la Presse 35, 1000 Bruxelles
Tél. : +32 2 274 48 00

Cette démarche est gratuite et sans préjudice de tout autre recours administratif ou juridictionnel.`,
  },
  {
    title: "10. Conditions générales de participation",
    content: `La présente politique de confidentialité est distincte des Conditions Générales de Participation (CGP) qui régissent les contrats de vols et d'achat de produits.

Les CGP précisent notamment les conditions d'annulation, de remboursement, les règles de participation aux vols et les obligations des passagers.

Pour consulter les Conditions Générales de Participation : fly-horizons.com/cgp.`,
  },
  {
    title: "12. Modifications de la politique",
    content: `La présente politique de confidentialité peut être mise à jour pour refléter des évolutions légales ou des changements dans les services proposés.

La date de dernière mise à jour est indiquée en haut de cette page. En cas de modification substantielle, une information sera envoyée par e-mail aux utilisateurs disposant d'un compte actif.

Il vous est conseillé de consulter régulièrement cette page.`,
  },
];

export default function PolitiqueConfidentialitePage() {
  return (
    <main className="min-h-screen bg-background">

      <section className="pt-[98px] pb-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

          {/* En-tête */}
          <div className="mb-10 pt-2 sm:pt-12">
            <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-4">Légal · RGPD</p>
            <h1 className="text-4xl sm:text-5xl font-black text-foreground leading-none tracking-tight mb-4">
              Politique de<br />
              <span className="text-primary">confidentialité</span>
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl mb-10">
              Fly Horizons s&apos;engage à protéger vos données personnelles conformément au Règlement
              Général sur la Protection des Données (RGPD, Règlement UE 2016/679) et à la loi belge
              du 30 juillet 2018.
            </p>

            {/* Métadonnées */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden mb-4">
              {[
                { label: "Version",             value: "1.1" },
                { label: "Responsable",         value: "DESTANBERG Romain" },
                { label: "Mise à jour",         value: "19 septembre 2026" },
                { label: "Droit applicable",    value: "RGPD · Loi belge 2018" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-card px-5 py-4">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-sm font-semibold text-foreground">{value}</p>
                </div>
              ))}
            </div>

            {/* Note introductive */}
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <p className="text-xs font-bold text-foreground uppercase tracking-[2px] mb-1">
                Activité non commerciale
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Fly Horizons est une activité de partage de coûts aéronautiques exercée à titre
                personnel, sans entreprise ni numéro de TVA. Les données collectées servent
                exclusivement à l&apos;organisation et à la sécurité des vols.
              </p>
            </div>
          </div>

          {/* Accordéon */}
          <CgvAccordion sections={SECTIONS} />

          {/* Contact */}
          <div className="mt-8 bg-navy rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-bold text-white mb-0.5">Une question sur vos données ?</p>
              <p className="text-xs text-white/50">Envoyez un e-mail à info@fly-horizons.com, réponse sous 48 h.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="https://wa.me/32472324135"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold bg-[#25D366] text-white rounded-lg hover:bg-[#1ebe5d] transition-colors"
              >
                <FaWhatsapp size={15} />
                WhatsApp
              </a>
              <a
                href="mailto:info@fly-horizons.com"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-black bg-primary text-primary-foreground rounded-lg hover:brightness-105 active:scale-[0.98] transition-all shadow-gold"
              >
                Nous contacter
              </a>
            </div>
          </div>

        </div>
      </section>

    </main>
  );
}
