import { describe, expect, test } from 'bun:test'

import { bmr, socleFormule } from './bmr'
import { appliquerPlafonds, semainesJusquAuPoidsCible } from './objectif'

const HOMME = { sexe: 'homme', poidsKg: 85, tailleCm: 178, ageAns: 35 } as const
const BMR_HOMME = bmr(HOMME)
const SOCLE_HOMME = socleFormule(BMR_HOMME)

const base = {
  poidsKg: HOMME.poidsKg,
  socleApplique: SOCLE_HOMME,
  eatKcal: 0,
  w: 0,
  bmrKcal: BMR_HOMME,
  sexe: HOMME.sexe,
}

describe('Plafonds de l\'objectif (doc 02 § 6)', () => {
  test('le rythme est borné à 1 % du poids corporel', () => {
    const r = appliquerPlafonds({ ...base, rythmeDemandeKgSemaine: 1.5 })
    expect(r.plafondsAppliques).toContain('part_du_poids')
    // C'est le « rythme_max: 0.85 » de l'exemple d'erreur du doc 06 § 12.
    expect(base.poidsKg * 0.01).toBe(0.85)
  })

  test('le déficit est borné à 25 % de la dépense du jour', () => {
    const r = appliquerPlafonds({ ...base, rythmeDemandeKgSemaine: 1.5 })
    expect(r.plafondsAppliques).toContain('deficit_max')
    expect(r.deficitKcal).toBeLessThanOrEqual(r.depenseKcal * 0.25 + 1e-9)
  })

  test('Kalou ne refuse pas : il renvoie le rythme atteignable le plus proche', () => {
    const r = appliquerPlafonds({ ...base, rythmeDemandeKgSemaine: 1.5 })
    expect(r.rythmeDemandeKgSemaine).toBe(1.5)
    expect(r.rythmeAppliqueKgSemaine).toBeLessThan(1.5)
    expect(r.rythmeAppliqueKgSemaine).toBeGreaterThan(0)
  })

  test('⚠️ le profil de référence n\'atteint pas le rythme « recommandé par défaut »', () => {
    // Le § 3.2 donne un budget de 1 679 kcal pour 0,5 kg/semaine, et le § 6
    // présente 0,5 comme le défaut recommandé. Mais le § 5.4 impose
    // `budget ≥ max(BMR ; plancher)`, soit 1 792 kcal ici : le budget du
    // document viole le garde-fou du même document, et le rythme retombe à 0,41.
    const r = appliquerPlafonds({ ...base, rythmeDemandeKgSemaine: 0.5 })
    expect(r.plafondsAppliques).toContain('plancher_apport')
    expect(Math.round(r.budgetKcal)).toBe(1793)
    expect(r.rythmeAppliqueKgSemaine).toBeCloseTo(0.407, 3)
  })

  test('sans le plancher BMR, le budget du document passerait', () => {
    // Avec le seul plancher sanitaire (1 500 kcal pour un homme), 1 679 est valide.
    const r = appliquerPlafonds({ ...base, rythmeDemandeKgSemaine: 0.5, bmrKcal: 1500 })
    expect(r.plafondsAppliques).not.toContain('plancher_apport')
    expect(Math.round(r.budgetKcal)).toBe(1679)
  })

  test('le plancher sanitaire féminin est respecté', () => {
    const femme = { sexe: 'femme', poidsKg: 50, tailleCm: 160, ageAns: 30 } as const
    const bmrFemme = bmr(femme)
    const r = appliquerPlafonds({
      rythmeDemandeKgSemaine: 0.5,
      poidsKg: femme.poidsKg,
      socleApplique: socleFormule(bmrFemme),
      eatKcal: 0,
      w: 0,
      bmrKcal: bmrFemme,
      sexe: 'femme',
    })
    expect(r.plancherKcal).toBe(1200) // max(1189, 1200)
    expect(Math.round(r.budgetKcal)).toBe(1200)
    expect(r.plafondsAppliques).toContain('plancher_apport')
  })

  test('un objectif modeste passe sans plafonnement', () => {
    const r = appliquerPlafonds({ ...base, rythmeDemandeKgSemaine: 0.25, bmrKcal: 1500 })
    expect(r.plafondsAppliques).toEqual([])
    expect(r.rythmeAppliqueKgSemaine).toBeCloseTo(0.25, 10)
  })
})

describe('Date d\'atteinte (doc 02 § 6)', () => {
  test('arrondie à la semaine supérieure', () => {
    expect(semainesJusquAuPoidsCible(85, 78, 0.5)).toBe(14)
  })

  test('nulle si la cible est atteinte ou le rythme nul', () => {
    expect(semainesJusquAuPoidsCible(75, 78, 0.5)).toBeNull()
    expect(semainesJusquAuPoidsCible(85, 78, 0)).toBeNull()
  })
})
