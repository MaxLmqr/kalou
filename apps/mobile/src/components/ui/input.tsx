import { TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/design';

import { Text } from './text';

export type InputProps = TextInputProps & {
  label?: string;
  /** Unité affichée à droite du champ : « kcal », « kg », « min ». */
  suffix?: string;
  /** Aligne la valeur à droite et passe en chasse fixe (saisie numérique). */
  numeric?: boolean;
};

/**
 * Champ de saisie. Sans bordure au repos : c'est le fond creusé qui signale
 * la zone tactile, ce qui allège les écrans de correction d'estimation.
 */
export function Input({ label, suffix, numeric, style, ...rest }: InputProps) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {label ? (
        <Text variant="caption" color="textSecondary">
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          minHeight: theme.hitSize.lg,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surfaceSunken,
        }}>
        <TextInput
          placeholderTextColor={theme.colors.textMuted}
          keyboardType={numeric ? 'decimal-pad' : 'default'}
          style={[
            theme.typography.body,
            {
              flex: 1,
              color: theme.colors.text,
              textAlign: numeric ? 'right' : 'left',
              fontVariant: numeric ? ['tabular-nums'] : undefined,
              paddingVertical: theme.spacing.md,
            },
            style,
          ]}
          {...rest}
        />
        {suffix ? (
          <Text variant="body" color="textMuted">
            {suffix}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
