import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme, type ThemeColors, type TypographyVariant } from '@/design';

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
>;

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  color?: ColorRole;
  align?: TextStyle['textAlign'];
  /**
   * Chiffres à chasse fixe. Indispensable partout où une valeur change en
   * place (compteur de calories restantes, durée d'activité) : sans cela le
   * chiffre tremble à chaque incrément.
   */
  tabular?: boolean;
};

export function Text({
  variant = 'body',
  color = 'text',
  align,
  tabular,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const base = theme.typography[variant];
  const isNumeric = variant === 'display' || variant === 'numberLarge';

  return (
    <RNText
      style={[
        base as TextStyle,
        { color: theme.colors[color] },
        align ? { textAlign: align } : null,
        (tabular ?? isNumeric) ? { fontVariant: ['tabular-nums'] } : null,
        variant === 'overline' ? { textTransform: 'uppercase' } : null,
        style,
      ]}
      {...rest}
    />
  );
}
