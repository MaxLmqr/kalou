import {
  FENETRE_CALIBRATION_JOURS,
  JOUR_CALIBRATION_PLEINE,
  JOUR_PREMIERE_CALIBRATION,
  KCAL_PAR_KG_DE_GRAS,
  PART_JOURS_SAISIS_REQUISE,
  PESEES_REQUISES,
  SOCLE_MAX_EN_BMR,
  SOCLE_MIN_EN_BMR,
  VARIATION_SOCLE_MAX_HEBDO,
} from './constantes'
import type { GardeFou, StatutCalibration } from './types'

export type EntreesCalibration = {
  fenetreJours?: number
  /** Jours avec apports saisis **dans la fenêtre** — condition d'activation (§ 5.1). */
  joursAvecApportsDansFenetre: number
  nbPeseesDansFenetre: number
  tendanceDebutKg: number
  tendanceFinKg: number
  apportsTotauxKcal: number
  /** Somme des dépenses sportives nettes de la fenêtre. */
  eatTotalKcal: number
  /**
   * Jours valides **cumulés depuis le début du suivi** — pilote la transition
   * progressive (§ 5.3). Distinct du champ ci-dessus : voir la note sur `w`.
   */
  joursValidesCumules: number
  socleFormuleKcal: number
  bmrKcal: number
  /** Dernier socle appliqué, pour le garde-fou de vitesse. `null` la première fois. */
  socleAppliquePrecedentKcal: number | null
  /** Jours écoulés depuis la dernière calibration appliquée. */
  joursDepuisDerniereCalibration: number | null
}

export type ResultatCalibration = {
  statut: StatutCalibration
  /** Dépense quotidienne moyenne mesurée sur la fenêtre. Contient déjà le TEF. */
  depenseMesureeKcal: number
  socleMesureKcal: number
  socleFormuleKcal: number
  deltaTendanceKg: number
  eatMoyenKcal: number
  w: number
  /** Socle retenu, après transition et garde-fous. */
  socleAppliqueKcal: number
  gardeFousActifs: GardeFou[]
}

function borner(valeur: number, min: number, max: number): number {
  return Math.min(Math.max(valeur, min), max)
}

/**
 * Poids de la calibration dans le socle appliqué. Doc 02 § 5.3.
 *
 * ⚠️ Le document nomme `jours_valides` deux grandeurs différentes : au § 5.1 et
 * dans `calibrations.jours_valides` (doc 05) ce sont les jours saisis **dans la
 * fenêtre** de 14 jours, tandis que la formule du § 5.3 exige d'atteindre 28
 * pour que w vaille 1. Avec la première lecture, w plafonnerait à
 * (14 − 10) / 18 ≈ 0,22 et la calibration ne prendrait jamais le pas sur la
 * formule. C'est donc bien un cumul depuis le début du suivi qui est attendu
 * ici, et c'est ce qu'on implémente.
 */
export function poidsCalibration(joursValidesCumules: number): number {
  const etendue = JOUR_CALIBRATION_PLEINE - JOUR_PREMIERE_CALIBRATION
  return borner((joursValidesCumules - JOUR_PREMIERE_CALIBRATION) / etendue, 0, 1)
}

/**
 * Calibration du socle sur la variation de poids observée. Doc 02 § 5.
 *
 * C'est une mesure, pas une estimation : sur une fenêtre assez longue, la
 * variation de la tendance révèle la dépense réelle.
 */
export function calibrer(entrees: EntreesCalibration): ResultatCalibration {
  const {
    fenetreJours = FENETRE_CALIBRATION_JOURS,
    joursAvecApportsDansFenetre,
    nbPeseesDansFenetre,
    tendanceDebutKg,
    tendanceFinKg,
    apportsTotauxKcal,
    eatTotalKcal,
    joursValidesCumules,
    socleFormuleKcal,
    bmrKcal,
    socleAppliquePrecedentKcal,
    joursDepuisDerniereCalibration,
  } = entrees

  const gardeFousActifs: GardeFou[] = []

  const deltaTendanceKg = tendanceFinKg - tendanceDebutKg
  const energieMobiliseeKcal = deltaTendanceKg * KCAL_PAR_KG_DE_GRAS
  const depenseMesureeKcal = (apportsTotauxKcal - energieMobiliseeKcal) / fenetreJours
  const eatMoyenKcal = eatTotalKcal / fenetreJours
  // Retirer le sport est essentiel : sans ça il serait compté deux fois, une
  // fois dans le socle mesuré et une fois à la saisie du jour (§ 5.2).
  const socleMesureKcal = depenseMesureeKcal - eatMoyenKcal

  const w = poidsCalibration(joursValidesCumules)

  // Conditions d'activation (§ 5.1). La sous-déclaration est la spirale que le
  // garde-fou empêche : sous-déclarer fait mesurer une dépense trop basse, donc
  // rétrécit le budget, donc aggrave la faim et la sous-déclaration.
  // ⚠️ Le § 5.1 annonce « au moins 11 jours sur 14 (≥ 80 %) », mais 11/14 vaut
  // 78,6 % : les deux critères ne désignent pas le même seuil. On retient le
  // nombre explicite (arrondi au plus proche), pas le ratio.
  const joursRequis = Math.round(fenetreJours * PART_JOURS_SAISIS_REQUISE)
  const assezDeJours = joursAvecApportsDansFenetre >= joursRequis
  const assezDePesees = nbPeseesDansFenetre >= PESEES_REQUISES

  if (!assezDeJours) gardeFousActifs.push('sous_declaration')

  if (!assezDeJours || !assezDePesees || w <= 0) {
    // Jamais recalculé à la baisse sur des données trouées : on gèle la
    // dernière valeur connue, ou on reste sur la formule si rien n'a été mesuré.
    return {
      statut: socleAppliquePrecedentKcal === null ? 'insuffisant' : 'gele',
      depenseMesureeKcal,
      socleMesureKcal,
      socleFormuleKcal,
      deltaTendanceKg,
      eatMoyenKcal,
      w,
      socleAppliqueKcal: socleAppliquePrecedentKcal ?? socleFormuleKcal,
      gardeFousActifs,
    }
  }

  // Transition progressive (§ 5.3) : pas de saut visible dans le budget.
  let socleAppliqueKcal = w * socleMesureKcal + (1 - w) * socleFormuleKcal

  // Garde-fou de vitesse (§ 5.4) : absorbe un artefact de fenêtre.
  if (socleAppliquePrecedentKcal !== null && joursDepuisDerniereCalibration !== null) {
    const semaines = Math.max(joursDepuisDerniereCalibration / 7, 0)
    const variationMax = socleAppliquePrecedentKcal * VARIATION_SOCLE_MAX_HEBDO * semaines
    const borne = borner(
      socleAppliqueKcal,
      socleAppliquePrecedentKcal - variationMax,
      socleAppliquePrecedentKcal + variationMax,
    )
    if (borne !== socleAppliqueKcal) {
      socleAppliqueKcal = borne
      gardeFousActifs.push('vitesse_max')
    }
  }

  // Bornes absolues (§ 5.4) : hors de cet intervalle, c'est un bug de données.
  const min = bmrKcal * SOCLE_MIN_EN_BMR
  const max = bmrKcal * SOCLE_MAX_EN_BMR
  if (socleAppliqueKcal < min) {
    socleAppliqueKcal = min
    gardeFousActifs.push('borne_basse')
  } else if (socleAppliqueKcal > max) {
    socleAppliqueKcal = max
    gardeFousActifs.push('borne_haute')
  }

  return {
    statut: 'applique',
    depenseMesureeKcal,
    socleMesureKcal,
    socleFormuleKcal,
    deltaTendanceKg,
    eatMoyenKcal,
    w,
    socleAppliqueKcal,
    gardeFousActifs,
  }
}
