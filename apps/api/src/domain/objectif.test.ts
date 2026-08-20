import { describe, expect, test } from 'bun:test'

import { bmr, socleFormule } from './bmr'
import { appliquerPlafonds, semainesJusquAuPoidsCible } from './objectif'

const HOMME = { sexe: 'homme', poidsKg: 85, tailleCm: 178, ageAns: 35 } as const
const SOCLE_HOMME = socleFormule(bmr(HOMME))

const base = {
  poidsKg: HOMME.poidsKg,
  socleApplique: SOCLE_HOMME,
  eatKcal: 0,
  w: 0,
  sexe: HOMME.sexe,
}

describe("Plafonds de l'objectif (doc 02 § 6)", () => {
  test('le rythme est borné à 1 % du poids corporel', () => {
    const r = appliquerPlafonds({ ...base, rythmeDemandeKgSemaine: 1.5 })
    expect(r.plafondsAppliques).toContain('part_du_poids')
    // C'est le « rythme_max: 0.85 » de l'exemple d'erreur du doc 06 § 12.
    expect(base.poidsKg * 0.01).toBe(0.85)
  })

  test('le déficit est borné à 25 % du besoin énergétique journalier', () => {
    const r = appliquerPlafonds({ ...base, rythmeDemandeKgSemaine: 1.5 })
    expect(r.plafondsAppliques).toContain('deficit_max')
    expect(r.deficitKcal).toBeLessThanOrEqual(r.besoinJournalierKcal * 0.25 + 1e-9)
  })

  test('Kalou ne refuse pas : il renvoie le rythme atteignable le plus proche', () => {
    const r = appliquerPlafonds({ ...base, rythmeDemandeKgSemaine: 1.5 })
    expect(r.rythmeDemandeKgSemaine).toBe(1.5)
    expect(r.rythmeAppliqueKgSemaine).toBeCloseTo(0.52, 2)
  })

  test('le profil de référence atteint le rythme recommandé par défaut', () => {
    // Le § 5.4 écrivait `apport cible ≥ max(BMR ; plancher)`, ce qui aurait
    // ramené ce profil à 0,41 kg/semaine et rendu inatteignable le défaut
    // recommandé du § 6 — alors même que 1 679 kcal est l'apport cible donné
    // par le § 3.2. Le plancher ne retient plus que la borne sanitaire.
    const r = appliquerPlafonds({ ...base, rythmeDemandeKgSemaine: 0.5 })
    expect(r.plafondsAppliques).toEqual([])
    expect(Math.round(r.apportCibleKcal)).toBe(1679)
    expect(r.rythmeAppliqueKgSemaine).toBeCloseTo(0.5, 10)
    expect(r.plancherKcal).toBe(1500)
  })

  test("l'apport cible reste au-dessus du plancher sanitaire masculin", () => {
    const r = appliquerPlafonds({
      ...base,
      poidsKg: 62,
      socleApplique: 1750,
      rythmeDemandeKgSemaine: 0.6,
    })
    expect(r.plafondsAppliques).toContain('plancher_apport')
    expect(Math.round(r.apportCibleKcal)).toBe(1500)
  })

  test('le plancher sanitaire féminin est respecté', () => {
    const femme = { sexe: 'femme', poidsKg: 50, tailleCm: 160, ageAns: 30 } as const
    const r = appliquerPlafonds({
      rythmeDemandeKgSemaine: 0.5,
      poidsKg: femme.poidsKg,
      socleApplique: socleFormule(bmr(femme)),
      eatKcal: 0,
      w: 0,
      sexe: 'femme',
    })
    expect(r.plancherKcal).toBe(1200)
    expect(Math.round(r.apportCibleKcal)).toBe(1200)
    expect(r.plafondsAppliques).toContain('plancher_apport')
  })

  test('un objectif modeste passe sans plafonnement', () => {
    const r = appliquerPlafonds({ ...base, rythmeDemandeKgSemaine: 0.25 })
    expect(r.plafondsAppliques).toEqual([])
    expect(r.rythmeAppliqueKgSemaine).toBeCloseTo(0.25, 10)
  })

  test('une séance de sport desserre les plafonds', () => {
    const sans = appliquerPlafonds({ ...base, rythmeDemandeKgSemaine: 1.5 })
    const avec = appliquerPlafonds({ ...base, eatKcal: 489, rythmeDemandeKgSemaine: 1.5 })
    expect(avec.deficitKcal).toBeGreaterThan(sans.deficitKcal)
  })
})

describe("Date d'atteinte (doc 02 § 6)", () => {
  test('arrondie à la semaine supérieure', () => {
    expect(semainesJusquAuPoidsCible(85, 78, 0.5)).toBe(14)
  })

  test('nulle si la cible est atteinte ou le rythme nul', () => {
    expect(semainesJusquAuPoidsCible(75, 78, 0.5)).toBeNull()
    expect(semainesJusquAuPoidsCible(85, 78, 0)).toBeNull()
  })
})
