import { View } from 'react-native';

import { useTheme } from '@/design';

import { Icon, type IconName } from './icon';

export type PastilleProps = {
  icon: IconName;
  /** Rôle de la ligne : apport, dépense, ou ni l'un ni l'autre. */
  tone?: 'intake' | 'expenditure' | 'neutral';
};

/**
 * Rond creusé portant une icône : le genre d'une ligne de journal.
 *
 * Le rond est **toujours neutre**, c'est l'icône qui porte le rôle. Teinter le
 * fond aurait demandé un aplat par rôle — donc deux couleurs de plus dans le
 * thème, à tenir en clair comme en sombre — pour une information que le tracé
 * suffit à donner.
 */
export function Pastille({ icon, tone = 'neutral' }: PastilleProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.surfaceSunken,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name={icon} size={16} color={tone === 'neutral' ? 'textMuted' : tone} />
    </View>
  );
}
