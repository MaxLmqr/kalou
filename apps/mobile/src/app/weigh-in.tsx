import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Sheet, StatLine, Surface, Text, Stepper } from '@/components/ui';
import { useTheme } from '@/design';
import { formatWeight, formatWeightDelta } from '@/design/format';
import { dernierePesee } from '@/data/exemple';

/** Le pas du sélecteur : 100 g, comme l'arrondi d'affichage (docs/03 § 8). */
const PAS_KG = 0.1;

/**
 * Me peser (docs/03 § 1.5).
 *
 * Sélecteur pré-positionné sur la dernière pesée, un tap pour valider. Ce qui
 * est montré ensuite est la **tendance**, jamais l'écart avec hier : une pesée
 * isolée ne dit rien, et la présenter comme un résultat serait malhonnête.
 */
export default function PeseeScreen() {
  const theme = useTheme();
  const [poidsKg, setPoidsKg] = useState(dernierePesee.poidsKg);

  return (
    <Sheet
      title="Me peser"
      footer={<Button label="Enregistrer" onPress={() => router.back()} />}>
      <Stepper
        value={formatWeight(poidsKg, false)}
        note="kilos"
        decrementLabel="Retirer 100 grammes"
        incrementLabel="Ajouter 100 grammes"
        onDecrement={() => setPoidsKg((valeur) => Math.round((valeur - PAS_KG) * 10) / 10)}
        onIncrement={() => setPoidsKg((valeur) => Math.round((valeur + PAS_KG) * 10) / 10)}
      />

      <Surface variant="sunken" style={{ gap: theme.spacing.sm }}>
        <View style={{ gap: theme.spacing.xs }}>
          <StatLine label="Tendance" value={formatWeight(dernierePesee.tendanceKg)} />
          <StatLine
            label="Sur 7 jours"
            value={formatWeightDelta(dernierePesee.variationSemaineKg)}
            tone="intake"
          />
        </View>
        <Text variant="caption" color="textMuted">
          Kalou suit la tendance, pas l&apos;écart avec hier : une pesée isolée ne veut rien dire.
        </Text>
      </Surface>
    </Sheet>
  );
}
