import { sql } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { users } from './auth'
import { foodPortions, foods } from './aliments'
import { synchronisable } from './commun'
import {
  confianceEnum,
  etatEntreeEnum,
  sourceEntreeEnum,
  typeItemEnum,
  uniteItemEnum,
} from './enums'

/**
 * Entrées alimentaires — nourriture et boissons sans distinction structurelle,
 * un verre de jus est un aliment liquide. Doc 05 § 2.
 *
 * `kcal` est la somme dénormalisée des composants : elle n'est jamais écrite
 * directement (doc 06 § 5), mais la stocker évite une agrégation sur le chemin
 * le plus chaud de l'application.
 */
export const foodEntries = pgTable(
  'food_entries',
  {
    /** Généré côté client : l'entrée existe avant toute connexion. */
    id: uuid().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    occurredAt: timestamp({ withTimezone: true }).notNull(),
    /** Jour local de rattachement, figé à l'écriture. Doc 05 § 1. */
    localDate: date().notNull(),
    libelle: text().notNull(),
    /** `null` tant que l'état est `en_attente` — l'entrée est alors hors total. */
    kcal: integer(),
    proteinesG: numeric({ precision: 6, scale: 1, mode: 'number' }),
    glucidesG: numeric({ precision: 6, scale: 1, mode: 'number' }),
    lipidesG: numeric({ precision: 6, scale: 1, mode: 'number' }),
    /** Fourchette d'incertitude renvoyée par l'estimation. */
    kcalMin: integer(),
    kcalMax: integer(),
    etat: etatEntreeEnum().notNull(),
    source: sourceEntreeEnum().notNull(),
    /** Vrai si au moins un composant a été corrigé à la main. */
    editedByUser: boolean().notNull().default(false),
    /** Clé de la vignette conservée pour l'historique. */
    imageRef: text(),
    ...synchronisable,
  },
  (table) => [
    // Lecture d'une journée : le chemin le plus chaud. Doc 05 § 3.
    index('food_entries_jour_idx')
      .on(table.userId, table.localDate)
      .where(sql`deleted_at is null`),
    index('food_entries_sync_idx').on(table.userId, table.updatedAt),
  ],
)

/**
 * Composants d'un repas. Toute entrée en a au moins un, quelle que soit son
 * origine (doc 08 § 2).
 *
 * Ils n'ont pas de cycle de vie propre : ils sont écrits avec leur parent et
 * disparaissent avec lui, d'où la suppression physique en cascade plutôt que
 * logique (doc 05 § 1).
 */
export const foodEntryItems = pgTable(
  'food_entry_items',
  {
    id: uuid().primaryKey(),
    foodEntryId: uuid()
      .notNull()
      .references(() => foodEntries.id, { onDelete: 'cascade' }),
    position: smallint().notNull(),
    type: typeItemEnum().notNull(),
    /** Renseigné pour `reference`, et pour `ia` si le rapprochement a réussi. */
    foodId: uuid().references(() => foods.id, { onDelete: 'set null' }),
    /** Toujours présent : l'historique reste lisible si l'aliment disparaît. */
    libelle: text().notNull(),
    /** `null` pour un composant `libre`, qui porte directement ses calories. */
    quantite: numeric({ precision: 7, scale: 1, mode: 'number' }),
    unite: uniteItemEnum(),
    portionId: uuid().references(() => foodPortions.id, { onDelete: 'set null' }),
    kcal: integer().notNull(),
    proteinesG: numeric({ precision: 6, scale: 1, mode: 'number' }),
    glucidesG: numeric({ precision: 6, scale: 1, mode: 'number' }),
    lipidesG: numeric({ precision: 6, scale: 1, mode: 'number' }),
    /** Figé : kcal/100 g de l'aliment au moment de la saisie. */
    kcalRefUtilise: numeric({ precision: 6, scale: 1, mode: 'number' }),
    /** Verrou au composant, pas à l'entrée : l'IA ne réécrit pas une correction. */
    editedByUser: boolean().notNull().default(false),
    confiance: confianceEnum(),
  },
  (table) => [index('food_entry_items_parent_idx').on(table.foodEntryId, table.position)],
)

export type FoodEntry = typeof foodEntries.$inferSelect
export type FoodEntryItem = typeof foodEntryItems.$inferSelect
