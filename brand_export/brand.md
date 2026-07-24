# Fly Horizons — Charte graphique complète

> Destiné à tout prestataire externe (graphiste, imprimeur, agence) chargé de créer des supports pour Fly Horizons. Ce document est la référence unique. Toute divergence avec d'autres fichiers doit être signalée.

**Exploitant** : DESTANBERG Romain  
**Site** : fly-horizons.com  
**Activité** : Baptêmes de l'air et vols sur mesure en avion léger depuis Charleroi (EBCI), Belgique  
**Date de version** : Juillet 2026

---

## 1. Identité visuelle — principes fondateurs

Fly Horizons incarne **le luxe accessible de l'aviation légère** : précision, confiance, liberté. L'esthétique est "premium minimal éditorial" — jamais clinquante, jamais générique. Chaque choix graphique exprime sérieux et émotion sans fioriture.

### Piliers visuels
1. **Photo-dominant** — les images de vol et de paysages priment sur les illustrations
2. **Contraste fort** — navy profond / gold lumineux / blanc pur, jamais de gris intermédiaire dominant
3. **Typographie massive** — les titres sont gros (font-black), les corps restent petits et aérés
4. **Sobriété des effets** — ombres subtiles uniquement, pas de dégradés complexes sur les couleurs de marque

---

## 2. Couleurs

### Palette principale

| Rôle | Nom | Hex | Notes |
|------|-----|-----|-------|
| Primaire | Gold | `#F2B705` | CTA, overlines, prix, accent |
| Primaire hover | Gold foncé | `#e6a800` | Survol boutons gold |
| Fond | Navy | `#0b2238` | Footer, sections hero inversées, sidebar admin |
| Texte principal | Foreground | `#1e2535` | Corps de texte sur fond clair |
| Page | Background | `#f5f5f7` | Fond de page standard |
| Surface | Card | `#ffffff` | Cards, inputs, modales |
| Bordures | Border | `#e0e5ef` | Toutes les bordures de card/input |
| Secondaire | Muted | `#edf0f7` | Fond inputs, hover nav |
| Texte doux | Muted fg | `#64748b` | Descriptions secondaires |
| Succès | Green | `#22c55e` | Badges confirmé, payé |
| Erreur | Red | `#ef4444` | Annulations, alertes |

### Règles absolues couleurs

- **Jamais de fond navy plein sur une page interne** — utiliser `#f5f5f7` ou `#ffffff`
- **Navy (`#0b2238`) uniquement** en footer, sidebar admin, sections hero sur fond photo, et cards sombres d'accentuation
- **Gold (`#F2B705`) uniquement** pour les CTA, overlines, prix afichés, étoiles
- Le gold ne s'utilise pas comme fond de page étendu, seulement en accent
- L'opacité du navy s'utilise pour les textes secondaires : `rgba(11,34,56, 0.5)` (50%), `0.4` (40%), `0.35` (35%)
- Sur fond navy : textes blancs `#fff`, textes secondaires `rgba(255,255,255, 0.45)`

### Dégradés utilisés

- **Hero image overlay** : `linear-gradient(to bottom, rgba(11,34,56,0.92) 0%, rgba(0,0,0,0.55) 50%, rgba(11,34,56,0.5) 100%)`
- **Card photo (haut vers bas)** : `linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.20) 60%, transparent 100%)`
- **Vague de transition** background→navy : SVG `path d="M0,0 L1440,0 L1440,24 Q720,48 0,24 Z"` fill `#f5f5f7`
- **Vague navy→blanc** : SVG `path d="M0,48 L0,24 Q360,0 720,24 Q1080,48 1440,24 L1440,48 Z"` fill `#ffffff`
- **Séparateur footer** : `linear-gradient(to right, rgba(242,183,5,0.40), rgba(242,183,5,0.10), transparent)`

---

## 3. Typographie

### Police unique : **Poppins** (Google Fonts)

Fly Horizons n'utilise qu'une seule famille typographique. Poppins est chargé en weights 300, 400, 500, 600, 700, 800, 900.

**Import Google Fonts** :
```
https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap
```

### Échelle typographique

| Style | Taille | Weight | Transform | Tracking | Couleur | Usage |
|-------|--------|--------|-----------|----------|---------|-------|
| **Overline** | 10px | 900 (Black) | UPPERCASE | +3px | Gold `#F2B705` | Toujours au-dessus d'un H1/H2 |
| **H1 Hero** | 60–72px | 900 | — | -0.02em | Blanc | Hero uniquement |
| **H1 Page** | 36–48px | 900 | — | -0.02em | Navy / Blanc | Titre principal section |
| **H2 Section** | 20px | 900 | — | — | Navy | Sous-titre card, sidebar |
| **Body** | 14px | 400 | — | — | `#1e2535` | Texte courant |
| **Body muted** | 14px | 400 | — | — | 50% navy | Descriptions |
| **Small** | 12px | 500 | — | — | 50% navy | Notes, légendes |
| **Label interne** | 9–10px | 900 | UPPERCASE | +2px | 40% navy | Étiquettes champs |
| **Prix** | 24–26px | 900 | — | — | Gold (sombre) / Navy (clair) | Afichage tarifaire |
| **Footer heading** | 10px | 700 | UPPERCASE | +2px | Gold | Titres colonnes footer |

### Pattern overline + titre (obligatoire)

Toute section de contenu important suit ce pattern exact :

```
OVERLINE EN GOLD 10px/900/UPPERCASE/+3px
Titre en font-black 36-48px navy ou blanc
```

---

## 4. Composants UI

### 4.1 Boutons

#### Bouton primaire (Gold)
- Fond : `#F2B705`
- Texte : `#0b2238`
- Font : 13–14px, font-black (900)
- Border-radius : 12px (rounded-xl)
- Padding : 14px vertical × 24px horizontal
- Ombre : `0 6px 24px rgba(242,183,5,0.35)`
- Hover : fond `#e6a800`
- Active : `scale(0.98)`

#### Bouton secondaire
- Fond : transparent
- Texte : navy 50%
- Bordure : `1px solid #e0e5ef`
- Font : 600 (semibold)
- Border-radius : 12px
- Hover : texte navy 100%, bordure `rgba(11,34,56,0.20)`

#### Bouton dark (Navy)
- Fond : `#0b2238`
- Texte : blanc
- Border-radius : 12px
- Usage : actions secondaires sur fond clair, liens "en savoir plus"

#### Bouton ghost sur fond sombre (overlay card photo)
- Fond : `rgba(255,255,255,0.12)`
- Bordure : `1px solid rgba(255,255,255,0.18)`
- Texte : blanc
- Hover : fond `#F2B705`, texte `#0b2238`, border transparent
- Transition : 300ms all

### 4.2 Champs de formulaire

- Fond : `#edf0f7`
- Bordure normale : `1px solid #e0e5ef`
- Border-radius : 12px (rounded-xl)
- Padding : 10px × 14px
- Font : 13px, Poppins
- Placeholder : navy 30%
- Focus : `border-color rgba(242,183,5,0.50)`, `box-shadow: 0 0 0 3px rgba(242,183,5,0.15)`
- iOS : font-size forcé à 16px pour éviter le zoom auto

### 4.3 Cards

#### Card standard (blanche)
- Fond : `#ffffff`
- Bordure : `1px solid #e0e5ef`
- Border-radius : 16px (rounded-2xl)
- Ombre : `0 2px 14px rgba(11,34,56,0.07)`
- Hover ombre : `0 8px 32px rgba(11,34,56,0.11)`
- Padding intérieur : 20–24px

#### Card photo-dominant (pack vol)
- Format portrait `3:4`, paysage `4:3` mobile
- Photo en `object-cover` avec overlay gradient bas→haut
- Zoom hover image : `scale(1.06)` sur 700ms ease-out
- Contenu overlay : titre blanc 19–21px/700, prix blanc 24px/900, badge ghost → gold au hover

#### Card sombre (accent navy)
- Fond : `#0b2238`
- Border-radius : 16px
- Texte titres : blanc
- Texte secondaire : `rgba(255,255,255,0.50)`
- Usage : sections hero, header sidebar récapitulatif

#### Card sidebar (2 tons)
- Header : fond `#0b2238`, border-radius top 12px, overline gold
- Body : fond blanc, bordure `#e0e5ef`, border-radius bottom 12px

#### Card témoignage
- Fond : blanc
- Border-radius : 16px (rounded-2xl)
- Padding : 32px (p-8)
- Ombre : `0 2px 20px rgba(0,0,0,0.06)`
- Guillemet décoratif : 88px, Georgia serif, or/12%, coin haut droit
- Étoiles : remplissage gold `#F2B705`
- Avatar auteur : cercle navy `#0b2238`, initiale blanche, 36×36px

### 4.4 Badges / Statuts

| Type | Fond | Texte | Bordure | Usage |
|------|------|-------|---------|-------|
| Gold | `rgba(242,183,5,0.12)` | `#b88a00` | `rgba(242,183,5,0.30)` | Voucher, vol sur mesure |
| Navy | `rgba(11,34,56,0.07)` | `#0b2238` | `rgba(11,34,56,0.12)` | Défaut, annulation 48h |
| Green | `rgba(34,197,94,0.10)` | `#15803d` | `rgba(34,197,94,0.20)` | Confirmé, payé |
| Red | `rgba(239,68,68,0.10)` | `#b91c1c` | `rgba(239,68,68,0.20)` | Annulé |

Tous les badges : `border-radius: 999px`, padding `3px × 10px`, font `10px font-bold`.

### 4.5 Badge flottant "X min" (card vol)
- Fond : `rgba(0,0,0,0.40)` + backdrop-blur
- Bordure : `rgba(255,255,255,0.20)`
- Border-radius : 8px (rounded-lg)
- Texte : `#F2B705`, 15px, font-black
- Position : top-left de la card photo

### 4.6 Badge "Le plus offert"
- Fond : `#F2B705`
- Texte : `#0b2238`, 11px, font-black, UPPERCASE
- Border-radius : 8px
- Position : top-right de la card photo

### 4.7 Icône box
- Taille : 40×40px (w-10 h-10)
- Border-radius : 12px (rounded-xl)
- Fond : `rgba(242,183,5,0.12)`
- Bordure : `rgba(242,183,5,0.20)`
- Icône : Lucide React, 18–20px, navy ou gold selon contexte

### 4.8 Header flottant

- Position : `fixed`, décollé du bord : top 8px (md: 14px), côtés 12px (md: 16px)
- Max-width : 1400px, centré
- Fond : blanc (`#ffffff`)
- Bordure : `1px solid #e0e5ef`
- Border-radius : 16px (rounded-2xl)
- Ombre au scroll : `0 8px 32px rgba(11,34,56,0.11)`
- Hauteur : 64px (md: 60px, xs: 56px)

### 4.9 Footer

- Fond : navy `#0b2238`
- Bordure top : `rgba(255,255,255,0.05)`
- Logo : version blanche
- Liens : `rgba(255,255,255,0.45)` → blanc au hover
- Headings colonnes : gold, 10px, font-bold, uppercase, tracking +2px
- Barre bas : `rgba(255,255,255,0.25)`, séparée par `·`
- Séparateur gold : gradient `rgba(242,183,5,0.40) → transparent`

---

## 5. Mise en page (Layout)

### Conteneur
- **Max-width** : 1400px, centré, `margin: 0 auto`
- **Padding mobile** : 16px
- **Padding tablette** : 24px
- **Padding desktop** : 40px

### Structure des pages
- Header fixe → spacer `h-[84px]` en dessous
- Pages courtes (auth, confirmation) : `flex-1 flex items-center justify-center`
- Pages longues : `flex-1` + padding bas `pb-16`

### Grilles produits
- Mobile : 1 colonne
- Tablette : 2 colonnes
- Desktop : 4 colonnes (packs) ou 3 colonnes (items)
- Gap : 12–16px entre cards

### Sections alternées
Les sections alternent fond clair (`#f5f5f7`) et fond blanc (`#ffffff`). Les sections navy sont réservées aux accroches visuelles majeures (vol sur mesure, hero).

Transitions entre sections utilisant des **vagues SVG** :
- Entrée dans une section navy : vague en `#f5f5f7`
- Sortie de la section navy : vague en `#ffffff`

---

## 6. Logos et icônes

### Logos disponibles
| Fichier | Format | Couleur | Usage |
|---------|--------|---------|-------|
| `fly-horizons-logo-navy.svg` | SVG vectoriel | Navy `#0b2238` | Header (fond clair) |
| `fly-horizons-logo-white.svg` | SVG vectoriel | Blanc `#ffffff` | Footer (fond navy), emails |
| `fly-horizons-logo-admin.svg` | SVG vectoriel | Navy | Sidebar admin |
| `logo-email.png` | PNG | Blanc | En-tête emails Resend |
| `logo-fly-horizons-navy.png` | PNG | Navy | Fallback PNG |
| `bimi-logo.svg` | SVG | — | BIMI email (favicon boîte mail) |
| `icone.svg` | SVG vectoriel | Navy + Blanc | Favicon, icône app, app icon |
| `icone.png` | PNG 2149×2149px | Navy + Blanc | Splash screen, Apple icon |

### Description du logo
Logo horizontal composé de :
1. **Symbole** (gauche) : pictogramme avion dans un cadre carré arrondi (border-radius ~30% de la hauteur)
2. **Wordmark** (droite) : "FLY HORIZONS" en capitales Poppins-like, tous les mots sur une ligne

Le symbole est une boussole/avion abstraite avec des ailes stylisées dans un cercle, inséré dans un conteneur carré arrondi.

### Zone de protection logo
Espace minimum autour du logo = hauteur du symbole × 0.5 de chaque côté.

### Usages interdits
- Ne pas déformer (étirer) le logo
- Ne pas changer les couleurs (uniquement navy ou blanc)
- Ne pas utiliser sur fond gold ou coloré
- Ne pas séparer symbole et wordmark pour les supports officiels

---

## 7. Images

### Photographies principales
| Fichier | Usage |
|---------|-------|
| `photo-pilote.jpg` | Portrait Romain (section "Votre pilote") |
| `photo-pilote.png` | Variante PNG |
| `da-40.webp` | DA-40 Diamond Star (photo principale avion) |
| `da-40-seats.webp` | Intérieur/sièges avion |
| `da-40-white.webp` | Avion sur fond blanc |
| `vol-sur-mesure.png` | Screenshot configurateur vol sur mesure |
| `gallery/1-11` | Galerie de vols (PNG + JPG) |
| `access-ebci/` | Accès aéroport Charleroi (plan, étapes, meeting point) |

### Style photographique
- **Lumière naturelle** — ciel dégagé, lumière dorée de fin de journée de préférence
- **Angle** — vues aériennes, 3/4 de l'avion, paysages belges reconnaissables
- **Traitement** — naturel, pas de filtre instagram, contrastes modérés
- **Pas de stock photos génériques** — tout doit être authentique à Fly Horizons

### Traitement sur fond dark (card photo)
Les photos de vols s'utilisent toujours avec un gradient overlay `from-black/92 via-black/20 to-transparent` (bas vers haut) pour garantir la lisibilité du texte posé dessus.

---

## 8. Voix de marque (Tone of Voice)

| Contexte | Voix | Exemple |
|----------|------|---------|
| Site public | "nous" | "Nous vous attendons à Charleroi EBCI." |
| Emails directs | "je" | "Je vous enverrai l'itinéraire sous 24 h." |
| Étapes personnalisées | "votre pilote" | "Votre pilote vérifiera l'espace aérien." |
| Mentions du fondateur | "Romain" | "Romain, pilote et fondateur de Fly Horizons" |

### Règles de ponctuation
- Ponctuation naturelle : virgule, point, point-virgule, deux-points
- **Jamais de tiret cadratin** (–)
- Guillemets français quand nécessaire : « »
- "Fly Horizons" uniquement dans les métadonnées SEO, **jamais dans le corps du texte**

### Adjectifs de marque à utiliser
- Accessible, humain, précis, confiant
- Liberté, émotion, découverte, unique

### À éviter
- Vocabulaire trop technique aviation
- Promesses excessives ou superlatifs creux
- Ton corporate/impersonnel

---

## 9. Règles d'impression

Pour les supports imprimés (flyers, affiches, cartes de visite) :

### Profil couleur
- Mode : **CMJN** pour l'impression offset ; **RVB** pour le digital
- Navy `#0b2238` → CMJN approx. : C=95 M=70 J=35 N=25
- Gold `#F2B705` → CMJN approx. : C=0 M=25 J=100 N=5
- Fond blanc : papier blanc naturel non plastifié recommandé

### Typographie pour print
- Poppins disponible en OTF/TTF via Google Fonts (téléchargement offline)
- Corps texte : minimum 8pt
- Overlines : minimum 7pt

### Espace blanc
Fly Horizons est une marque premium — préférer moins d'éléments avec plus d'espace blanc plutôt que de surcharger.

### Supports recommandés
- **Fond de page** : blanc pur ou gris très léger (#f5f5f7 → 97% blanc)
- **Titres** : navy `#0b2238` sur fond clair, blanc sur fond dark
- **CTA print** : fond gold, texte navy, jamais de CTA sur fond gris

---

## 10. Applications courantes

### Flyer A5
```
[Logo navy en haut à gauche]
                              [Overline gold UPPERCASE petit]
[Photo pleine largeur 60%]    [H1 navy font-black]
                              [Texte corps navy 50%]
                              [Bouton-simulé : rectangle gold]
[Barre bas navy]
[URL + contact blanc]
```

### Carte de visite 90×50mm
- Recto : logo blanc centré sur fond navy, tagline blanc/45% sous le logo
- Verso : fond blanc, nom Romain noir/900, titre navy/50%, email + WhatsApp navy
- Micro-texte : 7pt Poppins regular

### Bannière digitale
- Toujours fond navy ou fond photo sombre
- Logo version blanche en haut
- Overline gold + titre blanc font-black
- CTA gold en bas

---

## 11. Ce que ce dossier contient

```
brand_export/
├── brand.md           ← Ce fichier (référence complète)
├── colors.json        ← Tous les tokens couleur
├── typography.json    ← Échelle typographique complète
├── spacing.json       ← Rayons, marges, grilles, breakpoints
├── components.html    ← Guide composants interactif (imprimable)
├── logo/
│   ├── fly-horizons-logo-navy.svg
│   ├── fly-horizons-logo-white.svg
│   ├── fly-horizons-logo-admin.svg
│   ├── logo-email.png
│   ├── logo-fly-horizons-navy.png
│   └── bimi-logo.svg
├── icons/
│   ├── icone.svg
│   └── icone.png
├── images/
│   ├── photo-pilote.jpg
│   ├── da-40.webp
│   ├── da-40-seats.webp
│   ├── da-40-white.webp
│   ├── vol-sur-mesure.png
│   └── gallery/   (photos de vols)
└── screenshots/
    └── [captures depuis fly-horizons.com à faire par le demandeur]
```

---

*Fly Horizons · fly-horizons.com · DESTANBERG Romain · info@fly-horizons.com*
