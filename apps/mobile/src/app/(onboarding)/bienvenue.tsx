import { router } from 'expo-router';

import { Text } from '@/components/ui';
import { OnboardingStep } from '@/components/onboarding-step';

/** Écran 1 — une phrase sur le principe, un bouton. Pas de carrousel de vente. */
export default function BienvenueScreen() {
  return (
    <OnboardingStep
      etape={1}
      centre
      actionLabel="Commencer"
      onAction={() => router.push('/(onboarding)/toi')}>
      <Text variant="title">Kalou</Text>
      <Text variant="numberLarge">Ta balance calorique du jour, claire et sans jugement.</Text>
      <Text variant="body" color="textSecondary">
        Quatre questions, et tu enregistres ton premier repas. Aucune question sur ton niveau
        d&apos;activité : Kalou le mesurera tout seul.
      </Text>
    </OnboardingStep>
  );
}
