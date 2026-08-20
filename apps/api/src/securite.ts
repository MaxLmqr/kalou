/**
 * Garde-fous de sécurité, en fonctions pures.
 *
 * Volontairement séparé de `env.ts`, dont le simple chargement exige les
 * variables d'environnement : un test de garde-fou ne doit pas réclamer une base
 * de données pour s'exécuter.
 */

/**
 * Refus de démarrer avec le raccourci de développement en production.
 * Doc 06 § 2, garde-fou 2.
 *
 * Le code de développement ouvre l'accès à **tout le monde** dès que l'API est
 * joignable. Un avertissement au démarrage ne suffirait pas — personne ne lit
 * les logs de sa propre application — donc l'API s'arrête.
 */
export function verifierRaccourciDeDeveloppement(config: {
  isProduction: boolean
  devOtp: string | undefined
}): void {
  if (config.isProduction && config.devOtp) {
    throw new Error(
      "AUTH_DEV_OTP est renseignée alors que NODE_ENV=production. Ce code de " +
        "développement connecte n'importe quelle adresse : l'API refuse de démarrer. " +
        'Retire la variable de la configuration de production.',
    )
  }
}
