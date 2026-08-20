import { Pressable, View } from 'react-native';

import { useTheme } from '@/design';

import { Icon } from './icon';
import { Text } from './text';

export type StepperProps = {
  /** Déjà formaté : « 82,1 », « 45 min ». */
  value: string;
  /** Unité ou précision sous la valeur : « kilos », « dernière durée utilisée ». */
  note?: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
  /** `display` pour une pesée, `numberLarge` pour une durée. */
  variant?: 'display' | 'numberLarge';
};

/**
 * Sélecteur à deux boutons.
 *
 * Préféré au clavier numérique partout où la valeur de départ est déjà la
 * bonne à un cran près — pesée, durée d'activité : docs/03 § 1.4 et § 1.5
 * demandent un tap pour valider, pas une saisie.
 */
export function Stepper({
  value,
  note,
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
  variant = 'display',
}: StepperProps) {
  const theme = useTheme();
  const size = variant === 'display' ? theme.hitSize.lg : theme.hitSize.md;

  const button = (label: string, icon: 'minus' | 'plus', onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: theme.radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? theme.colors.surfacePressed : theme.colors.surfaceSunken,
      })}>
      <Icon name={icon} size={20} strokeWidth={2.2} />
    </Pressable>
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
      {button(decrementLabel, 'minus', onDecrement)}
      <View style={{ flex: 1, alignItems: 'center', gap: theme.spacing.xs }}>
        <Text variant={variant}>{value}</Text>
        {note ? (
          <Text variant={variant === 'display' ? 'body' : 'caption'} color={variant === 'display' ? 'textSecondary' : 'textMuted'}>
            {note}
          </Text>
        ) : null}
      </View>
      {button(incrementLabel, 'plus', onIncrement)}
    </View>
  );
}
