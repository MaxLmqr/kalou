import { router } from 'expo-router';
import { View } from 'react-native';

import {
  Divider,
  Icon,
  PressableSurface,
  Row,
  Section,
  Sheet,
  Text,
  type IconName,
} from '@/components/ui';
import { useTheme } from '@/design';
import { formatKcal, formatSignedKcal } from '@/design/format';
import { reutilisations } from '@/data/exemple';

/**
 * Menu d'action rapide (docs/03 § 1) — le cœur de l'application.
 *
 * Ordre délibéré : la photo d'abord parce que c'est le geste le plus fréquent,
 * la pesée en dernier parce qu'elle est quotidienne mais unique. Quatre actions
 * et pas cinq : « chercher » et « décrire » commencent par le même geste — taper
 * du texte — et sont donc un seul chemin (§ 1.2).
 *
 * Les réutilisations sont **au-dessus** des actions : en régime établi, la
 * majorité des saisies sont des répétitions, et c'est ce qui tient la promesse
 * des quinze secondes.
 */
export default function MenuActionRapideScreen() {
  const theme = useTheme();

  const actions: { icon: IconName; label: string; couleur: 'accent' | 'expenditure' | 'textSecondary'; vers: string }[] = [
    // La photo mène au composeur en annonçant que l'estimation n'est pas
    // branchée (doc 06 § 6 — `POST /estimations` reste à écrire). Mieux vaut
    // arriver au bon écran avec une phrase honnête qu'ouvrir un appareil photo
    // dont le résultat ne remplirait rien.
    { icon: 'camera', label: 'Photographier un repas', couleur: 'accent', vers: '/meal?photo=1' },
    { icon: 'search', label: 'Chercher un aliment', couleur: 'accent', vers: '/meal' },
    { icon: 'run', label: 'Ajouter une activité', couleur: 'expenditure', vers: '/activity' },
    { icon: 'scale', label: 'Me peser', couleur: 'textSecondary', vers: '/weigh-in' },
  ];

  const ouvrir = (vers: string) => {
    router.back();
    router.push(vers as never);
  };

  return (
    <Sheet>
      <Section title="Réutiliser">
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {reutilisations.map((element) => (
            <PressableSurface
              key={element.id}
              onPress={() => ouvrir(element.type === 'activite' ? '/activity' : '/meal')}
              style={{ flex: 1, gap: theme.spacing.sm, minHeight: 88 }}>
              <Text variant="label" style={{ flex: 1 }} numberOfLines={2}>
                {element.titre}
              </Text>
              <Text
                variant="label"
                color={element.type === 'activite' ? 'expenditure' : 'intake'}
                tabular>
                {element.type === 'activite'
                  ? formatSignedKcal(element.kcal)
                  : formatKcal(element.kcal)}
              </Text>
            </PressableSurface>
          ))}
        </View>
      </Section>

      <View>
        {actions.map((action, index) => (
          <View key={action.icon}>
            {index > 0 ? <Divider inset={theme.spacing.xxl} /> : null}
            <Row
              leading={<Icon name={action.icon} color={action.couleur} />}
              title={action.label}
              trailing={<Icon name="chevronRight" size={18} color="borderStrong" strokeWidth={2} />}
              onPress={() => ouvrir(action.vers)}
              style={{ minHeight: theme.hitSize.lg }}
            />
          </View>
        ))}
      </View>
    </Sheet>
  );
}
