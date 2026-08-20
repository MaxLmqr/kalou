import { describe, expect, test } from 'bun:test'

import { calculerTendance, tendanceCourante } from './tendance'

describe('Tendance de poids (doc 02 § 4)', () => {
  test('la première pesée initialise la tendance', () => {
    const [point] = calculerTendance([{ localDate: '2026-01-01', poidsKg: 85 }])
    expect(point!.tendanceKg).toBe(85)
    expect(point!.reinitialisee).toBe(true)
  })

  test('le lissage applique alpha = 0,15', () => {
    const points = calculerTendance([
      { localDate: '2026-01-01', poidsKg: 85 },
      { localDate: '2026-01-02', poidsKg: 86 },
    ])
    expect(points[1]!.tendanceKg).toBeCloseTo(85.15, 10)
  })

  test('une pesée absurde ne déplace la tendance que de 15 % de son écart', () => {
    // Le fameux « +800 g ce matin » : la tendance bouge de 120 g.
    const points = calculerTendance([
      { localDate: '2026-01-01', poidsKg: 85 },
      { localDate: '2026-01-02', poidsKg: 85.8 },
    ])
    expect(points[1]!.tendanceKg - 85).toBeCloseTo(0.12, 10)
  })

  test('les pesées sont traitées dans l\'ordre chronologique quel que soit l\'ordre d\'entrée', () => {
    const desordre = calculerTendance([
      { localDate: '2026-01-02', poidsKg: 86 },
      { localDate: '2026-01-01', poidsKg: 85 },
    ])
    expect(desordre[0]!.localDate).toBe('2026-01-01')
    expect(desordre[1]!.tendanceKg).toBeCloseTo(85.15, 10)
  })

  test("une journée sans pesée n'interpole pas", () => {
    // Deux pesées espacées de 5 jours donnent le même résultat que deux pesées
    // consécutives : l'EMA avance d'une pesée à l'autre, pas d'un jour à l'autre.
    const espacees = calculerTendance([
      { localDate: '2026-01-01', poidsKg: 85 },
      { localDate: '2026-01-06', poidsKg: 86 },
    ])
    expect(espacees[1]!.tendanceKg).toBeCloseTo(85.15, 10)
  })

  test('au-delà de 14 jours d\'interruption, la tendance est réinitialisée', () => {
    const points = calculerTendance([
      { localDate: '2026-01-01', poidsKg: 85 },
      { localDate: '2026-01-16', poidsKg: 90 },
    ])
    expect(points[1]!.reinitialisee).toBe(true)
    expect(points[1]!.tendanceKg).toBe(90)
  })

  test('exactement 14 jours d\'interruption ne réinitialise pas', () => {
    const points = calculerTendance([
      { localDate: '2026-01-01', poidsKg: 85 },
      { localDate: '2026-01-15', poidsKg: 90 },
    ])
    expect(points[1]!.reinitialisee).toBe(false)
  })

  test('une pesée à plus de 3 kg de la tendance est signalée mais conservée', () => {
    const points = calculerTendance([
      { localDate: '2026-01-01', poidsKg: 85 },
      { localDate: '2026-01-02', poidsKg: 8.5 }, // 8,5 tapé au lieu de 85
    ])
    expect(points[1]!.estAberrante).toBe(true)
    // Conservée : elle pèse dans l'EMA, mais seulement pour 15 %.
    expect(points[1]!.tendanceKg).toBeCloseTo(73.525, 10)
  })

  test('une pesée réinitialisant la série ne peut pas être aberrante', () => {
    const points = calculerTendance([
      { localDate: '2026-01-01', poidsKg: 85 },
      { localDate: '2026-02-01', poidsKg: 78 },
    ])
    expect(points[1]!.estAberrante).toBe(false)
  })

  test('sans pesée, il n\'y a pas de tendance', () => {
    expect(tendanceCourante([])).toBeNull()
  })
})
