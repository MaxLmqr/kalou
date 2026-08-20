import { cors } from '@elysiajs/cors'
import { openapi } from '@elysiajs/openapi'
import { Elysia } from 'elysia'

import { authentification } from './plugins/auth'

export const app = new Elysia()
  .use(cors())
  .use(openapi({ path: '/docs' }))
  .onError(({ code, error, status }) => {
    if (code === 'VALIDATION' || code === 'NOT_FOUND') return
    console.error(error)
    return status(500, { erreur: { code: 'erreur_interne', message: 'Erreur interne.' } })
  })
  .get('/health', () => ({ status: 'ok' as const }))
  .use(authentification)
  .get('/me', ({ utilisateur }) => ({ user: utilisateur }), { auth: true })

// Consommé par apps/mobile via Eden Treaty (import type uniquement).
export type App = typeof app
