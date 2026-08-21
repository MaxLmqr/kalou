import { palette } from './tokens';

const { neutral, sage, slate } = palette;

/**
 * Couleurs sémantiques. Les écrans n'utilisent jamais `palette` directement :
 * ils nomment un rôle, ce qui garde clair et sombre cohérents par construction.
 */
export type ThemeColors = {
  /** Fond de l'écran. */
  background: string;
  /** Fond d'une carte ou d'une feuille posée sur l'écran. */
  surface: string;
  /** Fond d'un élément creusé dans une surface (piste, champ, vignette). */
  surfaceSunken: string;
  /** Fond d'un élément pressé. */
  surfacePressed: string;

  /** Séparateur discret. */
  border: string;
  /** Contour d'un contrôle interactif. */
  borderStrong: string;

  /** Texte principal. */
  text: string;
  /** Texte de détail : les trois lignes sous le chiffre unique. */
  textSecondary: string;
  /** Texte effacé : unités, horodatages, mentions. */
  textMuted: string;
  /** Texte posé sur `accent`. */
  textOnAccent: string;

  /** Accent unique de l'application. */
  accent: string;
  /** Accent pressé. */
  accentPressed: string;
  /** Fond teinté d'accent, pour un aplat calme. */
  accentSurface: string;

  /** Apports (repas, boissons). */
  intake: string;
  /** Dépense (BMR, NEAT, activités). */
  expenditure: string;

  /**
   * État provisoire : estimation en attente, valeur saisie à la main plutôt que
   * lue dans la base. Volontairement proche du neutre — c'est un signal, pas une
   * alerte.
   */
  pending: string;
  pendingSurface: string;

  /**
   * Le seul ton d'avertissement de la palette. Réservé au plancher calorique
   * de sécurité (docs/02). Jamais pour un apport cible dépassé.
   */
  caution: string;
  cautionSurface: string;

  /** Voile derrière une feuille modale. */
  scrim: string;
  /** Ombre portée (iOS). */
  shadow: string;
};

export const lightColors: ThemeColors = {
  background: neutral[25],
  surface: neutral[0],
  surfaceSunken: neutral[50],
  surfacePressed: neutral[100],

  border: neutral[100],
  borderStrong: neutral[200],

  text: neutral[900],
  textSecondary: neutral[600],
  textMuted: neutral[400],
  textOnAccent: neutral[0],

  accent: sage[600],
  accentPressed: sage[700],
  accentSurface: sage[100],

  intake: sage[600],
  expenditure: slate[500],

  pending: neutral[400],
  pendingSurface: neutral[100],

  caution: '#8A6420',
  cautionSurface: '#F6EEDD',

  scrim: 'rgba(22, 22, 21, 0.32)',
  shadow: '#161615',
};

export const darkColors: ThemeColors = {
  background: neutral[950],
  surface: neutral[850],
  surfaceSunken: neutral[900],
  surfacePressed: neutral[800],

  border: neutral[800],
  borderStrong: neutral[700],

  text: neutral[25],
  textSecondary: neutral[300],
  textMuted: neutral[500],
  textOnAccent: neutral[950],

  accent: sage[400],
  accentPressed: sage[200],
  accentSurface: sage[900],

  intake: sage[400],
  expenditure: slate[400],

  pending: neutral[500],
  pendingSurface: neutral[800],

  caution: '#D9A855',
  cautionSurface: '#2A2314',

  scrim: 'rgba(0, 0, 0, 0.56)',
  shadow: '#000000',
};

export type ColorSchemeName = 'light' | 'dark';

export const themes: Record<ColorSchemeName, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};

/**
 * Élévation. Deux niveaux seulement : ce qui est posé sur l'écran (carte) et
 * ce qui flotte au-dessus (bouton d'action, feuille). En sombre, l'ombre ne
 * porte pas : c'est la bordure qui fait la séparation.
 */
export function elevation(scheme: ColorSchemeName, level: 0 | 1 | 2) {
  if (level === 0) return {};
  if (scheme === 'dark') {
    return { borderWidth: 1, borderColor: themes.dark.border };
  }
  const config =
    level === 1
      ? { radius: 8, offsetY: 2, opacity: 0.05, elevation: 2 }
      : { radius: 20, offsetY: 8, opacity: 0.1, elevation: 8 };
  return {
    shadowColor: themes.light.shadow,
    shadowOffset: { width: 0, height: config.offsetY },
    shadowRadius: config.radius,
    shadowOpacity: config.opacity,
    elevation: config.elevation,
  };
}
