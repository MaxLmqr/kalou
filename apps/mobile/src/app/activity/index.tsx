import { kcalNet } from '@kalou/api/domain';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import {
  Button,
  Input,
  List,
  Row,
  Screen,
  ScreenHeader,
  Section,
  Surface,
  Text,
} from '@/components/ui';
import { useTheme } from '@/design';
import { formatKcal } from '@/design/format';
import { CATEGORIES, useActivites, type ActiviteMet } from '@/hooks/use-activites';
import { useJournee } from '@/hooks/use-journee';

/** Séance de référence servant d'ordre de grandeur dans la liste. */
const DUREE_REFERENCE_MIN = 30;

/**
 * Réduit un libellé à sa forme comparable : sans accent, sans casse.
 *
 * C'est le même besoin que la recherche d'aliments (doc 08 § 5) mais pas le
 * même problème : vingt-deux libellés déjà en mémoire, contre un index CIQUAL
 * de plusieurs milliers de lignes. Filtrer ici évite un aller-retour réseau à
 * chaque frappe pour une table qui ne bouge jamais.
 */
function comparable(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Choisir une activité (docs/03 § 1.4).
 *
 * La liste est groupée par catégorie et non triée par usage personnel : le
 * classement par fréquence demande le décompte d'usages de `/favorites`
 * (doc 06 § 8), qui n'existe pas encore. Le champ de recherche est là pour ça
 * en attendant — sur vingt-deux entrées, il va plus vite qu'un tri.
 */
export default function ChoixActiviteScreen() {
  const theme = useTheme();
  const [recherche, setRecherche] = useState('');
  const { data: activites, isPending, error, refetch } = useActivites();
  const { data: jour } = useJournee();

  // La tendance de poids sert l'ordre de grandeur affiché sur chaque ligne.
  // Absente, les lignes retombent sur le MET : mieux vaut un chiffre technique
  // qu'un chiffre inventé à un poids par défaut.
  const poidsKg = jour?.tendance_poids_kg ?? null;

  const filtrees = useMemo(() => {
    if (!activites) return [];
    const terme = comparable(recherche.trim());
    const retenues =
      terme.length === 0
        ? [...activites]
        : activites.filter((activite) => comparable(activite.libelle).includes(terme));
    return retenues.sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'));
  }, [activites, recherche]);

  const groupes = useMemo(() => {
    const connues = CATEGORIES.map((categorie) => ({
      titre: categorie.libelle,
      activites: filtrees.filter((activite) => activite.categorie === categorie.code),
    }));

    // Filet : une catégorie ajoutée au référentiel côté serveur n'est pas dans
    // la table locale des libellés. Sans ce groupe, ses activités
    // disparaîtraient de la liste sans que rien ne le signale.
    const codesConnus = CATEGORIES.map((categorie) => categorie.code as string);
    const autres = filtrees.filter((activite) => !codesConnus.includes(activite.categorie));

    return [...connues, { titre: 'Autres', activites: autres }].filter(
      (groupe) => groupe.activites.length > 0,
    );
  }, [filtrees]);

  const enRecherche = recherche.trim().length > 0;

  const ligne = (activite: ActiviteMet) => (
    <Row
      key={activite.code}
      title={activite.libelle}
      value={
        poidsKg === null
          ? `MET ${activite.met.toLocaleString('fr-FR')}`
          : `≈ ${formatKcal(kcalNet({ met: activite.met, poidsKg, dureeMin: DUREE_REFERENCE_MIN }))}`
      }
      valueTone={poidsKg === null ? 'textMuted' : 'expenditure'}
      onPress={() => router.push({ pathname: '/activity/[code]', params: { code: activite.code } })}
    />
  );

  return (
    <Screen avoidKeyboard>
      <ScreenHeader title="Ajouter une activité" onCancel={() => router.back()} />

      <View style={{ gap: theme.spacing.sm }}>
        <Input
          placeholder="Chercher une activité"
          value={recherche}
          onChangeText={setRecherche}
          autoCorrect={false}
          returnKeyType="search"
        />
        {poidsKg !== null ? (
          <Text variant="caption" color="textMuted">
            Calories nettes pour {DUREE_REFERENCE_MIN} minutes, à ton poids de tendance.
          </Text>
        ) : null}
      </View>

      {isPending ? (
        <View style={{ paddingVertical: theme.spacing.xxxl, alignItems: 'center' }}>
          <ActivityIndicator color={theme.colors.textMuted} />
        </View>
      ) : error ? (
        <Surface variant="sunken" style={{ gap: theme.spacing.md }}>
          <Text variant="label">Liste des activités indisponible</Text>
          <Text variant="caption" color="textMuted">
            Kalou n&apos;a pas réussi à joindre le serveur. Rien n&apos;est perdu — réessaie.
          </Text>
          <Button label="Réessayer" variant="secondary" size="md" onPress={() => refetch()} />
        </Surface>
      ) : filtrees.length === 0 ? (
        <Surface variant="sunken" style={{ gap: theme.spacing.xs }}>
          <Text variant="label">Aucune activité pour « {recherche.trim()} »</Text>
          <Text variant="caption" color="textMuted">
            Le référentiel couvre les vingt-deux activités du modèle. Choisis la plus proche : ce
            qui compte est l&apos;ordre de grandeur de l&apos;effort, pas son nom.
          </Text>
        </Surface>
      ) : enRecherche ? (
        // En recherche, le groupement par catégorie découperait trois résultats
        // en trois cartes : la liste est plate, l'ordre est alphabétique.
        <List>{filtrees.map(ligne)}</List>
      ) : (
        groupes.map((groupe) => (
          <Section key={groupe.titre} title={groupe.titre}>
            <List>{groupe.activites.map(ligne)}</List>
          </Section>
        ))
      )}
    </Screen>
  );
}
