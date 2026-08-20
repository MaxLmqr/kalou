import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  BigNumber,
  Button,
  Chip,
  Divider,
  Row,
  Section,
  Sheet,
  Surface,
  Text,
} from '@/components/ui';
import { useTheme } from '@/design';
import { formatDuration, formatKcal } from '@/design/format';
import { activites, caloriesActivite, DUREE_PAR_DEFAUT_MIN, dureesProposees } from '@/data/exemple';

const PAS_MIN = 5;

/**
 * Ajouter une activité (docs/03 § 1.4).
 *
 * Les calories nettes s'affichent **en direct** pendant le réglage de la durée :
 * c'est ce qui rend lisible le lien entre l'effort et le budget, et c'est aussi
 * pour ça que la valeur occupe la place du chiffre unique de l'écran.
 */
export default function ActiviteScreen() {
  const theme = useTheme();
  const [activiteId, setActiviteId] = useState(activites[0].id);
  const [dureeMin, setDureeMin] = useState(DUREE_PAR_DEFAUT_MIN);

  const activite = activites.find((element) => element.id === activiteId) ?? activites[0];
  const kcal = caloriesActivite(activite.met, dureeMin);

  return (
    <Sheet
      scroll
      footer={<Button label="Enregistrer" onPress={() => router.back()} />}>
      {/*
        Le chiffre est positif et le libellé dit ce qu'il fait : une activité
        *augmente* le budget. L'entrée correspondante s'affichera en négatif
        dans le journal, où elle est une dépense — ce sont deux points de vue,
        pas deux valeurs.
      */}
      <BigNumber
        value={formatKcal(kcal)}
        label="calories ajoutées à ton budget"
        note={`${activite.libelle} · MET ${activite.met.toLocaleString('fr-FR')}`}
      />

      <Surface style={{ gap: theme.spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
          <Chip label="−5 min" onPress={() => setDureeMin((valeur) => Math.max(PAS_MIN, valeur - PAS_MIN))} />
          <View style={{ flex: 1, alignItems: 'center', gap: theme.spacing.xs }}>
            <Text variant="numberLarge">{formatDuration(dureeMin)}</Text>
            <Text variant="caption" color="textMuted">
              {dureeMin === DUREE_PAR_DEFAUT_MIN ? 'dernière durée utilisée' : 'durée'}
            </Text>
          </View>
          <Chip label="+5 min" onPress={() => setDureeMin((valeur) => valeur + PAS_MIN)} />
        </View>

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {dureesProposees.map((duree) => (
            <Chip
              key={duree}
              grow
              label={formatDuration(duree)}
              selected={duree === dureeMin}
              onPress={() => setDureeMin(duree)}
            />
          ))}
        </View>
      </Surface>

      <Section title="Tes activités">
        <View>
          {activites.map((element, index) => (
            <View key={element.id}>
              {index > 0 ? <Divider /> : null}
              <Row
                title={element.libelle}
                value={`MET ${element.met.toLocaleString('fr-FR')}`}
                valueTone={element.id === activiteId ? 'accent' : 'textMuted'}
                onPress={() => setActiviteId(element.id)}
              />
            </View>
          ))}
        </View>
      </Section>
    </Sheet>
  );
}
