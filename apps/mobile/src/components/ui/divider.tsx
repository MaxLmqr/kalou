import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/design';

/** Séparateur d'un cheveu. `inset` aligne le trait sur le texte d'une liste. */
export function Divider({ inset = 0, style, ...rest }: ViewProps & { inset?: number }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          height: theme.borderWidth.hairline,
          marginLeft: inset,
          backgroundColor: theme.colors.border,
        },
        style,
      ]}
      {...rest}
    />
  );
}
