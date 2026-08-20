import { describe, expect, test } from 'bun:test'

import { bmr, socleFormule } from './bmr'
import { apportCible, deficitQuotidien } from './apport-cible'
import { calibrer, poidsCalibration, type EntreesCalibration } from './calibration'

const BMR = bmr({ sexe: 'homme', poidsKg: 85, tailleCm: 178, ageAns: 35 })
const SOCLE_FORMULE = socleFormule(BMR)

/** Le cas du § 5.5 : 14 jours pleins, 27 300 kcal saisies, −0,65 kg de tendance. */
const CAS_DU_DOCUMENT: EntreesCalibration = {
  joursAvecApportsDansFenetre: 14,
  nbPeseesDansFenetre: 10,
  tendanceDebutKg: 85,
  tendanceFinKg: 84.35,
  apportsTotauxKcal: 27_300,
  eatTotalKcal: 315,
  joursValidesCumules: 28,
  socleFormuleKcal: SOCLE_FORMULE,
  bmrKcal: BMR,
  socleAppliquePrecedentKcal: null,
  joursDepuisDerniereCalibration: null,
}

describe('Poids de la transition (doc 02 § 5.3)', () => {
  test('nul avant le jour 10, plein au jour 28', () => {
    expect(poidsCalibration(9)).toBe(0)
    expect(poidsCalibration(10)).toBe(0)
    expect(poidsCalibration(28)).toBe(1)
    expect(poidsCalibration(60)).toBe(1)
  })

  test('à mi-chemin au jour 19', () => {
    expect(poidsCalibration(19)).toBeCloseTo(0.5, 10)
  })

  test("⚠️ avec les jours de la seule fenêtre, w plafonnerait à 0,22", () => {
    // Le § 5.1 et doc 05 définissent `jours_valides` sur la fenêtre de 14 jours,
    // mais le § 5.3 attend 28 pour w = 1. Les deux lectures sont incompatibles ;
    // on retient le cumul depuis le début du suivi.
    expect(poidsCalibration(14)).toBeCloseTo(0.222, 3)
  })
})

describe('Calibration — le cas du § 5.5', () => {
  const resultat = calibrer(CAS_DU_DOCUMENT)

  test('la dépense mesurée sort du bilan énergétique', () => {
    expect(resultat.deltaTendanceKg).toBeCloseTo(-0.65, 10)
    expect(Math.round(resultat.depenseMesureeKcal)).toBe(2308)
  })

  test('le socle mesuré retire le sport de la fenêtre', () => {
    expect(Math.round(resultat.socleMesureKcal)).toBe(2285)
    expect(resultat.statut).toBe('applique')
    expect(resultat.gardeFousActifs).toEqual([])
  })

  test('le socle grimpe de 224 kcal — le chiffre annoncé à l\'utilisateur', () => {
    expect(Math.round(resultat.socleAppliqueKcal - SOCLE_FORMULE)).toBe(224)
  })

  test("⚠️ mais l'apport cible, lui, n'augmente que de 56 kcal", () => {
    // Le § 5.5 annonce « ton apport cible augmente de 56 kcal », et c'est bien
    // ce qu'on trouve. Le socle, lui, grimpe de 224 kcal : en passant du régime
    // « /0,90 » au régime calibré, la correction de TEF disparaît et absorbe
    // les trois quarts du gain. Annoncer la hausse du socle serait faux de
    // 168 kcal.
    const deficit = deficitQuotidien(0.5)
    const avant = apportCible({ socleApplique: SOCLE_FORMULE, eatKcal: 0, deficitKcal: deficit, w: 0 })
    const apres = apportCible({
      socleApplique: resultat.socleAppliqueKcal,
      eatKcal: 0,
      deficitKcal: deficit,
      w: resultat.w,
    })
    expect(Math.round(apres - avant)).toBe(56)
  })
})

describe('Conditions d\'activation (doc 02 § 5.1)', () => {
  test('sous 11 jours saisis sur 14, la calibration est suspendue', () => {
    // ⚠️ Le document donne deux seuils qui divergent : « 11 jours sur 14 » et
    // « ≥ 80 % » (soit 12). Le nombre explicite l'emporte ici.
    const r = calibrer({ ...CAS_DU_DOCUMENT, joursAvecApportsDansFenetre: 10 })
    expect(r.gardeFousActifs).toContain('sous_declaration')
    expect(r.socleAppliqueKcal).toBe(SOCLE_FORMULE)
  })

  test('11 jours sur 14 suffisent', () => {
    const r = calibrer({ ...CAS_DU_DOCUMENT, joursAvecApportsDansFenetre: 11 })
    expect(r.statut).toBe('applique')
  })

  test('moins de 6 pesées empêche la calibration', () => {
    const r = calibrer({ ...CAS_DU_DOCUMENT, nbPeseesDansFenetre: 5 })
    expect(r.statut).toBe('insuffisant')
  })

  test('sans mesure antérieure le statut est « insuffisant », avec il est « gelé »', () => {
    const sansHistorique = calibrer({ ...CAS_DU_DOCUMENT, nbPeseesDansFenetre: 5 })
    expect(sansHistorique.statut).toBe('insuffisant')

    const avecHistorique = calibrer({
      ...CAS_DU_DOCUMENT,
      nbPeseesDansFenetre: 5,
      socleAppliquePrecedentKcal: 2285,
      joursDepuisDerniereCalibration: 3,
    })
    expect(avecHistorique.statut).toBe('gele')
    // Jamais recalculé à la baisse sur des données trouées.
    expect(avecHistorique.socleAppliqueKcal).toBe(2285)
  })
})

describe('Garde-fous (doc 02 § 5.4)', () => {
  test('le socle ne bouge pas de plus de 5 % par semaine', () => {
    const r = calibrer({
      ...CAS_DU_DOCUMENT,
      apportsTotauxKcal: 40_000, // mesure brutalement plus haute
      socleAppliquePrecedentKcal: 2000,
      joursDepuisDerniereCalibration: 7,
    })
    expect(r.gardeFousActifs).toContain('vitesse_max')
    expect(r.socleAppliqueKcal).toBeCloseTo(2100, 6) // 2000 + 5 %
  })

  test('le socle reste au-dessus du BMR', () => {
    const r = calibrer({ ...CAS_DU_DOCUMENT, apportsTotauxKcal: 5_000 })
    expect(r.gardeFousActifs).toContain('borne_basse')
    expect(r.socleAppliqueKcal).toBeCloseTo(BMR, 6)
  })

  test('le socle ne dépasse pas 2,2 × BMR', () => {
    const r = calibrer({ ...CAS_DU_DOCUMENT, apportsTotauxKcal: 80_000 })
    expect(r.gardeFousActifs).toContain('borne_haute')
    expect(r.socleAppliqueKcal).toBeCloseTo(BMR * 2.2, 6)
  })

  test('une prise de poids donne une dépense mesurée plus basse', () => {
    const perte = calibrer(CAS_DU_DOCUMENT)
    const prise = calibrer({ ...CAS_DU_DOCUMENT, tendanceFinKg: 85.65 })
    expect(prise.depenseMesureeKcal).toBeLessThan(perte.depenseMesureeKcal)
  })
})
