import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

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
  onPress?: () => void;
};

/** Les trois lignes de détail sous le chiffre unique : mangé, dépensé, budget. */
export function StatLine({ label, value, note, tone = 'text', trailing }: StatLineProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: theme.spacing.sm,
        minHeight: 26,
      }}>
      <Text variant="body" color="textSecondary" style={{ flex: 1 }}>
        {label}
      </Text>
      {note ? (
        <Text variant="caption" color="textMuted">
          {note}
        </Text>
      ) : null}
      <Text variant="bodyMedium" color={tone} tabular>
        {value}
      </Text>
      {trailing}
    </View>
  );
}
