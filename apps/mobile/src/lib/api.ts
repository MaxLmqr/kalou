import { treaty } from '@elysiajs/eden'
import type { App } from '@kalou/api'
import Constants from 'expo-constants'

/**
 * En dev sur un téléphone physique, `localhost` pointe sur le téléphone.
 * On réutilise l'IP LAN du serveur Expo pour joindre l'API sur la machine hôte.
 */
function resolveBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL

  const devHost = Constants.expoConfig?.hostUri?.split(':')[0]
  return devHost ? `http://${devHost}:3000` : 'http://localhost:3000'
}

/** Client typé de bout en bout : les types viennent directement de apps/api. */
export const api = treaty<App>(resolveBaseUrl())
