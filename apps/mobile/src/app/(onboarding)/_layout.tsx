import { Stack } from 'expo-router';

/**
 * Onboarding : une pile à part, hors des onglets.
 *
 * Le geste de retour arrière système est désactivé au niveau de la pile racine :
 * on ne « revient » pas dans une application qu'on n'a pas encore configurée.
 */
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
