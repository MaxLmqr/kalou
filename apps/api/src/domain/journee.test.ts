import { describe, expect, test } from 'bun:test'

import { ajouterJours, bornesDuJour, differenceEnJours, jourLocal, jours } from './journee'

const PARIS = { timezone: 'Europe/Paris' }
const PARIS_COUCHE_TARD = { timezone: 'Europe/Paris', heureBascule: 3 }

describe('Rattachement à une journée locale (doc 05 § 1)', () => {
  test('un repas du midi tombe le bon jour', () => {
    expect(jourLocal(new Date('2026-06-15T10:30:00Z'), PARIS)).toBe('2026-06-15')
  })

  test("23 h 30 à Paris, c'est encore le même jour, pas déjà le lendemain UTC", () => {
    // 23 h 30 heure d'été à Paris = 21 h 30 UTC. Un calcul en UTC serait juste
    // ici mais faux une heure plus tard : c'est le cas suivant qui compte.
    expect(jourLocal(new Date('2026-06-15T21:30:00Z'), PARIS)).toBe('2026-06-15')
  })

  test("00 h 30 à Paris appartient au nouveau jour, alors qu'il est encore la veille en UTC", () => {
    expect(jourLocal(new Date('2026-06-15T22:30:00Z'), PARIS)).toBe('2026-06-16')
  })
})

describe('Heure de bascule pour les couche-tard', () => {
  test('un en-cas à 01 h 30 compte pour la veille', () => {
    const instant = new Date('2026-06-15T23:30:00Z') // 01 h 30 le 16 à Paris
    expect(jourLocal(instant, PARIS)).toBe('2026-06-16')
    expect(jourLocal(instant, PARIS_COUCHE_TARD)).toBe('2026-06-15')
  })

  test('à partir de 03 h 00, la journée a basculé', () => {
    const instant = new Date('2026-06-16T01:00:00Z') // 03 h 00 le 16 à Paris
    expect(jourLocal(instant, PARIS_COUCHE_TARD)).toBe('2026-06-16')
  })

  test('la bascule fonctionne au passage de mois', () => {
    const instant = new Date('2026-06-30T23:30:00Z') // 01 h 30 le 1er juillet
    expect(jourLocal(instant, PARIS_COUCHE_TARD)).toBe('2026-06-30')
  })

  test("la bascule fonctionne au passage d'année", () => {
    const instant = new Date('2026-12-31T23:30:00Z') // 00 h 30 le 1er janvier
    expect(jourLocal(instant, PARIS)).toBe('2027-01-01')
    expect(jourLocal(instant, PARIS_COUCHE_TARD)).toBe('2026-12-31')
  })
})

describe("Changements d'heure (doc 07 — risque de bug silencieux)", () => {
  test('passage à l\'heure d\'été : la nuit ne dure que 23 heures', () => {
    // 2026-03-29 : 02 h 00 devient 03 h 00 à Paris.
    const { debut, finExclue } = bornesDuJour('2026-03-29', PARIS)
    const heures = (finExclue.getTime() - debut.getTime()) / 3_600_000
    expect(heures).toBe(23)
  })

  test("passage à l'heure d'hiver : la nuit dure 25 heures", () => {
    // 2026-10-25 : 03 h 00 revient à 02 h 00 à Paris.
    const { debut, finExclue } = bornesDuJour('2026-10-25', PARIS)
    const heures = (finExclue.getTime() - debut.getTime()) / 3_600_000
    expect(heures).toBe(25)
  })

  test("une entrée juste avant le changement d'heure reste sur son jour", () => {
    // 00 h 30 le 29 mars à Paris (heure d'hiver, UTC+1).
    expect(jourLocal(new Date('2026-03-28T23:30:00Z'), PARIS)).toBe('2026-03-29')
    // 04 h 00 le 29 mars à Paris (heure d'été, UTC+2), après le saut.
    expect(jourLocal(new Date('2026-03-29T02:00:00Z'), PARIS)).toBe('2026-03-29')
  })

  test('un jour ordinaire dure bien 24 heures', () => {
    const { debut, finExclue } = bornesDuJour('2026-06-15', PARIS)
    expect((finExclue.getTime() - debut.getTime()) / 3_600_000).toBe(24)
  })
})

describe('Voyage (doc 07 — attribution des entrées)', () => {
  test("le fuseau du profil décide, pas celui de l'appareil", () => {
    // Même instant : 20 h 00 UTC le 15 juin.
    const instant = new Date('2026-06-15T20:00:00Z')
    expect(jourLocal(instant, { timezone: 'Europe/Paris' })).toBe('2026-06-15') // 22 h 00
    expect(jourLocal(instant, { timezone: 'Asia/Tokyo' })).toBe('2026-06-16') // 05 h 00
    expect(jourLocal(instant, { timezone: 'America/Los_Angeles' })).toBe('2026-06-15') // 13 h 00
  })

  test('un fuseau à décalage non entier est géré', () => {
    // Katmandou est à UTC+5:45.
    const instant = new Date('2026-06-15T18:20:00Z') // 00 h 05 le 16
    expect(jourLocal(instant, { timezone: 'Asia/Kathmandu' })).toBe('2026-06-16')
  })
})

describe('Arithmétique des jours locaux', () => {
  test('décalage simple', () => {
    expect(ajouterJours('2026-06-15', 1)).toBe('2026-06-16')
    expect(ajouterJours('2026-06-15', -1)).toBe('2026-06-14')
  })

  test("franchit les mois, les années et les années bissextiles", () => {
    expect(ajouterJours('2026-12-31', 1)).toBe('2027-01-01')
    expect(ajouterJours('2028-02-28', 1)).toBe('2028-02-29')
    expect(ajouterJours('2026-02-28', 1)).toBe('2026-03-01')
  })

  test("le décalage n'est pas perturbé par un changement d'heure", () => {
    // Une fenêtre de calibration de 14 jours doit en compter 14, pas 13,96.
    expect(ajouterJours('2026-03-25', 14)).toBe('2026-04-08')
    expect(differenceEnJours('2026-03-25', '2026-04-08')).toBe(14)
  })

  test('la suite de jours est inclusive aux deux bornes', () => {
    expect(jours('2026-06-15', '2026-06-17')).toEqual(['2026-06-15', '2026-06-16', '2026-06-17'])
    expect(jours('2026-06-15', '2026-06-15')).toEqual(['2026-06-15'])
    expect(jours('2026-06-17', '2026-06-15')).toEqual([])
  })

  test('une fenêtre de calibration de 14 jours contient 14 jours', () => {
    const fin = '2026-06-15'
    const debut = ajouterJours(fin, -13)
    expect(jours(debut, fin)).toHaveLength(14)
  })
})
