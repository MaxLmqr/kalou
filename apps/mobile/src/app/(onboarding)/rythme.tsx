import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Icon, PressableSurface, Surface, Text } from '@/components/ui';
import { OnboardingStep } from '@/components/onboarding-step';
import { useTheme } from '@/design';
import { formatKcal, formatRythme } from '@/design/format';
import { profil, rythmes } from '@/data/exemple';

const DATE_COURTE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });

/**
 * Écran 4 — trois cartes de rythme, avec la date d'atteinte projetée sur
 * chacune. Les dates sont calculées, pas écrites : elles bougeront quand la
 * calibration aura mesuré la dépense réelle, et l'écran le dit.
 */
export default function RythmeScreen() {
  const theme = useTheme();
  const [choisi, setChoisi] = useState(profil.rythmeKgSemaine);

  return (
    <OnboardingStep
      etape={4}
      titre="Ton rythme"
      intro="Plus le rythme est lent, plus il tient dans la durée. Tu pourras en changer."
      onBack={() => router.back()}
      actionLabel="Continuer"
      onAction={() => router.push('/(onboarding)/budget')}>
      <View style={{ gap: theme.spacing.md }}>
        {rythmes.map((option) => {
          const selectionne = option.rythmeKgSemaine === choisi;
          return (
            <PressableSurface
              key={option.rythmeKgSemaine}
              variant="raised"
              selected={selectionne}
              onPress={() => setChoisi(option.rythmeKgSemaine)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
              <View style={{ flex: 1, gap: theme.spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Text variant="heading">{formatRythme(option.rythmeKgSemaine)}</Text>
                  {option.recommande ? <Badge label="recommandé" tone="accent" /> : null}
                </View>
                <Text variant="caption" color="textMuted">
                  −{formatKcal(option.deficitKcal)} kcal par jour
                  {option.atteintLe ? ` · objectif le ${DATE_COURTE.format(option.atteintLe)}` : ''}
                </Text>
              </View>
              {selectionne ? <Icon name="check" size={22} color="accent" strokeWidth={2.2} /> : null}
            </PressableSurface>
          );
        })}
      </View>

      <Surface variant="sunken" style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <Icon name="info" size={20} color="textMuted" />
        <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
          Les dates sont projetées sur ton rythme actuel. Elles bougeront quand Kalou aura mesuré ta
          dépense réelle.
        </Text>
      </Surface>
    </OnboardingStep>
  );
}
