import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  Divider,
  Icon,
  Row,
  Screen,
  ScreenHeader,
  Section,
  Surface,
  Text,
} from '@/components/ui';
import { useTheme } from '@/design';
import { alimentsTrouves } from '@/data/exemple';

/**
 * Chercher ou décrire (docs/03 § 1.2).
 *
 * Un seul champ pour deux intentions, et **l'utilisateur n'a pas à choisir
 * laquelle** : à la frappe, la base d'aliments répond, instantanément et hors
 * ligne ; sur la phrase entière, l'estimation prend le relais. La règle est
 * dans le texte du doc : un ou deux mots sont presque toujours une recherche,
 * une phrase longue presque toujours une description.
 */
export default function ChercherOuDecrireScreen() {
  const theme = useTheme();
  const [texte, setTexte] = useState('pois chi');

  const mots = texte.trim().split(/\s+/).filter(Boolean).length;
  const resultats = texte.trim().length > 0 ? alimentsTrouves : [];
  /** Au-delà de trois mots sans correspondance, c'est une description. */
  const estUneDescription = mots > 3;

  return (
    <Screen
      footer={
        <Button
          label="Estimer avec l'IA"
          variant={estUneDescription ? 'primary' : 'secondary'}
          icon={<Icon name="sparkle" size={18} color={estUneDescription ? 'textOnAccent' : 'text'} />}
          onPress={() => router.replace('/meal?source=photo')}
        />
      }>
      <ScreenHeader
        title="Chercher ou décrire"
        trailing={
          <Icon name="close" size={20} color="textSecondary" strokeWidth={2.2} />
        }
      />

      {/*
        Le champ est bordé d'accent au repos parce que le clavier s'ouvre
        d'emblée : il est déjà actif quand l'écran apparaît.
      */}
      <Surface
        radius="md"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          paddingVertical: theme.spacing.none,
          minHeight: theme.hitSize.lg,
          borderWidth: theme.borderWidth.thick,
          borderColor: theme.colors.accent,
        }}>
        <Icon name="search" size={20} color="textMuted" />
        <Text variant="body" style={{ flex: 1 }}>
          {texte}
        </Text>
      </Surface>

      {resultats.length > 0 && !estUneDescription ? (
        <Section title="Base d'aliments">
          <View>
            {resultats.map((aliment, index) => (
              <View key={aliment.id}>
                {index > 0 ? <Divider /> : null}
                <Row
                  title={aliment.libelle}
                  detail={aliment.portion}
                  value={`${aliment.kcalPour100g} kcal/100 g`}
                  valueTone="textMuted"
                  onPress={() => router.replace('/meal?source=composition')}
                />
              </View>
            ))}
            <Divider />
            <Row
              leading={<Icon name="chevronDown" size={16} color="textMuted" strokeWidth={2} />}
              title="Voir toutes les variantes"
              onPress={() => setTexte('pois chiches')}
            />
          </View>
        </Section>
      ) : null}

      <Surface
        variant="sunken"
        style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <Icon name="info" size={20} color="textMuted" />
        <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
          Tape une phrase entière — « deux tartines beurre confiture et un jus d&apos;orange » — et
          Kalou l&apos;estime au lieu de la chercher.
        </Text>
      </Surface>
    </Screen>
  );
}
