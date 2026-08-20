import { describe, expect, test } from 'bun:test'

import { normaliserLibelle } from './texte'

describe('Normalisation des libellés (doc 08 § 5)', () => {
  test('les accents disparaissent', () => {
    expect(normaliserLibelle('Pâtes')).toBe('pates')
    expect(normaliserLibelle('Crème fraîche épaisse')).toBe('creme fraiche epaisse')
  })

  test('les ligatures sont développées', () => {
    // Sans cela, « boeuf » ne trouverait pas « bœuf ».
    expect(normaliserLibelle('Bœuf haché')).toBe('boeuf hache')
    expect(normaliserLibelle('Œuf entier')).toBe('oeuf entier')
  })

  test('la ponctuation des libellés CIQUAL devient une séparation', () => {
    expect(normaliserLibelle("Pois chiches, cuits à l'eau, non salés")).toBe(
      'pois chiches cuits a l eau non sales',
    )
    expect(normaliserLibelle('Polenta ou semoule de maïs, précuite, sèche')).toBe(
      'polenta ou semoule de mais precuite seche',
    )
  })

  test('les chiffres sont conservés', () => {
    // Ils distinguent « Fromage blanc 0% » de « Fromage blanc 3% ».
    expect(normaliserLibelle('Fromage blanc 3%')).toBe('fromage blanc 3')
  })

  test('la requête et le libellé stocké se normalisent pareil', () => {
    // C'est l'invariant qui fait fonctionner la recherche : si les deux
    // divergeaient, « pâtes » cesserait de trouver « Pâtes ».
    expect(normaliserLibelle('  PÂTES  ')).toBe(normaliserLibelle('pâtes'))
  })

  test('une chaîne sans lettre ni chiffre se réduit au vide', () => {
    expect(normaliserLibelle('   ---   ')).toBe('')
  })
})
