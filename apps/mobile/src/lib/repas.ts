/**
 * Arithmétique du composeur de repas (docs/08 § 6 et § 7).
 *
 * Isolée de l'écran parce qu'elle est la seule partie du composeur qui peut se
 * tromper en silence : une portion mal convertie donne un repas plausible et
 * faux. Elle ne dépend ni de React ni du réseau, et se teste donc directement
 * (`repas.test.ts`).
 *
 * **Ces calories sont un aperçu.** Le serveur recalcule à l'écriture depuis le
 * `kcal_100g` de l'aliment et fige le résultat (doc 06 § 5) ; la même formule
 * vit ici pour que le total bouge pendant le réglage, exactement comme sur
 * l'écran d'activité.
 */

/** Pas du sélecteur en grammes, et plancher de saisie. */
export const PAS_G = 10;
/** Quantité d'ouverture d'un aliment sans portion connue ni historique. */
export const DEFAUT_G = 100;

export type Unite = 'g' | 'ml' | 'portion';

/** Portion domestique d'un aliment, telle que l'API la sert. */
export type Portion = {
  id: string;
  libelle: string;
  grammes: number;
  par_defaut: boolean;
};

export type LigneReference = {
  cle: string;
  type: 'reference';
  foodId: string;
  libelle: string;
  /** Figé à la saisie côté serveur ; sert ici à l'aperçu du total. */
  kcal100g: number;
  quantite: number;
  unite: Unite;
  portionId?: string;
  /** `undefined` tant que les portions de l'aliment ne sont pas chargées. */
  portions?: Portion[];
  /** Calories affichées. Recalculées à chaque changement de quantité. */
  kcal: number;
};

export type LigneLibre = { cle: string; type: 'libre'; libelle: string; kcal: number };
export type Ligne = LigneReference | LigneLibre;

/** Un composant tel que l'API l'attend (doc 06 § 5). */
export type ItemEnvoye =
  | {
      type: 'reference';
      food_id: string;
      quantite: number;
      unite: 'g' | 'ml' | 'unite' | 'portion';
      portion_id?: string;
    }
  | { type: 'libre'; libelle: string; kcal: number };

export function portionDe(ligne: LigneReference): Portion | undefined {
  return ligne.portions?.find((portion) => portion.id === ligne.portionId);
}

/** Grammes réellement consommés — `null` si la portion n'est pas encore connue. */
export function grammesDe(ligne: LigneReference): number | null {
  if (!ligne.portionId) return ligne.quantite;
  const portion = portionDe(ligne);
  return portion ? ligne.quantite * portion.grammes : null;
}

/** Applique une quantité à une ligne et en recalcule l'aperçu calorique. */
export function avecQuantite(
  ligne: LigneReference,
  quantite: number,
  unite: Unite,
  portionId: string | undefined,
): LigneReference {
  const suivante = { ...ligne, quantite, unite, portionId };
  const grammes = grammesDe(suivante);
  return grammes === null
    ? suivante
    : { ...suivante, kcal: Math.round((ligne.kcal100g * grammes) / 100) };
}

/** Ce qu'il faut savoir d'un aliment pour l'ouvrir dans le composeur. */
export type AlimentOuvrable = {
  unite_base: string;
  portions: Portion[];
  dernier_usage: {
    derniere_quantite: number | null;
    derniere_unite: string | null;
    dernier_portion_id: string | null;
  } | null;
};

/**
 * Quantité d'ouverture d'un aliment : la dernière utilisée, sa portion par
 * défaut, ou 100 g.
 *
 * L'ordre n'est pas négociable : reprendre la dernière quantité est « le
 * raccourci le plus rentable de tout l'écran » (doc 08 § 6). Une portion qui
 * n'appartient plus à l'aliment est ignorée plutôt que reprise — un
 * identifiant orphelin donnerait une quantité sans poids.
 */
export function ouvertureDe(aliment: AlimentOuvrable): {
  quantite: number;
  unite: Unite;
  portionId?: string;
} {
  const dernier = aliment.dernier_usage;
  if (dernier?.derniere_quantite) {
    const portion = aliment.portions.find((element) => element.id === dernier.dernier_portion_id);
    if (portion) {
      return { quantite: dernier.derniere_quantite, unite: 'portion', portionId: portion.id };
    }
    if (dernier.derniere_unite === 'g' || dernier.derniere_unite === 'ml') {
      return { quantite: dernier.derniere_quantite, unite: dernier.derniere_unite };
    }
  }

  const parDefaut = aliment.portions.find((portion) => portion.par_defaut) ?? aliment.portions[0];
  if (parDefaut) return { quantite: 1, unite: 'portion', portionId: parDefaut.id };
  return { quantite: DEFAUT_G, unite: aliment.unite_base === 'ml' ? 'ml' : 'g' };
}

/** Composant du journal, réduit à ce que le composeur en relit. */
export type ComposantDuJournal = {
  id: string;
  type: string;
  foodId: string | null;
  libelle: string;
  quantite: number | null;
  unite: string | null;
  portionId: string | null;
  kcal: number;
  kcalRefUtilise: number | null;
};

/** Reconstruit une ligne modifiable depuis un composant déjà enregistré. */
export function ligneDepuisComposant(item: ComposantDuJournal): Ligne {
  if (item.type !== 'reference' || !item.foodId) {
    return { cle: item.id, type: 'libre', libelle: item.libelle, kcal: item.kcal };
  }
  return {
    cle: item.id,
    type: 'reference',
    foodId: item.foodId,
    libelle: item.libelle,
    kcal100g: item.kcalRefUtilise ?? 0,
    quantite: item.quantite ?? DEFAUT_G,
    unite: item.unite === 'ml' || item.unite === 'portion' ? item.unite : 'g',
    portionId: item.portionId ?? undefined,
    kcal: item.kcal,
  };
}

/**
 * « 1 moyenne », « 2 × 1 moyenne ».
 *
 * Le libellé d'une portion porte déjà son compte (« 1 cuillère à soupe ») : le
 * préfixer d'un « 1 × » donnerait « 1 × 1 cuillère à soupe ». Au-delà de un, le
 * facteur se dit — pluraliser un libellé libre, non.
 */
export function multipleDe(quantite: number, portion: Portion): string {
  return quantite === 1 ? portion.libelle : `${quantite} × ${portion.libelle}`;
}

/** Corps envoyé à l'API : le client ne transmet jamais les calories d'une référence. */
export function itemsDe(lignes: Ligne[]): ItemEnvoye[] {
  return lignes.map((ligne) =>
    ligne.type === 'libre'
      ? { type: 'libre', libelle: ligne.libelle, kcal: ligne.kcal }
      : {
          type: 'reference',
          food_id: ligne.foodId,
          quantite: ligne.quantite,
          unite: ligne.unite,
          ...(ligne.portionId ? { portion_id: ligne.portionId } : {}),
        },
  );
}
