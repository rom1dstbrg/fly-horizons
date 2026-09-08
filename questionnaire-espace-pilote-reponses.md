# Questionnaire espace pilote — réponses de Romain

> Questionnaire complet (Q1→Q89), terminé le 2026-09-06. Deux contradictions
> (Q70/Q71 et Q45/Q46) ont été clarifiées après coup — voir tout en bas.
> Voir aussi `plan-attaque-espace-pilote.html` (plan de référence, consolide
> l'analyse initiale + ces réponses + l'avancement) et la mémoire
> `project_espace_pilote_decisions.md` pour le résumé exploitable.

---

## A · Les pilotes

- **Q1 — Combien de pilotes :** 3-4 au lancement, en formation (ATPL / time-building).
- **Q2 — Lien :** A (confiance totale).
- **Q3 — Vérif licence/medical/SEP :** C (parole) pour l'instant → précisé en **Q81/Q82** :
  champs texte + dates uniquement (pas d'upload PDF), **bloquants** tant que non remplis.
- **Q4 — Assurance :** C. Assurance école/club couvre les passagers, même règle que Romain.
- **Q5 — Avion :** A (avions école) mais flotte multi-types (Sonaca 200, PA28, DA40, DA42)
  → tranché en **Q87** : M&B reste DA40-only en v1, les autres types se débrouillent hors app.
- **Q6 — Multi-types M&B :** sans objet (pas leur avion perso).
- **Q7 — Signature de conditions :** B. Popup scroll-to-accept à la création du compte
  (bouton "Afficher les conditions", scroll obligatoire jusqu'en bas, bouton grisé → actif).
  Précisé en **Q83/Q84** : Claude rédige le texte maintenant (pas d'avocat prévu), popup =
  pattern standard scroll-to-unlock (pas de référence externe précise).
- **Q8 — Romain vole encore :** B (rarement, dépannage).
- **Q9/Q88 — Romain dans le système pilote_id :** tranché en **Q88 = C** : Romain garde
  l'admin (contrôle total) **et** a une fiche pilote reliée, accessible via l'espace pilote
  aussi s'il le souhaite. Cohérent avec **Q77 = B/C** sur l'ancien pilote "Romain Destanberg" :
  relié à son compte, actif.
- **Q10 — Pilote aussi client :** A (compte unique, on promeut le compte existant).
- **Q11 — Désactivation d'un pilote :** A. Vols → non assignés, redeviennent une demande à
  réassigner par Romain ; annonces dépubliées.

## B · Page « postuler »

- **Q12 — Maintenant ?** B (oui, discrète et non indexée).
- **Q13 — Contenu :** A (texte + renvoi vers le formulaire de contact, zéro formulaire dédié).
- **Q14 — Accès :** B (lien dans le footer).
- **Q15 — Marquage du message :** B (message de contact normal, Romain comprendra).

## C · L'attribution

- **Q16 — Assignation manuelle depuis :** drawer + liste.
- **Q17 — Quand assigner :** A (dès la demande reçue, avant confirmation client).
- **Q18 — Réassigner :** B (possible, pas d'email auto) → **Q86 = A** : Romain envoie
  lui-même un message via **un template unique modifiable**, avec un paragraphe
  "votre pilote est maintenant X" qu'il peut supprimer au cas par cas.
- **Q19 — Mise en jeu à qui :** A (tous les pilotes actifs). Pas de système de dispo :
  "les pilotes ne seront pas à jour, j'en suis sûr" → confirmé en **Q27/Q72** (jamais de
  dispos déclarées).
- **Q20 — Durée de l'offre :** B (48 h).
- **Q21 — Si personne ne prend :** A (notif à Romain, il gère à la main).
- **Q22/Q89 — Le pilote peut rendre un vol :** délai tranché en **Q89 = A** : jusqu'à **J-3**
  via l'app, au-delà il doit appeler Romain.
- **Q23 — Refus explicite (bouton "pas pour moi") :** A, avec écran admin détaillé en
  **Q85** : liste des refus (qui/quel vol/quand) + taux de refus par pilote + alerte visuelle
  si seuil dépassé (ex. >70%) + vue par période.
- **Q24 — Vols réservés à Romain :** B, mais nuancé : aucune assignation automatique de
  toute façon, Romain peut aussi prendre des demandes simples lui-même.

## D · Ce que fait le pilote

- **Q25 — Vol sur mesure concerné :** A → **non concerné en v1**. Pilotes = vols standard +
  annonces uniquement.
- **Q26 — Conflits d'agenda vérifiés à l'assignation :** A (oui), précisé par **Q76 = A** :
  on vérifie tous les créneaux du pilote (annonces + vols assignés) ; aujourd'hui la demande
  n'est pas forte mais le principe est retenu — si le pilote a déjà un vol sur ce créneau, il
  ne reçoit pas le mail de mise en jeu.
- **Q27 — Dispos déclarées pour prioriser :** A (non, pas de dispo, assignation "au feeling").
- **Q28 — Le pilote peut proposer un autre créneau :** A, **avec garde-fou explicite** :
  il ne doit pas pouvoir "prendre" un vol puis changer l'horaire pour arranger son propre
  planning. Romain veut des **stats de fréquence de changement de créneau par pilote**
  dans l'admin (repérage d'abus), même s'il n'y a pas de blocage dur prévu pour l'instant.
- **Q29 — Annuler le vol :** B — Romain seul annule ; le pilote demande l'annulation.
  Raison donnée : "sinon il va pas respecter ses engagements."
- **Q30 — Envoyer la route au client :** A — le pilote gère et envoie lui-même, Romain a
  juste un accès lecture en tant qu'admin.
- **Q31 — Marquer "vol effectué" + durée réelle :** C (les deux peuvent), **avec contrainte
  anti-fraude** : impossible de marquer "vol effectué" tant que la date/heure prévue n'est
  pas passée depuis **plus de 8h**.
- **Q32 — Historique visible côté pilote :** B (depuis son assignation uniquement).
- **Q33 — Modifier passagers / poids / infos client :** A, mais avec un **popup de mise en
  garde** expliquant l'impact de la modification avant de valider.
- **Q34 — Carnet de vols effectués côté pilote :** A (oui, page "mes vols passés").
- **Q35 — M&B côté pilote :** A (accès complet : ses vols assignés + calculateur libre).
- **Q36 — Contexte/remarque client visible :** A (oui, tout).

## E · Argent — le nœud du projet

- **Q37 — Modèle de paiement :** A — le pilote encaisse **en direct**, l'argent ne passe
  jamais par Romain. _Romain : "je ne sais juste pas comment faire ce système"_ → à
  concevoir avec lui (UX + garde-fous), pas de solution technique prête.
- **Q38 — Comment le pilote encaisse :** B — cash **ou** son propre moyen (virement,
  Payconiq...). Idée de Romain : un mini système de "facture" où le pilote choisit
  cash/virement, indépendant de Stripe.
- **Q39 — Qui fixe le prix :** B — le pilote fixe le prix : son coût de vol + une marge,
  potentiellement variable selon le nombre de passagers.
- **Q40 — Trace du montant dans l'app :** A — oui, montant + "payé oui/non" en **info
  seulement**, aucun calcul ni flux réel dans l'app.
- **Q41 — Vraiment 0€ pour Romain :** A — vraiment 0€, aucune commission, même symbolique.
- **Q42 — Vouchers utilisables sur vol pilote tiers :** A — non, vouchers = vols opérés par
  Romain uniquement. "On n'a pas besoin d'y toucher."
- **Q43 — Remboursement sur vol pilote annulé :** A — géré par le pilote lui-même (c'est lui
  qui avait encaissé).
- **Q44 — Règle des 25% NCO.GEN.104 :** B (dynamique) — le pilote choisit de diviser par le
  nombre de passagers recommandé pour le partage de frais, ou un pourcentage ; **alerte** si
  le résultat descend sous 25%, avec rappel de la réglementation.
- **Q45/Q46 — Reçu Fly Horizons + comptabilité admin — CLARIFIÉ après coup (contradiction
  lettre/note initiale) :**
  - Un **reçu neutre "participation aux frais"** est généré pour les vols pilotes, sur le
    même modèle que le reçu actuel de Fly Horizons.
  - `/admin/transactions` garde une **section séparée "vols pilotes tiers"** (date, pilote,
    montant) — purement informative, **0€ dans la P&L de Romain**, distincte de ses propres
    transactions.

## F · Emails & communication

- **Q47 — Emails pilote-aware :** A — passe complète dès la phase 2 (nom du pilote, "votre
  pilote X", reply-to du pilote). **Point ouvert soulevé par Romain** : le pilote n'a pas
  d'adresse email dédiée Fly Horizons — comment router le reply-to vers lui concrètement
  (email perso du pilote en reply-to, ou relais) ? À trancher techniquement.
- **Q48 — Reply-to d'un email envoyé par le pilote :** A — arrive chez le pilote.
- **Q49 — Client prévenu de l'assignation :** A — tout de suite : "un pilote nommé X va vous
  contacter."
- **Q50 — Email de présentation du pilote :** A — fortement encouragé, template pré-rempli
  éditable, pas bloquant.
- **Q51 — Emails libres du pilote au client :** A — email libre + templates.
- **Q52 — Boarding pass PDF pour vols pilote :** B — oui, reprendre le format actuel tel quel.
- **Q53 — Ce que le client voit du pilote :** B — prénom, nom, photo, courte bio (comme sur
  les annonces) → transparence, sur une page profil pilote.
- **Q54 — Emails d'annulation :** B — partent de Fly Horizons / Romain (cadre).

## G · Légal / CGU

- **Q55 — Réécriture CGP/CGU en "plateforme de mise en relation" :** A — oui, le pilote est
  responsable de son vol.
- **Q56 — Politique de confidentialité (partage coordonnées au pilote) :** A — oui, ajouté.
- **Q57 — Consentement explicite du client :** A — une phrase claire dans la confirmation
  suffit (pas de case à cocher séparée).
- **Q58 — Avis d'avocat en droit aérien :** C — **non prévu**. On avance sur la confiance
  pour l'instant.
- **Q59 — Statut BCE/TVA vérifié :** B — **pas encore fait**, à faire.

## H · Espace pilote — UX

- **Q60 — Nav espace pilote :** M&B, Mon profil, Offres à prendre, Mes vols passés (les 4).
- **Q61 — Le pilote édite sa fiche (bio/photo/tel/IBAN) :** A — oui, il gère tout lui-même.
- **Q62 — Dashboard pilote :** Mes vols à venir, Demandes en attente, Offres ouvertes,
  Vols pas encore payés à surveiller (4 des 5 cases ; pas de "résumé vols effectués" séparé,
  couvert par le carnet Q34).
- **Q63 — Notifications :** A — email + badge/compteur dans l'espace.
- **Q64 — Le pilote voit les vols des autres pilotes :** A — non, jamais.

## I · Admin (Romain)

- **Q65 — Écran "planning tous pilotes" :** A — oui, vue calendrier multi-pilotes.
- **Q66 — Colonne "pilote" + filtre dans la liste réservations :** A — les deux.
- **Q67 — Stats par pilote :** A — oui, utile (annulations dernière minute, changements de
  créneau fréquents, etc. — lié à Q28/Q23).
- **Q68 — Entrée "Pilotes" remontée dans la nav principale :** A — oui, section "Équipe".
- **Q69 — Impersonation "voir comme un pilote" :** A — oui, ça aide pour debugger.

## J · Périmètre & priorités

- **Q70/Q71 — Périmètre v1 — CLARIFIÉ après coup (contradiction initiale) :** Romain avait
  coché Q70=A (assignation manuelle seulement) mais Q71=B (mise en jeu indispensable dès le
  début). **Décision finale : les deux dès le lancement** — assignation manuelle ET mise en
  jeu automatique ("premier arrivé", offre 48h à tous les pilotes actifs) sont construites
  et livrées ensemble avant la première mise en prod du chantier pilotes.
- **Q72 — Dispos pilotes déclarées :** A — jamais / on verra plus tard.
- **Q73 — Stratégie de déploiement :** indécis sur le fond, mais préférence claire : **build
  d'abord, complètement, puis on met en place** (pas de découpage en petits déploiements
  successifs pour ce chantier). Idée complémentaire : on peut publier la page "postuler"
  tout de suite, mais l'espace pilote peut rester affiché "en construction" tant qu'il n'y a
  pas de vrai pilote actif — pas urgent puisque personne ne l'utilise encore.
- **Q74 — Date/événement qui pousse :** non, rien de pressant.

## K · Cas particuliers

- **Q75 — Client demande "je veux voler avec Romain" :** C, nuancé — pas de case dédiée
  prévue, mais si mentionné en commentaire, Romain l'attribue automatiquement ou contacte le
  pilote concerné via WhatsApp et assigne à la main. Pas un développement v1, juste un
  comportement manuel à garder en tête.
- **Q76 — Conflit annonce + assignation :** A — vérifié, voir Q26 (si le pilote a déjà un vol
  sur ce créneau, il ne reçoit pas la mise en jeu). Demande pas forte actuellement.
- **Q77 — Ancien pilote "Romain Destanberg" (vieille migration) :** cohérent avec Q88=C —
  relié à son compte, actif ; il pilote depuis l'admin mais peut aussi avoir accès à
  l'interface espace pilote.
- **Q78 — Log "author = pilote:Nom" :** A — oui, distinguer qui a fait quoi.
- **Q79 — Client refuse le partage de ses données avec un pilote :** A — le vol ne peut pas
  se faire dans ce cas, on lui explique.
- **Q80 — Autre chose :** rien, tout est déjà en commentaires ailleurs.

## L · Précisions (Q81→Q89)

- **Q81 — Format infos légales pilote :** A — champs texte + dates seulement, déclaratif,
  pas d'upload PDF pour l'instant.
- **Q82 — Champs légaux bloquants :** A — oui, bloquant tant que non remplis ; affiché en
  rouge dans le dashboard / première page du pilote.
- **Q83 — Texte des conditions (décharge de responsabilité) :** Claude rédige le texte
  maintenant (pas d'avocat prévu) ; on garde la preuve (version + horodatage + qui a accepté).
- **Q84 — Référence "popup style career2" :** pas de référence externe précise — juste le
  pattern standard : bouton "Conditions" → popup → scroll obligatoire jusqu'en bas → bouton
  "Accepter" s'active → ferme le popup.
- **Q85 — Écran admin "refus des pilotes" :** liste + taux + alerte de seuil + vue par
  période (les 4 cases cochées).
- **Q86 — Template "changement de pilote" :** A — un template unique modifiable par Romain,
  avec le paragraphe "votre pilote est maintenant X" en bloc supprimable.
- **Q87 — Flotte multi-types vs M&B DA40-only :** A — le M&B reste DA40-only en v1, les
  autres types (Sonaca 200, PA28, DA42) se débrouillent hors app comme aujourd'hui.
- **Q88 — Romain : admin ou espace pilote :** C — les deux : il garde l'admin (contrôle
  total) et a une fiche pilote reliée, avec accès à l'espace pilote s'il le souhaite.
- **Q89 — Délai pour rendre un vol :** A — jusqu'à J-3, au-delà il doit appeler Romain.

---

## Contradictions clarifiées après la première passe (2026-09-06)

1. **Mise en jeu en v1 (Q70 vs Q71)** → tranché : **les deux dès le lancement**, assignation
   manuelle ET mise en jeu automatique livrées ensemble.
2. **Reçu + compta pilotes (Q45/Q46, lettre A vs notes)** → tranché en faveur des **notes** :
   reçu "participation aux frais" généré + section séparée "vols pilotes tiers" dans
   `/admin/transactions`, informative, 0€ dans la P&L de Romain.

## Points encore réellement ouverts (pas de décision, à garder en tête)

1. **Q3/Q81** — Confirmé : pas d'upload PDF pour l'instant (déclaratif). Question de Romain
   tranchée, mais un système de stockage pourra être ajouté plus tard si besoin.
2. **Q37/Q38** — Romain ne sait pas comment construire concrètement le système d'encaissement
   direct pilote (facture cash/virement) — à concevoir techniquement dans le plan.
3. **Q47** — Le pilote n'a pas d'adresse email dédiée Fly Horizons : comment router le
   reply-to des emails "pilote-aware" vers lui (son email perso en reply-to direct, ou
   relais applicatif) ? À trancher techniquement dans le plan.
4. **Q28/Q67** — Stats "changements de créneau par pilote" et "refus par pilote" : écrans à
   spécifier précisément au moment de construire la phase admin.
5. **Q58/Q59** — Toujours aucun avis d'avocat ni vérification comptable prévus. Le chantier
   avance quand même "sur la confiance" — cohérent avec `project_marketplace_legal_risk` et
   `project_audit_legal_reouverture`, à garder en tête sans bloquer le build.
