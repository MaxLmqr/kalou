import { router } from 'expo-router';
import { View } from 'react-native';

import { Icon, List, Row, Screen, Section, StatLine, Surface, Text } from '@/components/ui';
import { useTheme } from '@/design';
import { formatKcal, formatRythme, formatWeight } from '@/design/format';
import { AGE_ANS, profil, rythmes, socleEstime } from '@/data/exemple';
import { PLANCHER_APPORT } from '@kalou/api/domain';

const DATE_COURTE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });

/**
 * Profil — volontairement pauvre (docs/03 § 6).
 *
 * Morphologie, objectif, journée, notifications, données. Le plancher de
 * sécurité y est en lecture seule et expliqué : c'est le seul endroit de
 * l'application où le ton d'avertissement est autorisé.
 */
export default function ProfilScreen() {
  const theme = useTheme();
  const rythme = rythmes.find((option) => option.rythmeKgSemaine === profil.rythmeKgSemaine);

  return (
    <Screen underTabBar>
      <Text variant="title">Profil</Text>

      <Section title="Objectif">
        <Surface style={{ gap: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="heading">{formatRythme(profil.rythmeKgSemaine)}</Text>
              <Text variant="caption" color="textMuted">
                déficit de {formatKcal(socleEstime.deficitKcal)} kcal par jour
              </Text>
            </View>
            <Icon name="chevronRight" size={18} color="borderStrong" strokeWidth={2} />
          </View>

          <View style={{ height: theme.borderWidth.hairline, backgroundColor: theme.colors.border }} />

          <View style={{ gap: theme.spacing.xs }}>
            <StatLine label="Poids souhaité" value={formatWeight(profil.poidsCibleKg)} />
            <StatLine
              label="Atteint le"
              value={rythme?.atteintLe ? DATE_COURTE.format(rythme.atteintLe) : '—'}
            />
          </View>
        </Surface>
      </Section>

      <Section title="Toi">
        <List inset={0}>
          <Row
            title="Morphologie"
            value={`${profil.sexe === 'homme' ? 'Homme' : 'Femme'} · ${AGE_ANS} ans · ${profil.tailleCm} cm`}
            valueTone="textMuted"
            trailing={<Icon name="chevronRight" size={18} color="borderStrong" strokeWidth={2} />}
            onPress={() => {}}
          />
          <Row
            title="Journée"
            value="Paris · minuit"
            valueTone="textMuted"
            trailing={<Icon name="chevronRight" size={18} color="borderStrong" strokeWidth={2} />}
            onPress={() => {}}
          />
          <Row
            title="Notifications"
            value="Matin et soir"
            valueTone="textMuted"
            trailing={<Icon name="chevronRight" size={18} color="borderStrong" strokeWidth={2} />}
            onPress={() => {}}
          />
        </List>
      </Section>

      {/*
        Seul usage autorisé du ton `caution` (cf. src/design/README.md) : le
        plancher est une limite sanitaire, pas un jugement sur la journée.
      */}
      <Surface
        variant="plain"
        style={{
          flexDirection: 'row',
          gap: theme.spacing.md,
          backgroundColor: theme.colors.cautionSurface,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
        }}>
        <Icon name="caution" size={20} color="caution" />
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <Text variant="label" color="caution">
            Plancher de sécurité : {formatKcal(PLANCHER_APPORT[profil.sexe])} kcal
          </Text>
          <Text variant="caption" color="caution">
            Kalou ne descendra jamais ton budget en dessous, même si ton objectif l&apos;exigeait.
          </Text>
        </View>
      </Surface>

      <Section>
        <List>
          <Row
            title="Aperçu du design system"
            trailing={<Icon name="chevronRight" size={18} color="borderStrong" strokeWidth={2} />}
            onPress={() => router.push('/design-system')}
          />
          <Row
            title="Revoir l'onboarding"
            detail="Refaire les cinq écrans et recalculer le budget estimé"
            trailing={<Icon name="chevronRight" size={18} color="borderStrong" strokeWidth={2} />}
            onPress={() => router.push('/bienvenue')}
          />
          <Row
            title="Sources des données"
            detail="CIQUAL (ANSES), Compendium of Physical Activities"
            trailing={<Icon name="chevronRight" size={18} color="borderStrong" strokeWidth={2} />}
            onPress={() => {}}
          />
          <Row
            title="Supprimer mon compte et mes données"
            trailing={<Icon name="chevronRight" size={18} color="borderStrong" strokeWidth={2} />}
            onPress={() => {}}
          />
        </List>
      </Section>
    </Screen>
  );
}
