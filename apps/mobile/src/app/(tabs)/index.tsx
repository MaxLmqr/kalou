import { router } from 'expo-router';
import { View } from 'react-native';

import {
  BigNumber,
  Divider,
  Fab,
  Icon,
  PendingDot,
  ProgressBar,
  Row,
  Screen,
  Section,
  StatLine,
  Text,
} from '@/components/ui';
import { useTheme } from '@/design';
import {
  formatDayHeading,
  formatKcal,
  formatRemaining,
  formatSignedKcal,
} from '@/design/format';
import { jour } from '@/data/exemple';

/**
 * Aujourd'hui — l'écran d'accueil (docs/03 § 2).
 *
 * Il répond à une seule question : qu'est-ce qu'il me reste ? D'où un unique
 * `BigNumber`, trois lignes de détail en typographie secondaire, et le journal
 * du jour directement dessous plutôt que dans un onglet.
 */
export default function AujourdHuiScreen() {
  const theme = useTheme();
  const restant = formatRemaining(jour.restantKcal);

  const consomme = jour.budgetKcal > 0 ? jour.apportsKcal / jour.budgetKcal : 0;
  /** Repère de l'heure courante sur la piste : « où j'en suis dans la journée ». */
  const heureDuJour = new Date().getHours() / 24;

  const estCalibre = jour.w >= 1;

  return (
    <Screen
      underTabBar
      floatingAction={
        <Fab
          accessibilityLabel="Ajouter une entrée"
          onPress={() => router.push('/quick-actions')}
        />
      }>
      <Text variant="caption" color="textMuted">
        {formatDayHeading(jour.date)}
      </Text>

      <BigNumber
        value={restant.value}
        label={restant.label}
        note={
          estCalibre
            ? 'Budget mesuré sur tes 14 derniers jours'
            : 'Budget estimé — Kalou le mesurera dans 6 jours'
        }
        style={{ marginVertical: theme.spacing.sm }}
      />

      <ProgressBar value={consomme} marker={heureDuJour} />

      <View style={{ gap: theme.spacing.xs }}>
        <StatLine label="Mangé" value={formatKcal(jour.apportsKcal)} tone="intake" />
        <StatLine
          label="Dépensé"
          note={
            jour.eatKcal > 0
              ? `dont ${formatKcal(jour.eatKcal)} par l'activité`
              : 'aucune activité'
          }
          value={formatKcal(jour.depenseKcal)}
          tone="expenditure"
          trailing={<Icon name="chevronRight" size={16} color="borderStrong" strokeWidth={2} />}
          onPress={() => router.push('/calibration')}
        />
        <StatLine label="Budget" value={formatKcal(jour.budgetKcal)} />
      </View>

      <Divider />

      <Section title="Aujourd'hui">
        <View>
          {jour.entrees.map((entree) => (
            <Row
              key={entree.id}
              time={entree.heure}
              title={entree.titre}
              detail={entree.detail}
              value={
                entree.kcal === null
                  ? '—'
                  : entree.type === 'activite'
                    ? formatSignedKcal(entree.kcal)
                    : formatKcal(entree.kcal)
              }
              valueTone={
                entree.kcal === null
                  ? 'textMuted'
                  : entree.type === 'activite'
                    ? 'expenditure'
                    : 'text'
              }
              trailing={
                entree.kcal === null ? (
                  <PendingDot style={{ marginLeft: theme.spacing.sm }} />
                ) : undefined
              }
              onPress={() => router.push('/meal')}
            />
          ))}
        </View>
      </Section>
    </Screen>
  );
}
