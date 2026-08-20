import { useState } from 'react';
import { View } from 'react-native';

import { BalanceChart, WeightChart } from '@/components/charts';
import { Screen, Section, Segmented, StatLine, Surface, Text } from '@/components/ui';
import { useTheme } from '@/design';
import { formatKcal, formatSignedKcal, formatWeight, formatWeightDelta } from '@/design/format';
import { historique, profil, semaine } from '@/data/exemple';

const FENETRES = [
  { value: '30', label: '30 j' },
  { value: '90', label: '90 j' },
] as const;

/**
 * Historique — trois strates, du plus lisible au plus détaillé (docs/03 § 4).
 *
 * L'ordre n'est pas décoratif : la courbe de poids répond à « est-ce que ça
 * marche », la balance quotidienne à « est-ce qu'un écart isolé compte », et la
 * semaine au seul indicateur de véracité qui vaille — prédit contre observé.
 */
export default function HistoriqueScreen() {
  const theme = useTheme();
  const [fenetre, setFenetre] = useState<(typeof FENETRES)[number]['value']>('30');

  return (
    <Screen underTabBar>
      <Text variant="title">Historique</Text>

      <Section>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <Text variant="overline" color="textMuted" style={{ flex: 1 }}>
            Poids
          </Text>
          <Segmented options={FENETRES} value={fenetre} onChange={setFenetre} />
        </View>

        <Surface style={{ gap: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm }}>
            <Text variant="numberLarge">{formatWeight(profil.tendanceKg)}</Text>
            <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
              tendance
            </Text>
            <Text variant="bodyMedium" color="intake" tabular>
              {formatWeightDelta(historique.variationKg)}
            </Text>
          </View>

          <WeightChart
            weighIns={historique.weighIns}
            trend={historique.trend}
            goal={historique.objectif}
          />

          <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
            <Legende trait>tendance</Legende>
            <Legende point>pesées</Legende>
            <Legende pointille>objectif</Legende>
          </View>
        </Surface>
      </Section>

      <Section title="Balance quotidienne">
        <Surface style={{ gap: theme.spacing.md }}>
          <BalanceChart balances={historique.balances} average={historique.average} />
          <StatLine
            label="Moyenne 7 jours"
            value={`${formatSignedKcal(historique.moyenneKcal)} kcal par jour`}
          />
        </Surface>
      </Section>

      <Section title="Cette semaine">
        <Surface style={{ gap: theme.spacing.xs }}>
          <StatLine label="Apports moyens" value={formatKcal(semaine.apportsMoyens)} tone="intake" />
          <StatLine
            label="Dépense moyenne"
            value={formatKcal(semaine.depenseMoyenne)}
            tone="expenditure"
          />
          <View style={{ height: theme.spacing.sm }} />
          <StatLine label="Perte prédite" value={formatWeightDelta(semaine.pertePreditKg)} />
          <StatLine label="Perte observée" value={formatWeightDelta(semaine.perteObserveeKg)} />
        </Surface>
      </Section>
    </Screen>
  );
}

/** Légende d'une série de la courbe. Trois formes, trois natures de donnée. */
function Legende({
  children,
  trait,
  point,
  pointille,
}: {
  children: string;
  trait?: boolean;
  point?: boolean;
  pointille?: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      {trait ? (
        <View
          style={{
            width: 14,
            height: 2.5,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.accent,
          }}
        />
      ) : null}
      {point ? (
        <View
          style={{
            width: 5,
            height: 5,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.pending,
          }}
        />
      ) : null}
      {pointille ? (
        <View
          style={{
            width: 14,
            borderTopWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: theme.colors.borderStrong,
          }}
        />
      ) : null}
      <Text variant="caption" color="textMuted">
        {children}
      </Text>
    </View>
  );
}
