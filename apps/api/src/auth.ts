import { db, schema } from '@kalou/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { emailOTP } from 'better-auth/plugins'

import { env } from './env'

/**
 * Envoi du code à 6 chiffres.
 *
 * En développement, le code part dans la console : brancher un service d'e-mail
 * n'apporte rien tant qu'on teste sur sa propre machine. En production, l'absence
 * de transport est une erreur franche plutôt qu'un code silencieusement perdu.
 */
async function envoyerCode(email: string, code: string): Promise<void> {
  if (env.isProduction) {
    throw new Error("Aucun transport d'e-mail configuré pour l'envoi des codes.")
  }
  console.log(`\n📧  Code de connexion pour ${email} : ${code}\n`)
}

export const auth = betterAuth({
  baseURL: env.baseUrl,
  secret: env.authSecret,
  basePath: '/auth',
  database: drizzleAdapter(db, { provider: 'pg', schema, usePlural: true }),
  advanced: {
    // Doc 05 § 1 : UUID v7, ordonnés temporellement.
    database: { generateId: () => Bun.randomUUIDv7() },
  },
  // Doc 06 : pas de mot de passe, un code à usage unique par e-mail.
  emailAndPassword: { enabled: false },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 10 * 60,
      sendVerificationOTP: async ({ email, otp }) => envoyerCode(email, otp),
    }),
  ],
})

export type Session = typeof auth.$Infer.Session
