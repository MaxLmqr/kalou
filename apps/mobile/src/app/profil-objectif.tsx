import { deficitQuotidien } from '@kalou/api/domain';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import {
  Badge,
  Button,
  Icon,
  Input,
  MessageErreur,
  PressableSurface,
  Screen,
  ScreenHeader,
  StatLine,
  Surface,
  Text,
} from '@/components/ui';
import { useTheme } from '@/design';
import { formatKcal, formatRythme } from '@/design/format';
import { useEnregistrerObjectif, useMoi } from '@/hooks/use-moi';
import { erreurApi } from '@/lib/api';

const RYTHMES = [0.25, 0.5, 0.75] as const;
const RECOMMANDE = 0.5;

/** Doc 02 § 6 et § 5.4. Chaque plafond a une raison, et elle se dit. */
const RAISON_DU_PLAFOND: Record<string, string> = {
  part_du_poids:
    'Au-delà de 1 % de ton poids par semaine, la perte se fait surtout sur le muscle.',
  deficit_max: 'Le déficit ne dépasse jamais un quart de ton besoin journalier.',
  plancher_apport: 'Descendre plus bas te ferait passer sous le plancher de sécurité.',
};

/**
 * Objectif de perte (doc 02 § 6).
 *
 * Trois rythmes, pas un curseur : un curseur suggère une précision que le modèle
 * n'a pas, et pousse à optimiser une valeur dont l'écart réel se mesure en
 * centaines de calories.
 *
 * C'est un écran dédié, poussé sur la pile : un réglage durable se modifie
 * dans un écran qui a son titre et son retour, pas dans une feuille.
 *
 * Les plafonds — 1 % du poids par semaine, 25 % du besoin journalier, plancher
 * d'apport — sont appliqués **par le serveur**, qui renvoie le rythme retenu.
 * Les recalculer ici pour griser des cartes ferait diverger les deux règles à la
 * première évolution.
 */
type ObjectifExistant = { rythmeDemande: number; poidsCibleKg: number | null };

export default function ObjectifScreen() {
  const { data: moi, isPending } = useMoi();

  if (isPending) {
    return (
      <Screen>
        <ScreenHeader title="Ton objectif" onBack={() => router.back()} />
        <View style={{ paddingVertical: 48, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  return <Formulaire objectif={moi?.goal ?? null} />;
}

/**
 * Séparé de l'écran pour que `useState` reçoive l'objectif courant dès son
 * premier rendu : un initialiseur ne se rejoue pas quand la requête arrive, et
 * l'écran resterait sur ses valeurs par défaut.
 */
function Formulaire({ objectif }: { objectif: ObjectifExistant | null }) {
  const theme = useTheme();
  const enregistrer = useEnregistrerObjectif();

  const [rythme, setRythme] = useState<number>(objectif?.rythmeDemande ?? RECOMMANDE);
  const [poidsCible, setPoidsCible] = useState(
    objectif?.poidsCibleKg ? String(objectif.poidsCibleKg).replace('.', ',') : '',
  );

  const cibleKg = poidsCible.length > 0 ? Number(poidsCible.replace(',', '.')) : undefined;
  const cibleValide =
    cibleKg === undefined || (Number.isFinite(cibleKg) && cibleKg >= 30 && cibleKg <= 300);

  const messageErreur = enregistrer.isError ? messageDErreur(enregistrer.error) : null;

  async function valider() {
    if (!cibleValide) return;
    try {
      const resultat = await enregistrer.mutateAsync({
        rythme_kg_semaine: rythme,
        ...(cibleKg !== undefined ? { poids_cible_kg: cibleKg } : {}),
      });
      // Doc 02 § 6 : les plafonds s'appliquent silencieusement **puis
      // s'expliquent**. Repartir sur un rythme qu'on n'a pas choisi, sans un
      // mot, c'est n'appliquer que la moitié de la règle.
      if (resultat.plafonds_appliques.length === 0) router.back();
    } catch {
      // Rendu par `messageErreur` : l'écran reste ouvert sur la saisie.
    }
  }

  const ajuste = enregistrer.data;
  if (ajuste && ajuste.plafonds_appliques.length > 0) {
    return (
      <Screen footer={<Button label="Compris" onPress={() => router.back()} />}>
        <ScreenHeader title="Rythme ajusté" onBack={() => router.back()} />

        <View
          style={{
            alignItems: 'center',
            gap: theme.spacing.xs,
            marginVertical: theme.spacing.sm,
          }}>
          <Text variant="numberLarge">{formatRythme(ajuste.rythme_applique)}</Text>
          <Text variant="body" color="textSecondary">
            au lieu de {formatRythme(rythme)}
          </Text>
        </View>

        <Surface variant="sunken" style={{ gap: theme.spacing.sm }}>
          {ajuste.plafonds_appliques.map((motif) => (
            <Text key={motif} variant="body" color="textSecondary">
              {RAISON_DU_PLAFOND[motif] ?? motif}
            </Text>
          ))}
        </Surface>

        <Surface variant="accent" style={{ gap: theme.spacing.xs }}>
          <StatLine label="Ton apport cible" value={formatKcal(ajuste.apport_cible_estime)} />
          <StatLine
            label="Ton besoin journalier"
            value={formatKcal(ajuste.besoin_journalier_estime)}
          />
        </Surface>
      </Screen>
    );
  }

  return (
    <Screen
      avoidKeyboard
      footer={
        <Button
          label="Enregistrer"
          disabled={!cibleValide}
          loading={enregistrer.isPending}
          onPress={valider}
        />
      }>
      <ScreenHeader title="Ton objectif" onBack={() => router.back()} />

      <View style={{ gap: theme.spacing.md }}>
        {RYTHMES.map((option) => {
          const selectionne = option === rythme;
          return (
            <PressableSurface
              key={option}
              variant="raised"
              selected={selectionne}
              onPress={() => setRythme(option)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
              <View style={{ flex: 1, gap: theme.spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Text variant="heading">{formatRythme(option)}</Text>
                  {option === RECOMMANDE ? <Badge label="recommandé" tone="accent" /> : null}
                </View>
                <Text variant="caption" color="textMuted">
                  −{formatKcal(deficitQuotidien(option))} kcal par jour
                </Text>
              </View>
              {selectionne ? <Icon name="check" size={22} color="accent" strokeWidth={2.2} /> : null}
            </PressableSurface>
          );
        })}
      </View>

      <Input
        label="Poids souhaité (facultatif)"
        value={poidsCible}
        onChangeText={setPoidsCible}
        placeholder="76,0"
        suffix="kg"
        numeric
      />

      {messageErreur ? <MessageErreur>{messageErreur}</MessageErreur> : null}

      <Surface variant="sunken" style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <Icon name="info" size={20} color="textMuted" />
        <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
          Changer d&apos;objectif ne réécrit pas le passé : l&apos;apport cible des journées
          déjà closes reste celui qui était le tien ce jour-là.
        </Text>
      </Surface>
    </Screen>
  );
}

/**
 * Traduit l'erreur du serveur.
 *
 * Deux cas méritent une phrase à eux. Sans pesée surtout : le rythme n'est pas
 * calculable, et rien sur cet écran ne permet de le deviner — le message doit
 * donc dire où aller.
 */
function messageDErreur(rejet: unknown): string {
  const erreur = erreurApi(rejet);

  if (erreur?.code === 'profil_incomplet') {
    const manque = (erreur.details?.manque as string[] | undefined) ?? [];
    if (manque.includes('pesee')) {
      return 'Kalou a besoin d’une première pesée pour calculer ton rythme. Pèse-toi depuis l’accueil, puis reviens.';
    }
    return 'Renseigne d’abord ta morphologie : sans elle, le rythme n’est pas calculable.';
  }
  if (erreur?.code === 'poids_cible_incoherent') {
    return 'Ton poids souhaité doit être inférieur à ton poids actuel.';
  }
  return erreur?.message ?? "L'enregistrement a échoué. Réessaie dans un instant.";
}
