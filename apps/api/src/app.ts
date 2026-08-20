import { cors } from '@elysiajs/cors'
import { openapi } from '@elysiajs/openapi'
import { Elysia } from 'elysia'

import { erreur } from './http/erreurs'
import { authRoutes } from './plugins/auth'
import { dayRoutes } from './routes/days'
import { foodEntryRoutes } from './routes/food-entries'
import { meRoutes } from './routes/me'
import { weighInRoutes } from './routes/weigh-ins'

export const app = new Elysia()
  .use(cors())
  .use(openapi({ path: '/docs' }))
  .onError(({ code, error, status }) => {
    if (code === 'VALIDATION' || code === 'NOT_FOUND') return
    console.error(error)
    return status(500, erreur('erreur_interne', 'Erreur interne.'))
  })
  .get('/health', () => ({ status: 'ok' as const }))
  .use(meRoutes)
  .use(dayRoutes)
  .use(weighInRoutes)
  .use(foodEntryRoutes)
  // En dernier : le montage de Better Auth installe un `ALL /*` qui capterait
  // toutes les routes déclarées après lui.
  .use(authRoutes)

// Consommé par apps/mobile via Eden Treaty (import type uniquement).
export type App = typeof app
