import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Chip, Row, Surface, Text } from '@/components/ui';
import { OnboardingStep } from '@/components/onboarding-step';
import { useTheme } from '@/design';
import { AGE_ANS, profil } from '@/data/exemple';
import type { Sexe } from '@kalou/api/domain';

const NAISSANCE = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Écran 1 — les trois valeurs du BMR, et rien d'autre. */
export default function ToiScreen() {
  const theme = useTheme();
  const [sexe, setSexe] = useState<Sexe>(profil.sexe);

  return (
    <OnboardingStep
      etape={1}
      titre="Toi"
      intro="Ces trois valeurs servent au calcul de ton métabolisme de base. Rien d'autre."
      actionLabel="Continuer"
      onAction={() => router.push('/(onboarding)/poids')}>
      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="caption" color="textSecondary">
          Sexe biologique
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Chip grow label="Homme" selected={sexe === 'homme'} onPress={() => setSexe('homme')} />
          <Chip grow label="Femme" selected={sexe === 'femme'} onPress={() => setSexe('femme')} />
        </View>
        {/*
          docs/02 § 2 : la formule de Mifflin-St Jeor n'existe qu'en deux
          variantes. Le dire évite que le choix soit vécu comme une case à
          cocher identitaire.
        */}
        <Text variant="caption" color="textMuted">
          La formule n&apos;existe qu&apos;en deux variantes. Choisis celle qui approche le mieux ta
          masse musculaire.
        </Text>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="caption" color="textSecondary">
          Date de naissance
        </Text>
        <Surface variant="sunken" radius="md" padding="none" style={{ paddingHorizontal: theme.spacing.lg }}>
          <Row title={NAISSANCE.format(profil.dateNaissance)} value={`${AGE_ANS} ans`} valueTone="textMuted" onPress={() => {}} />
        </Surface>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="caption" color="textSecondary">
          Taille
        </Text>
        <Surface variant="sunken" radius="md" padding="none" style={{ paddingHorizontal: theme.spacing.lg }}>
          <Row title=" " value={`${profil.tailleCm} cm`} onPress={() => {}} />
        </Surface>
      </View>
    </OnboardingStep>
  );
}
