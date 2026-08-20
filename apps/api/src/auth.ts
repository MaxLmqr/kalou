import { expo } from '@better-auth/expo'
import { db, profiles, schema } from '@kalou/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthMiddleware } from 'better-auth/api'
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
  // Avec le raccourci actif, le code est déjà connu de qui l'a configuré.
  if (env.devOtp) return
  console.log(`\n📧  Code de connexion pour ${email} : ${code}\n`)
}

/**
 * Raccourci de développement. Doc 06 § 2.
 *
 * Tant qu'aucun fournisseur d'e-mails n'est branché, `AUTH_DEV_OTP` connecte
 * n'importe quelle adresse. Le raccourci n'existe que si la variable est
 * renseignée, et `env.ts` empêche l'API de démarrer si elle l'est en production.
 *
 * L'implémentation ne court-circuite pas la vérification : elle fait générer par
 * Better Auth un code pour l'adresse visée — `generateOTP` le fixe alors à la
 * valeur de développement — puis laisse la requête suivre son cours normal.
 * Expiration, tentatives et limitation de débit restent donc ceux de la
 * bibliothèque, plutôt qu'un chemin parallèle à maintenir.
 */
const raccourciDeDeveloppement = createAuthMiddleware(async (ctx) => {
  if (!env.devOtp || ctx.path !== '/sign-in/email-otp') return

  const corps = ctx.body as { email?: string; otp?: string } | undefined
  if (!corps?.email || corps.otp !== env.devOtp) return

  // Garde-fou 3 : chaque usage laisse une trace, avec l'adresse utilisée.
  console.warn(`⚠️  Connexion par le code de développement : ${corps.email}`)

  await auth.api.sendVerificationOTP({ body: { email: corps.email, type: 'sign-in' } })
})

/**
 * Origines de confiance.
 *
 * Better Auth refuse toute requête d'écriture porteuse d'un cookie dont
 * l'`Origin` n'est pas de confiance — c'est sa protection contre le CSRF. Par
 * défaut la seule origine de confiance est `baseURL`.
 *
 * L'application native n'a pas d'origine HTTP : React Native n'envoie aucun
 * en-tête `Origin`, et le plugin Expo rejoue à sa place son `expo-origin`, qui
 * vaut le schéma de l'application — `mobile://` pour une version installée,
 * `exp://…` tant qu'on passe par Expo Go. Sans ces deux entrées, la
 * déconnexion partait en 403 et l'application gardait une session qu'elle ne
 * pouvait plus fermer.
 *
 * Le banc d'essai web, lui, est un vrai navigateur : il envoie son origine, qui
 * n'est pas celle de l'API (8081 contre 3000).
 */
const originesDeConfiance = [
  'mobile://',
  ...(env.isProduction ? [] : ['exp://', 'http://localhost:8081']),
]

export const auth = betterAuth({
  baseURL: env.baseUrl,
  secret: env.authSecret,
  basePath: '/auth',
  trustedOrigins: originesDeConfiance,
  database: drizzleAdapter(db, { provider: 'pg', schema, usePlural: true }),
  advanced: {
    // Doc 05 § 1 : UUID v7, ordonnés temporellement.
    database: { generateId: () => Bun.randomUUIDv7() },
  },
  // Doc 06 : pas de mot de passe, un code à usage unique par e-mail.
  emailAndPassword: { enabled: false },
  hooks: { before: raccourciDeDeveloppement },
  databaseHooks: {
    user: {
      create: {
        // Le profil naît avec le compte, vide : l'onboarding le remplit écran
        // par écran. Sans cette ligne, chaque route devrait gérer son absence.
        after: async (utilisateur) => {
          await db.insert(profiles).values({ userId: utilisateur.id }).onConflictDoNothing()
        },
      },
    },
  },
  plugins: [
    // Rejoue `expo-origin` dans `origin` : sans lui, aucune requête
    // authentifiée de l'application native ne passe le contrôle d'origine.
    expo(),
    emailOTP({
      otpLength: 6,
      expiresIn: 10 * 60,
      // Garde-fou 1 : sans la variable, on retombe sur le tirage de la
      // bibliothèque et le raccourci n'existe pas.
      generateOTP: () => env.devOtp,
      sendVerificationOTP: async ({ email, otp }) => envoyerCode(email, otp),
    }),
  ],
})

export type Session = typeof auth.$Infer.Session
