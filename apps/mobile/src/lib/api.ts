import { treaty } from '@elysiajs/eden'
import type { App } from '@kalou/api'
import { Platform } from 'react-native'

import { authClient } from './auth'
import { resolveBaseUrl } from './base-url'

/**
 * Client typé de bout en bout : les types viennent directement de apps/api.
 *
 * Le cookie de session est joint à la main sur les plateformes natives : le
 * plugin Expo de Better Auth ne rejoue le sien que sur ses propres appels, et
 * les routes de l'application, qui passent par Eden, répondraient 401 sans
 * cette en-tête.
 *
 * **Le web se joue autrement, et la nuance a coûté un écran de connexion en
 * boucle.** `authClient.getCookie` n'existe pas sans le plugin Expo, mais le
 * client de Better Auth est un mandataire : lire une propriété qu'il ne connaît
 * pas ne rend pas `undefined`, cela fabrique un appel HTTP. Le
 * `getCookie?.()` optionnel partait donc en `GET /auth/get-cookie` à chaque
 * requête — 404 — puis rendait une valeur vide, et aucun cookie n'était joint.
 * Le navigateur ne comblait pas le trou de lui-même : l'API vit sur un autre
 * port que le serveur Expo, la requête est donc inter-origine, et `fetch`
 * n'attache un cookie inter-origine que sur `credentials: 'include'`. Toutes
 * les routes répondaient 401, le gestionnaire de 401 fermait la session, et
 * l'application repartait sur la connexion sans jamais atteindre un écran.
 *
 * D'où la garde de plateforme, plutôt que l'appel optionnel qui ressemblait
 * à une garde sans en être une.
 */
const natif = Platform.OS !== 'web'

export const api = treaty<App>(resolveBaseUrl(), {
  // Sans effet en natif, où `fetch` n'a pas de notion d'origine.
  fetch: { credentials: 'include' },
  headers: async () => {
    if (!natif) return {}
    const cookie = await authClient.getCookie()
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

/**
 * Ramène une date d'API à sa journée `AAAA-MM-JJ`.
 *
 * Eden réhydrate les chaînes de date en objets `Date` (`parseStringifiedDate`)
 * alors que le type qu'il annonce reste `string`. Le compilateur ne voit donc
 * rien, et un `.split('-')` sur la valeur explose à l'exécution — écran blanc,
 * sans message. C'est arrivé sur la feuille de morphologie.
 *
 * On normalise ici plutôt que de faire confiance au type : la frontière est le
 * seul endroit où l'écart entre le type et la valeur est connu.
 */
export function jourIso(valeur: string | Date | null | undefined): string | null {
  if (!valeur) return null
  if (valeur instanceof Date) return valeur.toISOString().slice(0, 10)
  return typeof valeur === 'string' ? valeur.slice(0, 10) : null
}

/**
 * Vrai si l'API a refusé la requête pour une raison qui ne bougera pas d'elle-même
 * (4xx) : profil incomplet, validation, session expirée, ressource absente.
 *
 * Réessayer ne change rien à un refus déterministe — cela ne fait que retarder
 * l'écran qui doit l'expliquer. C'est le cas de l'accueil devant un onboarding
 * inachevé (422 `profil_incomplet`), qui est un état de l'application et non une
 * panne.
 */
export function estRefusDuClient(rejet: unknown): boolean {
  const status = (rejet as { status?: number } | null)?.status
  return typeof status === 'number' && status >= 400 && status < 500
}

/**
 * Vrai si le rejet est un 401 de l'API : session absente, expirée ou révoquée.
 *
 * Le cas n'est pas théorique en développement — une base réinitialisée efface
 * le compte sous les pieds d'un téléphone qui garde son cookie. Il vaut donc la
 * peine d'être distingué d'une panne réseau, qui, elle, se répare en réessayant.
 */
export function estSessionExpiree(rejet: unknown): boolean {
  return (rejet as { status?: number } | null)?.status === 401
}
