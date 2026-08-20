import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Row, Stepper, Surface, Text } from '@/components/ui';
import { OnboardingStep } from '@/components/onboarding-step';
import { useTheme } from '@/design';
import { formatWeight } from '@/design/format';
import { profil } from '@/data/exemple';

const PAS_KG = 0.1;

/** Écran 2 — le poids actuel, et le poids souhaité en facultatif assumé. */
export default function PoidsScreen() {
  const theme = useTheme();
  const [poidsKg, setPoidsKg] = useState(profil.tendanceKg);

  return (
    <OnboardingStep
      etape={2}
      titre="Ton poids"
      intro="C'est ce chiffre, suivi dans le temps, qui mesurera ta dépense réelle."
      onBack={() => router.back()}
      actionLabel="Continuer"
      onAction={() => router.push('/(onboarding)/rythme')}>
      <View style={{ gap: theme.spacing.md }}>
        <Text variant="caption" color="textSecondary">
          Poids actuel
        </Text>
        <Stepper
          value={formatWeight(poidsKg, false)}
          note="kilos"
          decrementLabel="Retirer 100 grammes"
          incrementLabel="Ajouter 100 grammes"
          onDecrement={() => setPoidsKg((valeur) => Math.round((valeur - PAS_KG) * 10) / 10)}
          onIncrement={() => setPoidsKg((valeur) => Math.round((valeur + PAS_KG) * 10) / 10)}
        />
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm }}>
          <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
            Poids souhaité
          </Text>
          <Text variant="caption" color="textMuted">
            facultatif
          </Text>
        </View>
        <Surface variant="sunken" radius="md" padding="none" style={{ paddingHorizontal: theme.spacing.lg }}>
          <Row title=" " value={formatWeight(profil.poidsCibleKg)} onPress={() => {}} />
        </Surface>
        <Text variant="caption" color="textMuted">
          Sert seulement à projeter une date. Tu peux le laisser vide.
        </Text>
      </View>
    </OnboardingStep>
  );
}
