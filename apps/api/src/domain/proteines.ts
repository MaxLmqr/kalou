import { PAS_ARRONDI_PLANCHER_PROTEINES_G, PLANCHER_PROTEINES_PAR_KG } from './constantes'

/**
 * Plancher protéique du jour. Doc 02 § 9.
 *
 * `1,6 × poids`, arrondi à 5 g près : la précision au gramme serait fausse —
 * le facteur 1,6 est déjà un ordre de grandeur, et le poids qui l'alimente est
 * une tendance lissée.
 *
 * C'est un **plancher**, pas une cible : le dépasser n'est pas un écart, et
 * rien dans l'interface ne doit le présenter comme tel.
 */
export function plancherProteines(poidsKg: number): number {
  const brut = PLANCHER_PROTEINES_PAR_KG * poidsKg
  return Math.round(brut / PAS_ARRONDI_PLANCHER_PROTEINES_G) * PAS_ARRONDI_PLANCHER_PROTEINES_G
}

/** Ce qu'il faut savoir d'un composant pour en tirer la somme protéique. */
export type ComposantProteique = {
  type: 'reference' | 'libre' | 'ia'
  proteinesG: number | null
}

export type SommeProteines = {
  /** `null` si aucun composant ne porte de valeur protéique. */
  totalG: number | null
  /** Vrai si le total n'est qu'une borne inférieure. */
  partielle: boolean
}

/**
 * Somme protéique de la journée : `Σ food_entry_items.proteines_g`. Doc 02 § 9.
 *
 * Un composant saisi en calories libres ne porte pas de valeur protéique
 * (doc 08 § 3). Le total est alors une **borne inférieure**, et doit s'afficher
 * comme telle (« ≥ 78 g ») : un chiffre faussement précis sur une donnée
 * partielle est pire que pas de chiffre du tout.
 */
export function sommeProteines(composants: readonly ComposantProteique[]): SommeProteines {
  let total = 0
  let renseigne = false
  let partielle = false

  for (const composant of composants) {
    if (composant.proteinesG === null) {
      if (composant.type === 'libre') partielle = true
      continue
    }
    total += composant.proteinesG
    renseigne = true
  }

  return { totalG: renseigne ? Math.round(total * 10) / 10 : null, partielle }
}
