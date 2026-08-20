import { verifierRaccourciDeDeveloppement } from './securite'

function required(nom: string): string {
  const valeur = process.env[nom]
  if (!valeur) throw new Error(`Variable d'environnement manquante : ${nom}`)
  return valeur
}

const port = Number(process.env.PORT ?? 3000)
const isProduction = process.env.NODE_ENV === 'production'

/**
 * Code de développement. Aucune valeur par défaut, à dessein : le raccourci
 * n'existe que si la variable est explicitement renseignée (doc 06 § 2,
 * garde-fou 1).
 */
const devOtp = process.env.AUTH_DEV_OTP || undefined

// Avant toute autre lecture : si la configuration est dangereuse, on s'arrête
// ici plutôt que de démarrer une API ouverte à tous.
verifierRaccourciDeDeveloppement({ isProduction, devOtp })

export const env = {
  port,
  databaseUrl: required('DATABASE_URL'),
  authSecret: required('BETTER_AUTH_SECRET'),
  /** URL publique de l'API, utilisée par Better Auth pour ses redirections. */
  baseUrl: process.env.BETTER_AUTH_URL ?? `http://localhost:${port}`,
  isProduction,
  devOtp,
}
