import { describe, expect, test } from 'bun:test'

import { kcalBrut, kcalNet } from './activite'
import { age, bmr, socleFormule } from './bmr'
import {
  balance,
  budgetDuJour,
  deficitQuotidien,
  depenseDuJour,
  depenseReelle,
  facteurTef,
  phase,
  restant,
} from './budget'

/**
 * Le profil de référence du doc 02 § 3.2 : homme, 35 ans, 85 kg, 178 cm,
 * objectif 0,5 kg/semaine, pas de sport.
 */
const PROFIL = { sexe: 'homme', poidsKg: 85, tailleCm: 178, ageAns: 35 } as const

describe('BMR — Mifflin-St Jeor (doc 02 § 2)', () => {
  test("l'exemple du document", () => {
    // Le document arrondit à 1 792 ; la valeur exacte est 1 792,5. On garde la
    // précision en interne, l'arrondi n'a lieu qu'à la frontière de l'API.
    expect(bmr(PROFIL)).toBeCloseTo(1792.5, 6)
    expect(Math.round(bmr(PROFIL))).toBeGreaterThanOrEqual(1792)
  })

  test('la constante de sexe vaut 166 kcal d\'écart', () => {
    const homme = bmr(PROFIL)
    const femme = bmr({ ...PROFIL, sexe: 'femme' })
    expect(homme - femme).toBe(166)
  })

  test("l'âge est décompté en années révolues", () => {
    const naissance = new Date(Date.UTC(1990, 5, 15))
    expect(age(naissance, new Date(Date.UTC(2026, 5, 14)))).toBe(35)
    expect(age(naissance, new Date(Date.UTC(2026, 5, 15)))).toBe(36)
  })
})

describe('Socle, TEF et budget (doc 02 § 3)', () => {
  const bmrKcal = bmr(PROFIL)
  const socle = socleFormule(bmrKcal)
  const deficit = deficitQuotidien(0.5)

  test('le socle applique le NEAT forfaitaire de 15 %', () => {
    expect(Math.round(socle)).toBe(2061)
  })

  test('la dépense du jour intègre le TEF', () => {
    expect(Math.round(depenseDuJour({ socleApplique: socle, eatKcal: 0, w: 0 }))).toBe(2290)
  })

  test('le déficit de 0,5 kg/semaine vaut 550 kcal', () => {
    expect(deficit).toBe(550)
  })

  test('le budget du document', () => {
    const budget = budgetDuJour({ socleApplique: socle, eatKcal: 0, deficitKcal: deficit, w: 0 })
    expect(Math.round(budget)).toBe(1679)
  })

  test('vérification du § 3.2 : le déficit énergétique réel est bien de 550 kcal', () => {
    const budget = budgetDuJour({ socleApplique: socle, eatKcal: 0, deficitKcal: deficit, w: 0 })
    expect(Math.round(balance({ apportsKcal: budget, socleApplique: socle, eatKcal: 0, w: 0 }))).toBe(-550)
  })

  test('la dépense réelle du § 3.2 vaut 2 229 kcal, pas 2 290', () => {
    const budget = budgetDuJour({ socleApplique: socle, eatKcal: 0, deficitKcal: deficit, w: 0 })
    const reelle = depenseReelle({ socleApplique: socle, eatKcal: 0, apportsKcal: budget, w: 0 })
    expect(Math.round(reelle)).toBe(2229)
    // La dépense d'équilibre, elle, ne bouge pas avec les apports : c'est ce qui
    // en fait le chiffre affichable.
    expect(Math.round(depenseDuJour({ socleApplique: socle, eatKcal: 0, w: 0 }))).toBe(2290)
  })

  test("retirer 550 kcal de dépense demande d'en retirer 611 de l'assiette", () => {
    const depense = depenseDuJour({ socleApplique: socle, eatKcal: 0, w: 0 })
    const budget = budgetDuJour({ socleApplique: socle, eatKcal: 0, deficitKcal: deficit, w: 0 })
    expect(Math.round(depense - budget)).toBe(611)
  })

  test('la balance suit ce qui est réellement mangé', () => {
    // Manger 321 kcal au-dessus du budget réduit le déficit d'autant, moins le
    // TEF de ces calories supplémentaires.
    const auBudget = balance({ apportsKcal: 1679, socleApplique: socle, eatKcal: 0, w: 0 })
    const auDessus = balance({ apportsKcal: 2000, socleApplique: socle, eatKcal: 0, w: 0 })
    expect(Math.round(auBudget)).toBe(-550)
    expect(Math.round(auDessus)).toBe(-261)
    expect(Math.round(auDessus - auBudget)).toBe(289) // 321 × 0,90
  })

  test('après calibration, le socle mesuré porte déjà le TEF', () => {
    const calibre = balance({ apportsKcal: 1735, socleApplique: 2285, eatKcal: 0, w: 1 })
    expect(Math.round(calibre)).toBe(-550)
  })

  test('une activité augmente le budget du jour', () => {
    const sans = budgetDuJour({ socleApplique: socle, eatKcal: 0, deficitKcal: deficit, w: 0 })
    const avec = budgetDuJour({ socleApplique: socle, eatKcal: 489, deficitKcal: deficit, w: 0 })
    expect(avec).toBeGreaterThan(sans)
  })

  test('le restant peut être négatif, sans traitement particulier', () => {
    expect(restant(1679, 2000)).toBe(-321)
  })
})

describe('Transition du facteur TEF (§ 3.2 → § 3.3)', () => {
  test('les deux régimes du document sont retrouvés aux extrémités', () => {
    expect(facteurTef(0)).toBeCloseTo(1 / 0.9, 12)
    expect(facteurTef(1)).toBe(1)
  })

  test('le budget ne saute pas quand la calibration commence à peser', () => {
    const socle = socleFormule(bmr(PROFIL))
    const deficit = deficitQuotidien(0.5)
    const commun = { socleApplique: socle, eatKcal: 0, deficitKcal: deficit }

    const aZero = budgetDuJour({ ...commun, w: 0 })
    const justeApres = budgetDuJour({ ...commun, w: 0.001 })

    // Un basculement brutal de régime coûterait 168 kcal ici.
    expect(Math.abs(justeApres - aZero)).toBeLessThan(1)
  })

  test('la phase exposée suit le poids de calibration', () => {
    expect(phase(0)).toBe('formule')
    expect(phase(0.5)).toBe('transition')
    expect(phase(1)).toBe('calibre')
  })
})

describe('Dépense sportive par MET (doc 02 § 7)', () => {
  const COURSE = { met: 8.3, poidsKg: 85, dureeMin: 45 }

  test("l'exemple du document", () => {
    expect(Math.round(kcalBrut(COURSE))).toBe(556)
    expect(Math.round(kcalNet(COURSE))).toBe(489)
  })

  test('le net retire le repos déjà compté dans le socle', () => {
    const yoga = { met: 2.5, poidsKg: 85, dureeMin: 60 }
    expect(Math.round(kcalBrut(yoga) - kcalNet(yoga))).toBe(89)
  })

  test('une activité à MET 1 ne rapporte rien', () => {
    expect(kcalNet({ met: 1, poidsKg: 85, dureeMin: 60 })).toBe(0)
  })
})
