/**
 * Kalou — jetons de design.
 *
 * Valeurs brutes, sans notion de thème clair/sombre. Les couleurs sémantiques
 * (ce qu'on utilise dans les écrans) sont dans `theme.ts`.
 *
 * Trois contraintes issues de docs/01 et docs/03 gouvernent ces valeurs :
 *  — « un seul chiffre » : une échelle typographique avec un vrai display isolé,
 *    très au-dessus du reste, pour que la hiérarchie soit non ambiguë ;
 *  — « sans jugement » : pas de rouge ni de vert de statut dans la palette.
 *    Dépasser son apport cible est une information, ça se dit avec du texte ;
 *  — « honnête sur l'incertitude » : une teinte discrète dédiée aux états
 *    provisoires (estimation en attente, apport cible non calibré).
 */
import { Platform } from 'react-native';

/** Neutres chauds. Base de toute l'interface. */
const neutral = {
  0: '#FFFFFF',
  25: '#FBFBF9',
  50: '#F4F4F0',
  100: '#EAEAE4',
  200: '#DCDCD4',
  300: '#C4C4BA',
  400: '#9A9A91',
  500: '#78786F',
  600: '#5C5C55',
  700: '#3D3D38',
  800: '#262623',
  850: '#1D1D1B',
  900: '#161615',
  950: '#0F0F0E',
} as const;

/** Accent unique : vert sauge profond. Calme, non alimentaire, non alarmant. */
const sage = {
  100: '#E3EFE9',
  200: '#C2DCD1',
  400: '#5FA88F',
  500: '#3D8368',
  600: '#2F6A54',
  700: '#255443',
  900: '#17322A',
} as const;

/** Bleu ardoise : sert uniquement à distinguer la dépense de l'apport. */
const slate = {
  100: '#E2E9EF',
  200: '#C3D4E1',
  400: '#7C9EBA',
  500: '#4F718D',
  600: '#3D5A72',
} as const;

export const palette = { neutral, sage, slate } as const;

export const spacing = {
  none: 0,
  /** 4 — respiration interne d'un élément dense */
  xs: 4,
  /** 8 — entre un libellé et sa valeur */
  sm: 8,
  /** 12 — padding d'un contrôle compact */
  md: 12,
  /** 16 — gouttière d'écran, padding de carte */
  lg: 16,
  /** 24 — entre deux blocs liés */
  xl: 24,
  /** 32 — entre deux sections */
  xxl: 32,
  /** 48 — autour du chiffre unique */
  xxxl: 48,
} as const;

export const radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 28,
  pill: 999,
} as const;

export const borderWidth = {
  hairline: 1,
  thick: 2,
} as const;

/**
 * Hauteur de la barre d'onglets native, **hors** zone sûre du bas.
 *
 * `NativeTabs` ne l'expose pas : un élément flottant (le bouton d'action) doit
 * donc l'additionner à `insets.bottom` pour ne pas passer derrière la barre.
 */
export const tabBarHeight = Platform.select({ ios: 50, android: 80 }) ?? 0;

/** Hauteurs de zone tactile. Plancher iOS/Android : 44. */
export const hitSize = {
  sm: 36,
  md: 44,
  lg: 52,
  fab: 60,
} as const;

/**
 * Famille de caractères — **une seule**, sur toute l'application.
 *
 * Poppins : géométrique, ronde, très lisible en petit corps. Le contraste ne
 * vient donc pas d'un mélange de familles mais des graisses et des tailles, ce
 * qui demande une échelle typographique plus franche — d'où l'écart assumé
 * entre `display` et tout le reste.
 *
 * **Poppins n'a pas de chiffres tabulaires** (aucune fonction `tnum`, et des
 * chasses très inégales : le « 1 » fait 0,29 cadratin contre 0,62 pour le
 * « 0 »). Deux conséquences à connaître avant de s'étonner : le chiffre unique
 * se recompose légèrement quand il change, et une colonne de valeurs n'est pas
 * alignée au chiffre près. `tabular` sur `<Text>` reste sans effet ici.
 *
 * Les chaînes sont les noms sous lesquels `usePolices()` (`design/fonts.ts`)
 * enregistre les fichiers — les deux côtés sont tenus ensemble par une
 * assertion de type là-bas.
 *
 * Ce sont des **fontes statiques, une par graisse**. C'est ce qui impose de
 * nommer une famille par graisse plutôt que d'écrire `fontWeight` : sur Android,
 * la graisse d'une fonte chargée à la main n'est pas synthétisée, et un
 * `fontWeight: '600'` y resterait sans effet.
 */
export const fontFamily = {
  light: 'Poppins_300Light',
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
} as const;

/**
 * Échelle typographique.
 *
 * Les interlignes sont plus généreux qu'ils ne le seraient pour un grotesque
 * neutre : les hampes de Poppins sont longues, et un interligne serré fait se
 * toucher les lignes d'un paragraphe.
 */
export const typography = {
  /** Le chiffre unique de l'accueil, et lui seul. */
  display: {
    fontSize: 64,
    lineHeight: 70,
    fontFamily: fontFamily.light,
    letterSpacing: -1.5,
  },
  /** Chiffre secondaire mis en avant (poids, durée d'une séance, total d'un repas). */
  numberLarge: {
    fontSize: 34,
    lineHeight: 42,
    fontFamily: fontFamily.regular,
    letterSpacing: -0.8,
  },
  /** Titre d'écran, et la date de l'accueil. */
  title: { fontSize: 26, lineHeight: 34, fontFamily: fontFamily.medium, letterSpacing: -0.4 },
  /** Titre de section, titre de feuille. */
  heading: { fontSize: 18, lineHeight: 26, fontFamily: fontFamily.semiBold, letterSpacing: -0.2 },
  /** Texte courant. */
  body: { fontSize: 16, lineHeight: 24, fontFamily: fontFamily.regular },
  bodyMedium: { fontSize: 16, lineHeight: 24, fontFamily: fontFamily.medium },
  /** Libellé de contrôle, ligne de journal. */
  label: { fontSize: 15, lineHeight: 21, fontFamily: fontFamily.medium },
  /** Légende, unité, mention d'incertitude. */
  caption: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily.regular },
  /** En-tête de section : petites capitales espacées. */
  overline: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fontFamily.semiBold,
    letterSpacing: 1,
  },
} as const;

export type TypographyVariant = keyof typeof typography;

/**
 * Durées et courbes. Le mouvement sert à expliquer une transition, jamais à
 * décorer : rien ne dure plus de 320 ms.
 */
export const motion = {
  duration: { instant: 90, fast: 140, base: 200, slow: 320 },
  /** À passer à `Easing.bezier(...)` de react-native-reanimated. */
  easing: {
    standard: [0.2, 0, 0, 1] as const,
    decelerate: [0, 0, 0, 1] as const,
    accelerate: [0.3, 0, 1, 1] as const,
  },
  /** Opacité d'un élément pressé. Pas d'effet de survol sur mobile. */
  pressedOpacity: 0.6,
} as const;

/** Largeur maximale du contenu — pertinent en web et sur tablette. */
export const maxContentWidth = 560;
