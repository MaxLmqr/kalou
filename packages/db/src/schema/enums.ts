import { pgEnum } from 'drizzle-orm/pg-core'

/** Paramètre de la formule BMR, pas une identité. Doc 02 § 2. */
export const sexeEnum = pgEnum('sexe', ['homme', 'femme'])

/** Doc 05, `food_entries.etat`. */
export const etatEntreeEnum = pgEnum('etat_entree', [
  'en_attente',
  'estime',
  'corrige',
  'manuel',
  'echec',
])

/** Doc 05, `food_entries.source`. */
export const sourceEntreeEnum = pgEnum('source_entree', ['ia_photo', 'ia_texte', 'favori', 'manuel'])

/** Doc 08 § 3 : nature d'un composant de repas. */
export const typeItemEnum = pgEnum('type_item', ['reference', 'libre', 'ia'])

export const uniteItemEnum = pgEnum('unite_item', ['g', 'ml', 'unite', 'portion'])

/** Unité de référence d'un aliment. Les liquides sont en ml. */
export const uniteBaseEnum = pgEnum('unite_base', ['g', 'ml'])

export const sourceAlimentEnum = pgEnum('source_aliment', ['ciqual', 'utilisateur'])

/** Confiance de l'estimation IA sur un composant. */
export const confianceEnum = pgEnum('confiance', ['haute', 'moyenne', 'basse'])

/** Doc 06 § 4 : d'où vient l'apport cible du jour. */
export const phaseEnum = pgEnum('phase', ['formule', 'transition', 'calibre'])
