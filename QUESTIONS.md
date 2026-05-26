# Questions en suspens — répondre avant de reprendre

## Décisions confirmées (ne pas retoucher)
- **M-3** — Badge "Exclusivité Fly Horizons" : retiré, remplacé par eyebrow "Vol sur mesure". ✅ Romain préfère ça.
- **M-2** — Je/Nous : hybride confirmé. "Nous" = Fly Horizons comme service. "Je"/"Romain" = interactions perso, emails, bio pilote. ✅
- **I-2** — Alerte poids : s'affiche avant le calendrier mais **ne bloque pas** la réservation. ✅ Déjà implémenté correctement.
- **I-4** — Boutique : page `/shop` existe toujours mais n'est plus accessible depuis aucun lien public. ✅

---

## Questions répondues — toutes implémentées

### 1. Téléphone — à publier ou non ?
**Réponse :** pas de numéro de téléphone → "réponse sous 24h" renforcé dans Contact + Footer. ✅ Implémenté.

### 2. BCE — disponible quand ?
**Réponse :** pas de BCE pour le moment. Footer : "DESTANBERG Romain" uniquement. ✅ Déjà géré.

### 3. Photos du DA40 TDI — tu peux les uploader ?
**Réponse :** il en a mais faut guider comment ajouter.
> **Guide** : connecte-toi à supabase.com/dashboard → table `product_images` → Insert → uploade l'image dans le Storage → copie l'URL publique → colle dans le champ `url` de la table. La galerie les affiche automatiquement. ⏳ À faire (pas de code requis).

### 4. CGP vs CGV — même document ?
**Réponse :** CGP distinct (participation, le client paye l'avion, pas Romain). ✅ Page `/cgp` créée, formulaires mis à jour.

### 5. Vrais témoignages — tu peux en collecter ?
**Réponse :** pas disponibles. 3 placeholders créatifs restent en place. ⏳ À remplacer quand disponibles.

### 6. Photos galerie (public/gallery/) — où les mettre ?
**Réponse :** section légère sur la homepage. ⏳ À faire.

### 7. Page "À propos" — à créer ?
**Réponse :** page `/about` créée. ✅ Implémentée avec bio, avion, approche cost-sharing, CTAs.

### 8. Explication HOBBS dans le tunnel — visible ou FAQ uniquement ?
**Réponse :** oui, explication simple dans step 3 (récapitulatif paiement). ✅ Implémenté.

### 9. FAQ "J'ai peur de voler" — je l'écris seul ou tu veux relire ?
**Réponse :** écrit par Claude dans le ton Fly Horizons. ✅ Implémenté dans thème "À bord".

### 10. Altitude et vitesse — à confirmer
**Réponse :** 120kt (220 km/h), 2000 à 3000 ft (~1000 m). ✅ Corrigé dans la FAQ.

### 11. Cost-sharing "sans but lucratif" — explication proactive ?
**Réponse :** ok. ✅ Expliqué dans la page /about (section "L'approche Fly Horizons").

### 12. Emails transactionnels — à auditer ?
**Réponse :** ok, communication hybride. ✅ Audit fait : "L'équipe" → "Fly Horizons"/"Romain, Fly Horizons", "avion léger privé" retiré, "48h" → "24h".

---

## Tâches restantes (à faire dans une prochaine session)

### A. Section galerie légère sur la homepage (Q6)
> 11 photos dans `public/gallery/`. Section compacte, pas trop grande.
ok
### B. CTA cadeau dans le hero (P3-B1)
> Lien discret "Offrir en cadeau →" sous les 2 CTA principaux du hero. 
on ne va pas faire ça. sinon trop de boutons.

### C. Validité 12 mois dans le panier (P3-B2)
> Ajouter "Valable 12 mois · Transférable librement" dans `cart/page.tsx` pour les vouchers.
ok
### D. Calendrier mobile — distinction visuelle (P4-1)
> Fond vert pâle sur les jours disponibles non sélectionnés.
ok
### E. Photos DA40 — upload Supabase (P2-C1)
> Pas de code requis. Voir guide question 3 ci-dessus.
je vais plutot les mettre dans le dossier public (da-40-1.webp, da-40-2.webp, da-40-3.jpg)
### F. Vrais témoignages (P3-A2)
> Quand disponibles, remplacer les 3 placeholders dans `app/(public)/page.tsx` tableau `.map()`.
je le ferai plus tard. donc on fera plus tard 