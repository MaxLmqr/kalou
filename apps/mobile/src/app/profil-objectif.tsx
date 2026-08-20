import { deficitQuotidien } from '@kalou/api/domain';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  Badge,
  Button,
  Icon,
  Input,
  MessageErreur,
  PressableSurface,
  Sheet,
  Surface,
  Text,
} from '@/components/ui';
import { useTheme } from '@/design';
import { formatKcal, formatRythme } from '@/design/format';
import { useEnregistrerObjectif, useMoi } from '@/hooks/use-moi';
import { erreurApi } from '@/lib/api';

const RYTHMES = [0.25, 0.5, 0.75] as const;
const RECOMMANDE = 0.5;

/**
 * Objectif de perte (doc 02 § 6).
 *
 * Trois rythmes, pas un curseur : un curseur suggère une précision que le modèle
 * n'a pas, et pousse à optimiser une valeur dont l'écart réel se mesure en
 * centaines de calories.
 *
 * Les plafonds — 1 % du poids par semaine, 25 % de la dépense, plancher
 * d'apport — sont appliqués **par le serveur**, qui renvoie le rythme retenu.
 * Les recalculer ici pour griser des cartes ferait diverger les deux règles à la
 * première évolution.
 */
export default function ObjectifScreen() {
  const theme = useTheme();
  const { data: moi } = useMoi();
  const enregistrer = useEnregistrerObjectif();

  const objectif = moi?.goal;
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
      await enregistrer.mutateAsync({
        rythme_kg_semaine: rythme,
        ...(cibleKg !== undefined ? { poids_cible_kg: cibleKg } : {}),
      });
      router.back();
    } catch {
      // Rendu par `messageErreur` : la feuille reste ouverte sur la saisie.
    }
  }

  return (
    <Sheet
      title="Ton objectif"
      scroll
      footer={
        <Button
          label="Enregistrer"
          disabled={!cibleValide}
          loading={enregistrer.isPending}
          onPress={valider}
        />
      }>
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
          Changer d&apos;objectif ne réécrit pas le passé : le budget des journées déjà closes
          reste celui qui était le tien ce jour-là.
        </Text>
      </Surface>
    </Sheet>
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
