import { router } from 'expo-router';
import { View } from 'react-native';

import {
  Badge,
  BigNumber,
  Button,
  Divider,
  Fab,
  Input,
  PendingDot,
  PressableSurface,
  ProgressBar,
  Row,
  Screen,
  ScreenHeader,
  Section,
  StatLine,
  Surface,
  Text,
} from '@/components/ui';
import { fontFamily, useTheme } from '@/design';
import {
  formatDayHeading,
  formatKcal,
  formatRemaining,
  formatSignedKcal,
  formatWeight,
} from '@/design/format';

/**
 * Aperçu du design system.
 *
 * Catalogue des primitives, atteignable depuis le profil. Il sert de référence
 * visuelle et de banc d'essai : c'est ici qu'on vérifie qu'un état rare — un
 * apport cible dépassé, une estimation en attente, le plancher de sécurité —
 * reste lisible sans avoir à le provoquer dans l'application.
 */
export default function DesignSystemScreen() {
  const theme = useTheme();
  const remaining = formatRemaining(1204);

  return (
    <Screen>
      <ScreenHeader title="Design system" onBack={() => router.back()} />
      <Text variant="caption" color="textMuted">
        Thème {theme.scheme === 'dark' ? 'sombre' : 'clair'}, suit le réglage système.
      </Text>

      {/* ---- Maquette de l'accueil (docs/03 § 2) ---- */}
      <Surface style={{ gap: theme.spacing.xl }}>
        {/* La date est le titre de l'écran : serif de titrage, en grand. */}
        <View style={{ gap: theme.spacing.xs }}>
          <Text variant="overline" color="textMuted">
            Aujourd&apos;hui
          </Text>
          <Text variant="title">{formatDayHeading(new Date())}</Text>
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <BigNumber value={remaining.value} label={remaining.label} />
          <Badge label="Estimé" tone="pending" style={{ alignSelf: 'center' }} />
        </View>

        <ProgressBar value={0.72} marker={0.6} />

        <View style={{ gap: theme.spacing.xs }}>
          <StatLine label="Mangé" value={formatKcal(475)} tone="intake" />
          {/*
            La note annonce ce que l'activité **rend** (489 / 0,90 = 543), pas ce
            qu'elle a coûté : cf. doc 02 § 3.2.
          */}
          <StatLine
            label="Besoin"
            note={`activité ${formatSignedKcal(543)}`}
            value={formatKcal(2833)}
            tone="expenditure"
          />
          <StatLine label="Apport cible" value={formatKcal(2222)} />
        </View>

        <Divider />

        <View>
          <Row time="08:12" title="Café au lait" value={formatKcal(120)} onPress={() => {}} />
          <Row
            time="12:40"
            title="Salade César"
            detail="estimation"
            value={formatKcal(355)}
            trailing={<PendingDot style={{ marginLeft: theme.spacing.sm }} />}
            onPress={() => {}}
          />
          <Row
            time="18:05"
            title="Course"
            detail="45 min"
            value={formatSignedKcal(-489)}
            valueTone="expenditure"
            onPress={() => {}}
          />
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Fab accessibilityLabel="Ajouter une entrée" />
        </View>
      </Surface>

      {/* ---- Typographie ---- */}
      <Section title="Typographie">
        {/*
          Deux familles, deux rôles : le grotesque porte les chiffres et
          l'interface, le serif ne porte que la date et les titres d'écran. La
          liste ci-dessous est l'endroit où l'on vérifie que le contraste entre
          les deux suffit à faire la hiérarchie — sans empiler les graisses.
        */}
        <Surface variant="sunken" style={{ gap: theme.spacing.md }}>
          <Text variant="caption" color="textMuted">
            {fontFamily.sans.replace(/_.*/, '')} pour les chiffres et l&apos;interface,{' '}
            {fontFamily.serif.replace(/_.*/, '').replace(/([a-z])([A-Z])/g, '$1 $2')} pour les
            titres.
          </Text>
          <Text variant="display">1 204</Text>
          <Text variant="numberLarge">{formatWeight(72.4)}</Text>
          <Text variant="title">Titre d&apos;écran</Text>
          <Text variant="heading">Titre de section</Text>
          <Text variant="body">
            Texte courant. Tutoiement, ton factuel : « tu es au-dessus de ton apport cible »,
            jamais « tu as dépassé ».
          </Text>
          <Text variant="label">Libellé de contrôle</Text>
          <Text variant="caption" color="textMuted">
            Légende et mention d&apos;incertitude
          </Text>
          <Text variant="overline" color="textMuted">
            En-tête de section
          </Text>
        </Surface>
      </Section>

      {/* ---- Couleurs ---- */}
      <Section title="Couleurs">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {(
            [
              ['background', 'Fond'],
              ['surface', 'Surface'],
              ['surfaceSunken', 'Creusé'],
              ['accent', 'Accent'],
              ['accentSurface', 'Accent doux'],
              ['intake', 'Apport'],
              ['expenditure', 'Dépense'],
              ['pending', 'En attente'],
              ['caution', 'Plancher'],
            ] as const
          ).map(([key, label]) => (
            <View key={key} style={{ alignItems: 'center', gap: theme.spacing.xs, width: 84 }}>
              <View
                style={{
                  width: 84,
                  height: 44,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors[key],
                  borderWidth: theme.borderWidth.hairline,
                  borderColor: theme.colors.border,
                }}
              />
              <Text variant="caption" color="textMuted" align="center">
                {label}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      {/* ---- Boutons ---- */}
      <Section title="Boutons">
        <Button label="Enregistrer" onPress={() => {}} />
        <Button label="Photographier un repas" variant="secondary" onPress={() => {}} />
        <Button label="Passer" variant="ghost" size="md" onPress={() => {}} />
        <Button label="Estimation en cours" loading onPress={() => {}} />
      </Section>

      {/* ---- Cartes de choix (onboarding § 3, écran 4) ---- */}
      <Section title="Cartes de choix">
        <PressableSurface selected onPress={() => {}} style={{ gap: theme.spacing.xs }}>
          <Text variant="heading">0,5 kg par semaine</Text>
          <Text variant="caption" color="textMuted">
            Objectif atteint le 12 novembre
          </Text>
        </PressableSurface>
        <PressableSurface onPress={() => {}} style={{ gap: theme.spacing.xs }}>
          <Text variant="heading">0,75 kg par semaine</Text>
          <Text variant="caption" color="textMuted">
            Objectif atteint le 3 octobre
          </Text>
        </PressableSurface>
      </Section>

      {/* ---- États ---- */}
      <Section title="États">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <Badge label="Estimation" tone="pending" />
          <Badge label="Mesuré" tone="accent" />
          <Badge label="En pause" tone="neutral" />
          <Badge label="Plancher de sécurité" tone="caution" />
        </View>
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="caption" color="textMuted">
            Barre neutre : au-delà de l'apport cible elle ne change pas de couleur.
          </Text>
          <ProgressBar value={0.35} />
          <ProgressBar value={1} />
          <ProgressBar value={1.3} />
        </View>
      </Section>

      {/* ---- Saisie ---- */}
      <Section title="Saisie">
        <Input label="Décris ton repas" placeholder="deux tartines beurre confiture" multiline />
        <Input label="Calories" placeholder="0" suffix="kcal" numeric />
        <Input label="Poids" placeholder="72,4" suffix="kg" numeric />
      </Section>
    </Screen>
  );
}
