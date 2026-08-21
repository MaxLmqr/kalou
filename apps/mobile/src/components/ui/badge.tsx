import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/design';

import { Text } from './text';

type Tone =
  /** Information neutre. */
  | 'neutral'
  /** Estimation en attente, valeur saisie à la main. */
  | 'pending'
  /** Valeur confirmée par l'utilisateur. */
  | 'accent'
  /** Plancher de sécurité atteint — seul usage d'un ton d'avertissement. */
  | 'caution';

export type BadgeProps = ViewProps & {
  label: string;
  tone?: Tone;
};

export function Badge({ label, tone = 'neutral', style, ...rest }: BadgeProps) {
  const theme = useTheme();

  const background =
    tone === 'accent'
      ? theme.colors.accentSurface
      : tone === 'caution'
        ? theme.colors.cautionSurface
        : tone === 'pending'
          ? theme.colors.pendingSurface
          : theme.colors.surfaceSunken;

  const color =
    tone === 'accent'
      ? 'accent'
      : tone === 'caution'
        ? 'caution'
        : tone === 'pending'
          ? 'pending'
          : 'textSecondary';

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: background,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
          borderRadius: theme.radius.pill,
        },
        style,
      ]}
      {...rest}>
      <Text variant="caption" color={color}>
        {label}
      </Text>
    </View>
  );
}

/** Pastille discrète : une entrée dont l'estimation n'est pas encore arrivée. */
export function PendingDot({ size = 6, style, ...rest }: ViewProps & { size?: number }) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel="Estimation en cours"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.pending,
        },
        style,
      ]}
      {...rest}
    />
  );
}
