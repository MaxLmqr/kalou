import { describe, expect, test } from 'bun:test';

import {
  avecQuantite,
  grammesDe,
  itemsDe,
  ligneDepuisComposant,
  multipleDe,
  ouvertureDe,
  type LigneReference,
  type Portion,
} from './repas';

/** La pomme du jeu de référence : 48,5 kcal/100 g, une portion de 150 g. */
const MOYENNE: Portion = { id: 'p1', libelle: '1 moyenne', grammes: 150, par_defaut: true };
const TRANCHE: Portion = { id: 'p2', libelle: '1 tranche', grammes: 30, par_defaut: false };

function pomme(reglages: Partial<LigneReference> = {}): LigneReference {
  return {
    cle: 'l1',
    type: 'reference',
    foodId: 'f1',
    libelle: 'Pomme',
    kcal100g: 48.5,
    portions: [MOYENNE, TRANCHE],
    quantite: 1,
    unite: 'portion',
    portionId: MOYENNE.id,
    kcal: 73,
    ...reglages,
  };
}

describe('Quantité et calories', () => {
  test('une portion se convertit en grammes puis en calories', () => {
    const ligne = avecQuantite(pomme(), 1, 'portion', MOYENNE.id);
    expect(grammesDe(ligne)).toBe(150);
    // Le serveur écrit 73 pour cette même entrée (cf. scripts/parcours.ts).
    expect(ligne.kcal).toBe(73);
  });

  test('un multiple de portion multiplie les grammes', () => {
    const ligne = avecQuantite(pomme(), 3, 'portion', MOYENNE.id);
    expect(grammesDe(ligne)).toBe(450);
    expect(ligne.kcal).toBe(218);
  });

  test('en grammes, la quantité est le poids', () => {
    const ligne = avecQuantite(pomme(), 200, 'g', undefined);
    expect(grammesDe(ligne)).toBe(200);
    expect(ligne.kcal).toBe(97);
  });

  test('changer de portion recalcule tout', () => {
    const ligne = avecQuantite(pomme(), 2, 'portion', TRANCHE.id);
    expect(grammesDe(ligne)).toBe(60);
    expect(ligne.kcal).toBe(29);
  });

  test('une portion inconnue ne produit pas un poids inventé', () => {
    // Cas d'une ligne relue du journal avant que le référentiel soit revenu :
    // mieux vaut pas de valeur qu'une valeur fausse.
    const ligne = avecQuantite(pomme({ portions: undefined }), 1, 'portion', MOYENNE.id);
    expect(grammesDe(ligne)).toBeNull();
    expect(ligne.kcal).toBe(73);
  });
});

describe("Quantité d'ouverture", () => {
  const base = { unite_base: 'g', portions: [MOYENNE, TRANCHE] };

  test('la dernière quantité utilisée passe avant la portion par défaut', () => {
    expect(
      ouvertureDe({
        ...base,
        dernier_usage: {
          derniere_quantite: 2,
          derniere_unite: 'portion',
          dernier_portion_id: TRANCHE.id,
        },
      }),
    ).toEqual({ quantite: 2, unite: 'portion', portionId: TRANCHE.id });
  });

  test('la dernière quantité en grammes est reprise telle quelle', () => {
    expect(
      ouvertureDe({
        ...base,
        dernier_usage: { derniere_quantite: 88, derniere_unite: 'g', dernier_portion_id: null },
      }),
    ).toEqual({ quantite: 88, unite: 'g' });
  });

  test("une portion qui n'appartient plus à l'aliment est ignorée", () => {
    expect(
      ouvertureDe({
        ...base,
        dernier_usage: {
          derniere_quantite: 2,
          derniere_unite: 'portion',
          dernier_portion_id: 'portion-supprimée',
        },
      }),
    ).toEqual({ quantite: 1, unite: 'portion', portionId: MOYENNE.id });
  });

  test('sans historique, la portion par défaut', () => {
    expect(ouvertureDe({ ...base, dernier_usage: null })).toEqual({
      quantite: 1,
      unite: 'portion',
      portionId: MOYENNE.id,
    });
  });

  test('sans portion connue, cent grammes', () => {
    expect(ouvertureDe({ unite_base: 'g', portions: [], dernier_usage: null })).toEqual({
      quantite: 100,
      unite: 'g',
    });
  });

  test('un liquide s\'ouvre en millilitres', () => {
    expect(ouvertureDe({ unite_base: 'ml', portions: [], dernier_usage: null })).toEqual({
      quantite: 100,
      unite: 'ml',
    });
  });
});

describe('Relecture et envoi', () => {
  test('un composant de référence redevient une ligne réglable', () => {
    const ligne = ligneDepuisComposant({
      id: 'i1',
      type: 'reference',
      foodId: 'f1',
      libelle: 'Pomme',
      quantite: 1,
      unite: 'portion',
      portionId: MOYENNE.id,
      kcal: 73,
      kcalRefUtilise: 48.5,
    });

    expect(ligne).toMatchObject({ type: 'reference', kcal100g: 48.5, kcal: 73, unite: 'portion' });
  });

  test('un composant libre garde ses calories', () => {
    const ligne = ligneDepuisComposant({
      id: 'i2',
      type: 'libre',
      foodId: null,
      libelle: 'Vinaigrette maison',
      quantite: null,
      unite: null,
      portionId: null,
      kcal: 90,
      kcalRefUtilise: null,
    });

    expect(ligne).toEqual({ cle: 'i2', type: 'libre', libelle: 'Vinaigrette maison', kcal: 90 });
  });

  test('une référence part sans ses calories, un composant libre avec', () => {
    expect(
      itemsDe([
        pomme(),
        avecQuantite(pomme({ cle: 'l2' }), 200, 'g', undefined),
        { cle: 'l3', type: 'libre', libelle: 'Vinaigrette maison', kcal: 90 },
      ]),
    ).toEqual([
      { type: 'reference', food_id: 'f1', quantite: 1, unite: 'portion', portion_id: MOYENNE.id },
      { type: 'reference', food_id: 'f1', quantite: 200, unite: 'g' },
      { type: 'libre', libelle: 'Vinaigrette maison', kcal: 90 },
    ]);
  });
});

describe('Étiquette de portion', () => {
  test('le libellé de portion porte déjà son compte', () => {
    expect(multipleDe(1, MOYENNE)).toBe('1 moyenne');
  });

  test('au-delà de un, le facteur se dit', () => {
    expect(multipleDe(3, MOYENNE)).toBe('3 × 1 moyenne');
  });
});
