import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { users } from './auth'
import { horodatages } from './commun'
import { sourceAlimentEnum, uniteBaseEnum, uniteItemEnum } from './enums'

/**
 * Base d'aliments : jeu de référence CIQUAL et aliments personnels. Doc 08.
 *
 * `user_id IS NULL` désigne un aliment de référence, visible de tous ; sinon
 * l'aliment est privé à son propriétaire.
 */
export const foods = pgTable(
  'foods',
  {
    id: uuid().primaryKey(),
    userId: uuid().references(() => users.id, { onDelete: 'cascade' }),
    source: sourceAlimentEnum().notNull(),
    /** Code CIQUAL d'origine, pour la traçabilité et les mises à jour. */
    codeSource: text(),
    /** Libellé affiché, réécrit pour le sous-ensemble curé. */
    libelle: text().notNull(),
    libelleOrigine: text(),
    /** Minuscules et sans accents : c'est la colonne sur laquelle on cherche. */
    libelleNormalise: text().notNull(),
    kcal100g: numeric('kcal_100g', { precision: 6, scale: 1, mode: 'number' }).notNull(),
    proteines100g: numeric('proteines_100g', { precision: 5, scale: 1, mode: 'number' }),
    glucides100g: numeric('glucides_100g', { precision: 5, scale: 1, mode: 'number' }),
    lipides100g: numeric('lipides_100g', { precision: 5, scale: 1, mode: 'number' }),
    fibres100g: numeric('fibres_100g', { precision: 5, scale: 1, mode: 'number' }),
    uniteBase: uniteBaseEnum().notNull().default('g'),
    /** Appartient au sous-ensemble curé (~300 aliments). Doc 08 § 5. */
    promu: boolean().notNull().default(false),
    usagesGlobaux: integer().notNull().default(0),
    referenceVersion: text(),
    /** Retrait sans suppression : l'historique doit rester lisible. */
    actif: boolean().notNull().default(true),
    ...horodatages,
  },
  (table) => [
    // Un aliment personnel est toujours rattaché à son propriétaire. Doc 05 § 2.
    check(
      'foods_proprietaire_coherent',
      sql`(${table.userId} is null) = (${table.source} = 'ciqual')`,
    ),
    index('foods_recherche_idx').on(table.libelleNormalise),
    index('foods_proprietaire_idx').on(table.userId),
  ],
)

/** Portions domestiques d'un aliment. Doc 08 § 6. */
export const foodPortions = pgTable(
  'food_portions',
  {
    id: uuid().primaryKey(),
    foodId: uuid()
      .notNull()
      .references(() => foods.id, { onDelete: 'cascade' }),
    /** « 1 cuillère à soupe », « 1 tranche ». */
    libelle: text().notNull(),
    grammes: numeric({ precision: 6, scale: 1, mode: 'number' }).notNull(),
    parDefaut: boolean().notNull().default(false),
  },
  (table) => [index('food_portions_food_idx').on(table.foodId)],
)

/** Synonymes de recherche, alimentés à la main puis par les recherches vaines. */
export const foodAliases = pgTable(
  'food_aliases',
  {
    foodId: uuid()
      .notNull()
      .references(() => foods.id, { onDelete: 'cascade' }),
    aliasNormalise: text().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.foodId, table.aliasNormalise] }),
    index('food_aliases_recherche_idx').on(table.aliasNormalise),
  ],
)

/**
 * Historique de consommation par aliment. C'est ce qui fait remonter les bons
 * résultats au bout de deux semaines d'usage, et ce qui pré-remplit la quantité.
 */
export const userFoodUsages = pgTable(
  'user_food_usages',
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    foodId: uuid()
      .notNull()
      .references(() => foods.id, { onDelete: 'cascade' }),
    usages: integer().notNull().default(0),
    dernierUsageAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    derniereQuantite: numeric({ precision: 7, scale: 1, mode: 'number' }),
    derniereUnite: uniteItemEnum(),
    dernierPortionId: uuid().references(() => foodPortions.id, { onDelete: 'set null' }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.foodId] }),
    index('user_food_usages_classement_idx').on(table.userId, table.usages),
  ],
)

export type Food = typeof foods.$inferSelect
export type FoodPortion = typeof foodPortions.$inferSelect
