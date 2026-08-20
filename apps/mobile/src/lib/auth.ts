import { expoClient } from '@better-auth/expo/client';
import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { resolveBaseUrl } from './base-url';

/**
 * Client d'authentification.
 *
 * Pas de mot de passe : un code à six chiffres par e-mail (doc 06 § 2). La
 * première connexion à une adresse crée le compte — il n'y a pas d'inscription
 * distincte, donc pas d'écran d'inscription à dessiner.
 *
 * Le plugin Expo range le cookie de session dans le `SecureStore` et le rejoue
 * de lui-même : aucune route d'authentification n'est écrite à la main, et le
 * jeton ne transite jamais par un état React.
 *
 * Il est **exclu du web**, où `expo-secure-store` n'a pas d'implémentation — son
 * module web est un objet vide, et l'appeler ferait tomber tout le bundle. Le
 * navigateur sait déjà garder un cookie ; c'est le comportement par défaut du
 * client quand le plugin est absent. Le web n'est pas une cible de la v1
 * (doc 01, non-objectifs), mais il reste notre banc d'essai.
 */
export const authClient = createAuthClient({
  baseURL: resolveBaseUrl(),
  // Le serveur monte Better Auth sur `/auth` (doc 06 § 2), pas sur le
  // `/api/auth` que le client suppose par défaut. Sans cette ligne, tous les
  // appels partent en 404 et l'application reste bloquée sur la connexion.
  basePath: '/auth',
  plugins: [
    ...(Platform.OS === 'web'
      ? []
      : [expoClient({ scheme: 'mobile', storagePrefix: 'kalou', storage: SecureStore })]),
    emailOTPClient(),
  ],
});

export const { useSession, signOut } = authClient;

/** Demande l'envoi d'un code de connexion. La réponse ne dit pas s'il existe un compte. */
export async function demanderCode(email: string) {
  return authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' });
}

/** Valide le code et ouvre la session. Crée le compte si l'adresse est inconnue. */
export async function validerCode(email: string, otp: string) {
  return authClient.signIn.emailOtp({ email, otp });
}
