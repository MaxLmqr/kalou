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
   * Chiffres à chasse fixe, demandés partout où une valeur change en place
   * (calories restantes, durée d'une séance) ou s'aligne en colonne.
   *
   * **Sans effet avec Poppins**, qui ne porte pas la fonction `tnum` : la
   * demande est transmise à la fonte, la fonte n'y répond pas. Conservé parce
   * que l'intention est juste et redeviendrait vraie avec une police qui la
   * porte — cf. la section « Polices » du README du design system.
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
