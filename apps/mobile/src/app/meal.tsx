import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  Badge,
  Button,
  Chip,
  Divider,
  Icon,
  List,
  Screen,
  ScreenHeader,
  Section,
  Surface,
  Text,
} from '@/components/ui';
import { useTheme } from '@/design';
import { formatKcal } from '@/design/format';
import { repasCompose, repasEstime, type Composant } from '@/data/exemple';

/**
 * Composer un repas (docs/03 § 1.3, docs/08 § 7).
 *
 * **Un seul écran, quel que soit le point d'entrée.** Photo, description et
 * recherche produisent la même chose : une liste de composants. L'estimation
 * n'est pas un mode parallèle, c'est un pré-remplissage — d'où l'absence
 * d'interface dédiée et la simple présence d'un bandeau et de badges.
 */
export default function ComposeurScreen() {
  const theme = useTheme();
  const { source } = useLocalSearchParams<{ source?: string }>();

  const repas = source === 'composition' ? repasCompose : repasEstime;
  const [composants, setComposants] = useState<Composant[]>(repas.composants);

  const total = useMemo(
    () => composants.reduce((somme, composant) => somme + composant.kcal, 0),
    [composants],
  );

  const supprimer = (id: string) =>
    setComposants((liste) => liste.filter((composant) => composant.id !== id));

  return (
    <Screen
      footer={
        <View style={{ gap: theme.spacing.sm }}>
          <Button label="Enregistrer" onPress={() => router.dismissAll()} />
          <Button
            label="Enregistrer et réutiliser"
            variant="ghost"
            size="md"
            block
            onPress={() => router.dismissAll()}
          />
        </View>
      }>
      <ScreenHeader title={repas.titre} onCancel={() => router.back()} cancelLabel="Fermer" />

      {repas.estimation ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
          {/*
            La vignette du repas photographié. Tant que la photo n'est pas
            remontée, un aplat neutre plutôt qu'un compte à rebours : l'entrée
            existe déjà, il n'y a rien à attendre.
          */}
          <Surface
            variant="sunken"
            radius="md"
            style={{ width: 72, height: 72, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="image" size={26} color="textMuted" strokeWidth={1.6} />
          </Surface>
          <View style={{ flex: 1, gap: theme.spacing.sm }}>
            <Badge label="Estimation" tone="pending" />
            <Text variant="caption" color="textSecondary">
              Kalou a rempli les lignes. Corrige ce qui te semble faux — le reste ne bouge pas.
            </Text>
          </View>
        </View>
      ) : (
        <Surface
          variant="sunken"
          radius="md"
          style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.md }}>
          <Icon name="search" size={20} color="textMuted" />
          <Text variant="body" color="textMuted">
            Ajouter un aliment
          </Text>
        </Surface>
      )}

      <Section title={repas.estimation ? 'Composants' : 'Mon repas'}>
        <List>
          {composants.map((composant) => (
            <View
              key={composant.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
                minHeight: theme.hitSize.lg,
                paddingVertical: theme.spacing.md,
              }}>
              <View style={{ flex: 1, gap: theme.spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Text variant="label">{composant.libelle}</Text>
                  {composant.corrige ? <Badge label="corrigé" tone="accent" /> : null}
                  {composant.origine === 'libre' ? <Badge label="saisi" tone="pending" /> : null}
                </View>
                {composant.quantite ? (
                  <View style={{ flexDirection: 'row' }}>
                    <Chip label={composant.quantite} selected={composant.corrige} onPress={() => {}} />
                  </View>
                ) : (
                  <Text variant="caption" color="textMuted">
                    calories saisies à la main
                  </Text>
                )}
              </View>
              <Text variant="bodyMedium" tabular>
                {formatKcal(composant.kcal)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Retirer ${composant.libelle}`}
                onPress={() => supprimer(composant.id)}
                hitSlop={theme.spacing.md}>
                <Icon name="close" size={16} color="borderStrong" strokeWidth={2} />
              </Pressable>
            </View>
          ))}
        </List>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Icon name="plus" size={18} color="accent" strokeWidth={2} />
          <Text variant="label" color="accent">
            {repas.estimation ? 'Ajouter un composant' : 'Ligne libre — libellé et calories'}
          </Text>
        </View>
      </Section>

      <Divider />

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm }}>
        <Text variant="heading" style={{ flex: 1 }}>
          Total
        </Text>
        <Text variant="numberLarge">{formatKcal(total)}</Text>
        <Text variant="caption" color="textMuted">
          kcal
        </Text>
      </View>
    </Screen>
  );
}
