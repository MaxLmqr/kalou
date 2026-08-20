/**
 * Format d'erreur unique. Doc 06 § 12.
 *
 * `message` est en français et affichable tel quel — l'interface n'a pas à
 * traduire un code en phrase, sans quoi le message diverge du calcul qui l'a
 * produit. `code` est stable et testable.
 */
export type CorpsErreur = {
  erreur: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export function erreur(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): CorpsErreur {
  return { erreur: details ? { code, message, details } : { code, message } }
}

/** 422 renvoyé quand l'onboarding n'est pas terminé. */
export function profilIncomplet(manque: readonly string[]): CorpsErreur {
  return erreur(
    'profil_incomplet',
    "Ton profil n'est pas encore complet : impossible de calculer un apport cible.",
    { manque },
  )
}
