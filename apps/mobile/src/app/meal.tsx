import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import {
  Badge,
  Button,
  Chip,
  Icon,
  Input,
  List,
  MessageErreur,
  Row,
  Screen,
  ScreenHeader,
  Section,
  Stepper,
  Surface,
  Text,
} from '@/components/ui';
import { useTheme } from '@/design';
import { formatGrammes, formatKcal, formatKcalPour100g } from '@/design/format';
import {
  useChargerAliment,
  useEnregistrerRepas,
  useModifierRepas,
  useRechercheAliments,
  useSupprimerRepas,
  type ResultatAliment,
} from '@/hooks/use-aliments';
import { useJournee, type EntreeDuJournal } from '@/hooks/use-journee';
import {
  avecQuantite,
  grammesDe,
  itemsDe,
  ligneDepuisComposant,
  multipleDe,
  ouvertureDe,
  portionDe,
  PAS_G,
  type Ligne,
  type LigneReference,
  type Portion,
} from '@/lib/repas';

/** Attente avant d'interroger le serveur, en ms. Une frappe n'est pas une requête. */
const DELAI_RECHERCHE = 250;

type Repas = Extract<EntreeDuJournal, { genre: 'repas' }>;

/**
 * Composer un repas (docs/03 § 1.3, docs/08 § 7).
 *
 * **Un seul écran, quel que soit le point d'entrée** — et la recherche est
 * dedans, pas avant : c'est la maquette du doc 08 § 7, où le champ de recherche
 * et la liste des composants cohabitent. L'écran de recherche séparé a disparu,
 * il faisait un aller-retour pour rien.
 *
 * Il sert aussi à corriger un repas déjà enregistré : la ligne du journal y
 * arrive avec l'identifiant de l'entrée, et `PATCH` remplace la liste des
 * composants (doc 06 § 5).
 */
export default function ComposeurScreen() {
  const { entree, photo } = useLocalSearchParams<{ entree?: string; photo?: string }>();
  const { data: jour, isPending } = useJournee();

  // Pas d'endpoint dédié à une entrée : la journée en cours porte déjà ses
  // composants (doc 06 § 4), et c'est la seule journée modifiable.
  const existante =
    entree === undefined
      ? undefined
      : jour?.journal.find(
          (element): element is Repas => element.genre === 'repas' && element.id === entree,
        );

  if (entree !== undefined && isPending) {
    return (
      <Screen>
        <ScreenHeader onCancel={() => router.back()} cancelLabel="Fermer" />
        <View style={{ paddingVertical: 48, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  if (entree !== undefined && !existante) return <Introuvable />;

  return (
    <Composeur
      entreeId={existante?.id}
      titre={existante?.libelle ?? 'Composer un repas'}
      lignesInitiales={existante ? existante.items.map(ligneDepuisComposant) : []}
      viaPhoto={photo !== undefined}
    />
  );
}

/**
 * Séparé de l'écran pour que `useState` reçoive les composants existants dès son
 * premier rendu : un initialiseur ne se rejoue pas quand la requête arrive.
 */
function Composeur({
  entreeId,
  titre,
  lignesInitiales,
  viaPhoto,
}: {
  entreeId?: string;
  titre: string;
  lignesInitiales: Ligne[];
  viaPhoto: boolean;
}) {
  const theme = useTheme();
  const [lignes, setLignes] = useState<Ligne[]>(lignesInitiales);
  const [saisie, setSaisie] = useState('');
  const [terme, setTerme] = useState('');
  const [toutesVariantes, setToutesVariantes] = useState(false);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [libre, setLibre] = useState<{ libelle: string; kcal: string } | null>(null);

  const chargerAliment = useChargerAliment();
  const recherche = useRechercheAliments(terme, toutesVariantes);
  const enregistrer = useEnregistrerRepas();
  const modifier = useModifierRepas();
  const supprimer = useSupprimerRepas();

  // Le serveur reçoit la frappe une fois posée, pas à chaque lettre.
  useEffect(() => {
    const minuteur = setTimeout(() => setTerme(saisie.trim()), DELAI_RECHERCHE);
    return () => clearTimeout(minuteur);
  }, [saisie]);

  // Changer de terme sort du mode « toutes les variantes » : il a été demandé
  // pour une recherche, pas pour la session.
  useEffect(() => setToutesVariantes(false), [terme]);

  /*
    Les composants venus du journal n'ont que l'identifiant de leur portion, pas
    son libellé ni le référentiel de l'aliment : on complète en tâche de fond
    pour que le sélecteur de quantité soit utilisable sans attendre un tap.
  */
  useEffect(() => {
    for (const ligne of lignesInitiales) {
      if (ligne.type !== 'reference') continue;
      chargerAliment(ligne.foodId)
        .then((aliment) =>
          setLignes((liste) =>
            liste.map((element) =>
              element.cle === ligne.cle && element.type === 'reference'
                ? { ...element, portions: aliment.portions, kcal100g: element.kcal100g || aliment.kcal_100g }
                : element,
            ),
          ),
        )
        .catch(() => undefined);
    }
    // Une seule fois, sur les composants d'ouverture : les lignes ajoutées
    // ensuite portent déjà leurs portions.
  }, []);

  const total = lignes.reduce((somme, ligne) => somme + ligne.kcal, 0);
  const enCours = enregistrer.isPending || modifier.isPending || supprimer.isPending;
  const echec = enregistrer.isError || modifier.isError || supprimer.isError;

  const ajouter = async (resultat: ResultatAliment) => {
    const aliment = await chargerAliment(resultat.id);
    const ouverture = ouvertureDe(aliment);
    const base: LigneReference = {
      cle: `${aliment.id}-${Date.now()}`,
      type: 'reference',
      foodId: aliment.id,
      libelle: aliment.libelle,
      kcal100g: aliment.kcal_100g,
      portions: aliment.portions,
      kcal: 0,
      ...ouverture,
    };
    setLignes((liste) => [...liste, avecQuantite(base, base.quantite, base.unite, base.portionId)]);
    setSaisie('');
    setTerme('');
  };

  const majLigne = (cle: string, transformer: (ligne: LigneReference) => LigneReference) =>
    setLignes((liste) =>
      liste.map((ligne) => (ligne.cle === cle && ligne.type === 'reference' ? transformer(ligne) : ligne)),
    );

  const valider = () => {
    const items = itemsDe(lignes);
    const apres = () => router.dismissTo('/');
    if (entreeId) modifier.mutate({ id: entreeId, items }, { onSuccess: apres });
    else enregistrer.mutate({ items }, { onSuccess: apres });
  };

  const resultats = terme.length > 0 ? recherche.data?.resultats ?? [] : [];

  return (
    <Screen
      avoidKeyboard
      footer={
        <View style={{ gap: theme.spacing.sm }}>
          <Button
            label="Enregistrer"
            loading={enCours}
            disabled={lignes.length === 0}
            onPress={valider}
          />
          {entreeId ? (
            <Button
              label="Supprimer ce repas"
              variant="ghost"
              disabled={enCours}
              onPress={() => supprimer.mutate(entreeId, { onSuccess: () => router.dismissTo('/') })}
            />
          ) : null}
        </View>
      }>
      <ScreenHeader title={titre} onCancel={() => router.back()} cancelLabel="Fermer" />

      {viaPhoto ? (
        <Surface variant="sunken" style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Icon name="info" size={20} color="textMuted" />
          <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
            L&apos;estimation par photo n&apos;est pas encore branchée. En attendant, cherche les
            aliments ou saisis une ligne libre si tu connais déjà les calories.
          </Text>
        </Surface>
      ) : null}

      <Input
        placeholder="Chercher un aliment"
        value={saisie}
        onChangeText={setSaisie}
        autoCorrect={false}
        autoFocus={lignes.length === 0}
        returnKeyType="search"
      />

      {terme.length > 0 ? (
        <Section title="Base d'aliments">
          {recherche.isError ? (
            <Surface variant="sunken" style={{ gap: theme.spacing.md }}>
              <Text variant="label">Recherche indisponible</Text>
              <Text variant="caption" color="textMuted">
                Kalou n&apos;a pas réussi à joindre le serveur. Une ligne libre reste possible.
              </Text>
            </Surface>
          ) : resultats.length === 0 ? (
            <Surface variant="sunken" style={{ gap: theme.spacing.xs }}>
              <Text variant="label">
                {recherche.isFetching ? 'Recherche…' : `Rien pour « ${terme} »`}
              </Text>
              <Text variant="caption" color="textMuted">
                Les libellés sont ceux de la cuisine, pas ceux du laboratoire : essaie « riz » ou
                « pomme ». Sinon, une ligne libre fait le travail.
              </Text>
            </Surface>
          ) : (
            <List>
              {resultats.map((resultat) => (
                <Row
                  key={resultat.id}
                  title={resultat.libelle}
                  detail={resultat.deja_consomme ? 'déjà mangé' : undefined}
                  value={formatKcalPour100g(resultat.kcal_100g)}
                  valueTone="textMuted"
                  onPress={() => ajouter(resultat)}
                />
              ))}
              {/*
                Le sous-ensemble curé d'abord, CIQUAL entier sur demande
                explicite (doc 08 § 5) : onze variantes de pois chiches en
                réponse à « pois chiche » est un échec produit.
              */}
              {recherche.data?.plus_de_variantes && !toutesVariantes ? (
                <Row
                  leading={<Icon name="chevronDown" size={16} color="textMuted" strokeWidth={2} />}
                  title="Voir toutes les variantes"
                  onPress={() => setToutesVariantes(true)}
                />
              ) : null}
            </List>
          )}
        </Section>
      ) : null}

      <Section
        title="Mon repas"
        trailing={
          lignes.length > 0 ? (
            <Text variant="caption" color="textMuted">
              {lignes.length === 1 ? '1 composant' : `${lignes.length} composants`}
            </Text>
          ) : null
        }>
        {lignes.length === 0 ? (
          <Surface variant="sunken" style={{ gap: theme.spacing.xs }}>
            <Text variant="label">Rien dans ce repas pour l&apos;instant.</Text>
            <Text variant="caption" color="textMuted">
              Cherche un aliment ci-dessus, ou saisis une ligne libre si tu connais déjà ses
              calories.
            </Text>
          </Surface>
        ) : (
          <List>
            {lignes.map((ligne) => (
              <LigneDuRepas
                key={ligne.cle}
                ligne={ligne}
                ouverte={ouverte === ligne.cle}
                onBasculer={() => setOuverte((actuelle) => (actuelle === ligne.cle ? null : ligne.cle))}
                onQuantite={(quantite, unite, portionId) =>
                  majLigne(ligne.cle, (courante) => avecQuantite(courante, quantite, unite, portionId))
                }
                onRetirer={() =>
                  setLignes((liste) => liste.filter((element) => element.cle !== ligne.cle))
                }
              />
            ))}
          </List>
        )}

        {libre ? (
          <Surface variant="sunken" style={{ gap: theme.spacing.md }}>
            <Text variant="caption" color="textSecondary">
              Une ligne libre porte ses calories elle-même : c&apos;est le chemin quand la valeur est
              déjà connue, ou quand la base n&apos;a pas l&apos;aliment (doc 08 § 3).
            </Text>
            <Input
              label="Libellé"
              placeholder="Vinaigrette maison"
              value={libre.libelle}
              onChangeText={(libelle) => setLibre({ ...libre, libelle })}
            />
            <Input
              label="Calories"
              placeholder="0"
              suffix="kcal"
              numeric
              value={libre.kcal}
              onChangeText={(kcal) => setLibre({ ...libre, kcal })}
            />
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Button
                label="Ajouter"
                size="md"
                disabled={
                  libre.libelle.trim().length === 0 || !Number.isFinite(Number(libre.kcal))
                }
                onPress={() => {
                  setLignes((liste) => [
                    ...liste,
                    {
                      cle: `libre-${Date.now()}`,
                      type: 'libre',
                      libelle: libre.libelle.trim(),
                      kcal: Math.max(0, Math.round(Number(libre.kcal) || 0)),
                    },
                  ]);
                  setLibre(null);
                }}
              />
              <Button label="Annuler" variant="ghost" size="md" onPress={() => setLibre(null)} />
            </View>
          </Surface>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => setLibre({ libelle: '', kcal: '' })}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
              minHeight: theme.hitSize.md,
              opacity: pressed ? theme.motion.pressedOpacity : 1,
            })}>
            <Icon name="plus" size={18} color="accent" strokeWidth={2} />
            <Text variant="label" color="accent">
              Ligne libre — libellé et calories
            </Text>
          </Pressable>
        )}
      </Section>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm }}>
        <Text variant="heading" style={{ flex: 1 }}>
          Total
        </Text>
        <Text variant="numberLarge">{formatKcal(total)}</Text>
        <Text variant="caption" color="textMuted">
          kcal
        </Text>
      </View>

      {echec ? (
        <MessageErreur>L&apos;enregistrement a échoué. Réessaie dans un instant.</MessageErreur>
      ) : null}
    </Screen>
  );
}

/** Étiquette de quantité d'une ligne : la portion d'abord, les grammes toujours. */
function libelleQuantite(ligne: LigneReference): string {
  const grammes = grammesDe(ligne);
  const portion = portionDe(ligne);

  if (portion) {
    return `${multipleDe(ligne.quantite, portion)} · ${grammes === null ? '—' : formatGrammes(grammes)}`;
  }
  if (ligne.portionId) return `${ligne.quantite} portion${ligne.quantite > 1 ? 's' : ''}`;
  return ligne.unite === 'ml' ? `${Math.round(ligne.quantite)} ml` : formatGrammes(ligne.quantite);
}

/**
 * Une ligne du repas, avec son sélecteur de quantité replié.
 *
 * Les portions domestiques précèdent la saisie en grammes, l'équivalent en
 * grammes restant affiché pour rester vérifiable (doc 08 § 6). Le sélecteur
 * compte donc en portions quand une portion est choisie, et en grammes sinon —
 * mais la grande valeur est toujours en grammes.
 */
function LigneDuRepas({
  ligne,
  ouverte,
  onBasculer,
  onQuantite,
  onRetirer,
}: {
  ligne: Ligne;
  ouverte: boolean;
  onBasculer: () => void;
  onQuantite: (quantite: number, unite: LigneReference['unite'], portionId?: string) => void;
  onRetirer: () => void;
}) {
  const theme = useTheme();

  const entete = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        minHeight: theme.hitSize.lg,
        paddingVertical: theme.spacing.sm,
      }}>
      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Text variant="label" numberOfLines={2} style={{ flexShrink: 1 }}>
            {ligne.libelle}
          </Text>
          {ligne.type === 'libre' ? <Badge label="saisi" tone="pending" /> : null}
        </View>
        {ligne.type === 'reference' ? (
          <View style={{ flexDirection: 'row' }}>
            <Chip label={libelleQuantite(ligne)} selected={ouverte} onPress={onBasculer} />
          </View>
        ) : (
          <Text variant="caption" color="textMuted">
            calories saisies à la main
          </Text>
        )}
      </View>

      <Text variant="bodyMedium" tabular>
        {formatKcal(ligne.kcal)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Retirer ${ligne.libelle}`}
        onPress={onRetirer}
        hitSlop={theme.spacing.md}>
        <Icon name="close" size={16} color="borderStrong" strokeWidth={2} />
      </Pressable>
    </View>
  );

  if (ligne.type !== 'reference' || !ouverte) return entete;

  const portion = portionDe(ligne);

  /*
    Une ligne venue du journal n'a que l'identifiant de sa portion : tant que le
    référentiel de l'aliment n'est pas revenu, on ne connaît pas son poids. Un
    sélecteur qui afficherait « 1 g » en attendant serait pire qu'une attente
    annoncée — le premier incrément écrirait cette valeur fausse.
  */
  if (ligne.portionId && !portion) {
    return (
      <View>
        {entete}
        <Surface
          variant="sunken"
          radius="md"
          style={{ marginBottom: theme.spacing.md, alignItems: 'center' }}>
          <Text variant="caption" color="textMuted">
            Chargement des portions…
          </Text>
        </Surface>
      </View>
    );
  }

  const grammes = grammesDe(ligne) ?? ligne.quantite;
  const pas = portion ? portion.grammes : PAS_G;

  return (
    <View>
      {entete}
      <Surface
        variant="sunken"
        radius="md"
        style={{ gap: theme.spacing.lg, marginBottom: theme.spacing.md }}>
        <Stepper
          variant="numberLarge"
          value={formatGrammes(grammes)}
          note={portion ? multipleDe(ligne.quantite, portion) : 'grammes'}
          decrementLabel={`Retirer ${formatGrammes(pas)}`}
          incrementLabel={`Ajouter ${formatGrammes(pas)}`}
          onDecrement={() => {
            if (!portion) onQuantite(Math.max(PAS_G, ligne.quantite - PAS_G), ligne.unite, undefined);
            // Une demi-portion n'existe pas : sous une portion, on passe aux
            // grammes plutôt que d'inventer une fraction de cuillère.
            else if (ligne.quantite > 1) onQuantite(ligne.quantite - 1, 'portion', portion.id);
            else onQuantite(Math.max(PAS_G, Math.round(grammes) - PAS_G), 'g', undefined);
          }}
          onIncrement={() => {
            if (portion) onQuantite(ligne.quantite + 1, 'portion', portion.id);
            else onQuantite(ligne.quantite + PAS_G, ligne.unite, undefined);
          }}
        />

        {ligne.portions && ligne.portions.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {ligne.portions.map((element) => (
              <Chip
                key={element.id}
                label={`${element.libelle} · ${formatGrammes(element.grammes)}`}
                selected={element.id === ligne.portionId}
                onPress={() => onQuantite(1, 'portion', element.id)}
              />
            ))}
            <Chip
              label="Grammes"
              selected={!ligne.portionId}
              onPress={() => onQuantite(Math.max(PAS_G, Math.round(grammes)), 'g', undefined)}
            />
          </View>
        ) : null}
      </Surface>
    </View>
  );
}

/** L'entrée visée n'est plus dans la journée en cours. */
function Introuvable() {
  const theme = useTheme();

  return (
    <Screen>
      <ScreenHeader title="Repas" onCancel={() => router.back()} cancelLabel="Fermer" />
      <Surface variant="sunken" style={{ gap: theme.spacing.md }}>
        <Text variant="label">Ce repas n&apos;est plus dans ta journée</Text>
        <Text variant="caption" color="textMuted">
          Il a peut-être été supprimé, ou il appartient à un autre jour. Seule la journée en cours
          est modifiable.
        </Text>
        <Button label="Fermer" variant="secondary" size="md" onPress={() => router.back()} />
      </Surface>
    </Screen>
  );
}
