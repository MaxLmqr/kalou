import type { ReactNode } from 'react';
import { ScrollView, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/design';

import { Text } from './text';

export type SheetProps = ViewProps & {
  /** Titre de la feuille. Absent pour le menu d'action rapide, qui n'en a pas. */
  title?: string;
  children: ReactNode;
  scroll?: boolean;
  /** Zone ancrée en bas : l'action principale de la feuille. */
  footer?: ReactNode;
};

/**
 * Contenu d'une feuille modale.
 *
 * La feuille elle-même est native (`presentation: 'formSheet'`) : poignée,
 * coins et geste de fermeture viennent du système. Ce composant ne fournit que
 * la gouttière, le rythme vertical et la zone sûre du bas.
 */
export function Sheet({ title, children, scroll = false, footer, style, ...rest }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const content = (
    <View style={{ gap: theme.spacing.xl }}>
      {title ? <Text variant="heading">{title}</Text> : null}
      {children}
    </View>
  );

  return (
    <View
      style={[{ flex: 1, backgroundColor: theme.colors.surface }, style]}
      {...rest}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{
            padding: theme.spacing.lg,
            paddingTop: theme.spacing.xl,
            gap: theme.spacing.xl,
            width: '100%',
            maxWidth: theme.maxContentWidth,
            alignSelf: 'center',
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        <View
          style={{
            padding: theme.spacing.lg,
            paddingTop: theme.spacing.xl,
            width: '100%',
            maxWidth: theme.maxContentWidth,
            alignSelf: 'center',
          }}>
          {content}
        </View>
      )}

      {footer ? (
        <View
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing.lg + insets.bottom,
            width: '100%',
            maxWidth: theme.maxContentWidth,
            alignSelf: 'center',
          }}>
          {footer}
        </View>
      ) : (
        <View style={{ height: insets.bottom }} />
      )}
    </View>
  );
}
