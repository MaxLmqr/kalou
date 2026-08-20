import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/design';

export type ProgressBarProps = ViewProps & {
  /** Part consommée du budget. Peut dépasser 1 : la barre l'assume. */
  value: number;
  /** Repère optionnel sur la piste (0 → 1), ex. l'heure courante de la journée. */
  marker?: number;
  height?: number;
};

/**
 * Barre de progression volontairement monochrome (docs/03 § 2).
 *
 * Au-delà de 100 %, elle ne change pas de couleur : le dépassement est rendu
 * par un segment plus dense qui repart de la gauche, pas par une alerte.
 */
export function ProgressBar({ value, marker, height = 6, style, ...rest }: ProgressBarProps) {
  const theme = useTheme();
  const filled = Math.max(0, Math.min(value, 1));
  const overflow = Math.max(0, Math.min(value - 1, 1));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={[
        {
          height,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.surfaceSunken,
          overflow: 'hidden',
          justifyContent: 'center',
        },
        style,
      ]}
      {...rest}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${filled * 100}%`,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.accent,
        }}
      />
      {overflow > 0 ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${overflow * 100}%`,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.accentPressed,
            // Une encoche de la couleur du fond marque le franchissement du
            // budget. Le dépassement reste lisible sans virer à l'alarme.
            borderRightWidth: theme.borderWidth.thick,
            borderRightColor: theme.colors.background,
          }}
        />
      ) : null}
      {marker !== undefined ? (
        <View
          style={{
            position: 'absolute',
            left: `${Math.max(0, Math.min(marker, 1)) * 100}%`,
            width: theme.borderWidth.thick,
            top: 0,
            bottom: 0,
            marginLeft: -theme.borderWidth.thick / 2,
            backgroundColor: theme.colors.background,
            opacity: 0.9,
          }}
        />
      ) : null}
    </View>
  );
}
