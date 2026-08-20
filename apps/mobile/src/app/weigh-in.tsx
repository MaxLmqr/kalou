import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button, MessageErreur, Sheet, StatLine, Stepper, Surface, Text } from '@/components/ui';
import { useTheme } from '@/design';
import { formatWeight, formatWeightDelta } from '@/design/format';
import { useEnregistrerPesee, usePesees, variationSurSeptJours } from '@/hooks/use-pesees';

/** Le pas du sélecteur : 100 g, comme l'arrondi d'affichage (docs/03 § 8). */
const PAS_KG = 0.1;

/** Point de départ quand il n'y a aucune pesée. Neutre, jamais suggestif. */
const POIDS_PAR_DEFAUT = 75;

/**
 * Me peser (docs/03 § 1.5).
 *
 * Sélecteur pré-positionné sur la dernière pesée, un tap pour valider. Ce qui
 * est montré ensuite est la **tendance**, jamais l'écart avec hier : une pesée
 * isolée ne dit rien, et la présenter comme un résultat serait malhonnête.
 *
 * C'est aussi la porte d'entrée du modèle : sans une première pesée, il n'y a
 * pas de tendance, donc pas d'apport cible et pas d'objectif enregistrable.
 */
export default function PeseeScreen() {
  const { data: historique, isPending } = usePesees();

  if (isPending) {
    return (
      <Sheet title="Me peser">
        <View style={{ paddingVertical: 48, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      </Sheet>
    );
  }

  const derniere = historique?.pesees[historique.pesees.length - 1];
  return <Formulaire poidsInitial={derniere?.poids_kg ?? POIDS_PAR_DEFAUT} />;
}

/**
 * Séparé de l'écran pour que `useState` reçoive la dernière pesée dès son
 * premier rendu : un initialiseur ne se rejoue pas quand la requête arrive.
 */
function Formulaire({ poidsInitial }: { poidsInitial: number }) {
  const theme = useTheme();
  const [poidsKg, setPoidsKg] = useState(poidsInitial);
  const enregistrer = useEnregistrerPesee();
  const { data: historique } = usePesees();

  const resultat = enregistrer.data;

  if (resultat) {
    const variation = variationSurSeptJours(historique?.tendance ?? []);
    return (
      <Sheet
        title="Pesée enregistrée"
        footer={<Button label="Terminé" onPress={() => router.back()} />}>
        <View style={{ alignItems: 'center', gap: theme.spacing.xs, marginVertical: theme.spacing.sm }}>
          <Text variant="display">{formatWeight(resultat.tendance_kg, false)}</Text>
          <Text variant="body" color="textSecondary">
            kilos de tendance
          </Text>
        </View>

        <Surface variant="sunken" style={{ gap: theme.spacing.sm }}>
          <StatLine
            label="Sur 7 jours"
            value={variation === null ? '—' : formatWeightDelta(variation)}
            tone={variation !== null && variation < 0 ? 'intake' : 'text'}
          />
          <Text variant="caption" color="textMuted">
            {variation === null
              ? 'Encore quelques pesées et Kalou pourra te dire où va la tendance.'
              : 'Kalou suit la tendance, pas l’écart avec hier : une pesée isolée ne veut rien dire.'}
          </Text>
        </Surface>

        {resultat.ecart_signale_kg !== null ? (
          <MessageErreur>
            Cette pesée s’écarte de plus de {resultat.ecart_signale_kg} kg de ta tendance. Elle est
            gardée, mais elle pèsera moins dans le calcul.
          </MessageErreur>
        ) : null}
      </Sheet>
    );
  }

  return (
    <Sheet
      title="Me peser"
      footer={
        <Button
          label="Enregistrer"
          loading={enregistrer.isPending}
          onPress={() => enregistrer.mutate(poidsKg)}
        />
      }>
      <Stepper
        value={formatWeight(poidsKg, false)}
        note="kilos"
        decrementLabel="Retirer 100 grammes"
        incrementLabel="Ajouter 100 grammes"
        onDecrement={() => setPoidsKg((valeur) => Math.round((valeur - PAS_KG) * 10) / 10)}
        onIncrement={() => setPoidsKg((valeur) => Math.round((valeur + PAS_KG) * 10) / 10)}
      />

      {enregistrer.isError ? (
        <MessageErreur>L’enregistrement a échoué. Réessaie dans un instant.</MessageErreur>
      ) : null}
    </Sheet>
  );
}
