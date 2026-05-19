# Révision des emails — Fly Horizons

Modifiez les textes ci-dessous, puis donnez ce fichier à Claude pour qu'il mette à jour le code.

- Les variables dynamiques sont notées `{comme_ceci}` — ne les modifiez pas.
- Les lignes `> texte` sont des blocs mis en valeur (callout avec bordure dorée).
- Les lignes `[Bouton: texte]` sont des boutons CTA dorés — modifiez uniquement le texte entre guillemets.

---

## Email 1 — Confirmation de commande (boutique)
**Destinataire :** client
**Déclencheur :** paiement Stripe confirmé (achat boutique)
**Objet :** `Confirmation de commande #{orderRef} — Fly Horizons`

```
Réf. #{orderRef}                          ← surtitre (petit texte doré)
Commande confirmée !                      ← titre
Merci {customerName}, nous avons bien reçu votre commande.  ← sous-titre
```

*(Corps : détail des articles + récapitulatif de prix + adresse de livraison + facture — ces sections sont entièrement dynamiques, pas de texte libre à modifier.)*

[Bouton: "Voir mes commandes"]

---

## Email 2 — Commande en préparation (boutique)
**Destinataire :** client
**Déclencheur :** admin marque la commande "en préparation"
**Objet :** `Votre commande #{orderRef} est en préparation — Fly Horizons`

```
Réf. #{orderRef}
Commande en préparation
Bonjour {customerName}, votre commande est en cours de traitement.
```

> Nous préparons votre commande avec soin. Vous recevrez un email dès qu'elle est déposée à la poste.

[Bouton: "Suivre mes commandes"]

---

## Email 3 — Commande expédiée (boutique)
**Destinataire :** client
**Déclencheur :** admin marque la commande "expédiée"
**Objet :** `Votre commande #{orderRef} est expédiée ! — Fly Horizons`

```
Réf. #{orderRef}
Votre colis est en route !
Bonjour {customerName}, votre commande a été déposée au bureau de poste.
```

> Votre colis est désormais en chemin. La livraison prend généralement 2–5 jours ouvrables selon votre pays.

[Bouton: "Voir mes commandes"]

---

## Email 4 — Vouchers de vol (achat boutique)
**Destinataire :** client
**Déclencheur :** achat d'un ou plusieurs vouchers vol
**Objet :** `Vos vouchers Fly Horizons — #{orderRef}`

```
Réf. #{orderRef}
Vos vouchers sont prêts !     (ou "Votre voucher est prêt !" si 1 seul)
Merci {customerName}, merci pour votre achat.
```

*(Carte voucher : code, durée — dynamique)*

Texte dans la carte :
```
Valable 12 mois à compter de la date d'achat
```

[Bouton dans la carte: "Réserver mon vol avec ce code"]

**Instructions d'utilisation :**
```
1. Cliquez sur le bouton ci-dessus — votre code sera automatiquement pré-rempli
2. Choisissez votre date et créneau horaire
3. Finalisez votre réservation — le vol est couvert par votre bon
```

Note de bas de section :
```
Conservez cet email — votre code vous sera demandé lors de la réservation.
```

---

## Email 5 — Vol sur mesure — devis + lien de paiement
**Destinataire :** client
**Déclencheur :** admin envoie le devis pour un vol sur mesure
**Objet :** `Votre vol sur mesure — {dateStr}`

```
Vol sur mesure
Votre vol sur mesure
Bonjour {prenom}, voici le récapitulatif de votre demande.
```

*(Tableau itinéraire + détail du prix — dynamique)*

**Si paiement requis (bloc encadré doré) :**
```
Acompte à régler
{montant} €
Payez votre acompte pour confirmer votre réservation.
Le solde sera réglé après votre vol selon la durée réelle.
```
[Bouton dans le bloc: "Payer mon acompte — {montant} €"]
```
Paiement sécurisé par Stripe — carte bancaire
```

**Si couvert par voucher (callout) :**
> Votre vol est entièrement couvert par votre voucher — aucun paiement requis. Nous vous recontacterons sous 24 h.

**Sign-off :**
```
Des questions ? Répondez à cet email ou écrivez-nous à info@fly-horizons.com.
À très bientôt à bord — L'équipe Fly Horizons
```

---

## Email 6 — Réservation standard — couvertes par voucher
**Destinataire :** client
**Déclencheur :** réservation créée avec un voucher (aucun paiement requis)
**Objet :** `Réservation confirmée — Fly Horizons`

```
Réservation
Réservation confirmée
Bonjour {prenom}, votre vol est confirmé.
```

*(Tableau détails du vol — dynamique)*

> Votre vol est entièrement couvert par votre voucher — aucun paiement supplémentaire requis. Nous vous contacterons rapidement pour confirmer tous les détails.

**Informations pratiques :**
```
Aéroport de Charleroi (EBCI), Belgique
Présentez-vous 15 minutes avant l'heure du vol
Questions — info@fly-horizons.com · FAQ
```

**Sign-off :**
```
À très bientôt à bord — L'équipe Fly Horizons
```

---

## Email 7 — Réservation standard — paiement reçu
**Destinataire :** client
**Déclencheur :** paiement réservation standard confirmé via Stripe
**Objet :** `Paiement confirmé — Fly Horizons`

```
Paiement reçu
Réservation confirmée
Bonjour {prenom}, votre paiement a bien été reçu.
```

*(Montant payé affiché en grand — dynamique)*
*(Tableau détails du vol — dynamique)*

**Informations pratiques :**
```
Aéroport de Charleroi (EBCI), Belgique
Présentez-vous 15 minutes avant l'heure du vol
Casques audio fournis — aucun équipement nécessaire
Questions — info@fly-horizons.com · FAQ
```

**Sign-off :**
```
Nous vous contacterons pour confirmer tous les détails. À très bientôt à bord — L'équipe Fly Horizons
```

[Bouton: "Plan d'accès →"]

---

## Email 8 — Vol sur mesure — acompte reçu
**Destinataire :** client
**Déclencheur :** paiement de l'acompte vol sur mesure confirmé
**Objet :** `Acompte reçu — Vol sur mesure Fly Horizons`

```
Acompte reçu
Votre réservation est confirmée
Bonjour {prenom}, votre acompte a bien été reçu.
```

*(Montant payé affiché en grand — dynamique)*
*(Tableau détails vol sur mesure — dynamique)*

> Nous vous recontacterons sous 24 h pour affiner votre itinéraire et confirmer la date exacte. Le solde sera réglé après votre vol selon la durée réelle.

**Sign-off :**
```
Des questions ? Répondez à cet email ou écrivez-nous à info@fly-horizons.com.
À très bientôt à bord — L'équipe Fly Horizons
```

[Bouton: "Plan d'accès →"]

---

## Email 9 — Date de vol confirmée (admin)
**Destinataire :** client
**Déclencheur :** admin clique "Confirmer la date" dans le drawer
**Objet :** `Votre date de vol est confirmée — Fly Horizons`

```
Fly Horizons
Date de vol confirmée
Bonjour {prenom}, votre date est réservée.
```

*(Tableau : date confirmée, durée estimée, lieu — dynamique)*

> Votre date est confirmée. Nous vous recontacterons très prochainement pour vous communiquer votre créneau horaire exact.

*(Si une route a été enregistrée : bloc itinéraire + bouton de validation route)*

**Sign-off :**
```
Questions ? Répondez directement à cet email — L'équipe Fly Horizons
```

[Bouton si pas de route: "Plan d'accès →"]

---

## Email 10 — Créneau horaire confirmé (admin)
**Destinataire :** client
**Déclencheur :** admin clique "Confirmer l'heure" dans le drawer
**Objet :** `Votre créneau horaire est confirmé — Fly Horizons`

```
Fly Horizons
C'est confirmé — à bientôt !
Bonjour {prenom}, votre vol est planifié.
```

*(Tableau : date, heure de départ en grand, durée, départ/retour — dynamique)*

*(Si une route a été enregistrée : bloc itinéraire + bouton de validation route)*

**Informations pratiques :**
```
Aéroport de Charleroi (EBCI), Belgique
Présentez-vous 15 minutes avant l'heure du vol
Casques audio fournis — aucun équipement nécessaire
Questions — info@fly-horizons.com
```

**Sign-off :**
```
Beau temps et bon vol ! Rendez-vous à l'aéroport — L'équipe Fly Horizons
```

[Bouton: "Plan d'accès →"]

---

## Email 11 — Contact — notification interne
**Destinataire :** admin (info@fly-horizons.com)
**Déclencheur :** formulaire de contact soumis par un visiteur
**Objet :** `Nouveau message : {sujet} — {nom}`

```
Nouveau message
Message de contact
```

*(Tableau : nom, email, sujet + corps du message — entièrement dynamique)*

[Bouton: "Voir dans l'admin"]

---

## Email 12 — Contact — accusé de réception
**Destinataire :** client
**Déclencheur :** formulaire de contact soumis (réponse automatique)
**Objet :** `Votre message a été reçu — Fly Horizons`

```
Contact
Message bien reçu
Nous vous répondrons sous 48 h ouvrables.
```

```
Bonjour {nom},
Merci pour votre message concernant {sujet}. Nous l'avons bien reçu et vous répondrons dans les meilleurs délais.
```

*(Rappel du message envoyé — dynamique)*

**Sign-off :**
```
L'équipe Fly Horizons
```

---

## Email 13 — Contact — réponse admin
**Destinataire :** client
**Déclencheur :** admin répond à un message de contact depuis /admin/contacts
**Objet :** `Réponse de Fly Horizons — {sujet}`

```
Fly Horizons
Réponse à votre message
Concernant : {sujet}
```

```
Bonjour {nom},
Voici notre réponse à votre demande :
{réponse de l'admin}
```

[Bouton: "Nous recontacter"]

**Sign-off :**
```
L'équipe Fly Horizons
```

---

## Email 14 — Invitation au paiement (réservation admin)
**Destinataire :** client
**Déclencheur :** admin envoie un lien de paiement depuis le drawer
**Objet :** `Votre réservation — {dateStr}`

```
Réservation de vol
Votre réservation
Bonjour {prenom} {nom}, voici le récapitulatif de votre réservation.
```

*(Tableau détails du vol — dynamique)*

**Bloc paiement encadré :**
```
Montant à régler
{montant} €
```
[Bouton: "Payer ma réservation — {montant} €"]
```
Paiement sécurisé par Stripe — carte bancaire
```

**Sign-off :**
```
Des questions ? Répondez à cet email ou écrivez-nous à info@fly-horizons.com.
À très bientôt à bord — L'équipe Fly Horizons
```

---

## Email 15 — Post-vol — remerciement + enquête
**Destinataire :** client
**Déclencheur :** admin marque "Vol effectué" dans le drawer
**Objet :** `Merci pour votre vol — Fly Horizons`

```
Fly Horizons
Merci pour votre vol !
```

```
Bonjour {prenom},

Merci d'avoir choisi Fly Horizons. Votre vol du {date} ({durée}) est maintenant terminé — nous espérons que vous avez passé un moment inoubliable !
```

```
Votre avis nous aide à améliorer constamment la qualité de nos vols.
L'enquête prend moins d'une minute — merci d'avance !
```

[Bouton: "Donner mon avis"]

**Sign-off :**
```
À bientôt à bord — L'équipe Fly Horizons
```

---

## Email 17 — Itinéraire de vol proposé au client
**Destinataire :** client
**Déclencheur :** admin confirme la date ou l'heure avec une route enregistrée (envoi automatique) OU clique "Renvoyer la route"
**Objet :** `Votre itinéraire de vol — Fly Horizons`

```
Itinéraire
Votre itinéraire de vol
Bonjour {prenom}, voici l'itinéraire prévu pour votre vol.
```

*(Tableau : date, durée estimée — dynamique)*

*(Bloc itinéraire : texte de la route — dynamique)*

[Bouton: "Valider ou modifier l'itinéraire →"]

```
Ce lien est valable jusqu'à 48 h avant votre vol.
```

**Sign-off :**
```
Questions ? Répondez directement à cet email — L'équipe Fly Horizons
```

---

## Pied de page commun à tous les emails
*(Apparaît sous chaque email, fond marine)*

```
Fly Horizons — fly-horizons.com
Une question ? Répondez directement à cet email — info@fly-horizons.com
```
