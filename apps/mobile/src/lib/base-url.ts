import Constants from 'expo-constants';

/**
 * URL de l'API.
 *
 * En dev sur un téléphone physique, `localhost` pointe sur le téléphone : on
 * réutilise l'IP LAN du serveur Expo pour joindre la machine hôte.
 *
 * Le client typé (`lib/api`) et le client d'authentification (`lib/auth`)
 * partagent cette résolution : deux origines différentes casseraient le cookie
 * de session, qui est lié à l'hôte qui l'a émis.
 */
export function resolveBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  return devHost ? `http://${devHost}:3000` : 'http://localhost:3000';
}
