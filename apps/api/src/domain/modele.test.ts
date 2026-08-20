import { describe, expect, test } from 'bun:test'

import { kcalBrut, kcalNet } from './activite'
import { age, bmr, socleFormule } from './bmr'
import {
  apportCible,
  balance,
  besoinJournalier,
  deficitQuotidien,
  depenseReelle,
  facteurTef,
  phase,
  restant,
} from './apport-cible'
import { plancherProteines, sommeProteines } from './proteines'

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

describe('Socle, TEF et apport cible (doc 02 § 3)', () => {
  const bmrKcal = bmr(PROFIL)
  const socle = socleFormule(bmrKcal)
  const deficit = deficitQuotidien(0.5)

  test('le socle applique le NEAT forfaitaire de 15 %', () => {
    expect(Math.round(socle)).toBe(2061)
  })

  test('le besoin énergétique journalier intègre le TEF', () => {
    expect(Math.round(besoinJournalier({ socleApplique: socle, eatKcal: 0, w: 0 }))).toBe(2290)
  })

  test('le déficit de 0,5 kg/semaine vaut 550 kcal', () => {
    expect(deficit).toBe(550)
  })

  test("l'apport cible du document", () => {
    const cible = apportCible({ socleApplique: socle, eatKcal: 0, deficitKcal: deficit, w: 0 })
    expect(Math.round(cible)).toBe(1679)
  })

  test('vérification du § 3.2 : le déficit énergétique réel est bien de 550 kcal', () => {
    const cible = apportCible({ socleApplique: socle, eatKcal: 0, deficitKcal: deficit, w: 0 })
    expect(Math.round(balance({ apportsKcal: cible, socleApplique: socle, eatKcal: 0, w: 0 }))).toBe(-550)
  })

  test('la dépense réelle du § 3.2 vaut 2 229 kcal, pas 2 290', () => {
    const cible = apportCible({ socleApplique: socle, eatKcal: 0, deficitKcal: deficit, w: 0 })
    const reelle = depenseReelle({ socleApplique: socle, eatKcal: 0, apportsKcal: cible, w: 0 })
    expect(Math.round(reelle)).toBe(2229)
    // Le besoin énergétique journalier, lui, ne bouge pas avec les apports :
    // c'est ce qui en fait le chiffre affichable.
    expect(Math.round(besoinJournalier({ socleApplique: socle, eatKcal: 0, w: 0 }))).toBe(2290)
  })

  test("retirer 550 kcal de dépense demande d'en retirer 611 de l'assiette", () => {
    const besoin = besoinJournalier({ socleApplique: socle, eatKcal: 0, w: 0 })
    const cible = apportCible({ socleApplique: socle, eatKcal: 0, deficitKcal: deficit, w: 0 })
    expect(Math.round(besoin - cible)).toBe(611)
  })

  test('la balance suit ce qui est réellement mangé', () => {
    // Manger 321 kcal au-dessus de l'apport cible réduit le déficit d'autant,
    // moins le TEF de ces calories supplémentaires.
    const aLaCible = balance({ apportsKcal: 1679, socleApplique: socle, eatKcal: 0, w: 0 })
    const auDessus = balance({ apportsKcal: 2000, socleApplique: socle, eatKcal: 0, w: 0 })
    expect(Math.round(aLaCible)).toBe(-550)
    expect(Math.round(auDessus)).toBe(-261)
    expect(Math.round(auDessus - aLaCible)).toBe(289) // 321 × 0,90
  })

  test('après calibration, le socle mesuré porte déjà le TEF', () => {
    const calibre = balance({ apportsKcal: 1735, socleApplique: 2285, eatKcal: 0, w: 1 })
    expect(Math.round(calibre)).toBe(-550)
  })

  test("une activité augmente l'apport cible du jour", () => {
    const sans = apportCible({ socleApplique: socle, eatKcal: 0, deficitKcal: deficit, w: 0 })
    const avec = apportCible({ socleApplique: socle, eatKcal: 489, deficitKcal: deficit, w: 0 })
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

  test("l'apport cible ne saute pas quand la calibration commence à peser", () => {
    const socle = socleFormule(bmr(PROFIL))
    const deficit = deficitQuotidien(0.5)
    const commun = { socleApplique: socle, eatKcal: 0, deficitKcal: deficit }

    const aZero = apportCible({ ...commun, w: 0 })
    const justeApres = apportCible({ ...commun, w: 0.001 })

    // Un basculement brutal de régime coûterait 168 kcal ici.
    expect(Math.abs(justeApres - aZero)).toBeLessThan(1)
  })

  test('la phase exposée suit le poids de calibration', () => {
    expect(phase(0)).toBe('formule')
    expect(phase(0.5)).toBe('transition')
    expect(phase(1)).toBe('calibre')
  })
})

describe('Plancher protéique (doc 02 § 9)', () => {
  test("l'arrondi se fait à 5 g près", () => {
    // ⚠️ Le § 9 et le lexique annoncent 136 g pour 85 kg, mais 1,6 × 85 = 136
    // n'est pas un multiple de 5 : la règle d'arrondi du même paragraphe donne
    // 135. C'est la règle qui fait foi, l'exemple qui est faux.
    expect(plancherProteines(85)).toBe(135)
    expect(plancherProteines(82.4)).toBe(130)
    expect(plancherProteines(60)).toBe(95)
  })

  test('un plancher, jamais un plafond : il croît avec le poids', () => {
    expect(plancherProteines(100)).toBeGreaterThan(plancherProteines(70))
  })
})

describe('Somme protéique du jour (doc 02 § 9)', () => {
  test('somme les composants qui portent une valeur', () => {
    expect(
      sommeProteines([
        { type: 'reference', proteinesG: 28.4 },
        { type: 'reference', proteinesG: 13.6 },
      ]),
    ).toEqual({ totalG: 42, partielle: false })
  })

  test("un composant libre sans protéines fait du total une borne inférieure", () => {
    expect(
      sommeProteines([
        { type: 'reference', proteinesG: 42 },
        { type: 'libre', proteinesG: null },
      ]),
    ).toEqual({ totalG: 42, partielle: true })
  })

  test('un composant libre renseigné ne rend pas la somme partielle', () => {
    expect(
      sommeProteines([
        { type: 'reference', proteinesG: 42 },
        { type: 'libre', proteinesG: 6 },
      ]),
    ).toEqual({ totalG: 48, partielle: false })
  })

  test('aucune valeur du tout : `null`, pas zéro', () => {
    // Afficher « 0 g » laisserait croire à une mesure ; il n'y en a aucune.
    expect(sommeProteines([{ type: 'libre', proteinesG: null }])).toEqual({
      totalG: null,
      partielle: true,
    })
    expect(sommeProteines([])).toEqual({ totalG: null, partielle: false })
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
