/**
 * Dépense sportive (EAT) par table MET. Doc 02 § 7.
 */

export type EntreesMet = {
  met: number
  /** Tendance du jour, figée dans l'enregistrement (doc 05, `poids_utilise_kg`). */
  poidsKg: number
  dureeMin: number
}

/** Dépense brute : inclut le repos, donc inutilisable telle quelle. */
export function kcalBrut({ met, poidsKg, dureeMin }: EntreesMet): number {
  return (met * 3.5 * poidsKg * dureeMin) / 200
}

/**
 * Dépense nette — la seule retenue par Kalou.
 *
 * Le `− 1` retire le repos, déjà couvert par le BMR contenu dans le socle.
 * Sans lui, une heure de yoga « rapporterait » 130 kcal déjà comptées.
 */
export function kcalNet({ met, poidsKg, dureeMin }: EntreesMet): number {
  return ((met - 1) * 3.5 * poidsKg * dureeMin) / 200
}
