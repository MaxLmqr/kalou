import { KCAL_PAR_KG_SEMAINE, PART_TEF } from './constantes'
import type { Phase } from './types'

/** Déficit quotidien visé pour un rythme de perte donné. Doc 02 § 6. */
export function deficitQuotidien(rythmeKgSemaine: number): number {
  return rythmeKgSemaine * KCAL_PAR_KG_SEMAINE
}

/**
 * Facteur de correction du TEF, fonction du poids de calibration `w`.
 *
 * Le doc 02 donne deux régimes :
 *  — § 3.2, avant calibration : le socle vient d'une formule et ignore la
 *    digestion, il faut donc diviser par 0,90 ;
 *  — § 3.3, après calibration : le socle est déduit d'un bilan énergétique réel
 *    et contient déjà le TEF, la division ne s'applique plus.
 *
 * Le document ne dit pas ce qui se passe entre les deux, alors que § 5.3 fait
 * précisément transiter le socle progressivement (w de 0 à 1). Basculer d'un
 * régime à l'autre dès que w > 0 produirait, sur l'exemple du § 3.2, un saut de
 * 1 679 à 1 511 kcal — soit exactement le « saut visible dans le budget » que
 * § 5.3 cherche à éviter.
 *
 * On interpole donc la correction en même temps que le socle. C'est cohérent
 * physiquement : la part de TEF manquante décroît à mesure que le socle mesuré
 * — qui la contient — prend le pas sur le socle formulé.
 *
 *   w = 0 → 1 / 0,90   (§ 3.2 à l'identique)
 *   w = 1 → 1          (§ 3.3 à l'identique)
 */
export function facteurTef(w: number): number {
  return w + (1 - w) / (1 - PART_TEF)
}

export type EntreesJournee = {
  /** Socle après transition et garde-fous (doc 02 § 5.3 et § 5.4). */
  socleApplique: number
  /** Somme des dépenses sportives nettes de la journée locale. */
  eatKcal: number
  deficitKcal: number
  /** Poids de la calibration, entre 0 et 1. */
  w: number
}

/**
 * Dépense du jour : ce que l'utilisateur peut manger sans ni perdre ni prendre.
 * Doc 02 § 3.2 et § 3.3.
 */
export function depenseDuJour({ socleApplique, eatKcal, w }: Omit<EntreesJournee, 'deficitKcal'>): number {
  return (socleApplique + eatKcal) * facteurTef(w)
}

/**
 * Budget du jour. Doc 02 § 3.2 : le déficit est lui aussi corrigé du TEF, et
 * c'est voulu — manger moins réduit aussi le coût de la digestion.
 */
export function budgetDuJour({ socleApplique, eatKcal, deficitKcal, w }: EntreesJournee): number {
  return (socleApplique + eatKcal - deficitKcal) * facteurTef(w)
}

/** Le chiffre unique de l'écran d'accueil. Peut être négatif. Doc 02 § 8. */
export function restant(budgetKcal: number, apportsKcal: number): number {
  return budgetKcal - apportsKcal
}

/**
 * Balance telle qu'écrite au § 8 : `apports − dépense_du_jour`.
 *
 * ⚠️ Cette définition et la vérification du § 3.2 ne donnent pas le même
 * résultat dès que les apports s'écartent de la dépense d'équilibre, parce que
 * `dépense_du_jour` porte le TEF de l'apport d'équilibre et non celui de ce qui
 * a réellement été mangé. Sur l'exemple du document lui-même (budget 1 679,
 * socle 2 061) : ici −611, là −550. Voir `balanceEnergetique`.
 */
export function balance(apportsKcal: number, depenseKcal: number): number {
  return apportsKcal - depenseKcal
}

/**
 * Balance énergétique réelle, avec le TEF calculé sur les apports du jour.
 *
 * C'est la formule qu'applique la vérification du § 3.2 (« à 1 679 kcal
 * ingérées, TEF = 168, dépense totale = 2 229, balance = −550 »), et c'est
 * celle qui est cohérente avec la calibration : le § 5.2 déduit la dépense d'un
 * bilan énergétique réel, pas d'une dépense d'équilibre théorique.
 *
 *   avant calibration : apports × 0,90 − (socle + EAT)
 *   après calibration : apports − (socle + EAT)   — le socle mesuré porte le TEF
 */
export function balanceEnergetique({
  apportsKcal,
  socleApplique,
  eatKcal,
  w,
}: {
  apportsKcal: number
  socleApplique: number
  eatKcal: number
  w: number
}): number {
  const partTefRestante = (1 - w) * PART_TEF
  return apportsKcal * (1 - partTefRestante) - (socleApplique + eatKcal)
}

/** Phase exposée par l'API (doc 06 § 4), dérivée du poids de calibration. */
export function phase(w: number): Phase {
  if (w <= 0) return 'formule'
  if (w >= 1) return 'calibre'
  return 'transition'
}
