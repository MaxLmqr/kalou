import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '@/design';

/**
 * Barre d'onglets.
 *
 * Trois destinations, pas quatre : l'accueil concentre l'usage, mais
 * l'historique est ce qui déculpabilise un écart isolé (docs/03 § 4) et le
 * profil doit rester atteignable. Aucune entrée « Ajouter » — la saisie passe
 * par le bouton d'action flottant de l'accueil (docs/03 § 1).
 *
 * Les icônes sont produites par `scripts/build-tab-icons.mjs` à partir des
 * mêmes tracés que `components/ui/icon.tsx` : la barre native ne sait pas
 * afficher un composant React.
 */
export default function AppTabs() {
  const { colors } = useTheme();

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.surfaceSunken}
      tintColor={colors.text}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Aujourd&apos;hui</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>Historique</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/chart.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/person.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
