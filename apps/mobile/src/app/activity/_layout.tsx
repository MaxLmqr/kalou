import { Stack } from 'expo-router';

import { useTheme } from '@/design';

/**
 * Pile du parcours « ajouter une activité ».
 *
 * Deux écrans : choisir l'activité, puis régler la durée. Ils forment une pile
 * à part, présentée en plein écran par la racine, pour que le retour du second
 * revienne au choix et non à l'accueil — la correction la plus fréquente est
 * « pas cette activité-là », et elle ne doit pas coûter tout le parcours.
 */
export default function ActiviteLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
