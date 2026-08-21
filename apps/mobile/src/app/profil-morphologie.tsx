import type { Sexe } from '@kalou/api/domain';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import {
  Button,
  Chip,
  Input,
  MessageErreur,
  Screen,
  ScreenHeader,
  Text,
} from '@/components/ui';
import { useTheme } from '@/design';
import { useEnregistrerProfil, useMoi } from '@/hooks/use-moi';
import { jourIso } from '@/lib/api';

/** `1988-03-14` → `14/03/1988`. Vide si la date est absente. */
function versSaisie(valeur: string | Date | null | undefined): string {
  const iso = jourIso(valeur);
  if (!iso) return '';
  const [annee, mois, jour] = iso.split('-');
  return `${jour}/${mois}/${annee}`;
}

/**
 * `14/03/1988` → `1988-03-14`, ou `null` si la saisie n'est pas une date réelle.
 *
 * Le contrôle va jusqu'à la reconstruction : `31/02` passe une validation par
 * bornes et devient le 3 mars une fois en base.
 */
function versIso(saisie: string): string | null {
  const correspondance = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(saisie.trim());
  if (!correspondance) return null;

  const [, jour, mois, annee] = correspondance;
  const date = new Date(Date.UTC(Number(annee), Number(mois) - 1, Number(jour)));
  const reel =
    date.getUTCFullYear() === Number(annee) &&
    date.getUTCMonth() === Number(mois) - 1 &&
    date.getUTCDate() === Number(jour);
  if (!reel) return null;

  const ageAns = (Date.now() - date.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (ageAns < 13 || ageAns > 120) return null;

  return `${annee}-${mois}-${jour}`;
}

/** Ajoute les barres obliques à la frappe, pour éviter de les taper. */
function formaterALaFrappe(saisie: string): string {
  const chiffres = saisie.replace(/\D/g, '').slice(0, 8);
  const morceaux = [chiffres.slice(0, 2), chiffres.slice(2, 4), chiffres.slice(4, 8)];
  return morceaux.filter(Boolean).join('/');
}

type ProfilExistant = {
  sexe: string | null;
  /** `string` selon le type d'Eden, `Date` à l'exécution — cf. `jourIso`. */
  dateNaissance: string | Date | null;
  tailleCm: number | null;
};

/**
 * Morphologie : les trois valeurs qui alimentent le métabolisme de base
 * (doc 02 § 2). Rien d'autre n'a sa place ici.
 *
 * C'est un écran dédié, poussé sur la pile : un réglage durable se modifie
 * dans un écran qui a son titre et son retour, pas dans une feuille.
 *
 * L'attente du profil est un état à part entière, et non un formulaire vide
 * qu'on remplirait après coup : un initialiseur `useState` ne se rejoue pas
 * quand la requête arrive. Rendre le formulaire avant, c'était le condamner à
 * rester vide chaque fois que le cache était froid — à l'ouverture de
 * l'application, précisément.
 */
export default function MorphologieScreen() {
  const { data: moi, isPending } = useMoi();

  if (isPending) {
    return (
      <Screen>
        <ScreenHeader title="Morphologie" onBack={() => router.back()} />
        <View style={{ paddingVertical: 48, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  return <Formulaire profile={moi?.profile ?? null} />;
}

function Formulaire({ profile }: { profile: ProfilExistant | null }) {
  const theme = useTheme();
  const enregistrer = useEnregistrerProfil();

  const [sexe, setSexe] = useState<Sexe | null>((profile?.sexe as Sexe | null) ?? null);
  const [naissance, setNaissance] = useState(versSaisie(profile?.dateNaissance));
  const [taille, setTaille] = useState(profile?.tailleCm ? String(profile.tailleCm) : '');

  const iso = versIso(naissance);
  const tailleCm = Number(taille);
  const tailleValide = Number.isInteger(tailleCm) && tailleCm >= 100 && tailleCm <= 250;
  const complet = sexe !== null && iso !== null && tailleValide;

  const naissanceEnErreur = naissance.length === 10 && iso === null;
  const tailleEnErreur = taille.length > 0 && !tailleValide;

  async function valider() {
    if (!complet) return;
    try {
      await enregistrer.mutateAsync({ sexe, date_naissance: iso, taille_cm: tailleCm });
      router.back();
    } catch {
      // Rendu par `enregistrer.isError` : l'écran reste ouvert sur la saisie.
    }
  }

  return (
    <Screen
      avoidKeyboard
      footer={
        <Button
          label="Enregistrer"
          disabled={!complet}
          loading={enregistrer.isPending}
          onPress={valider}
        />
      }>
      <ScreenHeader title="Morphologie" onBack={() => router.back()} />

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="caption" color="textSecondary">
          Sexe biologique
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Chip grow label="Homme" selected={sexe === 'homme'} onPress={() => setSexe('homme')} />
          <Chip grow label="Femme" selected={sexe === 'femme'} onPress={() => setSexe('femme')} />
        </View>
        <Text variant="caption" color="textMuted">
          La formule n&apos;existe qu&apos;en deux variantes. Choisis celle qui approche le mieux ta
          masse musculaire ; la calibration corrigera l&apos;écart.
        </Text>
      </View>

      <Input
        label="Date de naissance"
        value={naissance}
        onChangeText={(saisie) => setNaissance(formaterALaFrappe(saisie))}
        placeholder="JJ/MM/AAAA"
        keyboardType="number-pad"
        maxLength={10}
      />
      {naissanceEnErreur ? <MessageErreur>Cette date n&apos;existe pas.</MessageErreur> : null}

      <Input
        label="Taille"
        value={taille}
        onChangeText={(saisie) => setTaille(saisie.replace(/\D/g, '').slice(0, 3))}
        placeholder="178"
        suffix="cm"
        numeric
      />
      {tailleEnErreur ? <MessageErreur>Une taille se situe entre 100 et 250 cm.</MessageErreur> : null}

      {enregistrer.isError ? (
        <MessageErreur>L&apos;enregistrement a échoué. Réessaie dans un instant.</MessageErreur>
      ) : null}
    </Screen>
  );
}

