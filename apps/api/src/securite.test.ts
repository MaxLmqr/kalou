import { describe, expect, test } from 'bun:test'

import { verifierRaccourciDeDeveloppement } from './securite'

describe('Garde-fou du code de développement (doc 06 § 2)', () => {
  test('en production avec AUTH_DEV_OTP, le démarrage est refusé', () => {
    expect(() =>
      verifierRaccourciDeDeveloppement({ isProduction: true, devOtp: '123456' }),
    ).toThrow(/AUTH_DEV_OTP/)
  })

  test("le message dit quoi faire, pas seulement qu'il y a un problème", () => {
    try {
      verifierRaccourciDeDeveloppement({ isProduction: true, devOtp: '123456' })
      throw new Error('aurait dû lever')
    } catch (erreur) {
      expect((erreur as Error).message).toContain('production')
      expect((erreur as Error).message).toContain('Retire la variable')
    }
  })

  test('en production sans la variable, le démarrage passe', () => {
    expect(() =>
      verifierRaccourciDeDeveloppement({ isProduction: true, devOtp: undefined }),
    ).not.toThrow()
  })

  test('hors production, la variable est admise', () => {
    expect(() =>
      verifierRaccourciDeDeveloppement({ isProduction: false, devOtp: '123456' }),
    ).not.toThrow()
  })
})

/**
 * Le test qui compte : la fonction pure ci-dessus peut être juste sans que le
 * processus refuse réellement de démarrer. On lance donc l'API pour de vrai.
 */
describe("Refus de démarrage effectif de l'API", () => {
  const lancer = async (env: Record<string, string>) => {
    const processus = Bun.spawn(['bun', 'src/index.ts'], {
      cwd: new URL('..', import.meta.url).pathname,
      // Environnement explicite plutôt qu'hérité : sans cela le test dépendrait
      // du `.env` que Bun charge tout seul, et pourrait échouer sur une base
      // absente au lieu du garde-fou qu'il prétend vérifier.
      env: {
        PATH: process.env.PATH ?? '',
        DATABASE_URL: 'postgres://inutilise@127.0.0.1:1/inutilise',
        BETTER_AUTH_SECRET: 'inutilise',
        ...env,
      },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const code = await processus.exited
    const sortie =
      (await new Response(processus.stdout).text()) + (await new Response(processus.stderr).text())
    return { code, sortie }
  }

  test(
    "l'API s'arrête si AUTH_DEV_OTP est présente en production",
    async () => {
      const { code, sortie } = await lancer({
        NODE_ENV: 'production',
        AUTH_DEV_OTP: '123456',
        // Un port libre : le test doit échouer sur le garde-fou, pas sur le port.
        PORT: '39517',
      })
      expect(code).not.toBe(0)
      expect(sortie).toContain('AUTH_DEV_OTP')
    },
    { timeout: 30_000 },
  )
})
