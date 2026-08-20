import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, type ViewProps } from 'react-native';
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
 * coins et geste de fermeture viennent du système. Ce composant fournit la
 * gouttière, le rythme vertical, la zone sûre du bas — et l'évitement du
 * clavier.
 *
 * **Ce dernier point n'est pas un détail.** iOS ne redimensionne pas une feuille
 * quand le clavier apparaît : il la recouvre. Une feuille à champs de saisie et
 * à bouton ancré devient alors une impasse — on peut taper, mais plus valider.
 * Les claviers numériques aggravent le cas : ils n'ont pas de touche de retour,
 * donc aucun moyen de les refermer. D'où le `KeyboardAvoidingView` ici plutôt
 * que dans chaque écran, et le renvoi du clavier au défilement.
 *
 * Le `flex: 1` sur la zone défilante n'est pas cosmétique : sans lui, la vue
 * prend la hauteur de son contenu, n'a donc rien à faire défiler, et tout ce
 * qui dépasse sous le pied de page devient définitivement inatteignable — sans
 * le moindre signe qu'il manque quelque chose.
 */
export function Sheet({ title, children, scroll = false, footer, style, ...rest }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const gouttiere = {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    width: '100%' as const,
    maxWidth: theme.maxContentWidth,
    alignSelf: 'center' as const,
  };

  const content = (
    <View style={{ gap: theme.spacing.xl }}>
      {title ? <Text variant="heading">{title}</Text> : null}
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[{ flex: 1, backgroundColor: theme.colors.surface }, style]}
      {...rest}>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ ...gouttiere, gap: theme.spacing.xl }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        <View style={gouttiere}>{content}</View>
      )}

      {/* Pousse le pied de page en bas quand le contenu ne défile pas. */}
      {scroll ? null : <View style={{ flex: 1 }} />}

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
    </KeyboardAvoidingView>
  );
}
