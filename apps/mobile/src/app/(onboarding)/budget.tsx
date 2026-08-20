import { router } from 'expo-router';
import { View } from 'react-native';

import { Badge, BigNumber, Icon, StatLine, Surface, Text } from '@/components/ui';
import { OnboardingStep } from '@/components/onboarding-step';
import { useTheme } from '@/design';
import { formatKcal, formatSignedKcal } from '@/design/format';
import { socleEstime } from '@/data/exemple';

/**
 * Écran 4 — le budget, et la phrase d'honnêteté qui va avec.
 *
 * Le détail est affiché parce que le principe « honnête sur l'incertitude »
 * l'exige : présenter un chiffre nu sans dire d'où il sort, c'est présenter une
 * approximation comme une mesure.
 *
 * À la sortie de cet écran, le menu d'action rapide s'ouvre de lui-même : la
 * première saisie fait partie de l'onboarding (docs/03 § 3).
 */
export default function BudgetScreen() {
  const theme = useTheme();

  const terminer = () => {
    router.replace('/(tabs)');
    router.push('/quick-actions');
  };

  return (
    <OnboardingStep
      etape={4}
      centre
      actionLabel="Enregistrer ma première saisie"
      onAction={terminer}>
      <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
        <BigNumber value={formatKcal(socleEstime.budgetKcal)} label="calories par jour" />
        {/* `Badge` s'aligne à gauche par défaut : on le recentre ici. */}
        <View style={{ alignItems: 'center', alignSelf: 'stretch' }}>
          <Badge label="Estimation" tone="pending" />
        </View>
      </View>

      <Surface style={{ gap: theme.spacing.xs }}>
        <StatLine label="Métabolisme de base" value={formatKcal(socleEstime.bmrKcal)} />
        <StatLine
          label="Activité du quotidien"
          value={formatSignedKcal(socleEstime.neatKcal)}
        />
        <StatLine label="Digestion" value={formatSignedKcal(socleEstime.tefKcal)} />
        <StatLine label="Déficit choisi" value={formatSignedKcal(-socleEstime.deficitKcal)} />
      </Surface>

      <Surface variant="accent" style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <Icon name="info" size={20} color="accent" />
        <Text variant="body" color="accent" style={{ flex: 1 }}>
          C&apos;est une estimation. Dans deux semaines, Kalou l&apos;aura mesurée pour de vrai.
        </Text>
      </Surface>
    </OnboardingStep>
  );
}
