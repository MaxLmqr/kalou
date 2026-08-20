import { budgetDuJour, deficitQuotidien, depenseDuJour, facteurTef } from './budget'
import {
  DEFICIT_MAX_PART_DEPENSE,
  KCAL_PAR_KG_SEMAINE,
  PLANCHER_APPORT,
  RYTHME_MAX_PART_DU_POIDS,
} from './constantes'
import type { Sexe } from './types'

/** Motif d'un plafonnement, renvoyé à l'interface pour qu'elle l'explique. */
export type MotifPlafond = 'part_du_poids' | 'deficit_max' | 'plancher_apport'

export type EntreesObjectif = {
  rythmeDemandeKgSemaine: number
  /** Tendance de poids courante. */
  poidsKg: number
  socleApplique: number
  eatKcal: number
  w: number
  bmrKcal: number
  sexe: Sexe
}

export type ResultatObjectif = {
  rythmeDemandeKgSemaine: number
  rythmeAppliqueKgSemaine: number
  deficitKcal: number
  budgetKcal: number
  depenseKcal: number
  plancherKcal: number
  plafondsAppliques: MotifPlafond[]
}

/**
 * Applique les plafonds du doc 02 § 6 et § 5.4.
 *
 * Kalou ne refuse jamais un objectif : il propose le rythme le plus proche
 * atteignable et dit pourquoi (doc 02 § 6). D'où le retour des motifs plutôt
 * qu'une erreur.
 */
export function appliquerPlafonds(entrees: EntreesObjectif): ResultatObjectif {
  const { rythmeDemandeKgSemaine, poidsKg, socleApplique, eatKcal, w, bmrKcal, sexe } = entrees
  const plafondsAppliques: MotifPlafond[] = []

  // 1. Rythme borné à 1 % du poids corporel par semaine.
  const rythmeMax = poidsKg * RYTHME_MAX_PART_DU_POIDS
  let rythme = rythmeDemandeKgSemaine
  if (rythme > rythmeMax) {
    rythme = rythmeMax
    plafondsAppliques.push('part_du_poids')
  }

  let deficit = deficitQuotidien(rythme)
  const depenseKcal = depenseDuJour({ socleApplique, eatKcal, w })

  // 2. Déficit borné à 25 % de la dépense du jour.
  const deficitMax = depenseKcal * DEFICIT_MAX_PART_DEPENSE
  if (deficit > deficitMax) {
    deficit = deficitMax
    plafondsAppliques.push('deficit_max')
  }

  // 3. Plancher d'apport : le budget ne descend pas sous le BMR ni sous le
  //    plancher sanitaire. Si le déficit visé l'exige, on réduit le rythme.
  const plancherKcal = Math.max(bmrKcal, PLANCHER_APPORT[sexe])
  let budgetKcal = budgetDuJour({ socleApplique, eatKcal, deficitKcal: deficit, w })
  if (budgetKcal < plancherKcal) {
    const deficitAuPlancher = socleApplique + eatKcal - plancherKcal / facteurTef(w)
    deficit = Math.max(0, deficitAuPlancher)
    budgetKcal = budgetDuJour({ socleApplique, eatKcal, deficitKcal: deficit, w })
    plafondsAppliques.push('plancher_apport')
  }

  return {
    rythmeDemandeKgSemaine,
    rythmeAppliqueKgSemaine: deficit / KCAL_PAR_KG_SEMAINE,
    deficitKcal: deficit,
    budgetKcal,
    depenseKcal,
    plancherKcal,
    plafondsAppliques,
  }
}

/**
 * Date d'atteinte estimée du poids cible. Doc 02 § 6.
 * Renvoie `null` si le rythme est nul ou la cible déjà atteinte.
 */
export function semainesJusquAuPoidsCible(
  tendanceActuelleKg: number,
  poidsCibleKg: number,
  rythmeKgSemaine: number,
): number | null {
  if (rythmeKgSemaine <= 0) return null
  const restantKg = tendanceActuelleKg - poidsCibleKg
  if (restantKg <= 0) return null
  return Math.ceil(restantKg / rythmeKgSemaine)
}
