import { Stack } from 'expo-router';

/** Connexion : une pile à part, hors des onglets et hors de l'onboarding. */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
