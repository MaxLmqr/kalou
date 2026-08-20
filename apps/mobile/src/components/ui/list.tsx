import { Children, Fragment, type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/design';

import { Divider } from './divider';
import { Surface, type SurfaceProps } from './surface';

export type ListProps = ViewProps & {
  children: ReactNode;
  variant?: SurfaceProps['variant'];
  /** Décale le séparateur pour l'aligner sur le texte. */
  inset?: number;
};

/**
 * Carte de lignes séparées d'un cheveu. Le séparateur est posé *entre* les
 * enfants et jamais après le dernier : c'est la seule raison d'être du
 * composant, et ça évite de le refaire dans chaque écran de réglages.
 */
export function List({ children, variant = 'raised', inset, style, ...rest }: ListProps) {
  const theme = useTheme();
  const items = Children.toArray(children);

  return (
    <Surface
      variant={variant}
      padding="none"
      style={[{ paddingHorizontal: theme.spacing.lg, overflow: 'hidden' }, style]}
      {...rest}>
      {items.map((child, index) => (
        <Fragment key={index}>
          {index > 0 ? <Divider inset={inset ?? 0} /> : null}
          <View>{child}</View>
        </Fragment>
      ))}
    </Surface>
  );
}
