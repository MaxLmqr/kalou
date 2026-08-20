import { router } from 'expo-router';
import { View } from 'react-native';

import {
  Badge,
  BigNumber,
  ProgressBar,
  Screen,
  ScreenHeader,
  Section,
  StatLine,
  Surface,
  Text,
} from '@/components/ui';
import { useTheme } from '@/design';
import { formatKcal, formatSignedKcal, formatWeightDelta } from '@/design/format';
import { calibration, calibrationDetail } from '@/data/exemple';

const DATE_COURTE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });

/**
 * Ta dépense — l'écran de calibration (docs/02 § 5.5, docs/03 § 5).
 *
 * Trois états, toujours explicites : en apprentissage, calibré, en pause. La
 * transparence est fonctionnelle et pas cosmétique : elle explique pourquoi le
 * budget a changé, ce qui évite l'interprétation « l'appli déraille ».
 *
 * Ce qui n'est **pas** montré : une décomposition du socle mesuré en
 * métabolisme + activité + digestion. La mesure vient d'un bilan énergétique
 * réel et contient déjà tout cela (docs/02 § 3.3) ; la redécouper reviendrait à
 * réinventer l'estimation qu'elle vient précisément de remplacer.
 */
export default function CalibrationScreen() {
  const theme = useTheme();

  const enApprentissage = calibration.statut === 'insuffisant';
  const enPause = calibration.statut === 'gele';
  const delta = calibrationDetail.budgetApresKcal - calibrationDetail.budgetAvantKcal;

  return (
    <Screen>
      <ScreenHeader title="Ta dépense" onBack={() => router.back()} />

      {enApprentissage ? (
        <>
          <BigNumber
            value={formatKcal(calibrationDetail.budgetAvantKcal)}
            label="calories par jour"
            note="Estimation par formule — encore 6 jours de données"
          />
          <ProgressBar value={8 / 14} />
        </>
      ) : (
        <>
          <BigNumber
            value={formatKcal(calibration.depenseMesureeKcal)}
            label="calories dépensées par jour"
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.sm,
            }}>
            <Badge label={enPause ? 'En pause' : 'Mesuré'} tone={enPause ? 'neutral' : 'accent'} />
            <Text variant="caption" color="textMuted">
              le {DATE_COURTE.format(calibrationDetail.mesureeLe)}
            </Text>
          </View>
        </>
      )}

      <Surface
        variant="accent"
        style={{ gap: theme.spacing.sm }}>
        <Text variant="heading" color="accent">
          {enPause ? 'Kalou garde ta dernière mesure' : 'Kalou a mesuré ta dépense'}
        </Text>
        <Text variant="body" color="accent">
          {enPause
            ? 'Trop de jours sans saisie complète pour recalculer. La mesure reprendra dès que tu auras repris tes saisies.'
            : `${formatKcal(calibration.depenseMesureeKcal)} kcal par jour — au lieu de ${formatKcal(calibration.socleFormuleKcal)} estimés. Ton budget ${delta >= 0 ? 'augmente' : 'baisse'} de ${formatKcal(Math.abs(delta))} kcal.`}
        </Text>
      </Surface>

      <Section title="Sur quoi c'est mesuré">
        <Surface style={{ gap: theme.spacing.xs }}>
          <StatLine label="Fenêtre" value={`${calibrationDetail.fenetreJours} derniers jours`} />
          <StatLine
            label="Calories saisies"
            value={formatKcal(calibrationDetail.apportsTotauxKcal)}
          />
          <StatLine
            label="Tendance de poids"
            value={formatWeightDelta(calibration.deltaTendanceKg)}
          />
          <StatLine
            label="Jours complets"
            value={`${calibrationDetail.joursComplets} / ${calibrationDetail.joursDansLaFenetre}`}
          />
        </Surface>
      </Section>

      <Section title="Ce que ça change">
        <Surface style={{ gap: theme.spacing.xs }}>
          <StatLine
            label="Budget estimé par formule"
            value={formatKcal(calibrationDetail.budgetAvantKcal)}
            tone="textSecondary"
          />
          <StatLine
            label="Budget mesuré"
            value={formatKcal(calibrationDetail.budgetApresKcal)}
          />
          <StatLine label="Écart" value={formatSignedKcal(delta)} tone="intake" />
        </Surface>
      </Section>
    </Screen>
  );
}
