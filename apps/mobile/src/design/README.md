# Design system

Système visuel de Kalou. Trois principes de [docs/01](../../../../docs/01-vision-et-perimetre.md)
le contraignent, et rien d'autre ne devrait le faire évoluer :

| Principe | Conséquence visuelle |
|---|---|
| Un seul chiffre | Une seule variante `display`, réservée aux calories restantes. Tout le reste redescend d'un cran. |
| Sans jugement | Aucun rouge, aucun vert de statut. Le dépassement se dit en toutes lettres, la barre ne change pas de couleur. |
| Honnête sur l'incertitude | Un rôle de couleur `pending` et un `Badge tone="pending"` dédiés aux états provisoires. |

## Organisation

```
src/design/
  tokens.ts          Valeurs brutes : palette, espacement, rayons, typographie, mouvement
  theme.ts           Rôles sémantiques (clair / sombre) + élévation
  theme-provider.tsx <ThemeProvider> et useTheme()
  format.ts          Mise en forme des nombres (kcal, kg, durées, dates)

src/components/ui/   Primitives, toutes réexportées par @/components/ui
```

## Règles d'usage

**Ne jamais écrire une couleur en dur, ni importer `palette`.** Les écrans passent
par `useTheme().colors` et nomment un rôle (`textSecondary`, `expenditure`…).
C'est ce qui garantit que le mode sombre reste correct sans relecture.

**Ne jamais écrire un espacement en dur.** `theme.spacing.lg`, pas `16`.

**Un seul `<BigNumber>` par écran.** S'il en faut deux, c'est que la hiérarchie
de l'écran est à revoir, pas le composant.

**Les nombres passent par `@/design/format`.** Séparateur de milliers en espace
insécable, vrai signe moins, kilos au dixième : ces règles sont dans
[docs/03 § 8](../../../../docs/03-parcours-utilisateur.md) et n'ont pas à être
réimplémentées écran par écran.

**`caution` est réservé au plancher calorique de sécurité.** C'est le seul
avertissement de la palette. L'utiliser ailleurs casse le principe « sans jugement ».

## Primitives

| Composant | Rôle |
|---|---|
| `Screen`, `Section` | Conteneur d'écran (zone sûre, gouttière, largeur max) et regroupement titré |
| `Text` | Toute la typographie. `variant` + `color`, chiffres tabulaires automatiques |
| `Surface`, `PressableSurface` | Carte posée, bloc creusé, aplat d'accent ; version tactile avec état sélectionné |
| `Button`, `Fab` | Action principale / secondaire / tertiaire, et bouton d'action flottant |
| `BigNumber`, `StatLine` | Le chiffre unique et les lignes de détail sous lui |
| `Row` | Ligne du journal du jour : heure, libellé, valeur, pastille |
| `ProgressBar` | Consommation du budget, dépassement inclus, sans changement de couleur |
| `Badge`, `PendingDot` | États : estimation, mesuré, en pause, plancher |
| `Input` | Saisie texte ou numérique avec unité |
| `Divider` | Séparateur d'un cheveu |

## Icônes

Aucune bibliothèque d'icônes n'est installée. Les composants qui en ont besoin
(`Button`, `Fab`, `Row`) exposent un emplacement (`icon`, `trailing`, `children`)
plutôt que d'imposer un jeu d'icônes — le choix reste ouvert (`expo-symbols` côté
iOS, ou un jeu vectoriel commun).

## Aperçu

`src/app/index.tsx` est, pour l'instant, l'aperçu du système : maquette fidèle de
l'accueil, puis catalogue des primitives. Il sera remplacé par l'accueil réel au
jalon 1 de [docs/07](../../../../docs/07-roadmap.md).
