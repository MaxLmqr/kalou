import type { ReactNode } from 'react';
import { Pressable, View, type ViewProps } from 'react-native';

import { useTheme } from '@/design';

import { Text } from './text';

export type BigNumberProps = ViewProps & {
  /** Déjà formaté (voir `@/design/format`). */
  value: string;
  /** « calories restantes », « calories au-dessus ». */
  label: string;
  /** Mention d'incertitude affichée sous le libellé. */
  note?: string;
};

/**
 * Le chiffre unique (docs/01, principe « un seul chiffre »).
 * Un seul par écran — sinon la hiérarchie n'existe plus.
 */
export function BigNumber({ value, label, note, style, ...rest }: BigNumberProps) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${value} ${label}`}
      style={[{ alignItems: 'center', gap: theme.spacing.xs }, style]}
      {...rest}>
      <Text variant="display">{value}</Text>
      <Text variant="body" color="textSecondary">
        {label}
      </Text>
      {note ? (
        <Text variant="caption" color="textMuted" align="center">
          {note}
        </Text>
      ) : null}
    </View>
  );
}

export type StatLineProps = {
  label: string;
  /** Déjà formaté. */
  value: string;
  /** Complément entre parenthèses : « dont 489 par l'activité ». */
  note?: string;
  tone?: 'text' | 'intake' | 'expenditure' | 'textSecondary';
  trailing?: ReactNode;
  /** Rend la ligne tactile : « Besoin » ouvre l'écran de calibration. */
  onPress?: () => void;
};

/**
 * Les lignes de détail sous le chiffre unique : mangé, besoin, apport cible,
 * protéines.
 */
export function StatLine({ label, value, note, tone = 'text', trailing, onPress }: StatLineProps) {
  const theme = useTheme();

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: theme.spacing.sm,
        minHeight: 26,
      }}>
      {/*
        Le libellé ne se coupe pas et ne passe pas à la ligne : c'est la note qui
        cède la place. Une note un peu plus longue que prévu avait suffi à
        casser « Besoin » en « Beso / in ».
      */}
      <Text variant="body" color="textSecondary" numberOfLines={1}>
        {label}
      </Text>
      {note ? (
        <Text
          variant="caption"
          color="textMuted"
          numberOfLines={1}
          style={{ flex: 1, textAlign: 'right' }}>
          {note}
        </Text>
      ) : null}
      {note ? null : <View style={{ flex: 1 }} />}
      <Text variant="bodyMedium" color={tone} tabular>
        {value}
      </Text>
      {trailing}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${value}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? theme.motion.pressedOpacity : 1 })}>
      {content}
    </Pressable>
  );
}
