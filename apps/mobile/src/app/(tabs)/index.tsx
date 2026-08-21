import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import {
  BigNumber,
  Button,
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
  formatDuration,
  formatKcal,
  formatProteines,
  formatRemaining,
  formatSignedKcal,
  formatTime,
} from '@/design/format';
import {
  manqueALOnboarding,
  useJournee,
  type EntreeDuJournal,
  type Journee,
} from '@/hooks/use-journee';
import { jourIso } from '@/lib/api';
import { libellesManque, premiereEtapeManquante } from '@/lib/onboarding';

/**
 * D'où vient l'apport cible affiché (doc 06 § 4). La table est exhaustive par
 * construction : ajouter une phase côté serveur casse la compilation ici.
 */
const NOTE_PHASE = {
  formule: 'Apport cible estimé — Kalou le mesurera après deux semaines de suivi',
  transition: 'Apport cible en cours de mesure sur tes derniers jours',
  calibre: 'Apport cible mesuré sur tes 14 derniers jours',
} satisfies Record<Journee['detail']['phase'], string>;

/**
 * Aujourd'hui — l'écran d'accueil (docs/03 § 2).
 *
 * Il répond à une seule question : qu'est-ce qu'il me reste ? D'où un unique
 * `BigNumber`, quelques lignes de détail en typographie secondaire, et le
 * journal du jour directement dessous plutôt que dans un onglet.
 *
 * Tous les chiffres viennent de `GET /days/today` : aucune formule ne vit ici
 * (doc 06 § 1). Le client ne connaît ni le socle, ni le déficit, ni la
 * correction de TEF — sinon la moindre évolution du modèle exigerait une mise à
 * jour de l'application, et les deux implémentations divergeraient.
 */
export default function AujourdHuiScreen() {
  const { data: jour, isPending, error, refetch } = useJournee();

  if (isPending) return <EnAttente />;

  if (error) {
    // Un onboarding inachevé n'est pas une panne : le serveur dit ce qui manque,
    // et l'écran y renvoie au lieu de proposer un « Réessayer » sans effet.
    const manque = manqueALOnboarding(error);
    return manque ? <ProfilIncomplet manque={manque} /> : <Indisponible onReessayer={refetch} />;
  }

  return <VueDuJour jour={jour} />;
}

function VueDuJour({ jour }: { jour: Journee }) {
  const theme = useTheme();
  const restant = formatRemaining(jour.restant_kcal);

  const consomme = jour.apport_cible_kcal > 0 ? jour.apports_kcal / jour.apport_cible_kcal : 0;
  /** Repère de l'heure courante sur la piste : « où j'en suis dans la journée ». */
  const heureDuJour = new Date().getHours() / 24;

  // Eden réhydrate les dates alors que le type annonce une chaîne (cf. `jourIso`),
  // et l'on vise midi plutôt que minuit : la journée locale du serveur ne doit
  // pas reculer d'un jour à l'affichage selon le fuseau du téléphone.
  const iso = jourIso(jour.local_date);
  const titreDuJour = iso ? formatDayHeading(new Date(`${iso}T12:00:00`)) : '';

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
        {titreDuJour}
      </Text>

      <BigNumber
        value={restant.value}
        label={restant.label}
        note={NOTE_PHASE[jour.detail.phase]}
        style={{ marginVertical: theme.spacing.sm }}
      />

      <ProgressBar value={consomme} marker={heureDuJour} />

      <View style={{ gap: theme.spacing.xs }}>
        <StatLine label="Mangé" value={formatKcal(jour.apports_kcal)} tone="intake" />
        <StatLine
          label="Besoin"
          note={
            jour.detail.eat_kcal > 0
              ? `dont ${formatKcal(jour.detail.eat_kcal)} par l'activité`
              : 'aucune activité'
          }
          value={formatKcal(jour.besoin_journalier_kcal)}
          tone="expenditure"
          trailing={<Icon name="chevronRight" size={16} color="borderStrong" strokeWidth={2} />}
          onPress={() => router.push('/calibration')}
        />
        <StatLine label="Apport cible" value={formatKcal(jour.apport_cible_kcal)} />
        {/*
          Un plancher, pas une cible : la ligne reste en typographie neutre même
          en dessous du seuil. Aucune alerte, aucun ton d'avertissement — le
          principe « sans jugement » de docs/01 s'applique ici comme ailleurs.
          Le « ≥ » dit que la somme est incomplète (docs/02 § 9).
        */}
        <StatLine
          label="Protéines"
          value={formatProteines(
            jour.proteines.total_g,
            jour.proteines.plancher_g,
            jour.proteines.partiel,
          )}
        />
      </View>

      <Divider />

      <Section title="Aujourd'hui">
        {jour.journal.length === 0 ? (
          <Text variant="body" color="textMuted">
            Rien encore aujourd&apos;hui. Le bouton + ouvre les quatre façons d&apos;ajouter une
            entrée.
          </Text>
        ) : (
          <View>
            {jour.journal.map((entree) => (
              <LigneDuJournal key={entree.id} entree={entree} />
            ))}
          </View>
        )}
      </Section>
    </Screen>
  );
}

type Repas = Extract<EntreeDuJournal, { genre: 'repas' }>;

/**
 * « 4 composants · estimation en cours ». Une entrée d'un seul composant ne dit
 * rien de plus que son libellé : on ne l'annote pas.
 */
function detailDuRepas(entree: Repas): string | undefined {
  const morceaux: string[] = [];
  if (entree.items.length > 1) morceaux.push(`${entree.items.length} composants`);
  if (entree.etat === 'en_attente') morceaux.push('estimation en cours');
  else if (entree.source === 'ia_photo' || entree.source === 'ia_texte') {
    morceaux.push('estimation');
  }
  return morceaux.length > 0 ? morceaux.join(' · ') : undefined;
}

/**
 * Eden réhydrate les horodatages en `Date` alors que le type annonce parfois une
 * chaîne (cf. `jourIso`) : on accepte les deux plutôt que de croire le type.
 */
function heureDe(valeur: string | Date): string {
  return formatTime(valeur instanceof Date ? valeur : new Date(valeur));
}

/**
 * Une ligne du journal. Les deux genres se ressemblent à dessein — mais une
 * dépense s'écrit signée, et jamais dans la couleur des apports.
 */
function LigneDuJournal({ entree }: { entree: EntreeDuJournal }) {
  const theme = useTheme();

  if (entree.genre === 'activite') {
    return (
      <Row
        time={heureDe(entree.occurredAt)}
        title={entree.libelle}
        detail={formatDuration(entree.dureeMin)}
        // Le serveur renvoie une dépense positive ; l'accueil la montre comme
        // ce qu'elle est pour la journée : des calories rendues.
        value={formatSignedKcal(-entree.kcalNet)}
        valueTone="expenditure"
        onPress={() => router.push('/activity')}
      />
    );
  }

  return (
    <Row
      time={heureDe(entree.occurredAt)}
      title={entree.libelle}
      detail={detailDuRepas(entree)}
      value={entree.kcal === null ? '—' : formatKcal(entree.kcal)}
      valueTone={entree.kcal === null ? 'textMuted' : 'text'}
      trailing={
        entree.kcal === null ? <PendingDot style={{ marginLeft: theme.spacing.sm }} /> : undefined
      }
      onPress={() => router.push('/meal')}
    />
  );
}

function EnAttente() {
  const theme = useTheme();

  return (
    <Screen underTabBar scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.textMuted} />
      </View>
    </Screen>
  );
}

/** Tant qu'il manque une valeur au modèle, il n'y a pas d'apport cible à montrer. */
function ProfilIncomplet({ manque }: { manque: string[] }) {
  const theme = useTheme();
  const etape = premiereEtapeManquante(manque);

  return (
    <Screen underTabBar scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.lg }}>
        <Text variant="heading">Presque prêt</Text>
        <Text variant="body" color="textSecondary">
          {manque.length > 0
            ? `Kalou ne peut pas encore calculer ton apport cible : il manque ${libellesManque(manque)}.`
            : 'Kalou ne peut pas encore calculer ton apport cible : ton profil est incomplet.'}
        </Text>
        {etape ? <Button label="Continuer" onPress={() => router.push(etape)} /> : null}
      </View>
    </Screen>
  );
}

function Indisponible({ onReessayer }: { onReessayer: () => void }) {
  const theme = useTheme();

  return (
    <Screen underTabBar scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.lg }}>
        <Text variant="heading">Journée indisponible</Text>
        <Text variant="body" color="textSecondary">
          Kalou n&apos;a pas réussi à joindre le serveur. Rien n&apos;est perdu — réessaie.
        </Text>
        <Button label="Réessayer" onPress={onReessayer} />
      </View>
    </Screen>
  );
}
