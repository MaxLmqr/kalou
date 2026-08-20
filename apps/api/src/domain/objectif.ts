import { apportCible, besoinJournalier, deficitQuotidien, facteurTef } from './apport-cible'
import {
  DEFICIT_MAX_PART_BESOIN,
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
  sexe: Sexe
}

export type ResultatObjectif = {
  rythmeDemandeKgSemaine: number
  rythmeAppliqueKgSemaine: number
  deficitKcal: number
  apportCibleKcal: number
  besoinJournalierKcal: number
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
  const { rythmeDemandeKgSemaine, poidsKg, socleApplique, eatKcal, w, sexe } = entrees
  const plafondsAppliques: MotifPlafond[] = []

  // 1. Rythme borné à 1 % du poids corporel par semaine.
  const rythmeMax = poidsKg * RYTHME_MAX_PART_DU_POIDS
  let rythme = rythmeDemandeKgSemaine
  if (rythme > rythmeMax) {
    rythme = rythmeMax
    plafondsAppliques.push('part_du_poids')
  }

  let deficit = deficitQuotidien(rythme)
  const besoinJournalierKcal = besoinJournalier({ socleApplique, eatKcal, w })

  // 2. Déficit borné à 25 % du besoin énergétique journalier.
  const deficitMax = besoinJournalierKcal * DEFICIT_MAX_PART_BESOIN
  if (deficit > deficitMax) {
    deficit = deficitMax
    plafondsAppliques.push('deficit_max')
  }

  // 3. Plancher d'apport sanitaire. Si le déficit visé l'exige, on réduit le
  //    rythme plutôt que de descendre en dessous.
  //
  //    Le § 5.4 écrit `apport cible ≥ max(BMR ; plancher)`, mais le BMR y a été
  //    retiré : combiné à un socle NEAT de +15 %, il rend le rythme « recommandé
  //    par défaut » (0,5 kg/semaine) inatteignable pour le profil de référence
  //    du § 3.2 — dont l'apport cible de 1 679 kcal est pourtant celui du
  //    document. Manger sous son BMR est ordinaire en déficit modéré ; c'est le
  //    plancher sanitaire qui porte la sécurité.
  const plancherKcal = PLANCHER_APPORT[sexe]
  let apportCibleKcal = apportCible({ socleApplique, eatKcal, deficitKcal: deficit, w })
  if (apportCibleKcal < plancherKcal) {
    const deficitAuPlancher = socleApplique + eatKcal - plancherKcal / facteurTef(w)
    deficit = Math.max(0, deficitAuPlancher)
    apportCibleKcal = apportCible({ socleApplique, eatKcal, deficitKcal: deficit, w })
    plafondsAppliques.push('plancher_apport')
  }

  return {
    rythmeDemandeKgSemaine,
    rythmeAppliqueKgSemaine: deficit / KCAL_PAR_KG_SEMAINE,
    deficitKcal: deficit,
    apportCibleKcal,
    besoinJournalierKcal,
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
