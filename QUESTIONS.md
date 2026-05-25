# Questions en suspens — répondre avant de reprendre

## Décisions confirmées (ne pas retoucher)
- **M-3** — Le badge "Exclusivité Fly Horizons" : retiré, remplacé par eyebrow "Vol sur mesure". ✅ Romain préfère ça.
- **M-2** — Je/Nous : hybride confirmé. "Nous" = Fly Horizons comme service. "Je"/"Romain" = interactions perso, emails, bio pilote. ✅
- **I-2** — Alerte poids : s'affiche au-dessus du calendrier mais ne bloque PAS la réservation. ✅ Déjà implémenté correctement.

---

## Questions ouvertes à répondre

### 1. Téléphone — à publier ou non ?
> Si OUI : quel numéro ? (sera ajouté dans Contact + Footer)
> Si NON : on renforce juste "réponse sous 24h" à la place.

**Réponse :**

---

### 2. BCE — disponible quand ?
> Juste besoin du numéro d'entreprise belge. À ajouter dans le footer quand obtenu.

**Réponse :**

---

### 3. Photos du DA40 TDI — tu peux les uploader ?
> Pas de code requis. Juste uploader extérieur + intérieur via l'admin Supabase dans `product_images` et les associer aux produits. La galerie les affiche automatiquement.

**Réponse :**

---

### 4. CGP vs CGV — même document ?
> Le formulaire de réservation dit actuellement "Conditions Générales de Vente et de Participation" et pointe vers `/cgv`. Est-ce que ce document couvre aussi les CGP ou faut-il une page séparée `/cgp` ?

**Réponse :**

---

### 5. Vrais témoignages — tu peux en collecter ?
> 3 suffiront. Format : prénom + initiale nom, ville, 2-3 lignes libres. Idéalement un d'une personne qui avait peur de voler. Les placeholders actuels (Sophie M., Laurent & Valérie, Thomas D.) seront remplacés.

**Réponse :**

---

### 6. Photos galerie — à intégrer sur le site ?
> `public/gallery/` contient 11 photos (1.png→9.png + 10.jpg + 11.jpg). Tu veux les mettre quelque part ? (page dédiée ? section homepage ? fiche vol ?)

**Réponse :**
