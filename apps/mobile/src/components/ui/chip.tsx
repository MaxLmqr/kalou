import { Pressable, View } from 'react-native';

import { useTheme } from '@/design';

import { Text } from './text';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Occupe une part égale d'une rangée de chips. */
  grow?: boolean;
};

/**
 * Pastille tactile : une portion domestique, une durée pré-réglée, une quantité.
 * C'est le raccourci qui évite le clavier dans le composeur (docs/08 § 6).
 */
export function Chip({ label, selected = false, onPress, grow }: ChipProps) {
  const theme = useTheme();

  const style = {
    minHeight: theme.hitSize.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexGrow: grow ? 1 : 0,
    flexBasis: grow ? 0 : ('auto' as const),
    borderWidth: theme.borderWidth.thick,
  };

  if (!onPress) {
    return (
      <View
        style={[
          style,
          { backgroundColor: theme.colors.surfaceSunken, borderColor: 'transparent' },
        ]}>
        <Text variant="caption" color="textSecondary" tabular>
          {label}
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        style,
        {
          backgroundColor: selected
            ? theme.colors.accentSurface
            : pressed
              ? theme.colors.surfacePressed
              : theme.colors.surfaceSunken,
          borderColor: selected ? theme.colors.accent : 'transparent',
        },
      ]}>
      <Text variant="caption" color={selected ? 'accent' : 'textSecondary'} tabular>
        {label}
      </Text>
    </Pressable>
  );
}
