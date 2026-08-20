import { cors } from '@elysiajs/cors'
import { openapi } from '@elysiajs/openapi'
import { Elysia } from 'elysia'

import { erreur } from './http/erreurs'
import { authRoutes } from './plugins/auth'
import { activityRoutes } from './routes/activities'
import { dayRoutes } from './routes/days'
import { foodEntryRoutes } from './routes/food-entries'
import { foodRoutes } from './routes/foods'
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
  .use(foodRoutes)
  .use(activityRoutes)
  // En dernier : le montage de Better Auth installe un `ALL /*` qui capterait
  // toutes les routes déclarées après lui.
  .use(authRoutes)

// Consommé par apps/mobile via Eden Treaty (import type uniquement).
export type App = typeof app
