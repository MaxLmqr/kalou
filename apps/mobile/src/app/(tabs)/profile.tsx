import { age, deficitQuotidien } from '@kalou/api/domain';
import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { Button, Icon, List, Row, Screen, Section, StatLine, Surface, Text } from '@/components/ui';
import { useTheme } from '@/design';
import { formatKcal, formatRythme, formatWeight } from '@/design/format';
import { useMoi } from '@/hooks/use-moi';
import { jourIso } from '@/lib/api';
import { signOut } from '@/lib/auth';

const A_RENSEIGNER = 'À renseigner';

/**
 * Les codes de `onboarding.manque` sont ceux de l'API (doc 06 § 3). Les
 * afficher tels quels ferait lire « date_naissance » à l'utilisateur.
 */
const LIBELLE_MANQUE: Record<string, string> = {
  sexe: 'ton sexe biologique',
  date_naissance: 'ta date de naissance',
  taille: 'ta taille',
  pesee: 'une première pesée',
  objectif: 'un objectif de perte',
};

/** « a, b et c » — l'énumération française, pas une liste à puces. */
function enumerer(elements: string[]): string {
  if (elements.length <= 1) return elements[0] ?? '';
  return `${elements.slice(0, -1).join(', ')} et ${elements[elements.length - 1]}`;
}

/**
 * Profil — volontairement pauvre (docs/03 § 6).
 *
 * Objectif, morphologie, compte. Ni notifications, ni bascule de journée, ni
 * plancher de sécurité : ce dernier est une garantie du modèle, pas un réglage,
 * et l'afficher sur l'écran de réglages laissait croire qu'on pouvait le régler.
 *
 * Tout ce qui est montré ici vient de la base — c'est le premier écran branché
 * sur l'API. Le dernier bloc fait exception : deux commodités de développement,
 * à retirer quand elles auront cessé de servir.
 */
export default function ProfilScreen() {
  const theme = useTheme();
  const { data: moi, isPending, isError, refetch } = useMoi();

  if (isPending) {
    return (
      <Screen underTabBar scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.textMuted} />
        </View>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen underTabBar scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.lg }}>
          <Text variant="heading">Profil indisponible</Text>
          <Text variant="body" color="textSecondary">
            Kalou n&apos;a pas réussi à joindre le serveur. Rien n&apos;est perdu — réessaie.
          </Text>
          <Button label="Réessayer" onPress={() => refetch()} />
        </View>
      </Screen>
    );
  }

  const { profile, goal, user } = moi;
  const naissance = jourIso(profile?.dateNaissance);
  const ageAns = naissance ? age(new Date(naissance), new Date()) : null;

  const morphologie = [
    profile?.sexe ? (profile.sexe === 'homme' ? 'Homme' : 'Femme') : null,
    ageAns !== null ? `${ageAns} ans` : null,
    profile?.tailleCm ? `${profile.tailleCm} cm` : null,
  ].filter(Boolean);

  return (
    <Screen underTabBar>
      <Text variant="title">Profil</Text>

      {!moi.onboarding.complet ? (
        <Surface variant="accent" style={{ gap: theme.spacing.md }}>
          <Text variant="body" color="accent">
            Kalou ne peut pas encore calculer ton apport cible.
          </Text>
          <Text variant="caption" color="accent">
            Il manque {enumerer(moi.onboarding.manque.map((quoi) => LIBELLE_MANQUE[quoi] ?? quoi))}.
          </Text>
        </Surface>
      ) : null}

      <Section title="Objectif">
        <Surface style={{ gap: theme.spacing.md }}>
          <Row
            title={goal ? formatRythme(goal.rythmeKgSemaine) : A_RENSEIGNER}
            detail={
              goal
                ? `déficit de ${formatKcal(deficitQuotidien(goal.rythmeKgSemaine))} kcal par jour` +
                  // Le rythme retenu peut différer de celui demandé : les
                  // plafonds du doc 02 § 6 s'appliquent côté serveur.
                  (goal.rythmeDemande !== goal.rythmeKgSemaine
                    ? ` · demandé ${formatRythme(goal.rythmeDemande)}`
                    : '')
                : 'aucun objectif actif'
            }
            trailing={<Icon name="chevronRight" size={18} color="borderStrong" strokeWidth={2} />}
            onPress={() => router.push('/profil-objectif')}
          />
          {goal?.poidsCibleKg ? (
            <>
              <View
                style={{ height: theme.borderWidth.hairline, backgroundColor: theme.colors.border }}
              />
              <StatLine label="Poids souhaité" value={formatWeight(goal.poidsCibleKg)} />
            </>
          ) : null}
        </Surface>
      </Section>

      <Section title="Toi">
        <List>
          <Row
            title="Morphologie"
            value={morphologie.length > 0 ? morphologie.join(' · ') : A_RENSEIGNER}
            valueTone="textMuted"
            trailing={<Icon name="chevronRight" size={18} color="borderStrong" strokeWidth={2} />}
            onPress={() => router.push('/profil-morphologie')}
          />
        </List>
      </Section>

      <Section title="Compte">
        <Surface style={{ gap: theme.spacing.lg }}>
          <Text variant="body" color="textSecondary">
            {user.email}
          </Text>
          <Button
            label="Se déconnecter"
            variant="secondary"
            onPress={() => {
              // La bascule vers l'écran de connexion est faite par la garde de
              // session : la déclencher ici en plus produirait deux navigations.
              signOut();
            }}
          />
        </Surface>
      </Section>

      <Section>
        <List>
          <Row
            title="Aperçu du design system"
            trailing={<Icon name="chevronRight" size={18} color="borderStrong" strokeWidth={2} />}
            onPress={() => router.push('/design-system')}
          />
          <Row
            title="Revoir l'onboarding"
            detail="Refaire les quatre écrans et recalculer l'apport cible estimé"
            trailing={<Icon name="chevronRight" size={18} color="borderStrong" strokeWidth={2} />}
            onPress={() => router.push('/toi')}
          />
        </List>
      </Section>
    </Screen>
  );
}
