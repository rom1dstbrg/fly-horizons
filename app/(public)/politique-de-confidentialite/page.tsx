import type { Metadata } from "next";
import { CgvAccordion } from "@/components/shop/CgvAccordion";

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

FORMULAIRE DE CONTACT
Données collectées : prénom, nom, adresse e-mail, message.
Finalités : répondre à votre demande.
Base légale : intérêt légitime (art. 6.1.f RGPD).

ENQUÊTE DE SATISFACTION
Données collectées : note et commentaire facultatif.
Finalités : amélioration de la qualité du service.
Base légale : intérêt légitime (art. 6.1.f RGPD).`,
  },
  {
    title: "3. Données non collectées",
    content: `Fly Horizons ne collecte pas les données suivantes :
- Données bancaires (numéro de carte, IBAN) : le paiement est géré exclusivement par Stripe, qui traite ces données directement selon ses propres standards de sécurité (PCI-DSS).
- Données de santé détaillées : seule une mention d'une contre-indication éventuelle au vol peut être signalée librement par le passager dans le champ commentaire.
- Données de géolocalisation en dehors des waypoints choisis volontairement par le client pour un vol sur mesure.
- Données de navigation ou cookies de traçage publicitaire : aucun outil de tracking tiers (Google Analytics, Meta Pixel, etc.) n'est installé sur ce site.`,
  },
  {
    title: "4. Destinataires des données",
    content: `Vos données ne sont jamais vendues ni cédées à des tiers à des fins commerciales. Elles peuvent être transmises aux sous-traitants techniques suivants, dans le strict cadre de leur mission :

Stripe (stripe.com) : traitement des paiements en ligne. Données transmises : e-mail, montant, identifiant de commande. Stripe est certifié PCI-DSS niveau 1.

Supabase (supabase.com) : hébergement de la base de données. Les données sont stockées sur des serveurs situés en Europe (région EU-West).

Resend (resend.com) : envoi des e-mails transactionnels (confirmations, bons de vol, rappels). Données transmises : prénom, nom, e-mail, contenu de l'e-mail.

Ces prestataires agissent en tant que sous-traitants au sens du RGPD. Ils s'engagent contractuellement à traiter vos données uniquement sur instruction de Fly Horizons et à mettre en place les mesures de sécurité appropriées.

Aucune donnée n'est transférée hors de l'Espace Économique Européen, à l'exception des services ci-dessus dont les sièges sont aux États-Unis mais qui disposent de garanties adéquates (clauses contractuelles types ou cadre EU-US Data Privacy Framework).`,
  },
  {
    title: "5. Durée de conservation",
    content: `Les données personnelles sont conservées pour la durée strictement nécessaire aux finalités pour lesquelles elles ont été collectées :

Données de réservation et de vol : 5 ans à compter de la date du vol (obligation comptable et légale).

Données de commande boutique : 5 ans à compter de la commande (obligation comptable).

Données de compte utilisateur : jusqu'à la suppression du compte par l'utilisateur ou, en l'absence d'activité, 3 ans après la dernière connexion.

Données de contact (formulaire) : 2 ans à compter de la dernière interaction.

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
- Données bancaires jamais stockées sur les serveurs de Fly Horizons (délégation complète à Stripe).
- Accès à la base de données restreint via Row Level Security (RLS) de Supabase.
- Tokens de paiement à usage unique et expiration automatique.
- Accès administrateur protégé par authentification forte.`,
  },
  {
    title: "8. Cookies",
    content: `Le site fly-horizons.com utilise uniquement des cookies strictement nécessaires au fonctionnement du service :

Cookie de session : utilisé pour maintenir votre connexion à votre compte. Durée : session (supprimé à la fermeture du navigateur) ou 30 jours si vous cochez « rester connecté ».

Aucun cookie publicitaire, aucun cookie de traçage tiers, aucun outil d'analyse comportementale (Google Analytics, Facebook Pixel, Hotjar, etc.) n'est utilisé sur ce site.

Vous pouvez à tout moment supprimer les cookies via les paramètres de votre navigateur. La suppression du cookie de session entraîne la déconnexion de votre compte.`,
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
                { label: "Version",             value: "1.0" },
                { label: "Responsable",         value: "DESTANBERG Romain" },
                { label: "Mise à jour",         value: "5 juin 2026" },
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
            <a
              href="mailto:info@fly-horizons.com"
              className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-black bg-primary text-primary-foreground rounded-lg hover:brightness-105 active:scale-[0.98] transition-all shadow-gold"
            >
              Nous écrire
            </a>
          </div>

        </div>
      </section>

    </main>
  );
}
