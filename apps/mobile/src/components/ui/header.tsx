import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/design';

import { Icon } from './icon';
import { Text } from './text';

export type ScreenHeaderProps = {
  title?: string;
  /** Retour dans la pile : chevron à gauche, titre aligné à gauche. */
  onBack?: () => void;
  /** Fermeture d'une modale : libellé « Annuler », titre centré. */
  onCancel?: () => void;
  cancelLabel?: string;
  /** Action à droite : « Enregistrer », une croix, rien. */
  trailing?: ReactNode;
};

/**
 * En-tête d'écran, dessiné plutôt que natif.
 *
 * Les modales et les écrans poussés de Kalou n'ont pas la même grammaire qu'un
 * en-tête de navigation standard — un titre secondaire, pas de grand titre — et
 * le faire ici garde toute la chrome dans le système de design.
 */
export function ScreenHeader({
  title,
  onBack,
  onCancel,
  cancelLabel = 'Annuler',
  trailing,
}: ScreenHeaderProps) {
  const theme = useTheme();
  const centered = Boolean(onCancel);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        minHeight: theme.hitSize.md,
      }}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          onPress={onBack}
          hitSlop={theme.spacing.md}>
          <Icon name="chevronLeft" size={22} strokeWidth={2} />
        </Pressable>
      ) : null}

      {onCancel ? (
        <Pressable accessibilityRole="button" onPress={onCancel} hitSlop={theme.spacing.md}>
          <Text variant="label" color="textSecondary">
            {cancelLabel}
          </Text>
        </Pressable>
      ) : null}

      {title ? (
        <Text
          variant="heading"
          numberOfLines={1}
          align={centered ? 'center' : 'left'}
          style={{ flex: 1 }}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {/* Contrepoids du bouton de gauche, pour que le titre reste centré. */}
      {centered && !trailing ? <View style={{ width: 52 }} /> : trailing}
    </View>
  );
}
