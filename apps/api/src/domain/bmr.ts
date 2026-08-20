import { FACTEUR_NEAT } from './constantes'
import type { Sexe } from './types'

/**
 * Âge en années révolues. Doc 02 § 2 : l'âge est dérivé, jamais stocké.
 * Les deux dates sont interprétées comme des dates civiles (pas d'heure).
 */
export function age(dateNaissance: Date, le: Date): number {
  let ans = le.getUTCFullYear() - dateNaissance.getUTCFullYear()
  const moisEcoules = le.getUTCMonth() - dateNaissance.getUTCMonth()
  if (moisEcoules < 0 || (moisEcoules === 0 && le.getUTCDate() < dateNaissance.getUTCDate())) {
    ans -= 1
  }
  return ans
}

export type EntreesBmr = {
  sexe: Sexe
  /** Tendance lissée, jamais une pesée brute (doc 02 § 2). */
  poidsKg: number
  tailleCm: number
  ageAns: number
}

/**
 * BMR par Mifflin-St Jeor. Doc 02 § 2.
 *
 * Renvoie une valeur non arrondie : l'arrondi n'a lieu qu'à la frontière de
 * l'API. Arrondir ici propagerait l'erreur dans le socle puis dans le budget.
 */
export function bmr({ sexe, poidsKg, tailleCm, ageAns }: EntreesBmr): number {
  const constante = sexe === 'homme' ? 5 : -161
  return 10 * poidsKg + 6.25 * tailleCm - 5 * ageAns + constante
}

/**
 * Socle estimé par formule = BMR + NEAT forfaitaire. Doc 02 § 3.1.
 * Volontairement prudent : un budget qui se corrige vers le haut est préférable.
 */
export function socleFormule(bmrKcal: number): number {
  return bmrKcal * FACTEUR_NEAT
}
