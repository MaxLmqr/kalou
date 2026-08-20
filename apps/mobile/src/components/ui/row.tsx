import type { ReactNode } from 'react';
import { Pressable, View, type ViewProps } from 'react-native';

import { useTheme } from '@/design';

import { Text } from './text';

export type RowProps = {
  /** Horodatage à gauche, en chasse fixe : « 08:12 ». */
  time?: string;
  /** Slot libre tout à gauche : l'icône d'une action du menu rapide. */
  leading?: ReactNode;
  title: string;
  /** Précision sous le titre : « estimation », « 45 min ». */
  detail?: string;
  /** Valeur alignée à droite, déjà formatée. */
  value?: string;
  /** Rôle de couleur de la valeur : apport, dépense, sélection, ou neutre. */
  valueTone?: 'text' | 'intake' | 'expenditure' | 'textMuted' | 'accent';
  /** Slot libre à droite de la valeur (pastille, chevron). */
  trailing?: ReactNode;
  onPress?: () => void;
  style?: ViewProps['style'];
};

/**
 * Ligne du journal du jour (docs/03 § 2) et, plus largement, ligne de liste.
 * Toute la ligne est tactile : modifier une entrée doit être un geste évident.
 */
export function Row({
  time,
  leading,
  title,
  detail,
  value,
  valueTone = 'text',
  trailing,
  onPress,
  style,
}: RowProps) {
  const theme = useTheme();

  const content = (pressed: boolean) => (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          minHeight: theme.hitSize.md,
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          marginHorizontal: -theme.spacing.md,
          borderRadius: theme.radius.md,
          backgroundColor: pressed ? theme.colors.surfacePressed : 'transparent',
        },
        style,
      ]}>
      {leading}
      {time ? (
        <Text variant="caption" color="textMuted" tabular style={{ width: 40 }}>
          {time}
        </Text>
      ) : null}

      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="label" numberOfLines={1}>
          {title}
        </Text>
        {detail ? (
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>

      {value ? (
        <Text variant="label" color={valueTone} tabular>
          {value}
        </Text>
      ) : null}
      {trailing}
    </View>
  );

  if (!onPress) return content(false);

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
}
