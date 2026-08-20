function required(nom: string): string {
  const valeur = process.env[nom]
  if (!valeur) throw new Error(`Variable d'environnement manquante : ${nom}`)
  return valeur
}

const port = Number(process.env.PORT ?? 3000)

export const env = {
  port,
  databaseUrl: required('DATABASE_URL'),
  authSecret: required('BETTER_AUTH_SECRET'),
  /** URL publique de l'API, utilisée par Better Auth pour ses redirections. */
  baseUrl: process.env.BETTER_AUTH_URL ?? `http://localhost:${port}`,
  isProduction: process.env.NODE_ENV === 'production',
}
