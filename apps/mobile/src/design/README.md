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
  fonts.ts           Chargement des fichiers de police au démarrage
  format.ts          Mise en forme des nombres (kcal, kg, durées, dates)

src/components/ui/     Primitives, toutes réexportées par @/components/ui
src/components/charts/ Courbe de poids et balance quotidienne
```

## Règles d'usage

**Ne jamais écrire une couleur en dur, ni importer `palette`.** Les écrans passent
par `useTheme().colors` et nomment un rôle (`textSecondary`, `expenditure`…).
C'est ce qui garantit que le mode sombre reste correct sans relecture.

**Ne jamais écrire un espacement en dur.** `theme.spacing.lg`, pas `16`.

**Un seul `<BigNumber>` par écran.** S'il en faut deux, c'est que la hiérarchie
de l'écran est à revoir, pas le composant.

**Ne jamais écrire `fontFamily` ni `fontWeight`.** La famille est portée par la
`variant` de `<Text>`, et par elle seule. Les fontes sont statiques, une par
graisse : sur Android, un `fontWeight` posé à la main sur une fonte chargée n'est
pas synthétisé et reste sans effet — le texte y paraîtrait plus léger que sur iOS
sans que rien ne le signale.

**Les nombres passent par `@/design/format`.** Séparateur de milliers en espace
insécable, vrai signe moins, kilos au dixième : ces règles sont dans
[docs/03 § 8](../../../../docs/03-parcours-utilisateur.md) et n'ont pas à être
réimplémentées écran par écran.

**`caution` est réservé au plancher calorique de sécurité.** C'est le seul
avertissement de la palette. L'utiliser ailleurs casse le principe « sans jugement ».

## Primitives

| Composant | Rôle |
|---|---|
| `Screen`, `Section` | Conteneur d'écran (zone sûre, gouttière, largeur max) et regroupement titré, avec un bout de ligne libre à droite du titre |
| `Text` | Toute la typographie. `variant` + `color`, chiffres tabulaires automatiques |
| `Surface`, `PressableSurface` | Carte posée, bloc creusé, aplat d'accent ; version tactile avec état sélectionné |
| `Button`, `Fab` | Action principale / secondaire / tertiaire, et bouton d'action flottant |
| `BigNumber`, `StatLine` | Le chiffre unique et les lignes de détail sous lui |
| `Row` | Ligne du journal du jour : heure, libellé, valeur, pastille |
| `ProgressBar` | Consommation de l'apport cible, dépassement inclus, sans changement de couleur |
| `Badge`, `PendingDot` | États : estimation, mesuré, en pause, plancher |
| `Input` | Saisie texte ou numérique avec unité |
| `Stepper` | Sélecteur à deux boutons : pesée, durée d'activité |
| `Chip` | Pastille tactile : portion, durée pré-réglée, quantité |
| `Segmented` | Bascule entre deux vues d'un même contenu (30 j / 90 j) |
| `Sheet` | Contenu d'une feuille modale (la feuille elle-même est native) |
| `ScreenHeader` | En-tête d'écran poussé ou de modale |
| `List` | Carte de lignes séparées d'un cheveu |
| `Icon` | Jeu d'icônes au trait |
| `Divider` | Séparateur d'un cheveu |

## Polices

Deux familles, deux rôles — et le contraste entre elles fait la hiérarchie, ce
qui évite d'empiler les graisses :

| Famille | Rôle | Pourquoi celle-là |
|---|---|---|
| **Geist** | Chiffres et interface. Graisses 300, 400, 500, 600. | Ses chiffres ont un vrai jeu tabulaire (`tnum`) : sans lui, le chiffre unique tremblerait à chaque incrément et la colonne de droite du journal ne s'alignerait pas. |
| **Instrument Serif** | La date de l'accueil et les titres d'écran (`variant="title"`), rien d'autre. | Un serif de titrage donne à la date le poids d'un titre. Il n'a **pas** de chiffres tabulaires : il ne doit donc jamais porter une valeur qui change en place. |

`fonts.ts` charge les cinq fichiers au démarrage et rend la main dès qu'ils sont
prêts — ou dès que le chargement échoue, auquel cas la police système prend le
relais plutôt que de laisser l'application sur son écran de démarrage. La racine
(`app/_layout.tsx`) ne dessine rien avant : un premier rendu en police système
suivi d'un saut typographique se verrait sur chaque écran.

Ajouter une graisse suppose d'ajouter son fichier dans `fonts.ts` **et** de la
citer dans `typography` : le `satisfies` du module tient les deux ensemble, et
une famille sans fichier ne compile pas.

## Icônes

`components/ui/icon.tsx` dessine le jeu au trait de Kalou, sur une grille de 24,
avec `react-native-svg`. Il est **délibérément court** : une icône n'y entre que
si un écran la demande. Les composants qui en ont besoin (`Button`, `Fab`, `Row`)
exposent un emplacement (`icon`, `leading`, `trailing`) plutôt que d'imposer le
jeu, pour qu'un écran puisse y mettre autre chose.

La barre d'onglets fait exception : `NativeTabs` s'appuie sur des vues natives et
ne sait pas afficher un composant React. Ses icônes sont donc des PNG, générés à
partir **des mêmes tracés** par `scripts/build-tab-icons.mjs` :

```
bun run scripts/build-tab-icons.mjs
```

Ne pas les modifier à la main : ajouter le tracé au script, le relancer.

## Charts

`WeightChart` et `BalanceChart` (dans `components/charts/`) sont les deux seules
visualisations de l'application. Deux règles les gouvernent, toutes deux issues du
principe « sans jugement » :

- la balance quotidienne n'a **qu'un seul aplat** : c'est la position par rapport
  à la ligne de zéro qui porte le signe, pas la couleur. Colorer déficit et
  excédent différemment serait un vert / rouge déguisé ;
- la ligne d'objectif de la courbe de poids est une **pente sur la fenêtre
  affichée**, pas une droite vers le poids souhaité — cette dernière écraserait
  l'échelle et ferait passer une vraie perte pour un plateau.

## Aperçu

`src/app/design-system.tsx`, atteignable depuis le profil, est le catalogue des
primitives et le banc d'essai des états rares (apport cible dépassé, estimation en
attente, plancher de sécurité) — ceux qu'on ne veut pas avoir à provoquer dans
l'application pour les relire.
