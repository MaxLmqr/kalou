import {
  ALPHA_TENDANCE,
  ECART_PESEE_ABERRANTE_KG,
  JOURS_AVANT_REINITIALISATION_TENDANCE,
} from './constantes'
import { differenceEnJours } from './journee'

/** Une pesée, rattachée à son jour local (doc 05). */
export type Pesee = {
  localDate: string
  poidsKg: number
}

export type PointDeTendance = {
  localDate: string
  poidsKg: number
  tendanceKg: number
  /** Écart > 3 kg avec la tendance précédente. Acceptée, mais signalée. */
  estAberrante: boolean
  /** La série a été réinitialisée sur cette pesée (interruption > 14 jours). */
  reinitialisee: boolean
}

/**
 * Tendance de poids par lissage exponentiel. Doc 02 § 4.
 *
 * Aucune décision n'est prise sur une pesée brute : une pesée contient 0,5 à
 * 2 kg de bruit. Une journée sans pesée ne met pas à jour la tendance — il n'y
 * a pas d'interpolation, l'EMA avance d'une pesée à l'autre.
 */
export function calculerTendance(pesees: readonly Pesee[]): PointDeTendance[] {
  const triees = [...pesees].sort((a, b) => a.localDate.localeCompare(b.localDate))
  const points: PointDeTendance[] = []

  let tendancePrecedente: number | null = null
  let dateLaPlusRecente: string | null = null

  for (const pesee of triees) {
    const interrompue =
      dateLaPlusRecente !== null &&
      differenceEnJours(dateLaPlusRecente, pesee.localDate) > JOURS_AVANT_REINITIALISATION_TENDANCE

    // Après une interruption longue, la valeur d'avant ne décrit plus le corps
    // actuel : on repart de la nouvelle pesée plutôt que de la traîner.
    const reinitialisee: boolean = tendancePrecedente === null || interrompue

    const estAberrante: boolean =
      !reinitialisee && Math.abs(pesee.poidsKg - tendancePrecedente!) > ECART_PESEE_ABERRANTE_KG

    const tendanceKg: number = reinitialisee
      ? pesee.poidsKg
      : tendancePrecedente! + ALPHA_TENDANCE * (pesee.poidsKg - tendancePrecedente!)

    points.push({
      localDate: pesee.localDate,
      poidsKg: pesee.poidsKg,
      tendanceKg,
      estAberrante,
      reinitialisee,
    })

    tendancePrecedente = tendanceKg
    dateLaPlusRecente = pesee.localDate
  }

  return points
}

/** Dernière valeur de tendance connue, ou `null` si aucune pesée. */
export function tendanceCourante(pesees: readonly Pesee[]): number | null {
  const points = calculerTendance(pesees)
  return points.at(-1)?.tendanceKg ?? null
}
