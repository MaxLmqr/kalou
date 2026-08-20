import { Elysia } from 'elysia'

import { auth } from '../auth'
import { erreur } from '../http/erreurs'

/**
 * Macro `auth` : une route déclarée avec `{ auth: true }` reçoit `utilisateur`
 * et `session` résolus, et répond 401 sans session valide — la vérification ne
 * peut pas être oubliée sur une route.
 *
 * Séparée du montage ci-dessous à dessein : `mount` installe un `ALL /*` qui
 * capte tout ce qui n'a pas encore été déclaré. Enregistrer la macro par ce
 * biais dans chaque module de routes ferait remonter ce catch-all avant les
 * routes de l'application, qui répondraient alors 404.
 */
export const authMacro = new Elysia({ name: 'auth-macro' })
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers })
        if (!session) return status(401, erreur('non_authentifie', 'Connexion requise.'))
        return { utilisateur: session.user, session: session.session }
      },
    },
  })
  .as('scoped')

/**
 * Routes de Better Auth (`/auth/...`).
 *
 * À monter **en dernier** dans l'application, pour la raison ci-dessus.
 */
export const authRoutes = new Elysia({ name: 'auth-routes' }).mount(auth.handler)
