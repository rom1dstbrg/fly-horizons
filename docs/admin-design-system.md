# Admin Design System — Fly Horizons

Architecture de référence pour toutes les pages et composants du back-office (`/admin`).

---

## 1. Structure standard d'une page admin

```tsx
// app/admin/ma-page/page.tsx  (Server Component)
import { PageHeader } from "@/components/admin/PageHeader";
import { StatGrid, StatCard, PageTabs, PageToolbar, EmptyState, FormSection, AdminBadge, /* … */ } from "@/components/admin/ui";
import { MonClient } from "@/components/admin/MonClient";  // Client Component si besoin

export default async function Page() {
  const data = await fetchData();

  return (
    <div className="space-y-6">
      <PageHeader title="…" subtitle="…" action={<…/>} />
      <StatGrid cols={4}>
        <StatCard … />
      </StatGrid>
      <MonClient data={data} />
    </div>
  );
}
```

**Règles immuables :**
- Le `<div className="space-y-6">` est l'unique wrapper racine — jamais de padding/margin supplémentaire sur le wrapper.
- `PageHeader` toujours en premier enfant.
- Les KPI/stats toujours via `StatGrid` + `StatCard`, jamais via des grids ad hoc.
- La logique serveur (fetch Supabase, calculs) reste dans les Server Components. Les Client Components (`"use client"`) ne reçoivent que des props.

---

## 2. Composants UI disponibles

Tous les composants sont exportés depuis `@/components/admin/ui` (barrel `index.ts`).

### `PageHeader`

> Importé depuis `@/components/admin/PageHeader` (pas dans le barrel)

```tsx
<PageHeader
  title="Titre de la page"
  subtitle="Description courte"
  action={<Button>Action principale</Button>}  // optionnel
/>
```

### `StatGrid` + `StatCard`

```tsx
<StatGrid cols={4}>
  <StatCard
    label="Libellé"
    value="42"
    variant="success"    // voir variants ci-dessous
    icon={Users}
    subtitle="sous-titre optionnel"
    href="/admin/clients" // rend la carte cliquable + chevron
  />
</StatGrid>
```

**Variants disponibles :** `primary` (navy) · `gold` · `success` (vert) · `warning` (jaune) · `danger` (rouge) · `info` (bleu) · `neutral` (gris) · `orange` · `emerald` · `purple`

**Règle icône :** toujours un `LucideIcon`. Pour les icônes custom SVG, caster : `icon={MonIcon as unknown as typeof CreditCard}`.

### `AdminBadge`

Badge de statut. **Toujours via `AdminBadge`, jamais via un `<span>` inline coloré.**

```tsx
import { AdminBadge, STATUT_RESA, STATUT_ORDER /*, … */ } from "@/components/admin/ui";

const statut = STATUT_RESA[r.statut] ?? { label: r.statut, variant: "secondary" as const };
<AdminBadge variant={statut.variant} label={statut.label} />
```

**Maps de statuts disponibles (toutes dans `ui/AdminBadge.tsx`) :**

| Export | Usage |
|--------|-------|
| `STATUT_RESA` | Réservations régulières |
| `STATUT_PERSO` | Vols sur mesure |
| `STATUT_ORDER` | Commandes boutique |
| `STATUT_VOUCHER` | Vouchers |
| `STATUT_CONTACT` | Tickets contact |
| `PAYMENT_STATUS_CONFIG` | Statut paiement (format `{label, color}`) |
| `ACTION_LABELS` | Labels d'actions dans l'historique |

**Variants badge :** `warning` · `info` · `success` · `primary` · `danger` · `secondary` · `orange` · `emerald`

**Exception acceptée :** `PAYMENT_STATUS_CONFIG` utilise des classes Tailwind brutes (format `{label, color: "bg-… text-… border …"}`) car les couleurs ne correspondent pas aux variants AdminBadge. Usages légitimes dans `ReservationDrawer` et `VolsPersoClient`.

### `PageTabs`

```tsx
<PageTabs
  tabs={[
    { key: "reservations", label: "Réservations" },
    { key: "sur-mesure",   label: "Vols sur mesure" },
  ]}
  active={tab}
  onChange={setTab}
/>
```

### `PageToolbar`

Barre d'outils avec recherche + filtres.

```tsx
<PageToolbar
  search={search}
  onSearch={setSearch}
  placeholder="Rechercher…"
  right={<Button>…</Button>}
>
  <FilterChip label="Tous" active={!filter} onClick={() => setFilter("")} />
  <FilterChip label="Actifs" active={filter === "actif"} onClick={() => setFilter("actif")} />
</PageToolbar>
```

### `AdminSheet`

Drawer latéral pour créer/éditer — **remplace toute modale inline**.

```tsx
<AdminSheet open={open} onClose={() => setOpen(false)} title="Nouveau …">
  <SheetSection title="Informations">
    <SheetRow label="Nom" value={…} />
  </SheetSection>
</AdminSheet>
```

### `AdminRowActions`

Menu d'actions en fin de ligne de tableau.

```tsx
<AdminRowActions
  onEdit={() => …}
  onDelete={() => …}
  extraActions={[
    { label: "Voir détail", icon: Eye, onClick: () => … },
  ]}
/>
```

### `EmptyState`

```tsx
<EmptyState
  icon={Inbox}
  title="Aucun élément"
  description="Les éléments apparaîtront ici."
/>
```

### `FormSection` · `FormGrid` · `FormField` · `FormFooter`

Pour les formulaires dans les drawers et les pages de création.

```tsx
<FormSection title="Informations client">
  <FormGrid cols={2}>
    <FormField label="Prénom">
      <input … />
    </FormField>
    <FormField label="Nom">
      <input … />
    </FormField>
  </FormGrid>
</FormSection>
<FormFooter>
  <Button type="submit">Enregistrer</Button>
</FormFooter>
```

---

## 3. Organisation des fichiers

```
components/admin/
├── ui/                     ← Design System (immuable, partagé)
│   ├── index.ts            ← barrel unique, tout passe par là
│   ├── AdminBadge.tsx      ← badges + constantes statuts
│   ├── AdminRowActions.tsx
│   ├── AdminSheet.tsx
│   ├── StatCard.tsx
│   ├── StatGrid.tsx
│   ├── PageTabs.tsx
│   ├── PageToolbar.tsx
│   ├── EmptyState.tsx
│   ├── FilterChip.tsx
│   ├── FormSection.tsx
│   ├── FormGrid.tsx
│   ├── FormField.tsx
│   └── FormFooter.tsx
├── PageHeader.tsx          ← hors barrel (import direct)
├── CommandPalette.tsx      ← palette Ctrl+K
├── AdminSidebar.tsx
├── [FonctionnaliteClient].tsx  ← Client Components métier
└── [FonctionnaliteForm].tsx
```

**Règle d'import :**
```tsx
// ✅ Correct
import { AdminBadge, StatCard, EmptyState } from "@/components/admin/ui";
import { PageHeader } from "@/components/admin/PageHeader";

// ❌ Interdit — import direct hors barrel
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
// (exception tolérée pour les fichiers qui importent PAYMENT_STATUS_CONFIG
//  ou ACTION_LABELS car ils ne passent pas encore par le barrel)
```

---

## 4. Règles de design

### Couleurs

| Usage | Valeur |
|-------|--------|
| Fond de page | `bg-white` ou `bg-[#f5f8ff]` |
| Accents UI | `navy` (`#0b2238`) uniquement |
| Texte principal | `text-foreground` |
| Texte secondaire | `text-muted-foreground` |
| Bordures | `border-border` |
| Fond carte | `bg-card` |

**Interdit :** grands blocs `bg-navy` en fond de page ou en hero.

### Boutons

```tsx
// Action principale
<Button className="bg-navy text-white hover:bg-navy/90 cursor-pointer">…</Button>

// Action secondaire
<Button variant="outline" className="cursor-pointer">…</Button>

// Destructive
<Button variant="destructive" className="cursor-pointer">…</Button>
```

**Toujours `cursor-pointer`** sur tout élément interactif — bouton, icône d'action, ligne de tableau cliquable.

### Tableaux

Structure type :
```tsx
<div className="bg-card rounded-xl border border-border overflow-hidden">
  <table className="w-full text-sm">
    <thead className="border-b border-border bg-secondary/30">
      <tr>
        <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">…</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-border">
      <tr className="hover:bg-secondary/30 transition-colors">
        <td className="px-4 py-3">…</td>
        <td className="px-4 py-3 text-right">
          <AdminRowActions … />
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## 5. Patterns interdits

| Interdit | Raison | Alternative |
|----------|--------|-------------|
| `<span className="inline-flex … bg-green-…">` | Duplication du badge | `<AdminBadge>` |
| `<h1 className="text-2xl font-bold">` | Duplication du header | `<PageHeader>` |
| `<h2 className="text-lg font-semibold">` | Duplication du titre de section | `<FormSection title="…">` |
| `<div className="grid grid-cols-4 gap-4">` pour des KPIs | Duplication de StatGrid | `<StatGrid cols={4}>` |
| Constante locale `STATUT_XXX` avec labels et couleurs | Duplication des maps centrales | Importer depuis `@/components/admin/ui` |
| `SectionTitle`, `KPICard`, `SectionHeader` locaux | Duplication des composants DS | Composants DS |

---

## 6. Exceptions documentées

Ces cas dérogent intentionnellement au DS et **ne doivent pas être "corrigés"** :

1. **`analytics/page.tsx` — KPI cards doubles** : chaque carte affiche deux métriques (visiteurs uniques + pages vues) dans une seule cellule. `StatCard` n'accepte qu'une valeur. Gardé en `<div>` custom dans `<StatGrid>`.

2. **`reservations/new-mesure/page.tsx`** : page non migrée — contient un composant Leaflet/état complexe (`AdminVolMesureFlow`). Hors scope de la migration DS.

3. **`PAYMENT_STATUS_CONFIG`** : format `{label, color}` avec classes Tailwind brutes — utilisé pour les badges paiement inline qui ne correspondent pas aux variants `AdminBadge`. Centralisé dans `AdminBadge.tsx` et réexporté via le barrel.

4. **`STATUT_MAP` dans `ReservationDrawer`** : merge de `STATUT_RESA` + `STATUT_PERSO` avec un override `acompte_recu` intentionnel (label "Payé", variant "emerald"). L'override justifie la définition locale.

5. **`STATUS_COLOR` dans `ReservationCalendar`** : map de couleurs de fond pour les cellules du calendrier — génère des classes CSS, pas des `<span>`. `AdminBadge` ne peut pas s'y substituer.

6. **`PremiumPlaneIcon`** : SVG custom utilisé comme `LucideIcon` avec cast `as unknown as typeof CreditCard`. Seul usage d'un type cast dans le DS.

---

## 7. Checklist migration d'une nouvelle page

Avant de valider une migration :

- [ ] `PageHeader` en premier enfant du wrapper `space-y-6`
- [ ] Toutes les stats/KPIs via `StatGrid` + `StatCard`
- [ ] Tous les badges de statut via `AdminBadge` + maps centrales
- [ ] Toutes les sections titrées via `FormSection`
- [ ] États vides via `EmptyState`
- [ ] Drawers via `AdminSheet`
- [ ] Actions de ligne via `AdminRowActions`
- [ ] Filtres via `PageToolbar` + `FilterChip`
- [ ] Aucun `<h1>` / `<h2>` brut
- [ ] Aucune constante de statut dupliquée localement
- [ ] `cursor-pointer` sur tous les éléments interactifs
- [ ] Zero modification de logique métier (Server Actions, requêtes Supabase, calculs)
