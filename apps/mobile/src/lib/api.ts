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
