import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import {
  BigNumber,
  Button,
  Fab,
  List,
  Pastille,
  PendingDot,
  ProgressBar,
  Row,
  Screen,
  Section,
  StatLine,
  Surface,
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
  formatWeight,
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
      {/*
        La date est le titre de l'écran, et elle est traitée comme tel : en
        grand, dans la graisse de titrage. C'est la seule chose qui situe tout
        le reste — un chiffre de calories restantes sans jour ne veut rien dire.
      */}
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="overline" color="textMuted">
          Aujourd&apos;hui
        </Text>
        <Text variant="title">{titreDuJour}</Text>
      </View>

      {/*
        Le chiffre unique sur sa propre carte. Le fond posé lui donne la
        hiérarchie que la taille seule ne suffisait pas à établir, et la piste
        de progression reste dans la même carte : c'est la même information,
        lue autrement.
      */}
      <Surface padding="xl" radius="xl" style={{ gap: theme.spacing.xl }}>
        <BigNumber value={restant.value} label={restant.label} />
        <ProgressBar value={consomme} marker={heureDuJour} />
      </Surface>

      <Surface variant="sunken" style={{ gap: theme.spacing.sm }}>
        <StatLine label="Mangé" value={formatKcal(jour.apports_kcal)} tone="intake" />
        {/*
          Aucune annotation sur cette ligne : ce que l'activité rend est déjà
          dans le chiffre, et la séance qui l'a produit est dans le journal,
          juste dessous. Le détail du calcul n'a pas d'écran à ouvrir tant que la
          calibration est hors périmètre (doc 02 § 5).
        */}
        <StatLine
          label="Besoin"
          value={formatKcal(jour.besoin_journalier_kcal)}
          tone="expenditure"
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
        {/*
          Le principe « honnête sur l'incertitude » (docs/01) tient en une phrase
          désormais fixe : dire d'où vient le chiffre, sans annoncer une mesure
          que Kalou ne fait pas encore.
        */}
        <Text variant="caption" color="textMuted" style={{ marginTop: theme.spacing.xs }}>
          Apport cible estimé depuis ta morphologie et ta tendance de poids.
        </Text>
      </Surface>

      {/*
        Le journal du jour est sur l'accueil, pas dans un onglet (docs/03 § 2).
        Son titre est « Journal » et non « Aujourd'hui » : c'est désormais
        l'en-tête de l'écran qui porte le jour, et le répéter à mi-hauteur ne
        dirait rien de plus.
      */}
      <Section
        title="Journal"
        trailing={
          jour.journal.length > 0 ? (
            <Text variant="caption" color="textMuted">
              {jour.journal.length === 1 ? '1 entrée' : `${jour.journal.length} entrées`}
            </Text>
          ) : null
        }>
        {jour.journal.length === 0 ? (
          // La gouttière de droite dégage la place du bouton flottant : sans
          // elle, la dernière ligne du message passe dessous, et c'est
          // précisément le bouton dont le message parle.
          <Surface
            variant="sunken"
            style={{ gap: theme.spacing.xs, paddingRight: theme.hitSize.fab + theme.spacing.sm }}>
            <Text variant="label">Rien encore aujourd&apos;hui.</Text>
            <Text variant="caption" color="textMuted">
              Le bouton + ouvre les quatre façons d&apos;ajouter une entrée.
            </Text>
          </Surface>
        ) : (
          <List>
            {jour.journal.map((entree) => (
              <LigneDuJournal key={entree.id} entree={entree} />
            ))}
          </List>
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
 * Une ligne du journal.
 *
 * Les trois genres se ressemblent à dessein : même hauteur, même heure à gauche,
 * même valeur à droite. Ce qui les distingue tient à une pastille et à la
 * couleur de la valeur — une dépense s'écrit signée, et jamais dans la couleur
 * des apports ; une pesée n'est pas une calorie et n'en prend donc pas la
 * teinte.
 */
function LigneDuJournal({ entree }: { entree: EntreeDuJournal }) {
  const theme = useTheme();

  if (entree.genre === 'activite') {
    return (
      <Row
        leading={<Pastille icon="run" tone="expenditure" />}
        time={heureDe(entree.occurredAt)}
        title={entree.libelle}
        detail={formatDuration(entree.dureeMin)}
        // Le serveur renvoie une dépense positive ; l'accueil la montre comme
        // ce qu'elle est pour la journée : des calories rendues.
        value={formatSignedKcal(-entree.kcalNet)}
        valueTone="expenditure"
        // Le tap rouvre la séance sur son propre écran de réglage : même
        // activité, même durée, avec l'enregistrement à corriger ou à
        // supprimer (docs/03 § 2).
        onPress={() =>
          router.push({
            pathname: '/activity/[code]',
            params: {
              code: entree.activityCode,
              entree: entree.id,
              duree: entree.dureeMin,
            },
          })
        }
      />
    );
  }

  if (entree.genre === 'pesee') {
    return (
      <Row
        leading={<Pastille icon="scale" />}
        time={heureDe(entree.occurredAt)}
        title="Pesée"
        // L'écart signalé se dit ici comme ailleurs : la pesée est gardée, elle
        // pèse seulement moins dans la tendance (docs/03 § 1.5).
        detail={entree.estAberrante ? 'écart signalé' : undefined}
        value={formatWeight(entree.poidsKg)}
        onPress={() => router.push('/weigh-in')}
      />
    );
  }

  return (
    <Row
      leading={<Pastille icon="meal" tone="intake" />}
      time={heureDe(entree.occurredAt)}
      title={entree.libelle}
      detail={detailDuRepas(entree)}
      value={entree.kcal === null ? '—' : formatKcal(entree.kcal)}
      valueTone={entree.kcal === null ? 'textMuted' : 'text'}
      trailing={
        entree.kcal === null ? <PendingDot style={{ marginLeft: theme.spacing.sm }} /> : undefined
      }
      // Le tap rouvre le repas dans le composeur, avec ses composants : la
      // correction d'une quantité est le geste le plus fréquent après la saisie.
      onPress={() => router.push({ pathname: '/meal', params: { entree: entree.id } })}
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
        <Text variant="title">Presque prêt</Text>
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
        <Text variant="title">Journée indisponible</Text>
        <Text variant="body" color="textSecondary">
          Kalou n&apos;a pas réussi à joindre le serveur. Rien n&apos;est perdu — réessaie.
        </Text>
        <Button label="Réessayer" onPress={onReessayer} />
      </View>
    </Screen>
  );
}
