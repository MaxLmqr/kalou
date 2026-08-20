import { Circle, Path, Rect, Svg } from 'react-native-svg';

import { useTheme, type ThemeColors } from '@/design';

/**
 * Jeu d'icônes de Kalou.
 *
 * Tracé au trait sur une grille de 24, sans aplat : c'est ce qui permet de
 * les teinter par un rôle de couleur et de les mélanger au texte sans qu'elles
 * pèsent plus lourd qu'un libellé. Le jeu est délibérément court — une icône
 * n'entre ici que si un écran la demande.
 */
const paths = {
  /** Onglet « Aujourd'hui ». */
  home: ['M3 10.5 12 3l9 7.5', 'M5.5 9.5V20h13V9.5'],
  /** Onglet « Historique ». */
  chart: ['M4 19V5', 'M4 19h16', 'M7.5 15.5 11 11l3 2.5 4.5-6'],
  /** Onglet « Profil ». */
  person: ['M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5'],
  camera: ['M4 8.5h3l1.5-2.5h7L17 8.5h3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z'],
  search: ['m20 20-4.2-4.2'],
  /** « Ajouter une activité ». */
  run: ['M13 21l-1.5-5.5L8 13l1-5 4-1.5 3 3 3 1', 'M9 8 5.5 10 4 15'],
  /** « Me peser ». */
  scale: ['M8 8V6.5a4 4 0 0 1 8 0V8', 'M12 12v3'],
  plus: ['M12 5v14M5 12h14'],
  minus: ['M5 12h14'],
  close: ['M6 6l12 12M18 6 6 18'],
  check: ['M5 12.5 10 17.5 19 7'],
  chevronRight: ['M9 18l6-6-6-6'],
  chevronLeft: ['M15 18l-6-6 6-6'],
  chevronDown: ['M6 9l6 6 6-6'],
  info: ['M12 8h.01M11 12h1v4h1'],
  caution: ['M12 4.5 21 19.5H3Z', 'M12 10v4M12 17h.01'],
  /** Vignette d'un repas photographié dont l'image n'est pas encore là. */
  image: ['m4 17 5-4.5 4 3.5 3-2.5 4 3.5'],
  /** Estimation par le modèle. */
  sparkle: ['M12 3v3M12 18v3M3 12h3M18 12h3', 'M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1'],
} as const;

/** Cercles à tracer en plus des chemins, pour les icônes qui en ont. */
const circles: Partial<Record<IconName, { cx: number; cy: number; r: number }[]>> = {
  person: [{ cx: 12, cy: 8, r: 3.5 }],
  camera: [{ cx: 12, cy: 13, r: 3.5 }],
  search: [{ cx: 11, cy: 11, r: 6.5 }],
  run: [{ cx: 14.5, cy: 4.5, r: 2 }],
  info: [{ cx: 12, cy: 12, r: 9 }],
};

/** Cadres à angles arrondis, que `Path` ne sait pas tracer. */
const rects: Partial<Record<IconName, { x: number; y: number; width: number; height: number; rx: number }>> = {
  scale: { x: 3, y: 8, width: 18, height: 12, rx: 3 },
  image: { x: 3, y: 5, width: 18, height: 14, rx: 2.5 },
};

export type IconName = keyof typeof paths;

type ColorRole = Extract<
  keyof ThemeColors,
  | 'text'
  | 'textSecondary'
  | 'textMuted'
  | 'textOnAccent'
  | 'accent'
  | 'intake'
  | 'expenditure'
  | 'pending'
  | 'caution'
  | 'borderStrong'
>;

export type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorRole;
  /** Épaisseur du trait. 1,8 au repos, 2,2 pour les gestes (plus, moins). */
  strokeWidth?: number;
};

export function Icon({ name, size = 24, color = 'text', strokeWidth = 1.8 }: IconProps) {
  const theme = useTheme();
  const stroke = theme.colors[color];
  const rect = rects[name];

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {rect ? <Rect {...rect} stroke={stroke} strokeWidth={strokeWidth} /> : null}
      {paths[name].map((d, index) => (
        <Path
          key={index}
          d={d}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {circles[name]?.map((circle, index) => (
        <Circle
          key={`c${index}`}
          cx={circle.cx}
          cy={circle.cy}
          r={circle.r}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      ))}
    </Svg>
  );
}
