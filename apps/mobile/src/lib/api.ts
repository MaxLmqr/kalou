import { treaty } from '@elysiajs/eden'
import type { App } from '@kalou/api'

import { authClient } from './auth'
import { resolveBaseUrl } from './base-url'

/**
 * Client typé de bout en bout : les types viennent directement de apps/api.
 *
 * Le cookie de session est joint à la main. Le plugin Expo de Better Auth ne le
 * rejoue que sur ses propres appels ; les routes de l'application, elles,
 * passent par Eden et répondraient 401 sans cette en-tête.
 */
export const api = treaty<App>(resolveBaseUrl(), {
  headers: async () => {
    // Sur le web il n'y a pas de plugin Expo, donc pas de `getCookie` : c'est
    // le navigateur qui joint le cookie lui-même.
    const cookie = await authClient.getCookie?.()
    return cookie ? { Cookie: cookie } : {}
  },
})

/** Corps d'erreur de l'API (doc 06 § 14). */
export type ErreurApi = {
  code: string
  message: string
  details?: Record<string, unknown>
}

/**
 * Extrait le corps d'erreur d'un rejet Eden.
 *
 * Eden enveloppe la réponse dans `{ status, value }`, et l'API enveloppe la
 * sienne dans `{ erreur }` : deux couches qu'aucun écran n'a à connaître.
 * Renvoie `null` pour une panne réseau, qui n'a pas de code.
 */
export function erreurApi(rejet: unknown): ErreurApi | null {
  const valeur = (rejet as { value?: { erreur?: ErreurApi } } | null)?.value?.erreur
  return valeur?.code ? valeur : null
}
