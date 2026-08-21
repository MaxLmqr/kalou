import { kcalNet } from '@kalou/api/domain';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import {
  BigNumber,
  Button,
  Chip,
  MessageErreur,
  Screen,
  ScreenHeader,
  StatLine,
  Stepper,
  Surface,
  Text,
} from '@/components/ui';
import { useTheme } from '@/design';
import { formatDuration, formatKcal, formatWeight } from '@/design/format';
import {
  useActivites,
  useEnregistrerActivite,
  useModifierActivite,
  useSupprimerActivite,
  type ActiviteMet,
} from '@/hooks/use-activites';
import { manqueALOnboarding, useJournee } from '@/hooks/use-journee';

/** Pas du sélecteur, et donc durée minimale saisissable. */
const PAS_MIN = 5;
/** Bornes du serveur : au-delà de 12 h, c'est une erreur de saisie. */
const DUREE_MAX_MIN = 720;
/** Durée d'ouverture, faute de mieux : le décompte d'usages n'existe pas encore. */
const DUREE_PAR_DEFAUT_MIN = 30;
const DUREES_PROPOSEES = [20, 30, 45, 60] as const;

/**
 * Régler la durée, et enregistrer (docs/03 § 1.4).
 *
 * Les calories nettes s'affichent **en direct** pendant le réglage : c'est ce
 * qui rend lisible le lien entre l'effort et l'apport cible, et c'est pour ça
 * que la valeur occupe la place du chiffre unique de l'écran.
 *
 * Le même écran corrige une séance déjà enregistrée : la ligne du journal y
 * arrive avec l'identifiant de l'entrée et sa durée. Seule la durée se modifie —
 * changer d'activité, c'est saisir autre chose (doc 06 § 9).
 */
export default function DureeActiviteScreen() {
  const { code, entree, duree } = useLocalSearchParams<{
    code: string;
    entree?: string;
    duree?: string;
  }>();

  const { data: activites, isPending } = useActivites();
  const { data: jour, error: erreurJournee } = useJournee();

  if (isPending) {
    return (
      <Screen>
        <ScreenHeader onBack={() => router.back()} />
        <View style={{ paddingVertical: 48, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  const activite = activites?.find((element) => element.code === code);

  // Une activité retirée du référentiel garde ses séances passées (le serveur ne
  // filtre pas le journal sur `actif`). On ne peut plus en régler la durée — le
  // MET n'est plus servi, donc aucune estimation n'est affichable — mais on doit
  // pouvoir supprimer l'entrée.
  if (!activite) return <ActiviteRetiree entreeId={entree} />;

  // Le poids figé d'une séance est la tendance du jour (doc 02 § 7) : sans
  // pesée, il n'y a pas de tendance, et le serveur refuse l'écriture plutôt que
  // d'inventer un poids. L'écran le dit avant la saisie, pas après.
  const poidsKg = jour?.tendance_poids_kg ?? null;
  if (poidsKg === null) {
    return <PeseeManquante manque={manqueALOnboarding(erreurJournee) ?? []} />;
  }

  const dureeInitiale = Number(duree);

  return (
    <Formulaire
      activite={activite}
      poidsKg={poidsKg}
      entreeId={entree}
      dureeInitiale={
        Number.isFinite(dureeInitiale) && dureeInitiale > 0
          ? dureeInitiale
          : DUREE_PAR_DEFAUT_MIN
      }
    />
  );
}

function Formulaire({
  activite,
  poidsKg,
  entreeId,
  dureeInitiale,
}: {
  activite: ActiviteMet;
  poidsKg: number;
  entreeId?: string;
  dureeInitiale: number;
}) {
  const theme = useTheme();
  const [dureeMin, setDureeMin] = useState(dureeInitiale);

  const enregistrer = useEnregistrerActivite();
  const modifier = useModifierActivite();
  const supprimer = useSupprimerActivite();

  const modification = entreeId !== undefined;
  const enCours = enregistrer.isPending || modifier.isPending || supprimer.isPending;
  const echec = enregistrer.isError || modifier.isError || supprimer.isError;

  /**
   * Estimation affichée pendant le réglage.
   *
   * La formule n'est pas réimplémentée ici : `kcalNet` est **le module du
   * serveur** (doc 02 § 7), importé tel quel. Le chiffre enregistré reste
   * néanmoins celui que le serveur calcule, à sa précision de tendance — d'où
   * un écart possible d'une calorie, qui ne change rien à une décision.
   */
  const kcal = kcalNet({ met: activite.met, poidsKg, dureeMin });

  const regler = (valeur: number) =>
    setDureeMin(Math.min(DUREE_MAX_MIN, Math.max(PAS_MIN, valeur)));

  const valider = () => {
    const apres = () => router.dismissTo('/');
    if (modification) modifier.mutate({ id: entreeId, duree_min: dureeMin }, { onSuccess: apres });
    else enregistrer.mutate({ activity_code: activite.code, duree_min: dureeMin }, { onSuccess: apres });
  };

  return (
    <Screen
      footer={
        <View style={{ gap: theme.spacing.sm }}>
          <Button label="Enregistrer" loading={enCours} onPress={valider} />
          {modification ? (
            <Button
              label="Supprimer cette séance"
              variant="ghost"
              disabled={enCours}
              onPress={() => supprimer.mutate(entreeId, { onSuccess: () => router.dismissTo('/') })}
            />
          ) : null}
        </View>
      }>
      <ScreenHeader
        title={modification ? 'Modifier la séance' : 'Ta séance'}
        onBack={() => router.back()}
      />

      {/*
        Le chiffre est positif et le libellé dit ce qu'il fait : une activité
        *augmente* l'apport cible. L'entrée correspondante s'affichera en négatif
        dans le journal, où elle est une dépense — ce sont deux points de vue,
        pas deux valeurs.
      */}
      <BigNumber
        value={formatKcal(kcal)}
        label="calories ajoutées à ton apport cible"
        note={`${activite.libelle} · MET ${activite.met.toLocaleString('fr-FR')}`}
      />

      <Surface style={{ gap: theme.spacing.xl }}>
        <Stepper
          variant="numberLarge"
          value={formatDuration(dureeMin)}
          note="durée de la séance"
          decrementLabel={`Retirer ${PAS_MIN} minutes`}
          incrementLabel={`Ajouter ${PAS_MIN} minutes`}
          onDecrement={() => regler(dureeMin - PAS_MIN)}
          onIncrement={() => regler(dureeMin + PAS_MIN)}
        />

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {DUREES_PROPOSEES.map((proposee) => (
            <Chip
              key={proposee}
              grow
              label={formatDuration(proposee)}
              selected={proposee === dureeMin}
              onPress={() => setDureeMin(proposee)}
            />
          ))}
        </View>
      </Surface>

      {/*
        Ce qui sera figé dans l'enregistrement, dit avant de l'écrire : c'est ce
        qui rend la séance vérifiable des années plus tard, et ce qui explique
        qu'une pesée du lendemain ne réécrira pas ce chiffre.
      */}
      <Surface variant="sunken" style={{ gap: theme.spacing.sm }}>
        <StatLine label="Poids retenu" value={formatWeight(poidsKg)} />
        <StatLine label="Durée" value={formatDuration(dureeMin)} />
        <Text variant="caption" color="textMuted">
          Kalou retient les calories nettes : le repos de la séance est déjà compté dans ton besoin
          de base. Le poids utilisé est ta tendance du jour, et il ne changera plus pour cette
          séance.
        </Text>
      </Surface>

      {echec ? (
        <MessageErreur>L&apos;enregistrement a échoué. Réessaie dans un instant.</MessageErreur>
      ) : null}
    </Screen>
  );
}

/** Une séance dont l'activité n'est plus servie par le référentiel. */
function ActiviteRetiree({ entreeId }: { entreeId?: string }) {
  const theme = useTheme();
  const supprimer = useSupprimerActivite();

  return (
    <Screen>
      <ScreenHeader title="Séance" onBack={() => router.back()} />
      <Surface variant="sunken" style={{ gap: theme.spacing.md }}>
        <Text variant="label">Cette activité n&apos;est plus au référentiel</Text>
        <Text variant="caption" color="textMuted">
          La séance reste comptée dans ta journée, avec le MET et le poids figés à sa saisie. Sa
          durée n&apos;est plus modifiable ici.
        </Text>
        {entreeId !== undefined ? (
          <Button
            label="Supprimer cette séance"
            variant="secondary"
            size="md"
            loading={supprimer.isPending}
            onPress={() => supprimer.mutate(entreeId, { onSuccess: () => router.dismissTo('/') })}
          />
        ) : null}
      </Surface>
    </Screen>
  );
}

/** Pas de pesée, donc pas de tendance, donc pas de dépense calculable. */
function PeseeManquante({ manque }: { manque: string[] }) {
  const theme = useTheme();

  return (
    <Screen>
      <ScreenHeader title="Ta séance" onBack={() => router.back()} />
      <Surface variant="sunken" style={{ gap: theme.spacing.md }}>
        <Text variant="label">Il manque une pesée</Text>
        <Text variant="caption" color="textMuted">
          Les calories d&apos;une séance se calculent sur ton poids de tendance. Sans une première
          pesée, Kalou préfère ne rien enregistrer plutôt que d&apos;inventer un poids.
        </Text>
        <Button
          label="Me peser"
          variant="secondary"
          size="md"
          onPress={() => router.push('/weigh-in')}
        />
      </Surface>
      {manque.length > 1 ? (
        <Text variant="caption" color="textMuted">
          Ton profil est aussi incomplet par ailleurs : l&apos;accueil dit ce qui manque.
        </Text>
      ) : null}
    </Screen>
  );
}
