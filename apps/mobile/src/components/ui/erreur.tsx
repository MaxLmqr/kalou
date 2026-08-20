import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/design';

import { Icon } from './icon';
import { Text } from './text';

export type MessageErreurProps = {
  children: ReactNode;
};

/**
 * Message d'erreur : saisie invalide, connexion refusée, enregistrement échoué.
 *
 * C'est le second usage autorisé du ton `caution`, avec le plancher de sécurité.
 * Il ne contredit pas le principe « sans jugement » : celui-ci interdit de
 * dramatiser un écart alimentaire, pas de dire qu'une action a échoué. Un
 * dépassement de budget est une information ; un code de connexion refusé est un
 * obstacle, et le taire serait pire que le signaler.
 */
export function MessageErreur({ children }: MessageErreurProps) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="alert"
      style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
      <Icon name="caution" size={18} color="caution" />
      <Text variant="caption" color="caution" style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}
