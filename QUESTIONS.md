# Questions en suspens — répondre avant de reprendre

## Décisions confirmées (ne pas retoucher)
- **M-3** — Badge "Exclusivité Fly Horizons" : retiré, remplacé par eyebrow "Vol sur mesure". ✅ Romain préfère ça.
- **M-2** — Je/Nous : hybride confirmé. "Nous" = Fly Horizons comme service. "Je"/"Romain" = interactions perso, emails, bio pilote. ✅
- **I-2** — Alerte poids : s'affiche avant le calendrier mais **ne bloque pas** la réservation. ✅ Déjà implémenté correctement.
- **I-4** — Boutique : page `/shop` existe toujours mais n'est plus accessible depuis aucun lien public. ✅

---

## Questions ouvertes à répondre

### 1. Téléphone — à publier ou non ?
> Si OUI : quel numéro ? (sera ajouté dans Contact + Footer)
> Si NON : on renforce juste "réponse sous 24h" à la place.

**Réponse :**
pas de nuéro de tex donc on renforce juste "réponse sous 24h" à la place.
---

### 2. BCE — disponible quand ?
> Juste besoin du numéro d'entreprise belge pour le footer. À ajouter dès obtenu.

**Réponse :**
je compte pas avoir de BCE pour le moment
---

### 3. Photos du DA40 TDI — tu peux les uploader ?
> Pas de code requis. Uploader extérieur + intérieur via Supabase admin dans `product_images`. La galerie les affiche automatiquement.

**Réponse :**
j'en ai mais il va falloir guider comment ajouter
---

### 4. CGP vs CGV — même document ?
> Le formulaire dit "Conditions Générales de Vente et de Participation" et pointe vers `/cgv`. Est-ce que ce document couvre aussi les CGP ou faut-il une page `/cgp` séparée ?

**Réponse :**
oui enfaite CGV concerne des ventes mais moi c'est CGP pour participation vu que le client paye le vol et pas moi. le client ne me paye pas moi mais l'avion.
---

### 5. Vrais témoignages — tu peux en collecter ?
> 3 suffiront. Prénom + initiale, ville, 2-3 lignes. Idéalement un d'une personne qui avait peur de voler. Les 3 placeholders actuels seront remplacés.

**Réponse :**
j'en ai pas 
---

### 6. Photos galerie (public/gallery/ — 11 photos) — où les mettre ?
> Option A : section galerie sur la homepage
> Option B : intégrées aux fiches vol
> Option C : page dédiée `/galerie`
> Option D : rien pour l'instant

**Réponse :**
on peut mettre sur la home page mais pas une trop grosse secion.
---

### 7. Page "À propos" / "Qui suis-je" — à créer ?
> PilotCard est sur la homepage mais pas accessible depuis la nav. Le client méfiant ne peut pas "vérifier" qui est Romain en cherchant une page dédiée. Faut-il une page `/about` ou `/romain` avec la bio complète, la licence, l'avion, et un lien depuis le header ?

**Réponse :**
page about alors. pas besoin de parler de license
---

### 8. Explication HOBBS dans le tunnel de réservation — visible ou FAQ uniquement ?
> L'explication "prix calculé à la minute, différence remboursée sous 24h" est dans la FAQ. Faut-il aussi l'afficher dans le step 3 (récapitulatif paiement), sous le prix total, pour que le client ne soit pas surpris si le montant final diffère légèrement ?

**Réponse :**
oui, mias expliquer pour qql un qui n'y connait rien.
---

### 9. FAQ "J'ai peur de voler" — je l'écris seul ou tu veux relire le texte d'abord ?
> C'est la question pour le profil anxieux. Je peux l'écrire dans le ton de Fly Horizons (rassurant, honnête, humain) sans que tu aies à fournir de contenu. Ou tu préfères me donner ta version ?

**Réponse :**

---

### 10. Altitude et vitesse — à confirmer
> La FAQ dit "300 à 1 500 mètres" pour l'altitude. C'est correct pour le DA40 TDI sur tes itinéraires typiques ? Et tu veux mentionner la vitesse de croisière quelque part (environ 180-200 km/h) ou c'est inutile ?

**Réponse :**
120kt (220kmh) et environt 2000 à 3000ft (~1000m)
---

### 11. Cost-sharing "sans but lucratif" — explication proactive ou FAQ uniquement ?
> Tu m'avais dit que le but c'est "offrir l'accès à l'aviation à prix bas, sans but lucratif". C'est expliqué dans la FAQ (NCO.GEN.104) mais nulle part ailleurs de façon proactive. Est-ce qu'on ajoute une section ou un encart quelque part (nos-offres ? fiche vol ?) pour expliquer ça clairement aux clients méfiants, sans jargon ?
ok 
**Réponse :**

---

### 12. Emails transactionnels (Resend) — à auditer pour Je/Nous et mots interdits ?
> On a nettoyé toutes les pages publiques. Mais les emails envoyés aux clients (confirmation réservation, lien paiement, report de vol...) n'ont pas été vérifiés. Ils utilisent peut-être encore "vol privé" ou un mauvais ton. À faire dans une prochaine session ?

**Réponse :**
ok on va vérifier mais oublie pas, communication : hybride.
Nous = Fly Horizons en tant que service.
Je = Romain lorsqu'il y a une interaction humaine ou une responsabilité personnelle.