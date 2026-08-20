import type { Href } from 'expo-router';
import { TabList, Tabs, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef } from 'react';
import { Pressable, View } from 'react-native';

import { Icon, Text, type IconName } from '@/components/ui';
import { useTheme } from '@/design';

const DESTINATIONS: { name: string; href: Href; label: string; icon: IconName }[] = [
  { name: 'index', href: '/', label: "Aujourd'hui", icon: 'home' },
  { name: 'history', href: '/history', label: 'Historique', icon: 'chart' },
  { name: 'profile', href: '/profile', label: 'Profil', icon: 'person' },
];

/**
 * Barre d'onglets du web.
 *
 * `NativeTabs` n'existe pas ici : on redessine les mêmes trois destinations
 * avec les primitives du design system. Le web n'est pas une cible de la v1
 * (docs/01, non-objectifs) — cette version existe pour que `expo start --web`
 * reste utilisable comme banc d'essai, pas comme un produit.
 */
export default function AppTabs() {
  const theme = useTheme();

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList
        style={{
          borderTopWidth: theme.borderWidth.hairline,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        }}>
        {DESTINATIONS.map((destination) => (
          <TabTrigger key={destination.name} name={destination.name} href={destination.href} asChild>
            <TabButton icon={destination.icon}>{destination.label}</TabButton>
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}

const TabButton = forwardRef<View, TabTriggerSlotProps & { icon: IconName }>(
  ({ children, icon, isFocused, ...props }, ref) => {
    const theme = useTheme();

    return (
      <Pressable
        ref={ref}
        {...props}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.xs,
          paddingVertical: theme.spacing.sm,
          minHeight: theme.hitSize.lg,
        }}>
        <Icon name={icon} color={isFocused ? 'text' : 'textMuted'} />
        <Text variant="caption" color={isFocused ? 'text' : 'textMuted'}>
          {children as string}
        </Text>
      </Pressable>
    );
  },
);

TabButton.displayName = 'TabButton';
