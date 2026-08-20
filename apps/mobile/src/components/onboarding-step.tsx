import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button, Screen, ScreenHeader, Text } from '@/components/ui';
import { useTheme } from '@/design';

export const NOMBRE_D_ETAPES = 5;

export type OnboardingStepProps = {
  /** Numéro d'étape, de 1 à 5. */
  etape: number;
  titre?: string;
  /** Phrase d'introduction sous le titre. */
  intro?: string;
  onBack?: () => void;
  actionLabel: string;
  onAction: () => void;
  /** Centre le contenu verticalement : écrans 1 et 5, qui n'ont qu'une idée. */
  centre?: boolean;
  children: ReactNode;
};

/**
 * Une étape d'onboarding : une information par écran, aucun formulaire dense
 * (docs/03 § 3). L'objectif chiffré est une première saisie en moins de
 * soixante secondes, ce qui interdit d'empiler les questions.
 */
export function OnboardingStep({
  etape,
  titre,
  intro,
  onBack,
  actionLabel,
  onAction,
  centre,
  children,
}: OnboardingStepProps) {
  const theme = useTheme();

  return (
    <Screen
      scroll={!centre}
      footer={
        <View style={{ gap: theme.spacing.lg }}>
          <Progression etape={etape} />
          <Button label={actionLabel} onPress={onAction} />
        </View>
      }>
      {onBack ? <ScreenHeader onBack={onBack} /> : null}

      <View
        style={{
          gap: theme.spacing.xxl,
          flex: centre ? 1 : undefined,
          justifyContent: centre ? 'center' : undefined,
        }}>
        {titre || intro ? (
          <View style={{ gap: theme.spacing.sm }}>
            {titre ? <Text variant="title">{titre}</Text> : null}
            {intro ? (
              <Text variant="body" color="textSecondary">
                {intro}
              </Text>
            ) : null}
          </View>
        ) : null}
        {children}
      </View>
    </Screen>
  );
}

/** Cinq points, celui de l'étape courante allongé. Pas de pourcentage. */
function Progression({ etape }: { etape: number }) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: NOMBRE_D_ETAPES, now: etape }}
      style={{
        flexDirection: 'row',
        gap: theme.spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {Array.from({ length: NOMBRE_D_ETAPES }, (_, index) => {
        const courant = index + 1 === etape;
        return (
          <View
            key={index}
            style={{
              width: courant ? 20 : 4,
              height: 4,
              borderRadius: theme.radius.pill,
              backgroundColor: courant ? theme.colors.accent : theme.colors.borderStrong,
            }}
          />
        );
      })}
    </View>
  );
}
