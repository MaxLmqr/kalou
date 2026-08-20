import { date, integer, numeric, pgTable, primaryKey, smallint, uuid } from 'drizzle-orm/pg-core'

import { users } from './auth'
import { horodatages } from './commun'
import { phaseEnum } from './enums'

/**
 * Récapitulatif quotidien **figé**, écrit à la clôture de la journée locale.
 *
 * Sans cette table, tout écran d'historique referait N calculs à chaque
 * affichage, et un changement de profil réécrirait le passé. La journée en cours
 * est calculée à la volée ; les journées closes sont lues ici et ne bougent plus
 * (doc 05 § 5, invariant 4).
 *
 * Elle n'est **jamais** synchronisée vers le client : elle est dérivée, et le
 * serveur en est seul propriétaire (doc 06 § 11).
 */
export const dailySummaries = pgTable(
  'daily_summaries',
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    localDate: date().notNull(),
    /** Figés : le triplet qui a servi à établir le budget de la journée. */
    bmr: integer().notNull(),
    socle: integer().notNull(),
    deficitCible: integer().notNull(),
    budgetKcal: integer().notNull(),
    eatKcal: integer().notNull().default(0),
    /** Dépense d'équilibre affichée, cf. doc 02 § 3.2. */
    depenseKcal: integer().notNull(),
    apportsKcal: integer().notNull().default(0),
    /** `apports − dépense réelle`, TEF calculé sur ce qui a été mangé (§ 8). */
    balanceKcal: integer().notNull().default(0),
    /** Entrées en attente d'estimation, exclues des totaux. */
    entreesEnAttente: smallint().notNull().default(0),
    tendancePoidsKg: numeric({ precision: 5, scale: 2, mode: 'number' }),
    phase: phaseEnum().notNull(),
    ...horodatages,
  },
  (table) => [primaryKey({ columns: [table.userId, table.localDate] })],
)

export type DailySummary = typeof dailySummaries.$inferSelect
