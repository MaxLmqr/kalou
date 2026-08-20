import { Elysia } from 'elysia'

import { auth } from '../auth'

/**
 * Monte les routes de Better Auth et expose la macro `auth`.
 *
 * Une route déclarée avec `{ auth: true }` reçoit `user` et `session` résolus,
 * et répond 401 sans session valide — la vérification ne peut pas être oubliée.
 */
export const authentification = new Elysia({ name: 'authentification' })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers })
        if (!session) return status(401, { erreur: { code: 'non_authentifie', message: 'Connexion requise.' } })
        return { utilisateur: session.user, session: session.session }
      },
    },
  })
  .as('scoped')
