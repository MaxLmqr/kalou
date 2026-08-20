/**
 * Constantes du modèle calorique — doc 02.
 *
 * Toute valeur ici est normative : elle vient du document et n'est pas un
 * réglage. Changer l'une d'elles change le produit, pas l'implémentation.
 */

/** Part des apports dépensée par la digestion (TEF). Doc 02 § 3.2. */
export const PART_TEF = 0.1

/** Facteur NEAT forfaitaire appliqué au BMR avant calibration. Doc 02 § 3.1. */
export const FACTEUR_NEAT = 1.15

/** Densité énergétique du tissu adipeux, en kcal/kg. Doc 02 § 5.2. */
export const KCAL_PAR_KG_DE_GRAS = 7700

/** Déficit quotidien pour 1 kg/semaine : 7 700 / 7. Doc 02 § 6. */
export const KCAL_PAR_KG_SEMAINE = KCAL_PAR_KG_DE_GRAS / 7

/** Lissage exponentiel de la tendance de poids (demi-vie ≈ 4,3 j). Doc 02 § 4. */
export const ALPHA_TENDANCE = 0.15

/** Au-delà, la tendance est réinitialisée sur la nouvelle pesée. Doc 02 § 4. */
export const JOURS_AVANT_REINITIALISATION_TENDANCE = 14

/** Écart à la tendance au-delà duquel une pesée est signalée. Doc 02 § 4. */
export const ECART_PESEE_ABERRANTE_KG = 3

/** Fenêtre glissante de calibration, en jours. Doc 02 § 5.1. */
export const FENETRE_CALIBRATION_JOURS = 14

/** Part minimale de jours avec apports saisis dans la fenêtre. Doc 02 § 5.1. */
export const PART_JOURS_SAISIS_REQUISE = 0.8

/** Nombre de pesées minimum dans la fenêtre. Doc 02 § 5.1. */
export const PESEES_REQUISES = 6

/** Premier jour où une calibration peut s'appliquer. Doc 02 § 5.3. */
export const JOUR_PREMIERE_CALIBRATION = 10

/** Jour où la calibration prend tout son poids (w = 1). Doc 02 § 5.3. */
export const JOUR_CALIBRATION_PLEINE = 28

/** Variation hebdomadaire maximale du socle appliqué. Doc 02 § 5.4. */
export const VARIATION_SOCLE_MAX_HEBDO = 0.05

/** Bornes absolues du socle, en multiples du BMR. Doc 02 § 5.4. */
export const SOCLE_MIN_EN_BMR = 1.0
export const SOCLE_MAX_EN_BMR = 2.2

/** Planchers d'apport, en kcal. Doc 02 § 5.4. */
export const PLANCHER_APPORT = { homme: 1500, femme: 1200 } as const

/** Rythme de perte maximal, en part du poids corporel par semaine. Doc 02 § 6. */
export const RYTHME_MAX_PART_DU_POIDS = 0.01

/** Déficit maximal, en part du besoin énergétique journalier. Doc 02 § 6. */
export const DEFICIT_MAX_PART_BESOIN = 0.25

/** Plancher protéique : `1,6 × poids`, arrondi à 5 g près. Doc 02 § 9. */
export const PLANCHER_PROTEINES_PAR_KG = 1.6
export const PAS_ARRONDI_PLANCHER_PROTEINES_G = 5
