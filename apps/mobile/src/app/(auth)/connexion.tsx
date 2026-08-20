import { useState } from 'react';
import { View } from 'react-native';

import { Button, Icon, Input, MessageErreur, Screen, Surface, Text } from '@/components/ui';
import { useTheme } from '@/design';
import { demanderCode, validerCode } from '@/lib/auth';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LONGUEUR_CODE = 6;

/**
 * Connexion (docs/06 § 2).
 *
 * Deux étapes, une adresse puis un code à six chiffres. Pas de mot de passe, et
 * **pas d'écran d'inscription** : la première connexion à une adresse crée le
 * compte, donc proposer un choix « connexion / inscription » ferait inventer à
 * l'utilisateur une distinction que le serveur ignore.
 */
export default function ConnexionScreen() {
  const theme = useTheme();
  const [etape, setEtape] = useState<'adresse' | 'code'>('adresse');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const adresseValide = EMAIL.test(email.trim());
  const codeComplet = code.trim().length === LONGUEUR_CODE;

  async function envoyerLeCode() {
    setEnCours(true);
    setErreur(null);
    const { error } = await demanderCode(email.trim().toLowerCase());
    setEnCours(false);
    if (error) {
      setErreur("Le code n'a pas pu être envoyé. Réessaie dans un instant.");
      return;
    }
    setEtape('code');
  }

  async function seConnecter() {
    setEnCours(true);
    setErreur(null);
    const { error } = await validerCode(email.trim().toLowerCase(), code.trim());
    setEnCours(false);
    if (error) {
      // Volontairement une seule formulation : distinguer « code faux » de
      // « code expiré » renseignerait un attaquant sans aider l'utilisateur,
      // qui refait le même geste dans les deux cas.
      setErreur('Ce code ne fonctionne pas. Il expire au bout de dix minutes.');
      setCode('');
    }
    // Le succès n'a rien à faire ici : la session change, et c'est la garde de
    // navigation (`app/_layout`) qui bascule sur l'application.
  }

  function changerAdresse() {
    setEtape('adresse');
    setCode('');
    setErreur(null);
  }

  return (
    <Screen
      scroll={false}
      footer={
        etape === 'adresse' ? (
          <Button
            label="Recevoir un code"
            disabled={!adresseValide}
            loading={enCours}
            onPress={envoyerLeCode}
          />
        ) : (
          <View style={{ gap: theme.spacing.sm }}>
            <Button
              label="Se connecter"
              disabled={!codeComplet}
              loading={enCours}
              onPress={seConnecter}
            />
            <Button
              label="Changer d'adresse"
              variant="ghost"
              size="md"
              block
              onPress={changerAdresse}
            />
          </View>
        )
      }>
      <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.xxl }}>
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="title">
            {etape === 'adresse' ? 'Kalou' : 'Ton code de connexion'}
          </Text>
          <Text variant="body" color="textSecondary">
            {etape === 'adresse'
              ? 'Ton adresse suffit : tu recevras un code à six chiffres, pas de mot de passe à retenir.'
              : `Six chiffres viennent de partir vers ${email.trim().toLowerCase()}.`}
          </Text>
        </View>

        {etape === 'adresse' ? (
          <Input
            label="Adresse e-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="max@exemple.fr"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="go"
            onSubmitEditing={() => adresseValide && envoyerLeCode()}
          />
        ) : (
          <Input
            label="Code"
            value={code}
            onChangeText={(saisie) => setCode(saisie.replace(/\D/g, '').slice(0, LONGUEUR_CODE))}
            placeholder="000000"
            numeric
            autoFocus
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={LONGUEUR_CODE}
            returnKeyType="go"
            onSubmitEditing={() => codeComplet && seConnecter()}
          />
        )}

        {erreur ? <MessageErreur>{erreur}</MessageErreur> : null}

        {__DEV__ && etape === 'code' ? (
          <Surface variant="sunken" style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <Icon name="info" size={20} color="textMuted" />
            <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
              Build de développement : le code s&apos;affiche dans la console de l&apos;API, ou
              vaut <Text variant="caption" color="text">AUTH_DEV_OTP</Text> si la variable est
              renseignée.
            </Text>
          </Surface>
        ) : null}
      </View>
    </Screen>
  );
}
